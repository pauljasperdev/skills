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

The Linear-to-implementation workflow uses `linear2claude` for Fable 5.1 issue examination, then `handoff2codex` to start Codex implementation on the same T3 worktree.
