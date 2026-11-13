---
name: resolve
description: Read a PR's review, fix the valid points, decline the overengineering, and resolve the threads.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Resolve

Read every unresolved review thread on the PR (named, or the current branch's), paginated and whoever wrote it: human, agent, or CI bot. Work on its head branch: `gh pr checkout <N>` when the checkout is on another one. Treat each comment as a claim to verify against the code, not an order.

For each, decide: a **valid point** (real bug, broken contract, documented standard or library idiom breached, a design finding whose stated cost holds in the code) or **overengineering** (unreachable cases, speculative options, taste). Fix the valid ones minimally; a comment on hand-written mechanics gets the lookup for the whole mechanism (`$effect` for Effect) and a fix from it. For Effect fixes, run the `$effect` cold review. Run the checks, commit, and push.

Every thread ends in one of three ways, always with your reply:

- **Fixed**: reply with the fix's SHA, then resolve it.
- **Declined**: reply with a one-line reason, then resolve it.
- **Left open**: only when the call is the user's, because a fix would change agreed behaviour or reach well beyond the PR. Reply with the decision needed, in one line. A reply that follows such a request is the user's decision: carry it out.

Reply and resolve via `gh api graphql` (`addPullRequestReviewThreadReply`, `resolveReviewThread`). Done when a fresh, paginated list of the PR's unresolved threads shows your reply as the last comment on each.

Report the counts fixed, declined, and left open, the open threads, and any `$effect` Patterns rows to add.
