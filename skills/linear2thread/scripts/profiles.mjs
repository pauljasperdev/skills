// The two entry skills select a profile; all creation mechanics are shared.
const profiles = Object.freeze({
  claude: Object.freeze({
    name: "claude",
    modelSelection: Object.freeze({
      instanceId: "claudeAgent",
      model: "claude-fable-5-1",
      options: Object.freeze([Object.freeze({ id: "effort", value: "high" })]),
    }),
  }),
  codex: Object.freeze({
    name: "codex",
    modelSelection: Object.freeze({
      instanceId: "codex",
      model: "gpt-6-astra",
      options: Object.freeze([Object.freeze({ id: "reasoningEffort", value: "high" })]),
    }),
  }),
});

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function resolveProfile(name) {
  if (!Object.hasOwn(profiles, name)) {
    fail("PROFILE_INVALID", "Pass --profile claude or --profile codex explicitly.");
  }
  return profiles[name];
}

export function modelMatches(actual, expected) {
  const options = new Map((actual?.options ?? []).map(({ id, value }) => [id, value]));
  return actual?.instanceId === expected.instanceId &&
    actual?.model === expected.model &&
    expected.options.every(({ id, value }) => options.get(id) === value);
}

export function validateExamineProvider(config, profile) {
  const selection = profile.modelSelection;
  const provider = config?.providers?.find((p) => p.instanceId === selection.instanceId);
  if (provider?.status !== "ready") {
    fail("T3_EXAMINE_PROVIDER_UNAVAILABLE", selection.instanceId + " is not ready in T3.");
  }
  const model = provider.models?.find((m) => m.slug === selection.model);
  if (!model) {
    fail("T3_EXAMINE_MODEL_UNAVAILABLE", "T3 does not expose " + selection.model + ".");
  }
  for (const { id, value } of selection.options) {
    const descriptor = model.capabilities?.optionDescriptors?.find((d) => d.id === id);
    if (!descriptor?.options?.some((o) => o.id === value)) {
      fail("T3_EXAMINE_OPTIONS_UNAVAILABLE", selection.model + " does not expose " + id + ": " + value + ".");
    }
  }
  return { instanceId: provider.instanceId, driver: provider.driver, status: provider.status,
    model: model.slug, options: selection.options };
}
