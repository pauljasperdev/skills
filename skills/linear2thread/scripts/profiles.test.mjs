import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveProfile, validateExamineProvider, modelMatches } from "./profiles.mjs";
import { makeBootstrapCommand } from "./t3-worktree.mjs";

const configFor = (selection) => ({
  providers: [{
    instanceId: selection.instanceId, driver: selection.instanceId, status: "ready",
    models: [{
      slug: selection.model,
      capabilities: { optionDescriptors: selection.options.map(({ id, value }) => ({
        id, options: [{ id: value }],
      })) },
    }],
  }],
});

test("profile must be explicit and known", () => {
  for (const name of [undefined, "", "other", "__proto__"]) {
    assert.throws(() => resolveProfile(name), { code: "PROFILE_INVALID" });
  }
});

for (const [name, instanceId, model, optionId] of [
  ["claude", "claudeAgent", "claude-fable-5-1", "effort"],
  ["codex", "codex", "gpt-6-astra", "reasoningEffort"],
]) {
  test(name + " requires its own provider, model, and high option", () => {
    const profile = resolveProfile(name);
    const expected = { instanceId, model, options: [{ id: optionId, value: "high" }] };
    assert.deepEqual(profile.modelSelection, expected);
    const config = configFor(expected);
    assert.equal(validateExamineProvider(config, profile).model, model);
    assert.throws(() => validateExamineProvider({ providers: [] }, profile),
      { code: "T3_EXAMINE_PROVIDER_UNAVAILABLE" });
    config.providers[0].models[0].capabilities.optionDescriptors[0].options = [{ id: "medium" }];
    assert.throws(() => validateExamineProvider(config, profile),
      { code: "T3_EXAMINE_OPTIONS_UNAVAILABLE" });
    config.providers[0].models[0].slug = "other";
    assert.throws(() => validateExamineProvider(config, profile),
      { code: "T3_EXAMINE_MODEL_UNAVAILABLE" });
    assert.equal(modelMatches(expected, profile.modelSelection), true);
    assert.equal(modelMatches({ ...expected, options: [] }, profile.modelSelection), false);
    assert.equal(modelMatches(resolveProfile(name === "codex" ? "claude" : "codex").modelSelection,
      profile.modelSelection), false);
  });

  test(name + " bootstraps a T3 worktree and first turn with one model selection", () => {
    const profile = resolveProfile(name);
    const prepared = makeBootstrapCommand({
      profile, project: { id: "project-1", workspaceRoot: "/repo" },
      baseBranch: "pre", worktreeBranch: "t3code/sid-12-sample",
      startFromOrigin: true, workspace: "sideberry", issue: "SID-12", title: "Sample",
    });
    const command = prepared.command;
    assert.equal(command.type, "thread.turn.start");
    assert.equal(command.threadId, prepared.threadId);
    assert.deepEqual(command.modelSelection, profile.modelSelection);
    assert.deepEqual(command.bootstrap.createThread.modelSelection, command.modelSelection);
    assert.deepEqual(prepared.modelSelection, command.modelSelection);
    assert.equal(command.bootstrap.createThread.worktreePath, null);
    assert.equal(command.bootstrap.createThread.projectId, "project-1");
    assert.equal(command.bootstrap.createThread.title, "SID-12 — Sample");
    assert.deepEqual(command.bootstrap.prepareWorktree, {
      projectCwd: "/repo", baseBranch: "pre", branch: "t3code/sid-12-sample", startFromOrigin: true,
    });
    assert.equal(command.bootstrap.runSetupScript, true);
    assert.equal(prepared.expectedWorktreeName, "t3code-sid-12-sample");
    assert.ok(command.message.text.includes(name === "codex" ? "$examine-issue" : "/examine-issue"));
    assert.ok(command.message.text.includes("--workspace sideberry"));
    assert.ok(command.message.text.includes("Wait for setup to finish successfully"));
  });
}
