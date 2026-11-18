---
name: to-tickets
description: Turn a conversation, plan, or milestone brainstorm into tickets in the repo's issue tracker that carry the user story, the outcome, and only the user's own decisions. Use whenever drafting, filing, or editing tickets or issues.
---

# To Tickets

Ticket = **intent**: user story, outcome, the user's decisions. The implementer owns the how and reads every line as a requirement.

## Provenance

- In a ticket: only what the user said or explicitly approved
- Each decision carries its source: the user's words or the approving message
- Outside the ticket, as questions to the user:
  - your proposals; findings from reviewers, researchers, probes, subagents
  - what you learned from the code
  - mechanisms, data models, libraries, endpoints, paths, commands, numbers, limits, UI specifics, unless the user chose them
- "Yes" to a summary approves the summary only
- Same rules when editing a ticket, milestone, or parent, including edits after a review

## 1. Gather

- Read: conversation, referenced tickets, specs, milestones, with comments
- Collect: user stories (who, what they want, why), outcomes, decisions + sources, exclusions, open questions
- Code: vocabulary and natural slices only
- Port or rewrite: Decided holds the user's scope rule ("port all of it"), not an inventory of the old behavior
- Done: every decision sourced, every other idea marked as yours

## 2. Slice

- **Tracer bullets**: one observable outcome per ticket, verifiable alone, fits one fresh session
- Blocked-by only where one outcome cannot exist before another
- Fewer, larger slices; the implementer finds the tasks
- Too wide to land green (codebase-wide rename) → **expand–contract**: add new form, migrate callers in batches blocked by the expand, remove old form blocked by every batch

## 3. Close every question

- Grill per `$grilling`, scoped to each ticket's:
  - user story: who, what they want, why, one concrete case
  - outcome: what is observably true when done
  - your open questions and proposals
- The how stays out of the grilling unless the user raised it
- Answer → a decision with its source
- "Implementer decides" → a decision too: `<topic>: implementer's call`
- Done: every story has who, what, why, and a case; no open questions left

## 4. Write

```markdown
## User story

As <who>, I want <what>, so that <why>.

<a few sentences in the user's terms: their situation today, what changes
for them, one concrete case from the conversation>

## Outcome

- [ ] <observable behavior: false today, true when done>

## Decided

- <decision>: <source>

## Out of scope

- <only what the user excluded>
```

- The user story is the heart: who, what, why, written out so a stranger gets it; works for a feature and a fix alike
- Readable first: bullets for lists, short prose for the story, a table, ASCII sketch, or HTML element when it reads faster; a sketch shows what the user sees or decided, under Provenance
- Outcome = what a user, caller, or operator sees; would the line change with the implementation? → method, cut it
- Domain language; no paths, code, module names, step lists
- Empty section → left out; empty Decided is normal
- Costly external fact (vendor limit, probe result) → final `## Context`: fact + source, never a step
- One screen per ticket; shared context → milestone or parent, same rules

## 5. Provenance check

- Fresh subagent gets the user's messages, each with the message it answers, + drafts; not your reasoning
- It returns every line it cannot trace to the user
- Cut each line, or ask the user
- Done: every line traced

## 6. Show

- Full bodies as published, with titles, blocked-by edges, milestone or parent
- Revise until the user approves the exact text

## 7. Publish

- Tracker: the one this repo uses, per `AGENTS.md`/`CLAUDE.md` and the docs they point to, else its existing issues and remote; unclear → ask
- Blockers first; native blocking relation, else a `Blocked by` line
- Attach the named milestone or parent; leave existing parents unchanged
- State: the one the user named, else where the repo's docs put agent-filed work (inbox, triage); docs silent → ask
- Report: link, state, blockers per ticket
