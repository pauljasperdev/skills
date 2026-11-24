---
name: to-tickets
description: Turn a conversation, plan, or milestone brainstorm into tickets in the repo's issue tracker that show what to build through the user story, the outcome, the user's own decisions, and sourced context. Use whenever drafting, filing, or editing tickets or issues.
---

# To Tickets

Ticket = **intent**: what to build, seen from the user's side, plus the facts that shape it. The implementer owns the how and reads every line as a requirement unless it is marked as context.

## Provenance

Sort every line by kind:

| Kind | Who supplies it | In the ticket | Check |
|---|---|---|---|
| **Decision** | the user only | Decided, Outcome, Out of scope; binding | traced to the user |
| **Fact** | anyone, with a source | Context; not binding | sourced, phrased as fact, no "should" |
| **Proposal** | you, reviewers, researchers, subagents | out, unless the user approves it | — |

- Decisions carry their source: the user and the date; a short quote only where the wording matters
- Mechanisms, data models, libraries, endpoints, paths, commands, numbers, limits, UI specifics → Decided only when the user chose them, Context only as verified fact
- "Yes" to a summary approves the summary only
- "Ok" to your proposal or explanation → record the user's goal behind it, not your design; binds the implementer only if the user says so when asked, else `<topic>: implementer's call`
- Unverified claims stay out, even as context
- Same rules when editing a ticket, milestone, or parent, including edits after a review

## 1. Gather

- Read: conversation, referenced tickets, specs, milestones, with comments
- Collect:
  - user stories: who, what they want, why, the cases and pictures the user described
  - outcomes, decisions + sources, exclusions, open questions
  - resources the user gave: links, docs, threads, screenshots, images, Miro or Figma boards
  - facts found along the way, with their sources: today's state, external limits, costs, accounts and credentials needed, related tickets and PRs
- Code: vocabulary, natural slices, and today's state
- Port or rewrite: Decided holds the user's scope rule ("port all of it"), not an inventory of the old behavior
- Done: every decision and fact sourced, every other idea marked as yours

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
- Ask only what the conversation leaves unclear; all questions in one round
- The how stays out, including where work starts and how branches merge, unless the user raised it
- Answer → a decision with its source
- "Implementer decides" → a decision too: `<topic>: implementer's call`
- Done: every story shows who, what, why, and a case; no open questions left

## 4. Write

```markdown
## User story

As <who>, I want <what>, so that <why>.

<as long as it takes for a stranger to picture the result, from the user's side:
today vs. after, a walkthrough of the cases from the conversation, and a picture
when it shows faster>

## Outcome

- [ ] <observable behavior: false today, true when done>

## Decided

- <decision>: <user, date>

## Out of scope

- <only what the user excluded>

## Context

- Resources: <link>: <what it is for>
- Today: <the state the story starts from>
- <limit, cost, account, credential, or other force that shapes the build>: <source>
- Related: <ticket or PR>: <what it touches>
```

- The user story is the heart: the headline says who, what, why; the body shows what gets built, at any length; "so that" may go when it's obvious
- Pictures: images, screenshots, ASCII flows, breadboards, before/after tables, states, HTML, Miro or Figma boards; embed or link the user's own
- The story shows what the user sees and does; what the user didn't decide stays rough: name it ("a list of letters"), don't design it
- Outcome = what a user, caller, or operator sees; would the line change with the implementation? → method, cut it
- Context states facts; the implementer draws the conclusions; long context goes in a `<details>` block
- Domain language; no file paths, code, or step lists
- Empty section → left out; empty Decided is normal
- Outcome and Decided fit one screen; shared context → milestone or parent, same rules

## 5. Provenance check

- On the full drafts, and again on the lines changed after each revision
- Fresh subagent gets the user's messages, each with the message it answers, the sources behind Context, and the drafts; not your reasoning
- It returns every Decision line it cannot trace to the user, and every Context line without a source or phrased as advice
- Cut each line, or ask the user
- Done: every line traced or sourced

## 6. Show

- Full bodies as published, with titles, blocked-by edges, milestone or parent
- Revise until the user approves the exact text

## 7. Publish

- Tracker: the one this repo uses, per `AGENTS.md`/`CLAUDE.md` and the docs they point to, else its existing issues and remote; unclear → ask
- Blockers first; native blocking relation, else a `Blocked by` line
- Attach the named milestone or parent; leave existing parents unchanged
- State: the one the user named, else where the repo's docs put agent-filed work (inbox, triage); docs silent → ask
- Report: link, state, blockers per ticket
