---
name: issue2codex
description: Open or preview GitHub issue examinations in Codex T3 worktree threads, using a requested model or the GPT-6 Astra/high default. Use when dispatching issues to Codex.
---

# Issue to Codex

Use **`issue2thread`** with profile **`codex`**. Read its full `SKILL.md` and follow its selection, blocker, dispatch, verification, and Status workflow. Pass the user's selector, model/provider/options, and preview intent unchanged. The profile supplies defaults; an explicit user selection takes precedence through the adapter's `--model`, `--provider`, and `--option` flags.

Resolve `issue2thread` through installed skill discovery or sibling [`../issue2thread/SKILL.md`](../issue2thread/SKILL.md). Its `to-worktree-thread` and shared `to-thread` dependencies must be installed alongside it. If any are absent, install the complete chain from the same source:

```sh
npx skills add pauljasperdev/skills -g --agent <invoking-agent> --skill to-thread to-worktree-thread issue2thread issue2codex -y
```
