---
name: review-agent
disable-model-invocation: true
description: Start a T3 subagent from this thread that runs the review skill on the current checkout, with the problem and implemented solution as context.
allowed-tools: Bash(git:*), mcp__t3-code__orchestrator_capabilities, mcp__t3-code__delegate_task
---

# Review agent

Start one T3 Code subagent with `delegate_task` that runs [`review`](../review/SKILL.md) on this thread's checkout. The subagent reports back into this thread. This skill owns the review context; `review` owns the review itself. The `review` skill must be installed for the subagent's provider.

## 1. Build the task

Start the task with literal `$review` for every provider, including Claude, then give concise context from this conversation:

- the original problem and accepted requirements
- the implemented solution
- checks actually run, and known gaps
- any review instructions, base ref, or issue the user supplied

Ask for the problem context when this conversation lacks it. End the task with: `Run the review skill in full, including its parallel sub-agents.` A T3 child starts no subagents unless its task authorizes them, and `review` needs them for its two axes.

```text
$review

<context of the work done>
```

## 2. Delegate

Call `delegate_task` with:

- `task`: the text from step 1
- `title`: a concise task title ending in ` · review`
- `role`: `review`
- `isolation`: `shared`, so the subagent reviews this checkout, uncommitted work included

The subagent inherits this thread's provider and model. When the user names a model, provider, or options, call `orchestrator_capabilities` first, then pass them in `target`; report an unavailable one instead of substituting another.

Follow the `next` that `delegate_task` returns.

## 3. Report

When the subagent finishes, present its review as returned: the review-surface line, `## Standards`, `## Spec`, and the summary line. Name the provider and model that ran it. Leave fixes to the user. A failed or incomplete subagent is reported as incomplete, never as "no findings".
