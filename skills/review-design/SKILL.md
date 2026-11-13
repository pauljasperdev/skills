---
name: review-design
description: Design review of a change. Judges where it puts responsibilities, and its module boundaries and interfaces.
disable-model-invocation: true
---

# Design review

Judge where the change puts responsibilities, and the boundaries and interfaces between them. Use the `codebase-design` vocabulary (deep modules, interfaces, seams).

1. Read the modules around the change until you can say what each one owns.
2. Design the change yourself: the shape you would give it in this codebase.
3. Compare your shape with the one that was built.

Look for:

- **Responsibilities**: a module doing two jobs, or one job spread over several modules.
- **Ownership**: logic placed outside the module that owns its data or decision.
- **Leaks**: callers depending on another module's internals, storage shape, or implementation types instead of its interface.
- **Shallow interfaces**: an interface as complex as what it hides; pass-through layers.
- **Dependency direction**: domain code depending on infrastructure, transport, or UI details; new cycles.
- **Seams**: a new concern without one, or one added for a single implementation with no current need.

Report a finding only where the built shape has a concrete cost: the next change it makes harder, or the caller it breaks. Each finding proposes the better shape: which module owns what, behind which interface.

A documented repository standard wins over this review.

Out of scope: the code inside a module, and bugs.
