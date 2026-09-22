import assert from "node:assert/strict";
import { test } from "node:test";
import { prepareIssueSpec } from "./t3-worktree.mjs";
import { makeBootstrapCommand } from "../../to-thread/scripts/t3-worktree.mjs";
import { resolveProfile } from "../../to-thread/scripts/profiles.mjs";

for (const name of ["claude", "codex"]) {
  test(name + " preserves Linear naming and examination when using the generic bootstrap", () => {
    const profile = resolveProfile(name);
    const spec = prepareIssueSpec({ cwd: "/repo", workspace: "sideberry", issue: "SID-12",
      title: "Sample", baseBranch: "pre", allowDuplicate: true }, profile);
    assert.equal(spec.title, "SID-12 — Sample");
    assert.equal(spec.branchLabel, "SID-12-Sample");
    assert.equal(spec.dedupeKey, "SID-12");
    assert.equal(spec.baseBranch, "pre");
    assert.equal(spec.allowDuplicate, true);
    const prepared = makeBootstrapCommand({ ...spec, profile,
      project: { id: "project-1", workspaceRoot: "/repo" }, baseBranch: "pre",
      worktreeBranch: "t3code/sid-12-sample", startFromOrigin: true });
    assert.equal(prepared.command.bootstrap.createThread.title, "SID-12 — Sample");
    assert.ok(prepared.prompt.includes(name === "codex" ? "$examine-issue" : "/examine-issue"));
    assert.ok(prepared.prompt.includes("--workspace sideberry"));
    assert.ok(prepared.prompt.includes("Wait for setup to finish successfully"));
    assert.ok(prepared.prompt.includes("Keep Linear and the repository read-only"));
  });
}

test("Linear input validation stays in the wrapper", () => {
  const profile = resolveProfile("codex");
  const spec = { issue: "SID-12", workspace: "sideberry", title: "Sample" };
  for (const [field, value, code] of [["issue", "oops", "ISSUE_INVALID"],
    ["workspace", "bad slug", "WORKSPACE_INVALID"], ["title", "", "TITLE_INVALID"]]) {
    assert.throws(() => prepareIssueSpec({ ...spec, [field]: value }, profile), { code });
  }
});
