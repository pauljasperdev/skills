---
name: review-risk
description: Risk review of a change. Rates its blast radius and points a human reviewer at what could break.
disable-model-invocation: true
---

# Risk review

Rate how much could break if the change is wrong, and how hard it is to undo:

- 🟢 **low**: inside one module; no shared contract, stored data, or access rule changes; a revert undoes it.
- 🟡 **medium**: changes a contract other modules or apps use, or behaviour across a user flow.
- 🔴 **high**: changes stored data or its schema, authentication or access, an external integration, or deployment; or a revert does not undo it.

The highest matching level wins. Explain the rating to a human reviewer: what could break, and where to look first. The higher the level, the more context they need.

Rate the change, not its quality: report no findings.
