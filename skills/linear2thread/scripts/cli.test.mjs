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
    ["to-thread", ["t3-worktree.mjs", "profiles.mjs"], "../../to-thread/scripts/",
      { title: "Task", prompt: "Inspect the code." }],
    ["linear2thread", ["t3-worktree.mjs"], "./",
      { title: "Task", issue: "SID-12", workspace: "sideberry" }],
  ]) {
    const directory = path.join(root, skill, "scripts");
    await mkdir(directory, { recursive: true });
    for (const file of files) await copyFile(new URL(source + file, import.meta.url), path.join(directory, file));
    const script = path.join(directory, "t3-worktree.mjs");
    assert.match(execFileSync(process.execPath, [script, "--help"], { encoding: "utf8" }), /open JSON:/);
    const run = (input) => spawnSync(process.execPath,
      [script, "open", "--profile", "codex", "--json", "--t3-home", root],
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
