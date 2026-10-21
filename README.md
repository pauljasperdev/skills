# Skills

Personal agent skills.

`implement` builds an authorized feature, fix, or handoff with minimal, maintainable code and verified behavior. It uses the installed `codebase-design` skill for design decisions and `effect` for Effect v4 work; it does not introduce Effect into other projects. `improve` is a fresh-eyes second pass after implementation: it re-solves the problem, cuts what the solution doesn't need, proposes cuts that change agreed behavior, and hints at `audit-effect` for Effect mismatches that recur beyond the change.

`refactor` simplifies the code under discussion while preserving observable behavior through small, verified changes.

Install all:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code codex --skill '*' -y
```

Install one:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill to-thread to-worktree-thread issue2thread issue2claude
```

`review` reviews the current branch against the origin state of the default branch on two axes — repo standards and the owning GitHub issue plus its milestone — using parallel sub-agents.

The `gemhog-*` skills are the Gemhog content pipeline; Notion holds the content (backlog, Reports, Skripte), the skills hold the rules. The backlog is a kanban board (Ideen, Up Next, Researched, Skript, Voiceover, Ready to post, Queued): a status names what an idea has, and each skill, called without a topic, takes every idea in the column before its own and moves it on. `gemhog-content` is the shared reference the others read by relative path (channel, formats, source and number rules, where things live in Notion), so it is always installed with them. `gemhog-research` turns a named backlog idea, or with no topic every idea in Up Next, into its Report and stops there; each idea gets a researcher subagent and an independent reviewer subagent, and only the main session writes to Notion. `gemhog-script` derives up to three Videoansätze from a Report, waits for the choice, then writes the Skript and its ElevenLabs-Fassung. `gemhog-voiceover` has Eleven v4 speak that Fassung in Paul's cloned voice through the ElevenLabs connector and saves it as the one `voiceover.mp3` in the short's folder; every run spends credits, so it generates on order only. `gemhog-publish` uploads an exported short to the content bucket and adds it to the Buffer queue of the Gemhog YouTube, TikTok and Instagram channels, with texts built from the Videobeschreibung; it shows Paul the texts before anything is queued. Install them together, per workspace: `npx skills add pauljasperdev/skills --agent claude-code codex --skill gemhog-content gemhog-research gemhog-script gemhog-voiceover gemhog-edit-short gemhog-publish -y`.

`gemhog-edit-short` edits a Gemhog short in HyperFrames: the speaker is on screen for the hook take, then a voiceover file runs over graphic scenes in the gemhog.com look, with word-by-word captions, quiet sound effects and a closing card. One script (`scripts/short.py`, run with `uv`) finds the cut points from the waveforms, assembles the project, follows clips trimmed in Studio and checks the export. It expects the workspace to hold `media/sound/` (pop and swoosh) and logos in `media/`.

`audit-effect` is manually invoked to audit Effect usage across the current codebase and produce pattern-level findings with standalone refactoring prompts. It uses the installed `effect` and `codebase-design` skills for practices and architecture judgment; the audit leaves code unchanged.

`review2thread` summarizes the original problem and implemented solution, then delegates to `to-thread` to launch a review on the current branch and worktree. Pass any configured model and optional provider; when no model is supplied, the agent asks.

`to-thread` opens a new native T3 thread on the current branch and worktree, keeping uncommitted files available and skipping setup. `review2thread` uses it.

`to-worktree-thread` opens a new native T3 thread with a new branch-backed worktree and automatic setup. It uses the shared T3 adapter from `to-thread`. Both accept a supplied model and optional provider/options, and ask when no model is supplied.

`issue2thread` uses `to-worktree-thread` with issue selection, blocker gating, examination prompts, and Status updates. `issue2claude` and `issue2codex` select default profiles owned by `issue2thread`; an explicit user model, provider, or option overrides those defaults through the adapter CLI. Install both dispatch skills alongside the issue skills.

`issue-comments` compares implementation decisions with related GitHub issues, reads milestone siblings and dependencies, and updates comments or blocked-by relations when needed.

`examine-work` investigates prompts or supplied briefs read-only without requiring a tracker. Its report is a discussion basis: the problem, proposed solution and decisions to discuss, the technical approach with key code and an ASCII or HTML diagram for architecture and infrastructure changes, testing and review, and a short plain-language summary. Use it standalone, for example: `$examine-work investigate adding CSV export to the current dashboard`.

`examine-issue` wraps `examine-work` with issue retrieval, milestone context, and a Status change to In Progress before repository investigation. Install both together (`--skill examine-issue examine-work`), including when using the issue dispatchers. Explicit read-only invocations skip the change; dispatched examinations leave Status changes to the dispatcher.

Issue tracking is GitHub Issues in each repository's `origin`, used through `gh` 2.94 or newer:

- Status and Priority are single-select fields of the konzeptlab organization Project `Issues`; skills resolve field and option IDs by name.
- Status runs Triage, Backlog, Todo, In Progress, In Review, Done, Canceled. Triage is the inbox: an issue an agent files goes in with Status Triage, an issue with no Status counts as Triage, and only Paul moves an issue out of it.
- Starting work sets Status to In Progress. The dispatch queue is open issues with Status Todo, ordered by priority (Urgent, High, Medium, Low, none), then age.
- An issue is blocked while any of its blocked-by issues is open.
- The milestone is the repository milestone; branches are `t3code/<N>-<slug>`.
