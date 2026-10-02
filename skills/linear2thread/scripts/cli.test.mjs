import assert from "node:assert/strict";
import { test } from "node:test";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

test("standalone and sibling-installed CLIs preserve their input and error contracts", async (t) => {
  const root = await mkdtemp(path.join(tmpdir(), "thread-cli-test-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const [skill, files, source, spec] of [
    ["to-thread", ["t3-worktree.mjs", "model-selection.mjs"], "../../to-thread/scripts/",
      { title: "Task", prompt: "Inspect the code." }],
    ["to-worktree-thread", ["t3-worktree.mjs"], "../../to-worktree-thread/scripts/",
      { title: "Task", prompt: "Inspect the code." }],
    ["linear2thread", ["t3-worktree.mjs", "profiles.mjs"], "./",
      { title: "Task", issue: "SID-12", workspace: "sideberry" }],
  ]) {
    const directory = path.join(root, skill, "scripts");
    await mkdir(directory, { recursive: true });
    for (const file of files) await copyFile(new URL(source + file, import.meta.url), path.join(directory, file));
    const script = path.join(directory, "t3-worktree.mjs");
    assert.match(execFileSync(process.execPath, [script, "--help"], { encoding: "utf8" }), /open JSON:/);
    const run = (input) => spawnSync(process.execPath,
      [script, "open", ...(skill !== "linear2thread" ? ["--model", "example-model"] : ["--profile", "codex"]), "--json", "--t3-home", root],
      { input, encoding: "utf8" });
    for (const [input, code] of [
      ["{", "INPUT_INVALID"],
      [JSON.stringify({ cwd: root, ...spec }), "T3_SERVER_UNAVAILABLE"],
      [JSON.stringify({ cwd: root, ...spec, title: "" }), "TITLE_INVALID"],
    ]) {
      const result = run(input);
      assert.equal(result.status, 1);
      assert.equal(result.stdout, "");
      assert.equal(JSON.parse(result.stderr).error.code, code);
    }
  }
});

for (const skill of ["to-thread", "to-worktree-thread"]) {
  test(skill + " CLI asks for a model and accepts arbitrary explicit selections", () => {
    const script = new URL(`../../${skill}/scripts/t3-worktree.mjs`, import.meta.url).pathname;
    const input = JSON.stringify({ cwd: "/does-not-exist", title: "Task", prompt: "Inspect it." });
    for (const flags of [[], ["--provider", "my-provider"]]) {
      const result = spawnSync(process.execPath, [script, "open", "--json", ...flags], { input, encoding: "utf8" });
      assert.equal(JSON.parse(result.stderr).error.code, "MODEL_REQUIRED");
    }
    for (const [flags, selection] of [
      [["--model", "my-model", "--provider", "my-provider", "--option", "effort=medium"], undefined],
      [[], { instanceId: "my-provider", model: "my-model", options: [] }],
    ]) {
      const result = spawnSync(process.execPath, [script, "open", "--json", ...flags],
        { input: JSON.stringify({ cwd: "/does-not-exist", title: "Task", prompt: "Inspect it.", modelSelection: selection }), encoding: "utf8" });
      assert.equal(JSON.parse(result.stderr).error.code, "WORKSPACE_NOT_FOUND");
    }
  });
}

test("Linear doctor and open enforce the same profile selection", () => {
  const script = new URL("./t3-worktree.mjs", import.meta.url).pathname;
  const input = JSON.stringify({ cwd: "/does-not-exist", workspace: "sideberry", issue: "SID-12", title: "Task" });
  for (const command of ["doctor", "open"]) {
    const taskFlags = command === "doctor" ? ["--cwd", "/does-not-exist"] : ["--json"];
    for (const [selectionFlags, expected] of [
      [[], "PROFILE_INVALID"],
      [["--profile", "codex"], "WORKSPACE_NOT_FOUND"],
      [["--profile", "codex", "--model", "override"], "ARGUMENT_INVALID"],
      [["--profile", "codex", "--provider", "override"], "ARGUMENT_INVALID"],
      [["--profile", "codex", "--option", "reasoningEffort=low"], "ARGUMENT_INVALID"],
    ]) {
      const result = spawnSync(process.execPath, [script, command, ...selectionFlags, ...taskFlags], { input, encoding: "utf8" });
      assert.equal(result.status, 1);
      assert.equal(JSON.parse(result.stderr).error.code, expected, `${command} ${selectionFlags.join(" ")}`);
    }
  }
});
