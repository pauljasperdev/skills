---
name: issue-comments
description: After implementation or a merged PR, give related tickets a heads-up on big decisions that are new or break the original plan, so their implementers aren't surprised. Often nothing needs saying.
---

# Issue Comments

A **heads-up** to a colleague who picks up the next ticket: what this work decided that they would not expect from the ticket, and why. Facts, not orders. They read it, then solve their ticket with a fresh mind.

Most work leaves no comment. Silence is the normal result.

## 1. Find the work

- Source: a PR URL, the conversation, or the branch `<prefix>/<N>-<slug>`; ambiguous → ask
- Read: its ticket; the PR's description, threads, and commits
- Tracker: the one the repo uses, as in `$to-tickets`
- Done: the decisions that went beyond or against the ticket, each with its link

## 2. Find what earns a heads-up

A decision earns one only when it is **big** and the next implementer would be **surprised**:

- it contradicts what a related ticket's body or Decided lines assume
- it is new and a related ticket's work builds directly on it (a shared interface, a chosen service, a dropped feature)

Related = tickets this work blocks, its blockers, milestone or parent siblings. Read their bodies and comments.

Everything else stays out: what the code or PR already shows, small choices, status, ideas for how the other ticket could be built.

- Done: each related ticket has its heads-up, or none

## 3. Write

```markdown
Heads-up from #<N> (<PR link>): <what was decided>, because <why>.
<Only if it contradicts the ticket: which line of this ticket it affects.>
```

- One or two sentences; one comment per ticket; skip it if an existing comment says the same
- State the fact; the implementer decides what it means for their ticket
- Ticket bodies stay as written
- A decision that would change another ticket's user story, outcome, scope, or order is the user's call → ask the user instead of commenting

## 4. Report

- Comments added, with links
- Questions for the user: scope or order changes, blocked-by edges that look wrong, work no ticket covers
