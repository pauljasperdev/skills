---
name: linear2claude
description: Open selected unblocked Linear issues as native T3 Code worktree threads using Claude Fable 5.1 with high reasoning and read-only examine-issue. Model-specific entry to linear2thread's shared RPC workflow. Use when the user dispatches Linear work to Claude or Fable in T3; use handoff2codex for an already examined worktree.
---

# Linear to Claude

Use the **`linear2thread` base skill** with profile **`claude`**. Read its full `SKILL.md` and follow its shared selection, workspace, blocker, T3 creation, verification, and Linear transition workflow. Pass the user's selector and preview intent unchanged.

Resolve the base through installed skill discovery or the sibling `../linear2thread/SKILL.md`. If absent, install it from the same repository before continuing:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill linear2thread linear2claude -y
```

Fixed target: T3 provider `claudeAgent`, model `claude-fable-5-1`, option `effort: high`. The adapter's `scripts/profiles.mjs` is the executable authority.

Run the **base skill's** adapter:

```text
node <linear2thread-dir>/scripts/t3-worktree.mjs doctor --profile claude --cwd <absolute-invoking-checkout>
node <linear2thread-dir>/scripts/t3-worktree.mjs open --profile claude --json
```

Supply the base skill's JSON input to `open` on stdin. The adapter authenticates with the official T3 CLI and calls `orchestration.dispatchCommand` over WebSocket RPC with `thread.turn.start` and the `createThread` / `prepareWorktree` / `runSetupScript` bootstrap. **T3 creates the branch, worktree, and first turn.** Do not create a Codex App task, require a Codex environment TOML, or create a worktree manually.

This wrapper changes only the model profile. Do not reproduce or invent another dispatch workflow here.
