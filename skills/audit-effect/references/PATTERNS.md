# Pattern hypotheses

Use the sections relevant to the scoped modules. `$effect` supplies the target
practices and version-sensitive APIs; these probes identify where to investigate
and which counterexamples prevent mechanical rewrites.

API names follow the Effect v4 guides. Spellings moved between majors and across
v4 pre-releases (`Effect.catch` was `catchAll`, `Effect.result` was `either`,
`Effect.forkChild` was `fork`), so translate each probe to the installed source
resolved in step 1 before searching or recommending.

## Dependencies and composition

Search `make*`/`create*` factories, dependency objects, concrete client imports,
`Layer.provide`, `provideMerge`, `mergeAll`, `Context.Reference`,
`Effect.serviceOption`, `Effect.provide` inside function bodies, layer-returning
functions, `Layer.fresh`, and service shapes whose operations carry a
requirement.

Trace acquisition, implementation selection, provisioning, and lifetime through
the composition root and consumers. Candidates include collaborating application
modules passed around outside the Effect environment, concrete transports selected
inside policy code, and defaults that silently remove required behavior. Acquiring
a service or overriding a low-level function does not establish that callers can
substitute its full implementation. Identify the actual substitution or ownership
cost, then check whether the proposed seam resolves it or merely moves a dependency
object.

Read each service shape for requirement leakage: an operation whose Effect type
still requires an implementation collaborator forces every caller and test double
to provide it. The guides resolve collaborators while the layer constructs the
service, leaving operations with no requirements. A requirement the caller
supplies per call, such as a request context, transaction, or `Scope`, is part of
the contract.

Count how often each layer is built. Layers are shared by reference identity
within one provision: a layer-returning function called at several sites, or
`Effect.provide(layer)` applied inside a handler, loop, or lookup, acquires its
services again each time, which matters for pools, clients, caches, and background
fibers. Service keys resolve by identifier string, so two declarations sharing one
are the same service.

Configuration-value factories, platform-binding adapters, transaction-local
helpers, and seeded test layers can be appropriate. A private helper closing over
a dependency already acquired by its owning module is ordinary implementation
detail. Layer recipes can preserve conditional, separately scoped acquisition;
compare that lifetime with any proposed shared service graph. `Layer.fresh`, a
local provide for an isolated operation, and stateless layers make repeated
construction deliberate or harmless. `provideMerge` can intentionally expose
dependencies, and a defaultable reference or `Effect.serviceOption` can have a
truthful fallback. Judge missing required authority separately from explicitly
optional operation.

## Workflows and execution

Search repeated `runPromise`/`runSync` calls, large framework callbacks, nested
runtimes, `ManagedRuntime.make`, process entry files, signal handlers,
`process.exit`, `tryPromise`, `Effect.try`, and broad `try`/`catch` blocks.

Inspect wrapper callbacks and called helpers for application sequencing, branching,
retries, or recovery hidden outside Effect. A one-line wrapper around an application
`async` workflow is the same candidate. Apply `$effect`'s minimal foreign-call
boundary rule; judge the operations enclosed, not a line-count threshold.

Follow a complete operation. Look for business policy fragmented across Promise
bridges, hardwired implementations, lost typed errors, or ambiguous resource
ownership. Prefer a cohesive Effect workflow behind a small interface, with
execution at the framework seam and named operation effects.

At a process entry point, compare the runner with the shutdown contract. The
platform `runMain` interrupts the program on termination signals so finalizers
run, reports the failure, and sets the exit code; `runPromise` with hand-written
signal handlers, `process.exit`, or catch-and-log wrappers re-implements part of
that and can skip finalizers. Where the host owns the entry point, a
`ManagedRuntime` built once from the application layer lives and is disposed with
the host; one built per call re-acquires every service.

Framework hooks and foreign SDKs need adapters. Match runtime ownership to the
host: process, request, invocation, or durable step. Verify acquisition, sharing,
and disposal before recommending that a runtime move or become shared. Scripts,
serverless invocations, tests, and framework callbacks have no process lifecycle
to manage and legitimately end in a run call. `Effect.Do`, piped versus data-first
calls, and plain `if`/`for`/`while` with `yield*` inside `Effect.gen` are
documented forms. Point-free callbacks and `flow` are a style migration unless the
passed function has overloads or optional parameters, where the guides warn that
generics can be silently erased.

