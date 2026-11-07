#!/usr/bin/env node

import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolveProfile } from "./profiles.mjs";
import { runCli } from "../../to-thread/scripts/t3-worktree.mjs";
import { prepareWorktreeThread } from "../../to-worktree-thread/scripts/t3-worktree.mjs";

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function validateIssue(issue) {
  if (!/^[1-9]\d*$/.test(String(issue))) {
    fail("ISSUE_INVALID", "issue must be a GitHub issue number such as 12.");
  }
  return Number(issue);
}

function validateRepo(repo) {
  if (typeof repo !== "string" || !/^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/.test(repo)) {
    fail("REPO_INVALID", "repo must be a GitHub repository such as konzeptlab/signal.");
  }
  return repo;
}

function validateTitle(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    fail("TITLE_INVALID", "title must be a non-empty issue title.");
  }
  if (title.includes("\n") || title.includes("\r")) {
    fail("TITLE_INVALID", "title must be a single line.");
  }
  return title.trim();
}

function issuePrompt(issue, profile) {
  return `${profile.name === "codex" ? "$" : "/"}examine-issue ${issue}`;
}

export function prepareIssueSpec(spec, profile) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    fail("INPUT_INVALID", "prepare --json expects one JSON object on stdin.");
  }
  const issue = validateIssue(spec.issue);
  const repo = validateRepo(spec.repo);
  const title = validateTitle(spec.title);
  return {
    cwd: spec.cwd,
    baseBranch: spec.baseBranch,
    allowDuplicate: spec.allowDuplicate,
    title: `#${issue} — ${title}`,
    branchLabel: `${issue}-${title}`,
    dedupeKey: `#${issue} — `,
    prompt: issuePrompt(issue, profile),
  };
}

const entryPath = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  const argv = process.argv.slice(2);
  const example = '{"cwd":"/repo","repo":"konzeptlab/signal","issue":12,"title":"Issue title"}';
  try {
    if (argv[0] === "help" || argv[0] === "--help" || argv.length === 0) {
      process.stdout.write(`Usage:\n  node t3-worktree.mjs doctor --profile claude|codex [--cwd PATH] [--model MODEL] [--provider INSTANCE_ID] [--option ID=VALUE]\n  node t3-worktree.mjs prepare --profile claude|codex [--model MODEL] [--provider INSTANCE_ID] [--option ID=VALUE] --json\n\nProfile defaults apply to omitted model/provider flags. Any explicit selection replaces the default options; --option is repeatable.\nprepare JSON: ${example}\nprepare prints t3_thread_launch arguments; it never creates a thread.\n`);
    } else {
      const profileIndex = argv.indexOf("--profile");
      const profile = resolveProfile(profileIndex === -1 ? undefined : argv[profileIndex + 1]);
      argv.splice(profileIndex, 2);
      const hasSelection = argv.some((argument) => ["--provider", "--model", "--option"].includes(argument));
      const { modelSelection } = profile;
      const defaults = [];
      if (!argv.includes("--provider")) defaults.push("--provider", modelSelection.instanceId);
      if (!argv.includes("--model")) defaults.push("--model", modelSelection.model);
      if (!hasSelection) {
        for (const { id, value } of modelSelection.options) defaults.push("--option", `${id}=${value}`);
      }
      await runCli(async (spec, t3Home, selection) => {
        const result = await prepareWorktreeThread(prepareIssueSpec(spec, profile), t3Home, selection);
        return { ...result, issue: spec.issue, repo: spec.repo };
      }, example, [argv[0], ...defaults, ...argv.slice(1)]);
    }
  } catch (error) {
    process.stderr.write(JSON.stringify({ ok: false, error: { code: error.code, message: error.message } }) + "\n");
    process.exitCode = 1;
  }
}
