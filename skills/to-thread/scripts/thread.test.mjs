import assert from "node:assert/strict";
import { test } from "node:test";
import { makeBootstrapCommand, openThread } from "./t3-worktree.mjs";
import { resolveProfile } from "./profiles.mjs";

test("a standalone task needs no Linear context and retains its full prompt", () => {
  const spec = { title: "Investigate CSV export", prompt: "Investigate CSV export.\nOnly examine the code." };
  const prepared = makeBootstrapCommand({ ...spec, profile: resolveProfile("codex"),
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
    ["dedupeKey", "", "DEDUPE_KEY_INVALID"]]) {
    await assert.rejects(openThread({ ...spec, [field]: value }), { code });
  }
});
