# Webhook setup

Run `review-pr` automatically when a PR opens, through a T3 scheduled task with a webhook trigger.

## Requirements

- **T3 Connect** signed in on the environment; only then does the task get a public URL.
- **An environment that is online.** An offline environment misses deliveries. Turn on Settings → Sharing & access → "Hold webhooks while offline" (held up to 24 h), or run the task on an always-on environment.
- **An unattended runtime mode** for the project, so `git` and `gh` run without approval prompts.
- **`gh` authenticated** on that environment. The review is posted as that account.
- `review` and `review-pr` installed for the project's default provider.

## T3 task

Create it in the repository's T3 project (`schedule_task`, or the task editor):

- **Destination**: new thread each run (`bindToCurrentThread: false`).
- **Prompt**: `$review-pr {{body.pull_request.html_url}}` for Codex, `/review-pr {{body.pull_request.html_url}}` for Claude.
- **Schedule**: `{type: 'webhook'}` with:
  - **Filters**:
    - `headers.x-github-event` equals `pull_request`
    - `body.action` in `opened`, `ready_for_review`, `reopened` (add `synchronize` to re-review each push)
    - `body.pull_request.draft` equals `false`
    - `body.repository.full_name` equals `<owner>/<repo>`
    - `body.pull_request.head.repo.full_name` equals `<owner>/<repo>`: same-repository PRs only, so fork code never reaches an agent holding write access
  - **Signature**: header `x-hub-signature-256`, encoding `hex`, prefix `sha256=`, secret from `request_secret`.
  - **Dedupe**: replay key `{{headers.x-github-delivery}}`; coalesce key `{{body.pull_request.number}}` with a window of about 300 s, so a burst of pushes yields one review.

## GitHub webhook

Repository → Settings → Webhooks → Add webhook:

- Payload URL: the task's `webhookUrl`
- Content type: `application/json`
- Secret: the same secret as the task
- Events: "Pull requests" only

Check a delivery in the task's Deliveries view: it shows each request, its filter outcome, and the rendered prompt.
