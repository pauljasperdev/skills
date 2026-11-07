# Design lens

**Owns**: boundaries, ownership, and structure. Use the installed `codebase-design` vocabulary (deep modules, interfaces, seams).

Look for:

- **Leaks**: callers depending on another module's internals, storage shape, or implementation types instead of its interface.
- **Shallow interfaces**: an interface as complex as what it hides; pass-through layers.
- **Ownership**: logic placed outside the module that owns its data or decision.
- **Dependency direction**: domain code depending on infrastructure, transport, or UI details; new cycles.
- **Seams**: a new concern without one, or one added for a single implementation with no current need.
- **Structural smells** (Fowler): Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man.

Rules:

- A documented repository standard overrides this lens.
- Every finding here is a judgement call. Report it only when the change shows a concrete cost, and propose the smallest correction that fits the repository and its libraries.

**Hand off**: naming, reuse, and duplication go to standards; bugs to correctness.
