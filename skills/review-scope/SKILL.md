---
name: review-scope
description: Scope review of a change. Judges it against the issue it implements and that issue's role in its milestone.
disable-model-invocation: true
---

# Scope review

Judge the change against the issue it implements, and that issue's role in its milestone.

Look for:

- requirements the issue asks for that are missing or partial
- behaviour nobody asked for (scope creep), including work that belongs to a sibling issue
- requirements that look implemented but behave wrong
- changes that work against the milestone outcome or this issue's role in it

Each finding quotes the issue or milestone line.

Out of scope: anything unrelated to a requirement.
