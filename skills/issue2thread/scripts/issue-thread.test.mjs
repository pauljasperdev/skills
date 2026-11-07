import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareIssueSpec } from "./t3-worktree.mjs";
import { makeLaunchRequest } from "../../to-thread/scripts/t3-worktree.mjs";
import { resolveProfile } from "./profiles.mjs";

for (const name of ["claude", "codex"]) {
  test(name + " preserves issue naming and examination when using the generic bootstrap", () => {
    const profile = resolveProfile(name);
    const spec = prepareIssueSpec({ cwd: "/repo", repo: "konzeptlab/signal", issue: "12",
      title: "Sample", baseBranch: "pre", allowDuplicate: true }, profile);
    assert.equal(spec.title, "#12 — Sample");
    assert.equal(spec.branchLabel, "12-Sample");
    assert.equal(spec.dedupeKey, "#12 — ");
    assert.equal(spec.baseBranch, "pre");
    assert.equal(spec.allowDuplicate, true);
    const { launch } = makeLaunchRequest({ ...spec, modelSelection: profile.modelSelection,
      project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "pre",
      worktreeBranch: "t3code/12-sample" });
    assert.equal(launch.title, "#12 — Sample");
    assert.equal(spec.prompt, (name === "codex" ? "$" : "/") + "examine-issue 12");
    assert.ok(launch.message.endsWith("\n\n" + spec.prompt));
    assert.ok(launch.message.includes("Wait for setup to finish successfully"));
  });
}

test("issue input validation stays in the wrapper", () => {
  const profile = resolveProfile("codex");
  const spec = { issue: 12, repo: "konzeptlab/signal", title: "Sample" };
  for (const [field, value, code] of [["issue", "twelve", "ISSUE_INVALID"], ["issue", 0, "ISSUE_INVALID"],
    ["repo", "signal", "REPO_INVALID"], ["title", "", "TITLE_INVALID"]]) {
    assert.throws(() => prepareIssueSpec({ ...spec, [field]: value }, profile), { code });
  }
});
