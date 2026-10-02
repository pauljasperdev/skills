import assert from "node:assert/strict";
import { test } from "node:test";
import childProcess from "node:child_process";
import { promisify } from "node:util";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, mkdir, writeFile, readFile, realpath, symlink, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("review reuse follows the worktree's T3 project and retains dirty Git state", async (t) => {
  const originalExecFile = childProcess.execFile;
  const execFile = promisify(originalExecFile);
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "review-worktree-test-")));
  t.after(async () => {
    childProcess.execFile = originalExecFile;
    syncBuiltinESMExports();
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
    await rm(root, { recursive: true, force: true });
  });
  const repo = path.join(root, "repo");
  const current = path.join(root, "current");
  const other = path.join(root, "other");
  const alias = path.join(root, "alias");
  const home = path.join(root, "t3");
  const git = async (cwd, ...args) => (await execFile("git", ["-C", cwd, ...args])).stdout.trim();
  await mkdir(repo);
  await git(repo, "init", "--initial-branch=main");
  await writeFile(path.join(repo, "tracked.txt"), "original\n");
  await git(repo, "add", "tracked.txt");
  await git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.test", "commit", "-m", "initial");
  await git(repo, "worktree", "add", "-b", "feature", current, "main");
  await git(repo, "worktree", "add", "-b", "other", other, "main");
  await symlink(current, alias);
  await writeFile(path.join(current, "tracked.txt"), "staged\n");
  await git(current, "add", "tracked.txt");
  await writeFile(path.join(current, "tracked.txt"), "unstaged\n");
  await writeFile(path.join(current, "untracked.txt"), "keep me\n");
  const before = await git(current, "status", "--porcelain");
  const projects = [{ id: "owner", workspaceRoot: repo, scripts: [{ runOnWorktreeCreate: true }] },
    { id: "other", workspaceRoot: other }];
  let threads = [{ id: "source", projectId: "owner", worktreePath: alias, title: "Task" }];
  let dispatched;
  let revoked = 0;
  const gitCalls = [];
  await mkdir(path.join(home, "userdata"), { recursive: true });
  await writeFile(path.join(home, "userdata/server-runtime.json"), JSON.stringify({
    version: 1, origin: "http://t3.test", port: 1234, pid: 1,
  }));
  childProcess.execFile = () => assert.fail("Expected a promisified subprocess");
  childProcess.execFile[promisify.custom] = async (file, args, options) => {
    if (file === "npx") {
      if (args.includes("revoke")) revoked++;
      return { stdout: JSON.stringify({ sessionId: "session", token: "token" }), stderr: "" };
    }
    assert.equal(file, "git");
    gitCalls.push(args);
    return await execFile(file, args, options);
  };
  syncBuiltinESMExports();
  globalThis.fetch = async (url) => {
    let body;
    if (url.pathname === "/.well-known/t3/environment") body = { environmentId: "test", serverVersion: "test" };
    else if (url.pathname === "/api/auth/websocket-ticket") body = { ticket: "ticket" };
    else if (url.pathname === "/api/orchestration/shell") body = { projects, threads };
    else if (url.pathname.startsWith("/api/orchestration/threads/")) body = { thread: {
      messages: [{ id: dispatched.message.messageId, role: "user", text: dispatched.message.text }],
      latestTurn: { state: "running" }, activities: [],
    } };
    else assert.fail(`Unexpected request: ${url}`);
    return new Response(JSON.stringify(body));
  };
  globalThis.WebSocket = class extends EventTarget {
    static OPEN = 1;
    readyState = 1;
    constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("open"))); }
    close() { this.readyState = 3; }
    send(raw) {
      const { id, tag, payload } = JSON.parse(raw);
      let value = {};
      if (tag === "server.getConfig") value = { providers: [{ instanceId: "custom", status: "ready", models: [{ slug: "custom-model" }] }] };
      else if (tag === "server.getSettings") value = { newWorktreesStartFromOrigin: true };
      else if (tag === "orchestration.dispatchCommand") {
        dispatched = payload;
        threads.push({ id: payload.threadId, projectId: payload.bootstrap.createThread.projectId,
          title: payload.bootstrap.createThread.title, modelSelection: payload.modelSelection,
          branch: payload.bootstrap.createThread.branch, worktreePath: payload.bootstrap.createThread.worktreePath,
          latestTurn: { state: "running" },
        });
      } else assert.equal(tag, "server.probe");
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
        data: JSON.stringify({ _tag: "Exit", requestId: id, exit: { _tag: "Success", value } }),
      })));
    }
  };
  const { openThread, runCli } = await import("./t3-worktree.mjs");
  const spec = { cwd: current, title: "Task · review", prompt: "Use the review skill. Original problem: export.", reuseWorktree: true };
  const selection = { model: "custom-model" };
  const created = await openThread(spec, home, false, selection);
  assert.equal(created.project.id, "owner");
  assert.equal(created.thread.worktreePath, current);
  assert.equal(created.thread.branch, "feature");
  assert.equal(created.thread.setup, "not-run");
  assert.equal(dispatched.message.text, spec.prompt);
  assert.equal(dispatched.bootstrap.prepareWorktree, undefined);
  assert.equal(dispatched.bootstrap.runSetupScript, false);
  assert.equal(await git(current, "status", "--porcelain"), before);
  assert.equal(await readFile(path.join(current, "tracked.txt"), "utf8"), "unstaged\n");
  assert.equal(await readFile(path.join(current, "untracked.txt"), "utf8"), "keep me\n");
  assert.equal(await git(current, "show", ":tracked.txt"), "staged");
  assert.equal(revoked, 1);

  // The same worktree can be saved under a symlink without permitting a second review.
  threads.find((thread) => thread.id === created.thread.id).worktreePath = alias;
  dispatched = undefined;
  const existing = await openThread(spec, home, false, selection);
  assert.equal(existing.action, "existing");
  assert.equal(existing.thread.id, created.thread.id);
  assert.deepEqual(existing.project.modelSelection, created.thread.modelSelection);
  assert.equal(dispatched, undefined);
  assert.equal(revoked, 2);

  // Conflicting project mappings stop before dispatch and still revoke authentication.
  threads.push({ id: "conflict", projectId: "other", worktreePath: current });
  await assert.rejects(openThread({ ...spec, allowDuplicate: true }, home, false, selection), { code: "T3_PROJECT_AMBIGUOUS" });
  assert.equal(dispatched, undefined);
  assert.equal(revoked, 3);
  threads.pop();
  const owner = projects.shift();
  await assert.rejects(openThread(spec, home, false, selection), { code: "T3_PROJECT_NOT_FOUND" });
  assert.equal(dispatched, undefined);
  assert.equal(revoked, 4);
  projects.unshift(owner);
  await git(current, "checkout", "--detach");
  await assert.rejects(openThread({ ...spec, allowDuplicate: true }, home, false, selection), { code: "DETACHED_BASE_CHECKOUT" });
  assert.equal(dispatched, undefined);
  assert.equal(revoked, 5);
  assert.equal(await git(current, "status", "--porcelain"), before);
  // Exercise the CLI health check through the same real Git and serialized RPC path.
  for (const flags of [[], ["--model", "custom-model", "--provider", "custom"]]) {
    let output = "";
    const stdoutWrite = process.stdout.write;
    process.stdout.write = (chunk) => { output += chunk; return true; };
    try {
      await runCli(undefined, undefined, ["doctor", "--cwd", current, "--t3-home", home, ...flags]);
    } finally {
      process.stdout.write = stdoutWrite;
    }
    const health = JSON.parse(output);
    assert.equal(health.ok, true);
    assert.equal(health.checkout.matchedBy, "worktree-thread");
    assert.equal(health.project.id, "owner");
    assert.equal(health.nativeBootstrapRpc, true);
    assert.deepEqual(health.providers.map(({ instanceId }) => instanceId), ["custom"]);
    assert.deepEqual(health.project.modelSelection, flags.length === 0 ? undefined :
      { model: "custom-model", instanceId: "custom", options: [] });
  }
  assert.equal(revoked, 7);
  assert.ok(gitCalls.every((args) => ["rev-parse", "symbolic-ref", "worktree"].includes(args[2]) &&
    (args[2] !== "worktree" || args[3] === "list")), "the adapter only inspected Git");
});
