import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveProfile } from "./profiles.mjs";
import { resolveModelSelection, modelMatches } from "../../to-thread/scripts/model-selection.mjs";
import { makeLaunchRequest } from "../../to-thread/scripts/t3-worktree.mjs";

const configFor = (selection) => ({
  providers: [{
    instanceId: selection.instanceId, driver: selection.instanceId, status: "ready",
    models: [{
      slug: selection.model,
      capabilities: { optionDescriptors: selection.options.map(({ id, value }) =>
        typeof value === "boolean" ? { id, type: "boolean" } : { id, options: [{ id: value }] }) },
    }],
  }],
});

test("profile must be explicit and known", () => {
  for (const name of [undefined, "", "other", "__proto__"]) {
    assert.throws(() => resolveProfile(name), { code: "PROFILE_INVALID" });
  }
});

for (const [name, instanceId, model, options] of [
  ["claude", "claudeAgent", "claude-opus-5-5", [{ id: "effort", value: "high" }, { id: "fastMode", value: true }]],
  ["codex", "codex", "gpt-6-astra", [{ id: "reasoningEffort", value: "high" }]],
]) {
  test(name + " requires its own provider, model, and default options", () => {
    const profile = resolveProfile(name);
    const expected = { instanceId, model, options };
    assert.deepEqual(profile.modelSelection, expected);
    const config = configFor(expected);
    assert.equal(resolveModelSelection(config, profile.modelSelection).model, model);
    assert.throws(() => resolveModelSelection({ providers: [] }, profile.modelSelection),
      { code: "T3_PROVIDER_UNAVAILABLE" });
    config.providers[0].models[0].capabilities.optionDescriptors[0].options = [{ id: "medium" }];
    assert.throws(() => resolveModelSelection(config, profile.modelSelection),
      { code: "T3_OPTIONS_UNAVAILABLE" });
    config.providers[0].models[0].slug = "other";
    assert.throws(() => resolveModelSelection(config, profile.modelSelection),
      { code: "T3_MODEL_UNAVAILABLE" });
    assert.equal(modelMatches(expected, profile.modelSelection), true);
    assert.equal(modelMatches({ ...expected, options: [] }, profile.modelSelection), false);
    assert.equal(modelMatches(resolveProfile(name === "codex" ? "claude" : "codex").modelSelection,
      profile.modelSelection), false);
  });

  test(name + " prepares a T3 worktree launch and first turn with one model selection", () => {
    const profile = resolveProfile(name);
    const { launch, expected } = makeLaunchRequest({
      modelSelection: profile.modelSelection, project: { id: "project-1", workspaceRoot: "/repo" },
      baseBranch: "pre", worktreeBranch: "t3code/12-sample",
      title: "#12 — Sample", prompt: "Examine this task.",
    });
    assert.deepEqual(launch.modelSelection, profile.modelSelection);
    assert.deepEqual(expected.modelSelection, launch.modelSelection);
    assert.equal(launch.projectId, "project-1");
    assert.equal(launch.title, "#12 — Sample");
    assert.deepEqual(launch.workspaceStrategy, {
      type: "worktree", baseRef: "pre", branch: "t3code/12-sample",
    });
    assert.equal(expected.worktreeName, "t3code-12-sample");
    assert.ok(launch.message.endsWith("Examine this task."));
    assert.ok(launch.message.includes("Wait for setup to finish successfully"));
  });
}
