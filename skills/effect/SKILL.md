---
name: effect
description: Effect v4 lookup and patterns. Use when writing, reviewing, examining, or auditing Effect code.
---

# Effect

Every Effect decision rests on a **lookup** in the library, made in the current pass. Memory, earlier reads, summaries, and nearby code are leads, not sources.

## Sources

Resolve the installed `effect` version from the lockfile, then search in order:

1. `.repos/effect`, the Effect checkout. Version differs from the installed one: verify names and import paths in `node_modules/effect/src`. Absent: use `node_modules/effect` (ships `AGENTS.md`, `ai-docs/`, `src/`). Name either gap in the report.
2. `LLMS.md` (installed: `AGENTS.md`): grep the concept, open the linked `ai-docs/src/**` examples.
3. `packages/effect/src/<Module>.ts`: the export's JSDoc (`**When to use**`, `**Gotchas**`, examples), then `packages/effect/test/<Module>.test.ts`.

## Lookup

A **mechanism** is control flow or state written by hand, or reused from a local helper: catch, error flag or counter, accumulator of results or failures, loop that retries, polls, or waits, deadline, fork, lock, cache, queue, cleanup, config read, log line, parser, serializer, state machine.

Before writing or approving a mechanism:

1. Find its row in Patterns. Search the sources for the construct and for the mechanism's own words.
2. Read the closest module's JSDoc and one example or test in full.
3. Use the construct, or keep the hand-written version and cite the requirement the construct fails with the `path:line` that shows it.

Done when every mechanism cites a source. A claim without a path ("Schedule can't do this", "no combinator exists") is **unverified**: it decides nothing, and the report lists it as open.

Local code sets naming and wiring. Idiom comes from the lookup; where local code contradicts it, follow the lookup and name the mismatch.

Report one line per mechanism: mechanism → construct → `path:line`.

## Patterns

In the Look in column, `.ts` files are under `packages/effect/src/` and numbered folders under `ai-docs/src/`.

| Hand-written | Effect construct | Look in |
|---|---|---|
| `try`/`catch`, `throw`, an error turned into a boolean, `null`, counter, or status object | Failure stays in the error channel (`Schema.TaggedError` or `Data.TaggedError`); one boundary handles it with `catchTag`/`catchTags` | `01_effect/04_errors`, `Effect.ts` |
| Catch-and-continue in a loop, failures pushed to an array | `Effect.partition`, `Effect.validate`, `Effect.all` with `mode: "result"` | `Effect.ts` |
| `catch`/`orElseSucceed`/`ignore` over a whole error union | Recover only the tags the fallback is true for; `orDie` only for impossible states and startup config | `01_effect/04_errors`, `Effect.ts` |
| Route guard reading an atom with `orElseSucceed` (defects still crash the page) | `Effect.catchCause` → redirect | `Effect.ts`, `reactivity/Atom.ts` |
| Attempt counter, `while` + `sleep`, backoff arithmetic | `Effect.retry`/`Effect.repeat` with a `Schedule` | `06_schedule`, `Schedule.ts` |
| Polling loop, interval timer, time-of-day check | `Effect.repeat` with `Schedule.spaced`/`fixed`/`cron` | `06_schedule`, `Schedule.ts`, `Cron.ts` |
| Retry or wait inside a durable workflow | `Activity.retry` (attempt count, no schedule) and named `DurableClock.sleep` between attempts; a `Schedule` is in-memory | `workflow/Activity.ts`, `workflow/DurableClock.ts`, `packages/effect/test/workflow/` |
| Deadline via timers, `Promise.race`, elapsed-time checks | `Effect.timeout*`; after `retry` it bounds the whole, before it each attempt | `Effect.ts` |
| `Promise.all`, hand-made limiter, in-flight counter | `Effect.all`/`Effect.forEach` with `concurrency` | `Effect.ts` |
| Cancel flag, fiber array, replace-previous logic | Interruption, `FiberSet`/`FiberMap`/`FiberHandle`, `forkScoped` | `FiberSet.ts`, `FiberMap.ts`, `FiberHandle.ts` |
| Ready flag, captured resolver, hand-made lock, shared `let` | `Deferred`, `Latch`, `Semaphore`, `Ref`/`SynchronizedRef` | `Deferred.ts`, `Latch.ts`, `Semaphore.ts`, `SynchronizedRef.ts` |
| Buffer plus listeners, event emitter | `Queue`, `PubSub`, `SubscriptionRef` | `01_effect/07_pubsub`, `Queue.ts`, `SubscriptionRef.ts` |
| Cursor or page loop, `for await`, size-or-time flush | `Stream` (`paginate`, `callback`, `mapEffect`, `groupedWithin`) | `03_stream`, `Stream.ts` |
| `try`/`finally`, `.close()` on every path, manual rollback | `acquireRelease`, `Effect.scoped`, `addFinalizer`, scoped layer | `01_effect/05_resources`, `Scope.ts` |
| Map with timestamps, in-flight promise map | `Cache.make`, `Effect.cachedWithTTL` | `Cache.ts` |
| `process.env`, `??` defaults, hand parsing of settings | `Config` read in a layer, `Config.Redacted`; tests use `ConfigProvider` | `packages/effect/CONFIG.md`, `Config.ts` |
| `console.*`, hand timing, module-level counters | `Effect.log*`, `annotateLogs`, `Effect.fn`/`withSpan`, `Metric` | `08_observability`, `Logger.ts`, `Metric.ts` |
| Dependency object passed around, `provide` inside a handler | `Context.Service` plus `Layer`, built once at the root | `01_effect/03_services`, `Layer.ts` |
| Function that only returns `Effect.gen` | `Effect.fn("name")` | `LLMS.md` → Writing Effect code |
| `JSON.parse` plus cast, hand-written guard or serializer | `Schema.decodeUnknownEffect`/encode, one schema per shape | `01_effect/02_schema`, `packages/effect/SCHEMA.md` |
| Library value returned across RPC as-is, typed by inference | Decode into the contract schema before returning | `rpc/Rpc.ts`, `01_effect/02_schema` |
| `runPromise` mid-workflow, signal handlers, `process.exit` | One program run at the edge (`runMain`, `ManagedRuntime`) | `01_effect/06_running`, `ManagedRuntime.ts` |
| Real sleeps, `Date.now()`, `Math.random()` in tests | `TestClock`, `Deferred`/`Latch` synchronization, `it.effect` | `09_testing`, `testing/TestClock.ts` |

Documented forms that stay: plain `for`/`if` with `yield*` over a collection, sequential `Effect.all`, run calls at script, test, and framework-callback edges, `console` at a CLI's output boundary. A valid API in a different style is a style note.

## Review

Run a **cold review** on every Effect diff: a fresh subagent briefed with the diff command, the untracked files, and this task, and without the implementation's reasons:

> Load `$effect`. For every mechanism in the diff, cite the construct that models it with `path:line`, or the `path:line` showing none fits. Report each departure with its `file:line`. A finding or rejection without a path is unverified.

Fix each finding by re-solving the whole mechanism from the lookup. A finding you reject goes to the human in the report, with the source that refutes it.

When a confirmed finding has no row in Patterns, end the report with the row to add, written generally.
