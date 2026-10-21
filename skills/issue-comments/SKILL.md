---
name: issue-comments
description: Share implementation decisions with related GitHub issues and update confirmed blocked-by relations when needed.
---

# Issue Comments

Use after implementation decisions may have changed the plan recorded in GitHub issues. Identify the implemented issue from the conversation or the branch `t3code/<N>-<slug>`; ask if it is ambiguous.

Issues live in the repository's GitHub `origin`. Use `gh` 2.94 or newer and pass `-R <owner>/<repo>`, resolved from `origin`, on every issue command.

Read the issue with `gh issue view <N> --json title,body,state,milestone,blockedBy,blocking,comments`. When it has a milestone, list the milestone's other issues with `gh issue list --milestone <number> --state all --limit 1000`, prioritizing direct dependencies, especially issues the implemented issue blocks. Compare their plans and current comments with decisions established during implementation.

Preserve issue and milestone descriptions as the record of the original plan. Record what changed and why in a decision comment (`gh issue comment`), linking the PR or source issue when available. If acceptance criteria conflict with the decision, name the specific criteria that are superseded or deferred, say which still apply, and state what implementation should do instead. Agents should read the description and comments; the decision overrides only the criteria it explicitly addresses.

Also compare existing blocked-by relations with the confirmed plan. An issue is blocked while any of its blocked-by issues is open. Add or remove a relation with `gh issue edit <N> --add-blocked-by <M>` or `--remove-blocked-by <M>` only when a decision clearly changes whether one issue must wait for another; preserve direction and leave ambiguous relations unchanged.

Comment only when a confirmed decision changes an issue's assumptions, constraints, sequence, interface, or next action. Check existing comments first and avoid duplicates, speculation, or general status updates. Leave issues unchanged when no useful update is needed.

When a decision calls for new work, file it with `gh issue create`, then put it in the konzeptlab organization Project `Issues` with Status Triage: resolve the project number and ID, the Status field ID, and the Triage option ID by name with `gh project list --owner konzeptlab` and `gh project field-list <number> --owner konzeptlab`, get the item from `gh project item-add <number> --owner konzeptlab --url <issue-url> --format json`, and set it with `gh project item-edit --project-id <id> --id <item-id> --field-id <field-id> --single-select-option-id <option-id>`. Triage is the user's inbox; leave every other Status change to the user.

Report the issues reviewed, comments added, issues filed, and blocked-by relations changed; explain relevant decisions that needed no update.
