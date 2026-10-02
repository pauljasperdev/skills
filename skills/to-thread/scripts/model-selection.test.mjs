import assert from "node:assert/strict";
import { test } from "node:test";
import { validateModelSelection, resolveModelSelection, modelMatches } from "./model-selection.mjs";

const provider = (instanceId, status = "ready") => ({ instanceId, status,
  models: [{ slug: "example-model", capabilities: { optionDescriptors: [
    { id: "effort", options: [{ id: "medium" }] },
  ] } }],
});

test("arbitrary selections preserve supplied options without adding defaults", () => {
  const config = { providers: [provider("my-provider")] };
  const selected = resolveModelSelection(config, { model: "example-model" });
  assert.deepEqual(selected, { model: "example-model", instanceId: "my-provider", options: [] });
  const requested = { instanceId: "my-provider", model: "example-model", options: [{ id: "effort", value: "medium" }] };
  assert.deepEqual(resolveModelSelection(config, requested), requested);
  assert.equal(modelMatches(requested, requested), true);
  assert.equal(modelMatches(selected, requested), false);
  assert.equal(modelMatches({ ...requested, instanceId: "other-provider" }, requested), false);
});

test("missing model and ambiguous provider require user input", () => {
  for (const selection of [undefined, {}, { instanceId: "my-provider" }, { model: " " }]) {
    assert.throws(() => validateModelSelection(selection), { code: "MODEL_REQUIRED" });
  }
  const config = { providers: [provider("first"), provider("second")] };
  assert.throws(() => resolveModelSelection(config, { model: "example-model" }), { code: "PROVIDER_REQUIRED" });
  assert.equal(resolveModelSelection(config, { model: "example-model", instanceId: "second" }).instanceId, "second");
});

test("unavailable selections fail without substitution", () => {
  const config = { providers: [provider("my-provider")] };
  assert.throws(() => resolveModelSelection(config, { model: "missing-model" }), { code: "T3_MODEL_UNAVAILABLE" });
  assert.throws(() => resolveModelSelection(config, { model: "missing-model", instanceId: "my-provider" }), { code: "T3_MODEL_UNAVAILABLE" });
  assert.throws(() => resolveModelSelection(config, { model: "example-model", instanceId: "missing-provider" }), { code: "T3_PROVIDER_UNAVAILABLE" });
  assert.throws(() => resolveModelSelection({ providers: [provider("my-provider", "unavailable")] },
    { model: "example-model" }), { code: "T3_PROVIDER_UNAVAILABLE" });
  assert.throws(() => resolveModelSelection(config, { model: "example-model", options: [{ id: "effort", value: "high" }] }), { code: "T3_OPTIONS_UNAVAILABLE" });
  assert.throws(() => validateModelSelection({ model: "example-model", options: [null] }), { code: "OPTIONS_INVALID" });
});

test("malformed and conflicting selections fail before dispatch", () => {
  for (const instanceId of ["", " ", null, 0, []]) {
    assert.throws(() => validateModelSelection({ model: "example-model", instanceId }), { code: "PROVIDER_INVALID" });
  }
  for (const options of [{}, [null], [{ id: "", value: "high" }], [{ id: "effort", value: "" }],
    [{ id: "effort", value: "medium" }, { id: "effort", value: "high" }]]) {
    assert.throws(() => validateModelSelection({ model: "example-model", options }), { code: "OPTIONS_INVALID" });
  }
});
