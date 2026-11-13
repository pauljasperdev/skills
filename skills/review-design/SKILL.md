---
name: review-design
description: Design review of a change. Judges its interfaces, where it puts responsibilities, and the boundaries between modules.
disable-model-invocation: true
---

# Design review

Judge what callers see and where code lives: interfaces, responsibilities, and the boundaries between modules. Use the `codebase-design` vocabulary (deep modules, interfaces, seams).

1. Read the modules around the change until you can say what each one owns.
2. Design the change yourself: the interfaces and placement you would give it in this codebase, for the need it serves today.
3. Compare your shape with the one that was built.

Look for:

- **Responsibilities**: a module, package, or deployable doing two jobs, or one job spread over several; a package whose name does not match what it holds.
- **Ownership**: logic or data placed outside the module that owns it.
- **Leaks**: callers depending on another module's internals, storage shape, or implementation types; vendor names and quirks outside their adapter.
- **Interfaces**: a module interface as complex as what it hides; pass-through layers; failures returned as null, flags, or wrapped successes instead of typed errors; callbacks where the module could return events; flags where an adapter should absorb the difference.
- **Cross-cutting concerns**: auth, access scope, retries, or rate limits repeated per handler instead of enforced once in a layer.
- **Dependency direction**: domain code depending on server, transport, UI, or infrastructure; client code importing server packages; code that knows which environment it runs in.
- **Third-party code**: a library wrapped more than once or leaking past its edge; a hand-built subsystem a maintained library covers.
- **Seams**: an external provider without one; a seam inside the codebase with a single implementation and no current need.
- **Ahead of need**: modules, layers, config switches, entities, compat code, or features no current caller uses; old code's structure carried over as precedent.

Report a finding only where the built shape has a concrete cost: the next change it makes harder, or the caller it breaks. Each finding proposes the better shape: which module owns what, behind which interface.

A documented repository standard wins over this review.

Out of scope: code that callers cannot see, and bugs.
