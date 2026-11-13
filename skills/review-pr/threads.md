# Review threads

Every finding becomes its own review thread at its place in the diff, so it can be discussed and resolved alone. All threads of one review step go into one review, so the PR gets one notification. No findings: post nothing.

Anchor each finding:

- **Line**: its `file:line` (or range) lies in a diff hunk: a `LINE` thread there, `side: RIGHT` (`LEFT` for a removed line), `startLine` for a range.
- **File**: its file is in the PR but the line is outside every hunk: a `FILE` thread on that path, naming the line in the body.
- **Elsewhere**: its file is not in the PR (a broken caller, for example): a `LINE` thread on the changed line that causes it, naming the real location in the body.

Thread body: `**<severity> · <lens> · <verdict>**`, then the claim, the consequence, and the quoted evidence, a sentence or two each, and last the marker `<!-- agent -->`.

Post with `gh api graphql`, building every variables payload with a JSON serializer:

1. `addPullRequestReview(input: {pullRequestId, commitOID: <head>})` creates a pending review. A pending review of yours whose threads carry `<!-- agent -->` was left by a failed run: delete it and start again. Any other pending review of yours belongs to the human: leave it untouched and set the stage to `needs human`, asking them to submit or discard it.
2. `addPullRequestReviewThread(input: {pullRequestReviewId, path, body, subjectType, line, side, startLine, startSide})` once per finding. When a `LINE` thread is rejected, retry it as a `FILE` thread on the same path.
3. `submitPullRequestReview(input: {pullRequestReviewId, event: COMMENT})` with an empty body.

A finding that cannot be anchored goes under **Needs you** in the status comment and keeps the stage at `needs human`.
