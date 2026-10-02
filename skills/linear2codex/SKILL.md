---
name: linear2codex
description: Open or preview Linear issue examinations in Codex T3 worktree threads, using a requested model or the GPT-6 Astra/high default. Use when dispatching Linear work to Codex; handoff2codex handles an already examined worktree.
---

# Linear to Codex

Use **`linear2thread`** with profile **`codex`**. Read its full `SKILL.md` and follow its workspace, selection, blocker, dispatch, verification, and Linear transition workflow. Pass the user's selector, model/provider/options, and preview intent unchanged. The profile supplies defaults; an explicit user selection takes precedence through the Linear adapter's `--model`, `--provider`, and `--option` flags.

Resolve `linear2thread` through installed skill discovery or sibling [`../linear2thread/SKILL.md`](../linear2thread/SKILL.md). Its `to-worktree-thread` and shared `to-thread` dependencies must be installed alongside it. If any are absent, install the complete chain from the same source:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill to-thread to-worktree-thread linear2thread linear2codex -y
```
