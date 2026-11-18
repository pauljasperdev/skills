---
name: issue-comments
description: After implementation or a merged PR, tell related tickets what was decided or changed that affects them, and fix the blocked-by edges those decisions changed.
---

# Issue Comments

Tell other tickets what this work decided or changed that their implementers need to know. Nothing else.

## 1. Find the work

- Source: a PR URL, the conversation, or the branch `<prefix>/<N>-<slug>`; ambiguous → ask
- Read: its ticket; the PR's threads and commits; decisions made during implementation
- Tracker: the one the repo uses, as in `$to-tickets`
- Done: every decision and change listed with its source (PR, thread, commit)

## 2. Find who is affected

- Related, in order: tickets this work blocks, its blockers, milestone or parent siblings
- Read their bodies, comments, open PRs
- Affected = a decision changes its assumption, constraint, interface, order, or next step
- Done: every related ticket marked affected or not, with the reason

## 3. Comment

- One comment per affected ticket; read existing comments first, no duplicates
- Content:
  - **Changed:** the decision, why, link
  - **For this ticket:** which Outcome or Decided lines it supersedes, which still hold, what to do instead
- Ticket bodies stay as written: the record of the original plan
- Worth a comment only if it changes what that ticket's implementer does; status updates, speculation, and what the code shows anyway stay out

## 4. Blocked-by

- Add or remove an edge only when a decision clearly changes whether one ticket must wait for another
- Ambiguous → leave it

## 5. New work

- A decision calls for work no ticket covers → a short ticket per `$to-tickets` Write: the user story and the decision that calls for it, with links
- File it in the tracker's inbox; the user shapes it from there

## 6. Report

- Tickets read; comments added; edges changed; tickets filed
- Decisions that needed no comment, one line each