## Errors and recovery

Search `orDie`, `Effect.die`, `throw` inside Effect callbacks, `catchCause`,
`catchDefect`, `sandbox`, `ignore`, `ignoreCause`, `orElseSucceed`,
`Effect.option`, timeout operators, handlers that discard their error argument,
repeated `_tag` strings, failures collected into arrays, and classification by
`instanceof`, message text, or rendered cause output.

Classify each failure as expected (typed, recoverable by callers) or a defect (a
bug or broken invariant). Candidates include expected conditions raised with
`die`, `orDie`, or a throw, which removes them from signatures, typed recovery,
and retry; defect- or cause-level recovery inside domain logic, which the guides
reserve for boundaries where continuing is explicitly safe; and whole-channel
operators (`catch`, `orElseSucceed`, `option`, `ignore`) applied to a union where
only some members mean the fallback. Name the error members that reach each
operator, then check that the fallback is truthful for all of them, that
interruption still propagates, and that diagnostics keep useful classifications
without private data.

Tagged errors match by `_tag` string: two classes sharing a tag are caught by the
same handler with no compiler or runtime warning. A wrapper that keeps only the
error's message discards its `cause`. Validation that must report every problem
needs accumulation (`Effect.validate`, `Effect.partition`, `Effect.all` in result
mode) where a fail-fast combinator or hand-collected array stands in; the guides
model several domain errors as data, not as several cause reasons.

For each deadline establish what it covers. Placed after a retry it bounds the
whole operation including waits; placed before, each attempt; a schedule's
elapsed-time limit is checked only between attempts. An uninterruptible region
delays the timeout, a detached fork used to return early keeps consuming
resources, and a timeout converted to `Option` or to silent completion is truthful
only when expiry means absence.

`orDie` on startup configuration and impossible states, `Effect.exit` or cause
handling at supervision, reporting, test, and foreign-callback boundaries, and
`ignore` on best-effort telemetry are appropriate. `Data.TaggedError`,
`Data.Error`, and `Schema.TaggedError` are all supported, and yielding an error
equals failing with it; a difference from the selected style is a style migration.
`Result` and `Option` suit pure two-case data, while `Exit` carries defects and
interruption.

## Repetition and scheduling

Search attempt counters, `while`/`for` loops around I/O, `sleep`, `setInterval`,
recursive timers, backoff arithmetic, nested retry policies, cron expressions and
libraries, and time-of-day comparisons.

Separate one pass from recurrence policy. Distinguish successful continuation
from recoverable typed failure; verify immediate execution, additional-attempt
counts, delay placement, deadlines, interruption, exhaustion, and idempotency.
Check whether SDK retries and Effect retries multiply each other.

Match the driver to the trigger: `Effect.repeat` runs at once and recurs after
success, `Effect.schedule` waits for the first slot, and `Effect.retry` recurs
after a typed failure, never after a defect or interruption. `times` and `recurs`
count runs after the first. `spaced` delays after completion; `fixed` holds a
cadence and does not replay missed intervals. A repeat stops at the first failure,
so a pass that must continue handles its expected failures while permanent errors
still surface. Server-directed delays (`Retry-After`, poll-after) belong in the
error or response the schedule reads, and a failing schedule tap fails the
operation. Calendar rules need an explicit time zone, validation before the job
starts, and a decision about daylight-saving changes.

Durable workflow steps, database leases, fencing, queue delivery, and provider
submission ambiguity carry guarantees an in-process schedule or fiber cannot
replace: a schedule persists nothing and recovers no run missed during downtime.
Ordinary collection loops and transaction-local state machines may already be the
clearest implementation.

## Concurrency and shared state

Search `Promise.all`/`allSettled`/`race`/`any`, limiter libraries, in-flight
counters, `concurrency:` and `{ concurrent: true }` options, fork calls,
un-awaited run calls, fiber Maps/Sets/arrays, cancellation flags,
`AbortController` registries, captured Promise resolvers, ready flags,
hand-written locks, array work buffers, event emitters, listener registries, and
module-level `let`/Map/array state mutated inside Effects.

