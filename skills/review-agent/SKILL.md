---
name: review-agent
description: Start a T3 subagent from this thread that runs the review skill on the current checkout, with the problem and implemented solution as context.
disable-model-invocation: true
allowed-tools: mcp__t3-code__orchestrator_capabilities, mcp__t3-code__delegate_task
---

# Review agent

Start one T3 Code subagent with `delegate_task` that runs [`review`](../review/SKILL.md) on this thread's checkout. The subagent reports back into this thread. This skill owns the review context; `review` owns the review itself. The `review` skill must be installed for the subagent's provider.

## 1. Build the task

Start the task with the review invocation for the subagent's provider: `$review` for Codex, `/review` for Claude. Follow it with concise context from this conversation:

- the original problem and accepted requirements
- the implemented solution
- checks actually run, and known gaps
- any review instructions, base ref, paths, or issue the user supplied

Ask for the problem context when this conversation lacks it. End the task with `Run the review skill in full, including its parallel subagents.` T3 lets a child start subagents only when its task allows it; this line allows the ones `review` starts.

```text
$review

<context of the work done>
```

## 2. Delegate

Call `orchestrator_capabilities` once, then `delegate_task` with:

- `task`: the text from step 1
- `title`: a concise task title ending in ` · review`
- `role`: `review`
- `isolation`: `shared`, so the subagent reviews this checkout, uncommitted work included
- `target`: only the model, provider, or options the user named; otherwise omit it so the subagent inherits this thread's. Report an unavailable one instead of substituting another.

Tell the user the review started and that findings arrive when the subagent finishes. Leave the checkout unchanged until then, since the subagent reads live files. Follow the `next` that `delegate_task` returns.

## 3. Report

When the subagent finishes, present its review as returned and name the provider and model that ran it. A review without `review`'s surface line and lens sections means the subagent did not run `review`: report it as incomplete, like a failed subagent, never as "no findings". Leave fixes to the user.
