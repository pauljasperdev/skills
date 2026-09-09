# Pattern hypotheses

Use the sections relevant to the scoped modules. `$effect` supplies the target
practices and version-sensitive APIs; these probes identify where to investigate
and which counterexamples prevent mechanical rewrites.

## Dependencies and composition

Search `make*`/`create*` factories, dependency objects, concrete client imports,
`Layer.provide`, `provideMerge`, `mergeAll`, and `Context.Reference`.

Trace acquisition, implementation selection, provisioning, and lifetime through
the composition root and consumers. Candidates include collaborating application
modules passed around outside the Effect environment, concrete transports selected
inside policy code, and defaults that silently remove required behavior. Acquiring
a service or overriding a low-level function does not establish that callers can
substitute its full implementation. Identify the actual substitution or ownership
cost, then check whether the proposed seam resolves it or merely moves a dependency
object.

Configuration-value factories, platform-binding adapters, transaction-local
helpers, and seeded test layers can be appropriate. A private helper closing over
a dependency already acquired by its owning module is ordinary implementation
detail. Layer recipes can preserve conditional, separately scoped acquisition;
compare that lifetime with any proposed shared service graph. `provideMerge` can
intentionally expose dependencies, and a defaultable reference can have a truthful
fallback. Judge missing required authority separately from explicitly optional
operation.

## Workflows and execution

Search repeated `runPromise`/`runSync` calls, large framework callbacks, nested
runtimes, and multi-operation `async` functions wrapped in one `tryPromise`.

Follow a complete operation. Look for business policy fragmented across Promise
bridges, hardwired implementations, lost typed errors, or ambiguous resource
ownership. Prefer a cohesive Effect workflow behind a small interface, with
execution at the framework seam and named operation effects.

Framework hooks and foreign SDKs need adapters. Match runtime ownership to the
host: process, request, invocation, or durable step. Verify acquisition, sharing,
and disposal before recommending that a runtime move or become shared.

## Repetition and concurrency

Search attempt counters, `while`/`for` loops around I/O, `sleep`, timers, backoff
arithmetic, manual worker bookkeeping, and nested retry policies.

Separate one pass from recurrence policy. Distinguish successful continuation
from recoverable typed failure; verify immediate execution, additional-attempt
counts, delay placement, deadlines, interruption, exhaustion, and idempotency.
Check whether SDK retries and Effect retries multiply each other. Inspect
unbounded concurrency and whether background work belongs to a scope.

Durable workflow steps, database leases, fencing, queue delivery, and provider
submission ambiguity carry guarantees an in-process schedule or fiber cannot
replace. Ordinary collection loops and transaction-local state machines may
already be the clearest implementation.

## Caches and deduplication

Search Maps with timestamps, prune/eviction code, in-flight Promise maps, and
per-call cache construction. Compare keyed lookup sharing, capacity, success and
failure TTLs, invalidation, resource cleanup, and the owning lifetime with Effect
Cache, ScopedCache, or memoization facilities available in the installed version.

Indexes, grouping Maps, in-memory persistence adapters, and authoritative shared
database caches have different contracts. Confirm those contracts before
suggesting replacement. Request batching needs a real backend batch operation;
concurrent per-item requests alone do not establish that opportunity.

## Streams and resource lifecycles

Search `getReader`, stream conversions, abort listeners, completion flags,
multipart state, manual pagination, and repeated `try`/`finally` cleanup.

Investigate duplicated pull, backpressure, cursor, and cleanup mechanics around
Effect streams. Consider keeping orchestration in Stream/named Effects and
acquiring resources in scopes, with individual platform calls in adapters.

Retain byte bounds, hashes, cursor validation, early termination, publication
conditions, and native body requirements. Interrupting an Effect does not prove
that a native operation stopped: account for pending completion and cleanup.
Manual cleanup can be correct; evidence of duplication is not evidence of a leak.

## Configuration, schemas, and errors

Search environment reads/assertions, enum casts, unknown payload casts, custom
parsers, synchronous decoders, broad cause recovery, and error reclassification.

Trace untrusted input and configuration to their first validated representation.
Check that required configuration is explicit, expected failures retain typed
recovery, and diagnostics preserve useful classifications without private data.
Inspect fallback truthfulness and whether recovery preserves interruption and
distinguishes expected failures from defects.

Evaluate configuration acquisition and substitution separately from stricter
validation, new defaults, or snapshotting. Check read timing, empty/missing values,
and the existing error boundary before deciding whether a Config/provider seam
can preserve behavior. A blocked validation change need not block that seam.

Trusted construction and constant decoding can be synchronous. Migration scripts
and host-binding adapters legitimately acquire external configuration. Foreign
Promise seams and explicit supervision can need full-cause handling. Supported
class-based schemas and tagged errors may differ from the selected style while
remaining valid Effect; classify style migrations separately and preserve
existing encoded contracts and schema derivation ownership.

## HTTP and SDK adapters

Search raw `fetch`, SDK construction, response-body casts, status handling,
timeouts, and cancellation. Follow request construction through response decoding
and domain error mapping. Identify duplicated client policy or missing typed,
scoped, cancellable behavior before recommending Effect HttpClient facilities.

Supported SDKs, small raw-fetch adapters, and platform-specific transports may
already satisfy the interface. Preserve provider-specific status distinctions,
redaction, and idempotency; a generic transient retry policy can be broader than
the operation permits.

## Tests and observability

Search partial SDK fakes cast `as never`/`as any`, module mocks replacing layers,
global config/fetch mutation, tiny real deadlines, arbitrary synchronization
sleeps, and non-trivial Effect-returning functions without named operation spans.

Connect test friction to the production interface. Domain behavior should be
testable through typed adapters; provider behavior can use the real adapter with
an injected transport. Effect timing belongs under TestClock with explicit
readiness/completion coordination. Named `Effect.fn` operations should expose
meaningful workflows without tracing private payloads.

Deliberate malformed-input fixtures differ from pretending an incomplete adapter
satisfies its contract. Native driver/framework tests may need module mocks or
native timers; virtual timers are not wall-clock sleeps. Pure helpers and simple
combinators do not each need their own traced operation or service tag.