Establish the intended bound from the downstream resource. `Effect.all`,
`Effect.forEach`, and `zip` run sequentially unless given a concurrency option, so
a ported `Promise.all` may have become serial, while `"unbounded"` over I/O
fan-out removes the limit a hand-rolled limiter enforced. Concurrent combinators
interrupt siblings on the first failure; `race` returns the first success and
`raceFirst` the first completion.

Name the owner of each fork. `forkChild` ends with the forking fiber,
`forkScoped` and `forkIn` with a scope, and `forkDetach` runs until it finishes
or the process exits. Candidates include a child fork for work meant to outlive
its request, a detached fork or un-awaited run call for work that belongs to a
request, layer, or scope, hand-kept fiber collections and replace-previous logic
that `FiberSet`/`FiberMap` own, and cancellation flags polled in loops where
interruption would run finalizers. A forked fiber starts only after the current
one yields, so a subscriber forked late misses earlier events and a sleep inserted
to let it start is a guess.

Map hand-rolled coordination to the contract it needs: a one-shot signal
(`Deferred`), a reusable gate (`Latch`), permits released on failure and
interruption (`Semaphore`), single-consumer distribution with a bounded,
dropping, or sliding policy (`Queue`), broadcast to subscribers established
before the publish (`PubSub`), or current value plus changes (`SubscriptionRef`).
For shared state, check whether a read, an effect, and a write on one `Ref` can
interleave with another fiber where `SynchronizedRef.updateEffect` would
serialize them. Inspect unbounded queues and pubsubs where producers can outpace
consumers, ignored `false` results from dropping buffers, and shutdown: shutting
a queue down interrupts the fibers waiting on it, and joining such a fiber
propagates that interruption where awaiting its exit does not.

Sequential execution is the documented default and is correct for ordered or
rate-sensitive work. Unbounded concurrency over a small fixed set or over grouped
substreams is a documented form. Detached forks suit process-lifetime daemons.
State confined to one fiber, a class wrapping a `Ref`, and immutable values
replaced inside a `Ref` are ordinary. In-memory primitives give no durability or
cross-process delivery.

## Caches, deduplication, and batching

Search Maps with timestamps, prune/eviction code, in-flight Promise maps,
per-call cache construction, `Effect.cached*`, `Effect.request`, and resolver
definitions. Compare keyed lookup sharing, capacity, success and failure TTLs,
invalidation, resource cleanup, and the owning lifetime with Effect Cache,
ScopedCache, or memoization facilities available in the installed version.

Check where each cache is constructed: `Cache.make`, `Effect.cached`, and a cached
resolver each create an independent cache per execution, so one built inside a
handler or per call shares nothing. Compare failure semantics before recommending
replacement: `Cache` keeps a failed lookup for its TTL unless the TTL depends on
the exit, drops an interrupted one, and may briefly exceed capacity; a resolver
cache evicts by capacity only.

Indexes, grouping Maps, in-memory persistence adapters, and authoritative shared
database caches have different contracts. Confirm those contracts before
suggesting replacement. Request batching needs a real backend batch operation;
concurrent per-item requests alone do not establish that opportunity. Where
`Effect.request` is already used, verify that requests start together, since under
the sequential default every batch holds one request, and that the resolver
closes over its services where the owning layer constructs it.

## Resource lifecycles

Search `try`/`finally`, `.close()`/`.end()`/`.destroy()`/`release` calls, `using`
declarations, temp files and directories, abort listeners, `Scope.make`,
`Scope.close`, `Effect.scoped`, `acquireRelease`, `addFinalizer`, and undo steps
in failure branches.

For each resource identify the acquisition, the release, and the scope that owns
both. Candidates include release paths that miss failure or interruption, cleanup
repeated at every call site, multi-step creation with hand-written rollback (the
guides make each step an `acquireRelease` whose release inspects the `Exit`, so
one scope unwinds completed steps in reverse order), `Effect.scoped` placed so a
resource closes before its consumer finishes or stays open for the process, and
manually created scopes without a close on every path. `onError` cleanup does not
run on success; `ensuring` and `onExit` cover every outcome.

