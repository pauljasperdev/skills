# Skills

Personal agent skills.

`implement` builds an authorized feature, fix, or handoff with minimal, maintainable code and verified behavior. It uses the installed `codebase-design` skill for design decisions and `effect` for Effect v4 work; it does not introduce Effect into other projects. `improve` is a separate refinement pass after implementation.

`refactor` simplifies the code under discussion while preserving observable behavior through small, verified changes.

Install all:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill '*' -y
```

Install one:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill to-thread to-worktree-thread linear2thread linear2claude
```

`review` reviews the current branch against the origin state of the default branch on two axes — repo standards and the owning Linear issue plus its milestone — using parallel sub-agents.

The `gemhog-*` skills are the Gemhog content pipeline; Notion holds the content (backlog, Reports, Skripte), the skills hold the rules. The backlog is a kanban board (Ideen, Up Next, Researched, Skript, Voiceover, Ready to edit, Veröffentlicht): a status names what an idea has, and each skill, called without a topic, takes every idea in the column before its own and moves it on. `gemhog-content` is the shared reference the others read by relative path (channel, formats, source and number rules, where things live in Notion), so it is always installed with them. `gemhog-research` turns a named backlog idea, or with no topic every idea in Up Next, into its Report and stops there; each idea gets a researcher subagent and an independent reviewer subagent, and only the main session writes to Notion. `gemhog-script` derives up to three Videoansätze from a Report, waits for the choice, then writes the Skript and its ElevenLabs-Fassung. `gemhog-voiceover` has Eleven v4 speak that Fassung in Paul's cloned voice through the ElevenLabs connector and saves it as the one `voiceover.mp3` in the short's folder; every run spends credits, so it generates on order only. Install them together, per workspace: `npx skills add pauljasperdev/skills --agent claude-code codex --skill gemhog-content gemhog-research gemhog-script gemhog-voiceover gemhog-edit-short -y`.

`gemhog-edit-short` edits a Gemhog short in HyperFrames: the speaker is on screen for the hook take, then a voiceover file runs over graphic scenes in the gemhog.com look, with word-by-word captions, quiet sound effects and a closing card. One script (`scripts/short.py`, run with `uv`) finds the cut points from the waveforms, assembles the project, follows clips trimmed in Studio and checks the export. It expects the workspace to hold `media/sound/` (pop and swoosh) and logos in `media/`.

`audit-effect` is manually invoked to audit Effect usage across the current codebase and produce pattern-level findings with standalone refactoring prompts. It uses the installed `effect` and `codebase-design` skills for practices and architecture judgment; the audit leaves code unchanged.

`review2thread` summarizes the original problem and implemented solution, then delegates to `to-thread` to launch a review on the current branch and worktree. Pass any configured model and optional provider; when no model is supplied, the agent asks.

`to-thread` opens a new native T3 thread on the current branch and worktree, keeping uncommitted files available and skipping setup. `review2thread` uses it.

`to-worktree-thread` opens a new native T3 thread with a new branch-backed worktree and automatic setup. It uses the shared T3 adapter from `to-thread`. Both accept a supplied model and optional provider/options, and ask when no model is supplied.

`linear2thread` uses `to-worktree-thread` with Linear workspace verification, selection, blocker gating, examination prompts, and workflow-state updates. `linear2claude` and `linear2codex` select default profiles owned by `linear2thread`; an explicit user model, provider, or option overrides those defaults through the Linear adapter CLI. Install both dispatch skills alongside the Linear skills.

`linear-comments` compares implementation decisions with related Linear issues, reads milestone siblings and dependencies, and updates comments or blocking relations when needed.

`examine-work` investigates prompts or supplied briefs read-only without requiring a tracker. Its report covers the problem and proposed solution, the technical approach with key code, testing and review, and a short plain-language summary. Use it standalone, for example: `$examine-work investigate adding CSV export to the current dashboard`.

`examine-issue` wraps `examine-work` with Linear workspace verification, issue retrieval, milestone context, and an In Progress transition before repository investigation. Install both together (`--skill examine-issue examine-work`), including when using the Linear dispatchers. Explicit read-only invocations skip the transition; dispatched examinations leave workflow-state changes to the dispatcher. After either examination in Fable, `handoff2codex` can start implementation on the same T3 worktree.

Repositories that use Linear must commit `.linear.toml` (or `.config/linear.toml`) with their `workspace` and default `team_id`. Credentials stay in the system keychain. Linear-aware skills verify this repository context and never infer a workspace from the directory name or issue prefix.
