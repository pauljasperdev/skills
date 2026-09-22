---
name: linear2codex
description: Open or preview Linear issue examinations in GPT-6 Astra/high T3 worktree threads. Use when dispatching Linear work to Codex; handoff2codex handles an already examined worktree.
---

# Linear to Codex

Use **`linear2thread`** with profile **`codex`**. Read its full `SKILL.md` and follow its workspace, selection, blocker, dispatch, verification, and Linear transition workflow. Pass the user's selector and preview intent unchanged. This wrapper selects only the profile; `to-thread/scripts/profiles.mjs` defines the target model and options.

Resolve `linear2thread` through installed skill discovery or sibling [`../linear2thread/SKILL.md`](../linear2thread/SKILL.md). Its `to-thread` dependency must be installed alongside it. If either is absent, install the complete chain from the same source:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill to-thread linear2thread linear2codex -y
```
