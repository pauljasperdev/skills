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

`audit-effect` is manually invoked to audit Effect usage across the current codebase and produce pattern-level findings with standalone refactoring prompts. It uses the installed `effect` and `codebase-design` skills for practices and architecture judgment; the audit leaves code unchanged.

`review2thread` summarizes the original problem and implemented solution, then delegates to `to-thread` to launch a review on the current branch and worktree. Pass any configured model and optional provider; when no model is supplied, the agent asks.

`to-thread` opens a new native T3 thread on the current branch and worktree, keeping uncommitted files available and skipping setup. `review2thread` uses it.

`to-worktree-thread` opens a new native T3 thread with a new branch-backed worktree and automatic setup. It uses the shared T3 adapter from `to-thread`. Both accept a supplied model and optional provider/options, and ask when no model is supplied.

`linear2thread` uses `to-worktree-thread` with Linear workspace verification, selection, blocker gating, examination prompts, and workflow-state updates. `linear2claude` and `linear2codex` select profiles owned by `linear2thread`, which passes the explicit provider, model, and options to the worktree dispatcher. Install both dispatch skills alongside the Linear skills.

`linear-comments` compares implementation decisions with related Linear issues, reads milestone siblings and dependencies, and updates comments or blocking relations when needed.

`examine-work` investigates prompts or supplied briefs read-only without requiring a tracker. Its report covers the problem and proposed solution, the technical approach with key code, testing and review, and a short plain-language summary. Use it standalone, for example: `$examine-work investigate adding CSV export to the current dashboard`.

`examine-issue` wraps `examine-work` with Linear workspace verification, issue retrieval, milestone context, and an In Progress transition before repository investigation. Install both together (`--skill examine-issue examine-work`), including when using the Linear dispatchers. Explicit read-only invocations skip the transition; dispatched examinations leave workflow-state changes to the dispatcher. After either examination in Fable, `handoff2codex` can start implementation on the same T3 worktree.

Repositories that use Linear must commit `.linear.toml` (or `.config/linear.toml`) with their `workspace` and default `team_id`. Credentials stay in the system keychain. Linear-aware skills verify this repository context and never infer a workspace from the directory name or issue prefix.
