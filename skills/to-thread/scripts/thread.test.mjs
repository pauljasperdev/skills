import assert from "node:assert/strict";
import { test } from "node:test";
import { makeBootstrapCommand, openThread } from "./t3-worktree.mjs";

test("a standalone task needs no Linear context and retains its full prompt", () => {
  const spec = { title: "Investigate CSV export", prompt: "Investigate CSV export.\nOnly examine the code." };
  const prepared = makeBootstrapCommand({ ...spec, modelSelection: { instanceId: "custom-provider", model: "custom-model", options: [] },
    project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "main",
    worktreeBranch: "t3code/investigate-csv-export", startFromOrigin: false });
  assert.equal(prepared.threadTitle, spec.title);
  assert.ok(prepared.prompt.endsWith(spec.prompt));
  assert.ok(prepared.prompt.includes("Wait for setup to finish successfully"));
  assert.equal(prepared.command.bootstrap.runSetupScript, true);
  assert.equal(prepared.command.bootstrap.prepareWorktree.startFromOrigin, undefined);
  assert.equal(prepared.prompt.includes("Linear"), false);
  assert.equal(prepared.prompt.includes("examine-issue"), false);
});

test("generic input rejects missing tasks, malformed titles, and empty optional labels", async () => {
  const spec = { title: "Task", prompt: "Do the task" };
  for (const input of [null, [], "text"]) {
    await assert.rejects(openThread(input), { code: "INPUT_INVALID" });
  }
  for (const [field, value, code] of [["title", "", "TITLE_INVALID"],
    ["title", "two\nlines", "TITLE_INVALID"], ["prompt", " ", "PROMPT_INVALID"],
    ["prompt", undefined, "PROMPT_INVALID"], ["branchLabel", "", "BRANCH_LABEL_INVALID"],
    ["dedupeKey", "", "DEDUPE_KEY_INVALID"], ["reuseWorktree", "true", "REUSE_WORKTREE_INVALID"]]) {
    await assert.rejects(openThread({ ...spec, [field]: value }), { code });
  }
});

test("missing model requires the invoking agent to ask before accessing T3", async () => {
  const spec = { cwd: "/does-not-exist", title: "Task", prompt: "Do the task" };
  await assert.rejects(openThread(spec), { code: "MODEL_REQUIRED" });
  await assert.rejects(openThread(spec, undefined, false, { instanceId: "custom-provider" }), { code: "MODEL_REQUIRED" });
});

test("reusing a worktree preserves its branch, prompt, and skips setup", () => {
  const modelSelection = { instanceId: "custom-provider", model: "custom-model", options: [] };
  const prepared = makeBootstrapCommand({ modelSelection,
    project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "feature",
    worktreeBranch: "feature", worktreePath: "/worktrees/current", startFromOrigin: false,
    title: "Task · review", prompt: "Use the review skill. Original problem: fix export." });
  assert.deepEqual(prepared.command.modelSelection, modelSelection);
  assert.deepEqual(prepared.command.bootstrap.createThread.modelSelection, modelSelection);
  assert.equal(prepared.command.bootstrap.createThread.branch, "feature");
  assert.equal(prepared.command.bootstrap.createThread.worktreePath, "/worktrees/current");
  assert.equal(prepared.command.bootstrap.prepareWorktree, undefined);
  assert.equal(prepared.command.bootstrap.runSetupScript, false);
  assert.equal(prepared.command.message.text, prepared.prompt);
  assert.equal(prepared.prompt, "Use the review skill. Original problem: fix export.");
});
