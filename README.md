# Skills

Personal agent skills.

Install all:

```bash
npx skills add pauljasperdev/skills -g --agent pi claude-code --skill '*' -y
```

Install one:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill linear2claude
```

`review` reviews the current branch against the origin state of the default branch on two axes — repo standards and the owning Linear issue plus its milestone — using parallel sub-agents.

`review2claude` opens a new Fable 5.1 T3 thread on the current worktree and branch that runs `/review`, so the review happens in its own session without touching the implementing thread.

`examine-issue` is the shared, provider-neutral reconnaissance skill: it reads one issue and the repository without mutating either. Dispatchers own issue selection, workflow-state changes, worktree creation, and model choice. Use `linear2claude` for Fable 5.1 examination, optionally followed by `handoff2codex` for implementation on the same T3 worktree. Use `linear2codex` to dispatch Linear work directly to GPT-5.6 Sol/high Codex sessions; it reuses the same examiner.

Repositories that use Linear must commit `.linear.toml` (or `.config/linear.toml`) with their `workspace` and default `team_id`. Credentials stay in the system keychain. Linear-aware skills verify this repository context and never infer a workspace from the directory name or issue prefix.