A service whose constructor acquires resources hands their lifetime to its layer.
Closing a scope runs finalizers without interrupting work still using the
resource, and interrupting an Effect does not prove that a native operation
stopped: account for pending completion and cleanup. Manual cleanup can be
correct; evidence of duplication is not evidence of a leak.

## Streams

Search `getReader`, stream conversions, `for await`, async generators, event
listeners feeding buffers, completion flags, multipart state, cursor or
page-token loops, timer-driven emit loops, size-or-time flush buffers,
debounce/throttle helpers, latest-request counters, and `runCollect` followed by
array processing.

Investigate duplicated pull, backpressure, cursor, and cleanup mechanics around
Effect streams. Consider keeping orchestration in Stream/named Effects and
acquiring resources in scopes, with individual platform calls in adapters. Match
each source to its constructor: a step returning a page and a next cursor fits
`Stream.paginate`, where an unfold or loop carries leftover-page state; callback
and listener sources fit `Stream.callback`; async iterables need an explicit
error mapping. A resource must stay open for as long as the stream is consumed,
so look for acquisition scoped around the function that returns the stream.

Compare hand-rolled flow control with the operator's exact contract before
recommending it: bounded `mapEffect` concurrency emits in source order,
`switchMap` cancels the previous inner stream, `groupedWithin` flushes on size or
time, buffers suspend, drop, or slide, throttling counts chunks and can discard
them, a stream timeout ends the stream without failing, and `merge` waits for
both sides by default. Check that stream retry and recovery wrap only the
sub-stream whose failure is transient. Collect-then-reduce over a large or
unbounded stream is a candidate for a fold, `runForEach`, or a Sink.

Retain byte bounds, hashes, cursor validation, early termination, publication
conditions, and native body requirements. One repeated effect or a single
collection result needs no stream; `runCollect` on a small finite stream, a
manual pull loop, and a lossy buffer or throttle strategy chosen on purpose are
legitimate.

## Configuration and secrets

Search environment reads/assertions, `??`/`||` defaults on configuration,
`Config.orElse`, hand parsing of numeric or boolean settings, secret-named fields
typed as strings, `Redacted.value`, hand-written maskers, and secrets in logs,
span attributes, or error fields.

Trace configuration to its first validated representation. Check that required
configuration is explicit and every fallback truthful: the guides apply a default
only when a value is absent, treat an empty string as absent unless told
otherwise, and keep invalid input a failure, whereas `Config.orElse` also
recovers from invalid input and `||` from every falsy value.

Evaluate configuration acquisition and substitution separately from stricter
validation, new defaults, or snapshotting. Check read timing, empty/missing values,
and the existing error boundary before deciding whether a Config/provider seam
can preserve behavior. A blocked validation change need not block that seam.

Follow each secret from its source to its uses. Candidates include credentials
carried as plain strings through service shapes, values unwrapped far from the
call that needs them or stored in objects and errors, and schema-encoded redacted
values, which serialize the inner value unless JSON encoding is disallowed.

Migration scripts and host-binding adapters legitimately acquire external
configuration. Unwrapping a secret at its point of use is the supported path.

## Schemas and data modeling

Search `JSON.parse`, `as` casts on payloads, enum and branded-type casts,
hand-written type guards and assertion functions, an interface beside a validator
for one shape, custom parsers, `new Date(`/`Number(`/`parseInt(` on input,
hand-written serializers and DTO mappers, parallel validation-library or JSON
Schema definitions, `*Sync` decoders, throwing `make`/`*Unsafe`/`getOrThrow`
calls, `disableChecks`, deep-equality helpers, and stringified composite keys.

Trace untrusted input to its first validated representation and outbound values
to their encoding. Candidates include payloads cast instead of decoded, values
written to the wire or storage without the schema's encode path, coercion done by
hand around a decode, validation bypassed for input that is not trusted, and
several definitions of one shape (types, guards, serializers, JSON Schema, a
second validation library, fixtures, equality) where one schema can derive them.

