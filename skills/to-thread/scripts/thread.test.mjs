import assert from "node:assert/strict";
import { test } from "node:test";
import { makeLaunchRequest, prepareThread, prepareWorktreeThread } from "./t3-worktree.mjs";

test("a standalone task needs no issue context and retains its full prompt", () => {
  const spec = { title: "Investigate CSV export", prompt: "Investigate CSV export.\nOnly examine the code." };
  const { launch, expected } = makeLaunchRequest({ ...spec, modelSelection: { instanceId: "custom-provider", model: "custom-model", options: [] },
    project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "main",
    worktreeBranch: "t3code/investigate-csv-export" });
  assert.equal(launch.title, spec.title);
  assert.ok(launch.message.endsWith(spec.prompt));
  assert.ok(launch.message.includes("Wait for setup to finish successfully"));
  assert.deepEqual(launch.workspaceStrategy,
    { type: "worktree", baseRef: "main", branch: "t3code/investigate-csv-export" });
  assert.equal(expected.worktreeName, "t3code-investigate-csv-export");
  assert.equal(launch.message.includes("examine-issue"), false);
});

test("generic input rejects missing tasks, malformed titles, and empty optional labels", async () => {
  const spec = { title: "Task", prompt: "Do the task" };
  for (const input of [null, [], "text"]) {
    await assert.rejects(prepareThread(input), { code: "INPUT_INVALID" });
  }
  for (const [field, value, code] of [["title", "", "TITLE_INVALID"],
    ["title", "two\nlines", "TITLE_INVALID"], ["prompt", " ", "PROMPT_INVALID"],
    ["prompt", undefined, "PROMPT_INVALID"], ["branchLabel", "", "BRANCH_LABEL_INVALID"],
    ["dedupeKey", "", "DEDUPE_KEY_INVALID"], ["reuseWorktree", "true", "INPUT_INVALID"]]) {
    await assert.rejects(prepareThread({ ...spec, [field]: value }), { code });
  }
});

test("missing model requires the invoking agent to ask before accessing T3", async () => {
  const spec = { cwd: "/does-not-exist", title: "Task", prompt: "Do the task" };
  await assert.rejects(prepareThread(spec), { code: "MODEL_REQUIRED" });
  await assert.rejects(prepareThread(spec, undefined, { instanceId: "custom-provider" }), { code: "MODEL_REQUIRED" });
});

test("reusing a worktree preserves its branch, prompt, and skips setup", () => {
  const modelSelection = { instanceId: "custom-provider", model: "custom-model", options: [] };
  const project = { id: "project-1", workspaceRoot: "/repo", scripts: [{ runOnWorktreeCreate: true }] };
  const { launch, expected } = makeLaunchRequest({ modelSelection, project, baseBranch: "feature",
    worktreeBranch: "feature", worktreePath: "/worktrees/current",
    title: "Task · review", prompt: "Use the review skill. Original problem: fix export." });
  assert.deepEqual(launch.workspaceStrategy, { type: "existing_worktree", worktreePath: "/worktrees/current" });
  assert.deepEqual(launch.modelSelection, modelSelection);
  assert.equal(launch.projectId, "project-1");
  assert.equal(launch.message, "Use the review skill. Original problem: fix export.");
  assert.deepEqual(expected, { title: "Task · review", branch: "feature", worktreePath: "/worktrees/current",
    modelSelection, setup: "not-run" });
  const root = makeLaunchRequest({ modelSelection, project, baseBranch: "main", worktreeBranch: "main",
    worktreePath: "/repo", title: "Task", prompt: "Review." });
  assert.deepEqual(root.launch.workspaceStrategy, { type: "root" });
});

test("the selected entry point owns worktree creation", async () => {
  const spec = { cwd: "/does-not-exist", title: "Task", prompt: "Do the task" };
  for (const prepare of [prepareThread, prepareWorktreeThread]) {
    await assert.rejects(prepare(spec), { code: "MODEL_REQUIRED" });
    for (const reuseWorktree of [true, false]) {
      await assert.rejects(prepare({ ...spec, reuseWorktree }), { code: "INPUT_INVALID" });
    }
  }
  for (const field of ["baseBranch", "branchLabel"]) {
    await assert.rejects(prepareThread({ ...spec, [field]: "feature" }), { code: "INPUT_INVALID" });
    await assert.rejects(prepareWorktreeThread({ ...spec, [field]: "feature" }), { code: "MODEL_REQUIRED" });
  }
});
