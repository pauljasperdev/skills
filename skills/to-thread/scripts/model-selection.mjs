function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

export function validateModelSelection(selection) {
  if (typeof selection?.model !== "string" || !selection.model.trim()) {
    fail("MODEL_REQUIRED", "Supply a model; the invoking agent must ask the user when none is supplied.");
  }
  if (selection.instanceId !== undefined &&
      (typeof selection.instanceId !== "string" || !selection.instanceId.trim())) {
    fail("PROVIDER_INVALID", "The provider instance ID must be a non-empty string when supplied.");
  }
  const options = selection.options ?? [];
  if (!Array.isArray(options) || options.some((option) =>
    typeof option?.id !== "string" || !option.id.trim() ||
    typeof option?.value !== "string" || !option.value.trim())) {
    fail("OPTIONS_INVALID", "Model options must contain non-empty id and value strings.");
  }
  if (new Set(options.map(({ id }) => id)).size !== options.length) {
    fail("OPTIONS_INVALID", "Each model option must have one value.");
  }
  return { ...selection, model: selection.model.trim(), options };
}

export function resolveModelSelection(config, requested) {
  const selection = validateModelSelection(requested);
  let provider;
  if (selection.instanceId !== undefined) {
    provider = config?.providers?.find((candidate) => candidate.instanceId === selection.instanceId);
  } else {
    const matches = (config?.providers ?? []).filter((candidate) =>
      candidate.models?.some((model) => model.slug === selection.model));
    if (matches.length === 0) fail("T3_MODEL_UNAVAILABLE", "T3 does not expose " + selection.model + ".");
    if (matches.length > 1) {
      fail("PROVIDER_REQUIRED", "Multiple providers expose " + selection.model + "; ask the user which provider to use.");
    }
    [provider] = matches;
  }
  if (provider?.status !== "ready") {
    fail("T3_PROVIDER_UNAVAILABLE", (selection.instanceId ?? provider?.instanceId) + " is not ready in T3.");
  }
  const model = provider.models?.find((candidate) => candidate.slug === selection.model);
  if (!model) fail("T3_MODEL_UNAVAILABLE", "T3 does not expose " + selection.model + " on " + provider.instanceId + ".");
  for (const { id, value } of selection.options) {
    const descriptor = model.capabilities?.optionDescriptors?.find((candidate) => candidate.id === id);
    if (!descriptor?.options?.some((option) => option.id === value)) {
      fail("T3_OPTIONS_UNAVAILABLE", selection.model + " does not expose " + id + ": " + value + ".");
    }
  }
  return { ...selection, instanceId: provider.instanceId };
}

export function modelMatches(actual, expected) {
  const options = new Map((actual?.options ?? []).map(({ id, value }) => [id, value]));
  return actual?.instanceId === expected.instanceId &&
    actual?.model === expected.model &&
    expected.options.every(({ id, value }) => options.get(id) === value);
}
