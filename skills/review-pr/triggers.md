# Triggers

Three T3 tasks per repository start the agents in `~/.config/review-pr.json`. Each runs a small model that executes this manual. `pr-state`, next to this file, makes every decision; you only carry out what it prints.

## Run

1. Check the values in your prompt. Each must match its pattern, or reply `skip: invalid input` and stop:

| Value | Pattern |
| --- | --- |
| PR URL | `https://github.com/<owner>/<repo>/pull/<digits>` |
| Event, action | lowercase letters and `_` |
| Comment id | digits |

2. Run the command for your trigger in the project root, with `pr-state` as `python3 <this skill's dir>/pr-state`:

| Trigger | Command |
| --- | --- |
| PR event | `pr-state event --repo <owner/repo> --project <project id> --pr <PR URL> --event <event> --action <action> --apply` |
| PR comment | `pr-state comment --repo <owner/repo> --project <project id> --pr <PR URL> --comment-id <id> --apply` |
| Scan | `pr-state scan --repo <owner/repo> --project <project id> --apply` |

3. For each output line, by its `action`:

| Action | Do |
| --- | --- |
| `dispatch`, `merged` | `t3_thread_launch` in the project root with the line's `launch`: `title`, `message` exactly, model selection with instance id `provider` and model `model`, effort `effort`. Link the PR to the new thread. |
| `queue` | `t3_thread_send` the line's `message` to its `thread`. |
| `error` | Reply with the line and stop. |
| anything else | Nothing. The script already did it. |

4. Reply with one line per PR whose action was not `skip`: `#<pr> <action> <row>: <reason>`. With none, reply `nothing to do`.

## State table

`pr-state` applies this table to a PR; the first matching row wins. `scan` runs it for every open PR, `event` and `comment` for theirs, and the orchestrator runs it at its start and stop with `check`. After a run ends, the table yields skip, wait, or finalize until something outside changes.

| # | When | Action |
| --- | --- | --- |
| S1 | PR not open | skip |
| S2 | Draft | skip |
| S3 | From a fork | skip |
| S4 | Opened by a bot | skip |
| S5 | No status comment, created before `since` | skip |
| S6 | A T3 thread titled `Review PR #<n>` is not finished | skip |
| S7 | No status comment | dispatch |
| S8 | Head differs from the status comment's head | dispatch |
| S9 | A stage is `reviewing` or `resolving`: its run died | dispatch |
| S10 | An unresolved thread ends with a human reply | dispatch |
| S11 | A human PR comment is newer than the status comment | dispatch |
| S12 | Unresolved threads differ from the status comment's Open total | dispatch |
| S13 | Conflict or failed checks, CI stage not `needs human` | dispatch |
| S14 | Checks running, or mergeability unknown | wait |
| S15 | A stage is `waiting` | dispatch |
| S16 | A stage is `failed` | dispatch |
| S17 | A stage is `needs human`, no thread open | dispatch |
| S18 | Every stage `passed`, no open thread, checks green, mergeable, the head not approved by the bot | finalize: approve the head; enable auto-merge when the blast radius is in `autoMerge` |
| S19 | Labels differ from the label table | fix-labels |
| S20 | Otherwise | skip |

A human is a comment author with association owner, member, or collaborator, not a bot, and without the `<!-- agent -->` or `<!-- review-pr -->` marker.

**Label table**, first match: a run works on it → `agent review: running`; a stage `failed` → `agent review: failed`; a stage `needs human` → `agent review: needs human`; every stage `passed` → `agent review: passed` and `blast radius: <rating>`.

**PR event**, before the state table:

| # | When | Action |
| --- | --- | --- |
| E1 | `pull_request` `closed` and merged, no thread `Merged PR #<n>` yet | merged: start the config's `merged` agent with `/issue-comments <PR URL>` |
| E2 | Closed otherwise | skip |

**PR comment**, before the state table, reading the comment from GitHub by its id:

| # | When | Action |
| --- | --- | --- |
| C1 | By a bot, or carries an agent marker | skip |
| C2 | `/review` or `/review <stage>` by a human on a PR that S1–S4 skip | skip |
| C3 | `/review [stage]` by a human while a run works | react 👀; queue `rerun [stage] comment <id>` on that run's thread |
| C4 | `/review [stage]` by a human | react 👀; dispatch with `rerun [stage] comment <id>` |

## Setup

All three tasks run on a small model, bound to one T3 thread, with `freshSession`. Each prompt names this file, its trigger, the repository, the T3 project id, and the values below.

| Task | Schedule | Values in the prompt |
| --- | --- | --- |
| PR event | webhook | `{{headers.x-github-event}}`, `{{body.action}}`, `{{body.pull_request.html_url}}` |
| PR comment | webhook | `{{body.issue.html_url}}`, `{{body.comment.id}}` |
| Scan | every 60 minutes | none |

Webhook filters, all on `body.repository.full_name` equals `<owner>/<repo>` and `body.sender.login` not equal to the config's `bot`:

- **PR event**: `headers.x-github-event` in `pull_request`, `pull_request_review`, `pull_request_review_comment`, `pull_request_review_thread`; `body.action` in `opened`, `reopened`, `ready_for_review`, `synchronize`, `closed`, `submitted`, `created`, `resolved`, `unresolved`.
- **PR comment**: `headers.x-github-event` equals `issue_comment`; `body.action` equals `created`; `body.issue.pull_request` exists.

Each webhook task needs T3 Connect for its public URL, and its own GitHub webhook (content type `application/json`, the task's events, the task's `webhookUrl`, and a shared secret). Signature: header `x-hub-signature-256`, encoding `hex`, prefix `sha256=`. Dedupe: replay key `{{headers.x-github-delivery}}`; PR event and PR comment also coalesce per PR for 120 seconds.

A `schedule_task` update that passes `signature` without `secret` keeps the stored secret.
