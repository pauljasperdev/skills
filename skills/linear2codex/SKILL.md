---
name: linear2codex
description: Open selected unblocked Linear issues as native T3 Code worktree threads using GPT-6 Astra with high reasoning and read-only examine-issue. Model-specific entry to linear2thread's shared RPC workflow. Use when the user dispatches Linear work to Codex or Astra in T3; use handoff2codex for an already examined worktree.
---

# Linear to Codex

Use the **`linear2thread` base skill** with profile **`codex`**. Read its full `SKILL.md` and follow its shared selection, workspace, blocker, T3 creation, verification, and Linear transition workflow. Pass the user's selector and preview intent unchanged.

Resolve the base through installed skill discovery or the sibling `../linear2thread/SKILL.md`. If absent, install it from the same repository before continuing:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill linear2thread linear2codex -y
```

Fixed target: T3 provider `codex`, model `gpt-6-astra`, option `reasoningEffort: high`. The adapter's `scripts/profiles.mjs` is the executable authority.

Run the **base skill's** adapter:

```text
node <linear2thread-dir>/scripts/t3-worktree.mjs doctor --profile codex --cwd <absolute-invoking-checkout>
node <linear2thread-dir>/scripts/t3-worktree.mjs open --profile codex --json
```

Supply the base skill's JSON input to `open` on stdin. The adapter authenticates with the official T3 CLI and calls `orchestration.dispatchCommand` over WebSocket RPC with `thread.turn.start` and the `createThread` / `prepareWorktree` / `runSetupScript` bootstrap. **T3 creates the branch, worktree, and first turn.** Do not create a Codex App task, require a Codex environment TOML, or create a worktree manually.

This wrapper changes only the model profile. Do not reproduce or invent another dispatch workflow here.
