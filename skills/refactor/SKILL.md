---
name: refactor
description: Refactor existing code to simplify its design while preserving observable behavior.
---

# Refactor

Infer the target from the request and conversation. Ask only if it remains unclear.

Aim for code that is easier to understand and change. Prefer removing unnecessary machinery and clarifying responsibilities; introduce abstractions only when they simplify a present problem.

Preserve observable behavior through small, coherent transformations. Use relevant checks before and after changes, adding regression tests where needed to protect affected behavior.

Stop when the intended simplification is achieved. Briefly explain what became simpler, how it was verified, and any remaining uncertainty.
