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
npx skills add pauljasperdev/skills -g --agent claude-code --skill to-thread linear2thread linear2claude
```

`review` reviews the current branch against the origin state of the default branch on two axes — repo standards and the owning Linear issue plus its milestone — using parallel sub-agents.

`audit-effect` is manually invoked to audit Effect usage across the current codebase and produce pattern-level findings with standalone refactoring prompts. It uses the installed `effect` and `codebase-design` skills for practices and architecture judgment; the audit leaves code unchanged.

`review2claude` opens a new Fable 5.1 T3 thread on the current worktree and branch that runs `/review`, so the review happens in its own session without touching the implementing thread.

`to-thread` opens a native T3 thread and branch-backed worktree for any title and first prompt, without an issue tracker. It owns authenticated RPC creation, model profiles, automatic setup, and verification. For example: `$to-thread use Codex to investigate CSV export in a new thread`.

`linear2thread` wraps `to-thread` with Linear workspace verification, selection, blocker gating, examination prompts, and workflow-state updates. `linear2claude` and `linear2codex` select its model profile. Install `to-thread` alongside the Linear skills; the Linear adapter delegates creation to it.

`linear-comments` compares implementation decisions with related Linear issues, reads milestone siblings and dependencies, and comments only when an update will help ongoing work.

`examine-work` investigates proposed work from any prompt or supplied brief, with no issue tracker required. It keeps the project read-only and produces an evidence-backed technical foundation followed by a plain-language human review. Use it standalone, for example: `$examine-work investigate adding CSV export to the current dashboard`.

`examine-issue` wraps `examine-work` with Linear workspace verification, issue retrieval, and milestone context. Install both together (`--skill examine-issue examine-work`), including when using the Linear dispatchers. The dispatcher owns workflow-state changes. After either examination in Fable, `handoff2codex` can start implementation on the same T3 worktree.

Repositories that use Linear must commit `.linear.toml` (or `.config/linear.toml`) with their `workspace` and default `team_id`. Credentials stay in the system keychain. Linear-aware skills verify this repository context and never infer a workspace from the directory name or issue prefix.
