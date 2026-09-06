---
name: linear2codex
description: Open or preview Linear issue examinations in GPT-6 Astra/high T3 worktree threads. Use when dispatching Linear work to Codex; handoff2codex handles an already examined worktree.
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

Supply the base skill's JSON input to `open` on stdin. **T3 creates the branch, worktree, and first turn through the base adapter's WebSocket RPC bootstrap.** Keep the creation and verification contract in the base; never substitute manual worktree creation or another app's task tools.

This wrapper changes only the model profile. Do not reproduce or invent another dispatch workflow here.
