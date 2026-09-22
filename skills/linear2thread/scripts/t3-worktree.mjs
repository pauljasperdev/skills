#!/usr/bin/env node

import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { openThread, runCli } from "../../to-thread/scripts/t3-worktree.mjs";

function fail(code, message) {
  throw Object.assign(new Error(message), { code });
}

function validateIssue(issue) {
  if (typeof issue !== "string" || !/^[A-Z][A-Z0-9]*-\d+$/.test(issue)) {
    fail("ISSUE_INVALID", "issue must be a Linear identifier such as GEM-61.");
  }
  return issue;
}

function validateWorkspace(workspace) {
  if (typeof workspace !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(workspace)) {
    fail("WORKSPACE_INVALID", "workspace must be a Linear workspace slug such as gemhog.");
  }
  return workspace;
}

function validateTitle(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    fail("TITLE_INVALID", "title must be a non-empty Linear issue title.");
  }
  if (title.includes("\n") || title.includes("\r")) {
    fail("TITLE_INVALID", "title must be a single line.");
  }
  return title.trim();
}

function issuePrompt(issue, workspace, profile) {
  const examine = profile.name === "codex" ? "$examine-issue" : "/examine-issue";
  return `Use ${examine} to examine ${issue} in Linear workspace ${workspace}. Resolve the repository's committed Linear config and pass --workspace ${workspace} to every Linear CLI read; refuse any mismatched workspace. Keep Linear and the repository read-only; the dispatcher owns the issue's workflow-state transition. Make the consequential technical design decisions: define interfaces and ownership, choose appropriate seams and data flow, and explain how every affected library or framework should be used according to its conventions, with particular attention to Effect and React when present. Leave the implementation agent latitude over incidental implementation details such as local control flow and naming. Do not produce a waterfall implementation plan or start implementation. Finish with a concise technical foundation. ${profile.name === "claude" ? "It can be handed to /handoff2codex." : "Wait for user authorization before implementation."}`;
}

export function prepareIssueSpec(spec, profile) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    fail("INPUT_INVALID", "open --json expects one JSON object on stdin.");
  }
  const issue = validateIssue(spec.issue);
  const workspace = validateWorkspace(spec.workspace);
  const title = validateTitle(spec.title);
  return {
    cwd: spec.cwd,
    baseBranch: spec.baseBranch,
    allowDuplicate: spec.allowDuplicate,
    title: `${issue} — ${title}`,
    branchLabel: `${issue}-${title}`,
    dedupeKey: issue,
    prompt: issuePrompt(issue, workspace, profile),
  };
}

async function openIssue(spec, t3Home, dryRun, profile) {
  const result = await openThread(prepareIssueSpec(spec, profile), t3Home, dryRun, profile);
  return { ...result, issue: spec.issue, workspace: spec.workspace };
}

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  await runCli(openIssue, '{"cwd":"/repo","workspace":"gemhog","issue":"GEM-61","title":"Issue title"}');
}
