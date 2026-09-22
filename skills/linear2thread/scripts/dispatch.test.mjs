import assert from "node:assert/strict";
import { test } from "node:test";
import childProcess from "node:child_process";
import { promisify } from "node:util";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, mkdir, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("standalone and Linear dispatch use the shared runtime path", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "to-thread-test-"));
  const originalExecFile = childProcess.execFile;
  const originalFetch = globalThis.fetch;
  const originalWebSocket = globalThis.WebSocket;
  t.after(async () => {
    childProcess.execFile = originalExecFile;
    syncBuiltinESMExports();
    globalThis.fetch = originalFetch;
    globalThis.WebSocket = originalWebSocket;
    await rm(root, { recursive: true, force: true });
  });
  await mkdir(path.join(root, "userdata"));
  await writeFile(path.join(root, "userdata/server-runtime.json"), JSON.stringify({
    version: 1, origin: "http://t3.test", port: 1234, pid: 1,
  }));
  const project = { id: "project-1", title: "Project", workspaceRoot: root, scripts: [] };
  let threads = [];
  let dispatched;
  let rejectDispatch = false;
  let setupFailed = false;
  let raceThread;
  let worktreePath;
  let revoked = 0;
  childProcess.execFile = () => assert.fail("Expected a promisified subprocess");
  childProcess.execFile[promisify.custom] = async (file, args) => {
    let stdout;
    if (file === "npx") {
      if (args.includes("revoke")) { revoked++; stdout = "{}"; }
      else stdout = JSON.stringify({ sessionId: "test-session", token: "test-token" });
    } else if (file === "git" && args.includes("symbolic-ref")) {
      stdout = args[1] === worktreePath ? dispatched.bootstrap.prepareWorktree.branch : "main";
    }
    else if (file === "git" && args.includes("for-each-ref")) stdout = "t3code/task";
    else if (file === "git" && args.includes("worktree")) stdout = `worktree ${worktreePath}\n`;
    else throw new Error(`Unexpected subprocess: ${file} ${args.join(" ")}`);
    return { stdout, stderr: "" };
  };
  syncBuiltinESMExports();
  globalThis.fetch = async (url) => {
    if (url.pathname === "/api/auth/websocket-ticket" && raceThread) threads = [raceThread];
    if (url.pathname.startsWith("/api/orchestration/threads/")) {
      return new Response(JSON.stringify({ thread: {
        messages: [{ id: dispatched.message.messageId, role: "user", text: dispatched.message.text }],
        latestTurn: { state: "running" },
        activities: [{ kind: setupFailed ? "setup-script.failed" : "setup-script.started" }],
      } }));
    }
    const body = url.pathname === "/.well-known/t3/environment"
      ? { environmentId: "test", serverVersion: "test-version" }
      : url.pathname === "/api/auth/websocket-ticket" ? { ticket: "test-ticket" }
      : url.pathname === "/api/orchestration/shell" ? { projects: [project], threads }
      : assert.fail(`Unexpected URL: ${url}`);
    return new Response(JSON.stringify(body));
  };
  globalThis.WebSocket = class extends EventTarget {
    static OPEN = 1;
    readyState = 1;
    constructor() { super(); queueMicrotask(() => this.dispatchEvent(new Event("open"))); }
    close() { this.readyState = 3; }
    send(raw) {
      const { id, tag, payload } = JSON.parse(raw);
      let value;
      if (tag === "server.probe") value = {};
      else if (tag === "server.getSettings") value = { newWorktreesStartFromOrigin: true };
      else if (tag === "server.getConfig") value = { providers: [{
        instanceId: "codex", status: "ready", models: [{ slug: "gpt-6-astra",
          capabilities: { optionDescriptors: [{ id: "reasoningEffort", options: [{ id: "high" }] }] } }],
      }] };
      else if (tag === "orchestration.dispatchCommand") {
        dispatched = payload;
        if (!rejectDispatch) threads = [{ id: payload.threadId,
          projectId: project.id, title: payload.bootstrap.createThread.title,
          modelSelection: payload.modelSelection, branch: payload.bootstrap.prepareWorktree.branch,
          worktreePath, latestTurn: { state: "running" },
        }];
      } else assert.fail(`Unexpected RPC: ${tag}`);
      const exit = tag === "orchestration.dispatchCommand" && rejectDispatch
        ? { _tag: "Failure", cause: "fixture rejection" } : { _tag: "Success", value };
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
        data: JSON.stringify({ _tag: "Exit", requestId: id, exit }),
      })));
    }
  };
  const { openThread } = await import("../../to-thread/scripts/t3-worktree.mjs");
  const { resolveProfile } = await import("../../to-thread/scripts/profiles.mjs");
  const { prepareIssueSpec } = await import("./t3-worktree.mjs");
  const profile = resolveProfile("codex");
  const spec = { cwd: root, title: "Task", prompt: "Inspect the code." };
  const generic = await openThread(spec, root, true, profile);
  assert.equal(generic.action, "dry-run");
  assert.equal(generic.thread.title, "Task");
  assert.equal(generic.worktree.branch, "t3code/task-2");
  assert.equal(generic.worktree.baseBranch, "main");
  assert.equal(generic.worktree.startFromOrigin, true);
  assert.ok(generic.thread.prompt.endsWith(spec.prompt));
  assert.equal(dispatched, undefined);
  assert.equal(revoked, 1);

  const linear = prepareIssueSpec({ cwd: root, issue: "SID-12", title: "Sample", workspace: "sideberry" }, profile);
  const issue = await openThread(linear, root, true, profile);
  assert.equal(issue.worktree.branch, "t3code/sid-12-sample");
  assert.equal(issue.thread.title, "SID-12 — Sample");
  assert.ok(issue.thread.prompt.includes("$examine-issue"));
  threads = [{ id: "existing", projectId: project.id, title: "SID-12 — Old title" }];
  assert.equal((await openThread(linear, root, false, profile)).action, "existing");
  assert.equal(dispatched, undefined);
  assert.equal((await openThread({ ...linear, allowDuplicate: true }, root, true, profile)).action, "dry-run");

  threads = [];
  rejectDispatch = true;
  await assert.rejects(openThread(spec, root, false, profile), { code: "T3_RPC_COMMAND_FAILED" });
  assert.equal(dispatched.bootstrap.createThread.title, "Task");
  assert.equal(dispatched.bootstrap.prepareWorktree.branch, "t3code/task-2");
  assert.equal(dispatched.bootstrap.runSetupScript, true);
  assert.equal(revoked, 5);

  // A match that appears during connection must return the same receipt as an early match.
  const existing = { id: "raced", projectId: project.id, title: spec.title,
    branch: "t3code/task", worktreePath: "/existing", archivedAt: null };
  threads = [existing];
  const early = await openThread(spec, root, false, profile);
  threads = [];
  raceThread = existing;
  dispatched = undefined;
  assert.deepEqual(await openThread(spec, root, false, profile), early);
  assert.equal(dispatched, undefined);
  raceThread = undefined;

  // Archived, other-project, and partial-title matches must not suppress standalone creation.
  threads = [{ ...existing, archivedAt: "yesterday" },
    { ...existing, projectId: "other" }, { ...existing, title: "Task with more text" }];
  rejectDispatch = false;
  worktreePath = path.join(root, "t3code-task-2");
  await mkdir(worktreePath);
  const created = await openThread(spec, root, false, profile);
  assert.equal(created.action, "created");
  assert.equal(created.thread.id, dispatched.threadId);
  assert.equal(created.thread.worktreePath, worktreePath);
  assert.equal(created.worktree.detached, false);
  assert.equal(created.thread.setup, "not-configured");
  assert.deepEqual(created.thread.modelSelection, profile.modelSelection);

  project.scripts = [{ id: "setup", name: "Setup", command: "setup", runOnWorktreeCreate: true }];
  threads = [];
  assert.equal((await openThread(spec, root, false, profile)).thread.setup, "started");
  threads = [];
  setupFailed = true;
  await assert.rejects(openThread(spec, root, false, profile), { code: "T3_SETUP_FAILED" });
  assert.equal(threads[0].id, dispatched.threadId, "failed setup retains the created thread");
  assert.equal(revoked, 10, "all sessions are revoked, including failure paths");
});