Check decoding defaults against the contract in use: unknown properties are
stripped, only the first issue is reported unless all are requested, record keys
failing a key refinement are dropped, the first matching union member wins, an
optional field admits `undefined` where an optional key does not, and a decoding
fallback turns invalid input into a value. Synchronous, Result, Exit, and Option
interpreters fail at runtime on a schema with asynchronous or service-requiring
steps; the `Sync` forms, `make`, and assertions throw, and a throw inside an
Effect callback becomes a defect. Filters stay synchronous and pure.

Compare primitive stand-ins with the invariant they carry: interchangeable aliases
for identifiers (brands), wall-clock arithmetic and manual zone offsets
(`DateTime`, `Duration`), float arithmetic on money (`BigDecimal`), ad hoc result
unions and null sentinels inside domain code (`Result`, `Option`), and
hand-written equality or ordering. Equality is structural by default for plain
data and the hashed collections, while native `Set` and `Map` compare objects by
reference; structural comparison includes every field, so records carrying
timestamps or request IDs need a custom equality whose hash agrees with it.

Trusted construction and constant decoding can be synchronous, and stripping
unknown properties is the intended default. Supported class-based schemas and
tagged errors may differ from the selected style while remaining valid Effect;
classify style migrations separately and preserve existing encoded contracts and
schema derivation ownership. Null and undefined at wire and foreign boundaries,
plain arrays where `Chunk` adds no repeated concatenation, bare numbers as
milliseconds, native collections of primitives, nominal brands without
validation, plain objects without `Data` wrappers, and a `switch` with a `never`
check are sound. Derived JSON Schema is best-effort and the Arbitrary and
compiler modules are unstable, so a hand-maintained artifact can be the contract.

## HTTP, SDK, and platform adapters

Search raw `fetch`, SDK construction, response-body casts, status handling,
timeouts, cancellation, and file-system, path, or terminal built-ins outside
adapters. Follow request construction through response decoding and domain error
mapping. Identify duplicated client policy or missing typed, scoped, cancellable
behavior before recommending Effect HttpClient facilities.

Platform built-ins called from domain modules bypass the platform services, whose
value is substitution in tests and portability across runtimes; treat them as a
finding where that cost is demonstrated, and expect platform layers at the entry
point.

Supported SDKs, small raw-fetch adapters, platform-specific transports, and
built-ins inside an adapter or single-runtime script may already satisfy the
interface. Preserve provider-specific status distinctions, redaction, and
idempotency; a generic transient retry policy can be broader than the operation
permits.

## Tests

Search partial SDK fakes cast `as never`/`as any`, module mocks replacing layers,
global config/fetch/console mutation, tiny real deadlines, arbitrary
synchronization sleeps, and `Date.now()`, native timers, or `Math.random()` in
code under test.

Connect test friction to the production interface. Domain behavior should be
testable through typed adapters; provider behavior can use the real adapter with
an injected transport. Effect timing belongs under TestClock with explicit
readiness/completion coordination: the workflow is forked, the clock adjusted,
then the fiber joined. Wall-clock reads, native timers, and `Math.random()`
bypass the `Clock` and `Random` references, so virtual time and seeded randomness
cannot reach them.

Deliberate malformed-input fixtures differ from pretending an incomplete adapter
satisfies its contract. Native driver/framework tests may need module mocks or
native timers; virtual timers are not wall-clock sleeps.

## Observability

Search `console.*` and third-party logger calls inside Effects, log-level
environment checks, context interpolated into messages, hand-timed durations,
module-level counters and tally Maps, direct OpenTelemetry or metrics-client
calls, and non-trivial Effect-returning functions without a named span.

Check that logs, spans, and metrics flow through the runtime so one layer can
redirect, silence, or export them. Candidates include logging that bypasses the
logger, which escapes level control, annotations, and span events; request
context repeated in message text where an annotation covers the whole region;
causes flattened to strings; and hand-managed spans re-implementing the status
and exception recording a span on a failed effect already carries. Named
operations (`Effect.fn` per `$effect`, or `Effect.withSpan`) should expose
meaningful workflows without tracing private payloads. Confirm an exporter layer
is provided at the composition root before judging missing telemetry.

`console` inside a custom logger, at a CLI's output boundary, or in a script is
ordinary. Pure helpers and simple combinators do not each need their own traced
operation or service tag.
