# Skills

Personal agent skills.

Install all:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill '*' -y
```

Install one:

```bash
npx skills add pauljasperdev/skills -g --agent claude-code --skill linear2thread linear2claude
```

`review` reviews the current branch against the origin state of the default branch on two axes — repo standards and the owning Linear issue plus its milestone — using parallel sub-agents.

`review2claude` opens a new Fable 5.1 T3 thread on the current worktree and branch that runs `/review`, so the review happens in its own session without touching the implementing thread.

`linear2thread` owns the shared Linear selection, blocker gating, and T3 RPC dispatch workflow. `linear2claude` selects Fable 5.1/high; `linear2codex` selects GPT-6 Astra/high. Both create native T3 threads and branch-backed worktrees through the same authenticated WebSocket bootstrap adapter. Install the base alongside either entry skill. T3 runs its configured worktree setup; Codex App task tools and Codex environment TOMLs are not required.

`examine-issue` is their shared, provider-neutral reconnaissance skill: it reads one issue and the repository without mutating either. The dispatcher owns workflow-state changes. After Fable examination, `handoff2codex` can start implementation on the same T3 worktree.

Repositories that use Linear must commit `.linear.toml` (or `.config/linear.toml`) with their `workspace` and default `team_id`. Credentials stay in the system keychain. Linear-aware skills verify this repository context and never infer a workspace from the directory name or issue prefix.
