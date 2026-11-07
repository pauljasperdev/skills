import assert from "node:assert/strict";
import { test } from "node:test";
import childProcess from "node:child_process";
import { promisify } from "node:util";
import { syncBuiltinESMExports } from "node:module";
import { mkdtemp, mkdir, writeFile, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("standalone and issue preparation use the shared runtime path and never dispatch", async (t) => {
  const root = await realpath(await mkdtemp(path.join(tmpdir(), "to-thread-test-")));
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
  let revoked = 0;
  const rpcTags = [];
  childProcess.execFile = () => assert.fail("Expected a promisified subprocess");
  childProcess.execFile[promisify.custom] = async (file, args) => {
    let stdout;
    if (file === "npx") {
      if (args.includes("revoke")) { revoked++; stdout = "{}"; }
      else stdout = JSON.stringify({ sessionId: "test-session", token: "test-token" });
    } else if (file === "git" && args.includes("symbolic-ref")) stdout = "main";
    else if (file === "git" && args.includes("for-each-ref")) stdout = "t3code/task";
    else throw new Error(`Unexpected subprocess: ${file} ${args.join(" ")}`);
    return { stdout, stderr: "" };
  };
  syncBuiltinESMExports();
  globalThis.fetch = async (url) => {
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
      const { id, tag } = JSON.parse(raw);
      rpcTags.push(tag);
      let value;
      if (tag === "server.probe") value = {};
      else if (tag === "server.getConfig") value = { providers: [{
        instanceId: "codex", status: "ready", models: [{ slug: "gpt-6-astra",
          capabilities: { optionDescriptors: [{ id: "reasoningEffort", options: [{ id: "high" }] }] } }],
      }, { instanceId: "custom-provider", status: "ready", models: [{ slug: "custom-model" }] }] };
      else assert.fail(`Unexpected RPC: ${tag}`);
      queueMicrotask(() => this.dispatchEvent(new MessageEvent("message", {
        data: JSON.stringify({ _tag: "Exit", requestId: id, exit: { _tag: "Success", value } }),
      })));
    }
  };
  const { prepareThread, prepareWorktreeThread } = await import("../../to-thread/scripts/t3-worktree.mjs");
  const { resolveProfile } = await import("./profiles.mjs");
  const { prepareIssueSpec } = await import("./t3-worktree.mjs");
  const profile = resolveProfile("codex");
  const selection = { instanceId: "custom-provider", model: "custom-model", options: [] };
  const spec = { cwd: root, title: "Task", prompt: "Inspect the code." };

  const generic = await prepareWorktreeThread(spec, root, selection);
  assert.equal(generic.action, "launch");
  assert.equal(generic.tool, "t3_thread_launch");
  assert.equal(generic.launch.projectId, project.id);
  assert.equal(generic.launch.title, "Task");
  assert.match(generic.launch.clientRequestId, /^[0-9a-f-]{36}$/);
  assert.deepEqual(generic.launch.modelSelection, selection);
  assert.deepEqual(generic.launch.workspaceStrategy,
    { type: "worktree", baseRef: "main", branch: "t3code/task-2" });
  assert.ok(generic.launch.message.endsWith(spec.prompt));
  assert.ok(generic.launch.message.includes("Wait for setup to finish successfully"));
  assert.equal("runtimeMode" in generic.launch, false, "modes are inherited from the caller");
  assert.deepEqual(generic.expected, { title: "Task", branch: "t3code/task-2", worktreeName: "t3code-task-2",
    modelSelection: selection, setup: "not-configured" });
  assert.equal(generic.worktree.name, "t3code-task-2");
  assert.equal(revoked, 1);

  const tracked = prepareIssueSpec({ cwd: root, issue: 12, title: "Sample", repo: "konzeptlab/signal" }, profile);
  const issue = await prepareWorktreeThread(tracked, root, profile.modelSelection);
  assert.equal(issue.launch.workspaceStrategy.branch, "t3code/12-sample");
  assert.equal(issue.launch.title, "#12 — Sample");
  assert.ok(issue.launch.message.includes("$examine-issue"));
  threads = [{ id: "other", projectId: project.id, title: "#123 — Other issue" }];
  assert.equal((await prepareWorktreeThread(tracked, root, profile.modelSelection)).action, "launch");
  threads = [{ id: "existing", projectId: project.id, title: "#12 — Old title" }];
  assert.equal((await prepareWorktreeThread(tracked, root, profile.modelSelection)).action, "existing");
  assert.equal((await prepareWorktreeThread({ ...tracked, allowDuplicate: true }, root, profile.modelSelection)).action, "launch");

  // Archived, other-project, and partial-title matches must not suppress standalone preparation.
  const existing = { id: "match", projectId: project.id, title: spec.title,
    branch: "t3code/task", worktreePath: "/existing", archivedAt: null };
  threads = [existing];
  assert.equal((await prepareWorktreeThread(spec, root, selection)).action, "existing");
  threads = [{ ...existing, archivedAt: "yesterday" },
    { ...existing, projectId: "other" }, { ...existing, title: "Task with more text" }];
  assert.equal((await prepareWorktreeThread(spec, root, selection)).action, "launch");

  project.scripts = [{ id: "setup", name: "Setup", command: "setup", runOnWorktreeCreate: true }];
  threads = [];
  assert.equal((await prepareWorktreeThread(spec, root, selection)).expected.setup, "started");

  // The current checkout is the project root, so the launcher binds the root without setup.
  const review = await prepareThread({ ...spec, title: "Task · review" }, root, { model: "custom-model" });
  assert.equal(review.action, "launch");
  assert.deepEqual(review.launch.workspaceStrategy, { type: "root" });
  assert.equal(review.launch.message, spec.prompt);
  assert.deepEqual(review.launch.modelSelection, selection);
  assert.deepEqual(review.expected, { title: "Task · review", branch: "main", worktreePath: root,
    modelSelection: selection, setup: "not-run" });
  assert.equal(revoked, 9, "every temporary session is revoked");
  assert.ok(rpcTags.every((tag) => ["server.probe", "server.getConfig"].includes(tag)),
    "the adapter only reads T3 state");
});
