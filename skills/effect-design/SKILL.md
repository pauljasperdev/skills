---
name: effect-design
description: Effect v4 design rules. Use when designing or reviewing the interfaces, services, layers, and boundaries of Effect code.
---

# Effect design

`Effect<A, E, R>` puts success, expected failure, and required services into every signature. Design with it: the interface tells callers what can go wrong and what they must provide, services are the seams, and layers build the app once. Confirm a rule with the `effect` lookup before flagging a breach.

1. **Interfaces return `Effect` or `Stream`.** Flag: exported functions that throw, return a `Promise`, or take callbacks; error channels typed `unknown`, `Error`, or `string`.
2. **Expected errors are typed; defects are not.** `E` holds failures a caller can act on, as `Schema.TaggedError`. A failure no caller can handle becomes a defect (`orDie`). Flag: `SqlError` or `HttpClientError` leaking through a domain service.
3. **Each service owns its errors.** It wraps a dependency's error in its own tagged error, with the cause or a `reason`. Flag: a `Mailer` exposing `SmtpError`; one error class per call site.
4. **Services are the seams.** I/O, state, or a second implementation means a `Context.Service` with an interface type and a unique key, reached with `yield*`. Flag: module-level clients or singletons; `new Client()` in business logic.
5. **Service methods need nothing.** Methods have `R = never`; the layer constructor yields what the implementation needs. Flag: a method typed `Effect<_, _, Config>`.
6. **A service module ships its layers**: `layer`, `layerNoDeps`, `layerTest`. Flag: a service's private dependencies wired in `main`.
7. **Composition decides visibility.** `Layer.provide` hides a dependency, `Layer.provideMerge` exposes it. Flag: infrastructure such as `SqlClient` exposed to the whole app; layer outputs no consumer needs.
8. **One app layer, provided once at the entry point**, with observability outermost. A layer value is built once per build; sibling `provide` calls build copies. Flag: `Effect.provide` scattered through domain code; a layer factory called in several places when one instance was meant.
9. **Scopes own lifetimes.** A resource acquired in `Layer.effect` with `acquireRelease` lives as long as its layer; a background loop is a layer (`Layer.effectDiscard` with `forkScoped`). Flag: `open`/`close` on a service interface; a client created per call; `setInterval` or detached fibers with no owner.
10. **Schema is the contract at every boundary**: HTTP, config, files, rows, messages, and model output are decoded from `unknown`. Domain types are `Schema.Class` or branded; API definitions live apart from servers. Flag: IDs as bare strings; server code imported by a client.
11. **Config is read in layer constructors**, secrets as `Config.Redacted`, implementations chosen with `Layer.unwrap`. Flag: `process.env` in business logic; config passed down call chains.
12. **Values over time are Streams**: progress, events, pages. Flag: `onProgress` callbacks, `EventEmitter`, or unbounded arrays in an interface.
13. **Run once at the edge**: `NodeRuntime.runMain`, or one `ManagedRuntime` where a framework owns the entry point, disposed on shutdown. Flag: `Effect.run*` inside services; a runtime per request.
14. **Tests swap layers.** Each service offers `layerTest`; `it.effect` provides `TestClock`. Flag: `vi.mock` of modules; service tests that need a real database.

## v4, not v3

Agents often write v3. In v4: `Context.Service` replaces `Effect.Service` and `Effect.Tag`, and generates no layer. `Layer.effect` replaces `Layer.scoped`. `Effect.catch` replaces `catchAll`, `Result` replaces `Either`, `forkChild` and `forkDetach` replace `fork` and `forkDaemon`. Platform modules live in `effect` itself (`effect/http`, `effect/sql`, `effect/process`, `effect/cli`), not in `@effect/platform`.
