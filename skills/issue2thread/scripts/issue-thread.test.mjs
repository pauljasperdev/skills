import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareIssueSpec } from "./t3-worktree.mjs";
import { makeBootstrapCommand } from "../../to-thread/scripts/t3-worktree.mjs";
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
    const prepared = makeBootstrapCommand({ ...spec, modelSelection: profile.modelSelection,
      project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "pre",
      worktreeBranch: "t3code/12-sample", startFromOrigin: true });
    assert.equal(prepared.command.bootstrap.createThread.title, "#12 — Sample");
    assert.ok(prepared.prompt.includes(name === "codex" ? "$examine-issue" : "/examine-issue"));
    assert.ok(prepared.prompt.includes("-R konzeptlab/signal"));
    assert.ok(prepared.prompt.includes("Wait for setup to finish successfully"));
    assert.ok(prepared.prompt.includes("the dispatcher owns the issue's Status change"));
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
