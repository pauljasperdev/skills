---
name: plan-implementer
description: Implement plans produced by /planner, /superplan, plan.md, PRDs, or issue breakdowns using Pi subagents. Use whenever the user asks to execute, implement, carry out, finish, or continue a plan. Splits the plan into dependency waves, uses fresh gpt-5.5-low workers with a mandatory self-refactor follow-up, gates each task with forked gpt-5.5-xhigh verification, runs fixup/re-review loops, then finishes with a whole-plan xhigh improvement review.
compatibility: Requires Pi with pi-subagents/subagent tool. Designed for helper agents plan-worker-low and plan-verify-xhigh, falling back to builtin worker/reviewer with model gpt-5.5 when needed.
---

# Plan Implementer

Use this as the parent orchestration workflow for implementing an already-written plan. The parent owns sequencing, task selection, review synthesis, and final acceptance. Children implement or verify only the task they are given.

## Orchestration-only guardrail

DO NOT IMPLEMENT IN THIS CONTEXT WINDOW. THIS CURRENT CONTEXT IS ONLY THE ORCHESTRATOR.

The assistant reading this text must treat the current conversation/context window as the supervisor/orchestrator, not as an implementation worker. Do not edit project/source files, write code, or complete plan tasks directly from this context window. All implementation and fixup work must happen in delegated `plan-worker-low` workers, or the configured worker fallback. This current context may read files, split the plan, launch subagents, synthesize reviews, inspect diffs, and run non-mutating validation commands. If subagents are unavailable or a task cannot be safely delegated, stop and ask the user instead of implementing locally.

## Preflight

1. Read the plan source first: `plan.md`, the `/planner` or `/superplan` output, an issue, PRD, or user-provided file path.
2. Load project instructions that apply to the repo before launching writers.
3. Run `subagent({ action: "list" })` before the first subagent launch.
4. Prefer these helper agents when available:
   - `plan-worker-low` — fresh gpt-5.5 low implementation worker.
   - `plan-verify-xhigh` — forked gpt-5.5 xhigh verification agent.
5. If helper agents are unavailable, use builtin `worker`/`reviewer` with `model: "gpt-5.5"` or `model: "openai-codex/gpt-5.5"`. If the run API cannot set thinking level, disclose the fallback rather than silently pretending low/xhigh was applied.

## Step 1: identify executable tasks

Start a read-only subagent to convert the plan into executable units and dependency waves.

Use `context-builder` or `planner`, fresh context, no edits. Ask it to return:

- task id and title
- objective and acceptance criteria
- files/areas likely touched
- validation commands or manual checks
- dependencies/blockers
- whether it can run in parallel, and with which other task ids
- risk level
- recommended worker prompt

Treat “parallel executable” as “safe to work independently.” Do not let multiple writer agents edit the same active worktree. If you actually run tasks in parallel, use isolated worktrees or another isolation strategy, then merge/apply accepted diffs deliberately.

## Step 2: execute task waves

Implement tasks wave by wave. Within a wave, parallelize only tasks whose expected touched files and dependencies do not conflict. If unsure, run them serially.

For each task:

### 2.1 Fresh worker

Launch a fresh `plan-worker-low` worker for the task.

Worker prompt must include:

- plan source/path and the specific task id
- relevant prior completed tasks and constraints
- exact scope/non-goals
- acceptance criteria
- validation expectations
- stop rule: ask/return if an unapproved product, architecture, schema, or scope decision is required
- final self-review instruction below

Include this exact self-review instruction in the worker prompt:

> Before returning, ask yourself: “now that the task is fully implemented are there any improvements or refactorings that should be done to the implementation?” Apply only small, safe, in-scope improvements/refactors that clearly reduce risk or improve maintainability. Do not broaden the task. If none, say none.

Require the worker handoff to report:

- changed files
- what was implemented
- validation run with exit codes, or why skipped
- self-review improvements made or explicitly “none”
- risks, follow-ups, and decisions needed

### 2.2 Forked verifier

After the worker returns, launch a forked `plan-verify-xhigh` verifier for that task.

Verifier prompt must include:

- task id and acceptance criteria
- worker handoff summary
- current diff/files to inspect directly
- validation expectations
- instruction: review-only, do not edit project/source files

Verifier output must use:

```text
RESULT: PASS | FAIL
BLOCKERS:
- ...
FIXUPS_REQUIRED:
- ...
OPTIONAL_IMPROVEMENTS:
- ...
VALIDATION:
- ...
RISKS:
- ...
```

Treat `FAIL` or any non-empty `BLOCKERS`/`FIXUPS_REQUIRED` as a failed review.

### 2.3 Fixup loop

If review fails:

1. Synthesize only the fixes worth doing now.
2. Launch a fresh `plan-worker-low` fixup worker.
3. Give it the original task, verifier findings, accepted fixup scope, and validation expectations.
4. Include the same exact worker self-review instruction.
5. Fork `plan-verify-xhigh` again for the same task.

Default cap: 3 review/fixup rounds per task. If still failing, stop and ask the user with a concise summary of remaining blockers.

## Step 3: whole-plan final review

After every task passes verification, fork a `plan-verify-xhigh` agent for the whole implemented plan with this exact prompt:

> now that the plan is fully implemented are there any improvements or refactorings that we should?

Ask it to inspect the full current diff against the original plan and return:

```text
RESULT: PASS | FAIL
REQUIRED_BEFORE_DONE:
- ...
OPTIONAL_DEFERRED:
- ...
VALIDATION_GAPS:
- ...
RISKS:
- ...
```

If it returns required changes, run one final fresh `plan-worker-low` fixup worker, then fork the whole-plan verifier again. Default cap: 2 whole-plan final review rounds.

## Completion response

When done, answer the user with:

- plan/tasks completed
- files changed
- validations run
- review/fixup rounds performed
- remaining risks or deferred optional improvements
- any commands the user should run next

Do not claim completion until task-level verification and whole-plan final review have passed, or until the user explicitly accepts remaining blockers.
