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
  globalThis.fetch = async (url, options) => {
    let body;
    if (url.pathname.startsWith("/api/orchestration/")) assert.equal(options.headers["x-t3-orchestration-protocol"], "2");
    if (url.pathname === "/.well-known/t3/environment") body = { environmentId: "test", serverVersion: "test" };
    else if (url.pathname === "/api/auth/websocket-ticket") body = { ticket: "ticket" };
    else if (url.pathname === "/api/orchestration/shell") body = { projects, threads };
    else assert.fail(`Unexpected request: ${url}`);
    return new Response(JSON.stringify(body));
  };
  globalThis.WebSocket = class extends EventTarget {
    static OPEN = 1;
    readyState = 1;
    constructor(url) {
      super();
      assert.equal(url.searchParams.get("orchestrationProtocol"), "2");
      queueMicrotask(() => this.dispatchEvent(new Event("open")));
    }
    close() { this.readyState = 3; }
    send(raw) {
      const { id, tag } = JSON.parse(raw);
      let value = {};
      if (tag === "server.getConfig") value = { providers: [{ instanceId: "custom", status: "ready", models: [{ slug: "custom-model" }] }] };
      else assert.equal(tag, "server.probe");
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
        data: JSON.stringify({ _tag: "Exit", requestId: id, exit: { _tag: "Success", value } }),
      })));
    }
  };
  const { prepareThread, runCli } = await import("./t3-worktree.mjs");
  const spec = { cwd: current, title: "Task · review", prompt: "Use the review skill. Original problem: export." };
  const selection = { model: "custom-model" };
  const prepared = await prepareThread(spec, home, selection);
  assert.equal(prepared.action, "launch");
  assert.equal(prepared.project.id, "owner");
  assert.equal(prepared.launch.projectId, "owner");
  assert.deepEqual(prepared.launch.workspaceStrategy, { type: "existing_worktree", worktreePath: current });
  assert.equal(prepared.launch.message, spec.prompt);
  assert.deepEqual(prepared.expected, { title: spec.title, branch: "feature", worktreePath: current,
    modelSelection: { model: "custom-model", instanceId: "custom", options: [] }, setup: "not-run" });
  assert.equal(await git(current, "status", "--porcelain"), before);
  assert.equal(await readFile(path.join(current, "tracked.txt"), "utf8"), "unstaged\n");
  assert.equal(await readFile(path.join(current, "untracked.txt"), "utf8"), "keep me\n");
  assert.equal(await git(current, "show", ":tracked.txt"), "staged");
  assert.equal(revoked, 1);

  // Once launched, the same worktree saved under a symlink does not permit a second review.
  threads.push({ id: "launched", projectId: "owner", title: spec.title, branch: "feature",
    worktreePath: alias, modelSelection: prepared.expected.modelSelection });
  const existing = await prepareThread(spec, home, selection);
  assert.equal(existing.action, "existing");
  assert.equal(existing.thread.id, "launched");
  assert.deepEqual(existing.project.modelSelection, prepared.expected.modelSelection);
  assert.equal(revoked, 2);

  // Conflicting project mappings stop before preparation and still revoke authentication.
  threads.push({ id: "conflict", projectId: "other", worktreePath: current });
  await assert.rejects(prepareThread({ ...spec, allowDuplicate: true }, home, selection), { code: "T3_PROJECT_AMBIGUOUS" });
  assert.equal(revoked, 3);
  threads.pop();
  const owner = projects.shift();
  await assert.rejects(prepareThread(spec, home, selection), { code: "T3_PROJECT_NOT_FOUND" });
  assert.equal(revoked, 4);
  projects.unshift(owner);
  await git(current, "checkout", "--detach");
  await assert.rejects(prepareThread({ ...spec, allowDuplicate: true }, home, selection), { code: "DETACHED_BASE_CHECKOUT" });
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
    assert.equal(health.launcher, "t3_thread_launch");
    assert.deepEqual(health.providers.map(({ instanceId }) => instanceId), ["custom"]);
    assert.deepEqual(health.project.modelSelection, flags.length === 0 ? undefined :
      { model: "custom-model", instanceId: "custom", options: [] });
  }
  assert.equal(revoked, 7);
  assert.ok(gitCalls.every((args) => ["rev-parse", "symbolic-ref"].includes(args[2])), "the adapter only inspected Git");
});
