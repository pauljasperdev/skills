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

`examine-issue` is the shared, provider-neutral reconnaissance skill: it reads one issue and the repository without mutating either. Dispatchers own issue selection, workflow-state changes, worktree creation, and model choice. The current Linear-to-implementation workflow uses `linear2claude` for Fable 5.1 examination, then `handoff2codex` to start Codex implementation on the same T3 worktree; `to-codex` reuses the same examiner for direct Codex dispatch.
