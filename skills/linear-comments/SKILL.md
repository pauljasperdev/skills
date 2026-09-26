---
name: linear-comments
description: Share implementation decisions with related Linear issues and update confirmed dependency or blocking relations when needed.
---

# Linear Comments

Use after implementation decisions may have changed the plan recorded in Linear. Identify the implemented issue from the conversation; ask if it is ambiguous. Follow $linear-cli to resolve and verify the workspace before reading or writing issues.

Read the issue and its milestone. When it belongs to a milestone, read the milestone's other issues, prioritizing direct dependencies, especially issues blocked by the implemented issue. Compare their plans and current comments with decisions established during implementation.

Preserve issue and milestone descriptions as the record of the original plan. Record what changed and why in a decision comment, linking the PR or source issue when available. If acceptance criteria conflict with the decision, name the specific criteria that are superseded or deferred, say which still apply, and state what implementation should do instead. Agents should read the description and comments; the decision overrides only the criteria it explicitly addresses.

Also compare existing dependency relations with the confirmed plan. Add or remove a blocks/blocked-by relation only when a decision clearly changes whether one issue must wait for another; preserve direction and leave ambiguous relations unchanged.

Comment only when a confirmed decision changes an issue's assumptions, constraints, sequence, interface, or next action. Check existing comments first and avoid duplicates, speculation, or general status updates. Leave issues unchanged when no useful update is needed.

Report the issues reviewed, comments added, and dependency relations changed; explain relevant decisions that needed no update.
