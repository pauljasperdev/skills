// Target profiles owned by the Linear dispatch wrappers.
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

