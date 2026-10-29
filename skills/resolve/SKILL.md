---
name: resolve
description: Read a PR's review, fix the valid points, decline the overengineering, and resolve the threads.
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Resolve

Read the unresolved review threads on the PR (named, or the current branch's). Treat each comment as a claim to verify against the code, not an order.

For each, decide: a **valid point** (real bug, broken contract, documented standard or library idiom breached) or **overengineering** (unreachable cases, speculative options, taste). Fix the valid ones minimally; a comment on hand-written mechanics gets the lookup for the whole mechanism (`$effect` for Effect) and a fix from it. For Effect fixes, run the `$effect` cold review. Run the checks, commit, and push.

Reply on every thread with the fix's SHA or a one-line reason for declining, then resolve it via `gh api graphql` (`addPullRequestReviewThreadReply`, `resolveReviewThread`). Leave a thread open only when the call is the user's, and report those, plus any `$effect` Patterns rows to add.
