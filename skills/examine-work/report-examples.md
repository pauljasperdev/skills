# Report examples

Sample sections from three made-up examinations of different sizes:

- **Small**: CSV export dates are off by one day. A one-line fix.
- **Medium**: rate-limit the public API. New middleware, one decision.
- **Large**: move photo resizing off the web server into a queue. An architecture change.

They show the quality and density to aim for. Size, sections and decisions come from your own work.

## Header

```
# CSV export: dates off by one day
`shopfront` · `/path/to/repo` · **Ready** · Nothing run, repo unchanged
```

```
# Photo resizing moves to a queue
`gallery` · `/path/to/repo` · **Incomplete:** 2 unverified · Nothing run, repo unchanged · Diagram: /tmp/gallery-queue.html
```

## Not verified

Large:

- **Worker memory:** a 40 MP photo may exceed the worker's 512 MB. Not measured.
- **Queue retries:** unclear whether the hosted queue's built-in retry counts attempts per job or per message.

## Tests

Small:

| Scenario | Expected |
|---|---|
| Order at 00:30 Berlin | CSV date = order page date |
| Order at 12:00 Berlin | unchanged |

- `pytest tests/export`

Medium:

| Scenario | Expected |
|---|---|
| 600 requests in a minute | all pass |
| 601st request | `429`, `Retry-After` ≤ 60 |
| Two instances, 300 each | 601st on either → `429` |
| Redis down | requests pass, warning logged |
| New minute | counter starts at 0 |

- `npm test -- rateLimit`

## Changes

Medium:

| Where | Change |
|---|---|
| `src/http/rateLimit.ts` | new middleware |
| `src/http/app.ts` | mount before the router |
| `src/config.ts` | `rateLimit.perMinute`, default 600 |

## Out of scope

Large:

- Video uploads: they use a separate pipeline and aren't slow today.

## Proposed and Today

Small. A `// Now` / `// After` pair is the whole design, with no diagram:

```python
# shopfront/export/orders_csv.py:31
# Now
"date": order.created_at.date().isoformat(),
# After
"date": local_date(order.created_at, shop.time_zone).isoformat(),  # same helper as orders/views.py:18
```

Medium. One new piece and where it plugs in:

```ts
// src/http/rateLimit.ts (new)
export const rateLimit = ({ perMinute }: RateLimitConfig): Middleware => async (req, res, next) => {
  const key = `rl:${req.apiKey.id}:${currentMinute()}`;
  const count = await redis.incr(key);
  if (count === 1) await redis.expire(key, 60);
  if (count > perMinute) return res.status(429).set("Retry-After", String(secondsToNextMinute())).end();
  next();
};
```

```ts
// src/http/app.ts:22
// Now
app.use("/api", authenticate, router);
// After
app.use("/api", authenticate, rateLimit(config.rateLimit), router);
```

Large. Diagrams for both states, then the new interfaces:

```
TODAY
browser ──POST /photos──► web ──► resize ×4 ──► S3 ──► 201
                          └─ request held 3–9 s

PROPOSED
browser ──POST /photos──► web ──► S3 original ──► 201   (<1 s)
                           └─► [new] queue: ProcessPhoto { photoId }
                                         ▼
                                [new] worker ──► resize ×4 ──► S3
                                         └─► photos.status = ready | failed
[removed] resize call in src/upload/handler.ts
```

```ts
// src/photos/worker.ts (new)
export const processPhoto = async ({ photoId }: ProcessPhoto) => {
  const original = await storage.get(originalKey(photoId));
  for (const size of SIZES) await storage.put(sizeKey(photoId, size), await resize(original, size));
  await photos.setStatus(photoId, "ready");
};
```

```sql
-- migrations/0042_photo_status.sql (new)
ALTER TABLE photos ADD COLUMN status text NOT NULL DEFAULT 'ready'
  CHECK (status IN ('processing', 'ready', 'failed'));
```

## In simple words

Small, illustrated as a timeline:

```
Berlin clock   14 Mar 23:00 ──── 15 Mar 00:30  ◄── customer orders
World clock    14 Mar 22:00 ──── 14 Mar 23:30

order page:     15 March  ✓
spreadsheet:    14 March  ✗   today
spreadsheet:    15 March  ✓   after
```

**What this is about**
- Shop owners download their orders as a spreadsheet for accounting.

**Today**
- The spreadsheet uses world time, not the shop's clock.
- Orders placed just after midnight land on the previous day.
- So daily totals in the spreadsheet don't match the order page.

**After**
- The spreadsheet uses the shop's clock, like the order page.

**What you'll notice**
- Daily totals match everywhere.

Medium, illustrated with icons:

```
TODAY                                   AFTER
🤖🤖🤖🤖 one client floods ──► 🏪          🤖🤖🤖🤖 ──► 🚦 600 a minute ──► 🏪
🧑 normal customers wait                 🧑 normal customers get through
```

**What this is about**
- Other companies' programs call our shop to fetch products and place orders.

**Today**
- There's no limit on how often they can call.
- Last week one program called 40,000 times a minute, and checkout slowed down for everyone.

**After**
- Each program gets 600 calls a minute, like a turnstile.
- Past that, it's told "wait a few seconds". Its own software already knows how to wait and retry.

**What you'll notice**
- One noisy client can no longer slow down the shop.

Large, illustrated with boxes:

```
TODAY                                     AFTER
┌───────┐  upload + resize  ┌──────┐      ┌───────┐  upload  ┌──────┐
│ phone │ ──── 7 seconds ──►│ site │      │ phone │ ── 1 s ─►│ site │
└───────┘                   └──────┘      └───────┘          └──┬───┘
                                                         to-do list
                                                                ▼
                                                           ┌────────┐
                                                           │ helper │ makes the sizes
                                                           └────────┘
```

**What this is about**
- When someone uploads a photo, we make 4 smaller copies for thumbnails and previews.

**Today**
- The upload waits until all 4 copies are made. Big photos take up to 9 seconds.
- During that time the site can serve fewer other people.

**After**
- The site saves the photo, answers right away, and puts "make copies" on a to-do list.
- A separate helper works through the list.
- It's like a restaurant that takes your order and lets the kitchen cook, instead of keeping you at the till until the food is ready.

**What you'll notice**
- Uploads feel instant.
- For a second or two, a new photo shows slightly blurry until its copies are ready.

## TL;DR

Small:

```
before:  order at 00:30 Berlin → CSV says the previous day
after:   CSV date = order page date
```

- **Problem:** the export formats `created_at` in UTC, so orders just after midnight shift a day.
- **Proposal:** use `local_date` with the shop's time zone, the same helper the order page uses.
- **Next step:** a one-line change and a test at 00:30.

Large:

```
before:  upload ─► resize ×4 in the request ─► respond   (p95 6.8 s)
after:   upload ─► store original ─► respond (<1 s) · worker resizes
```

- **Problem:** resizing runs inside the upload request, so p95 is 6.8 s and web workers sit blocked.
- **Proposal:** store the original, enqueue `ProcessPhoto`, and let a worker resize. `photos.status` tracks progress.
- **Next step:** the queue, the worker and the status column. The UI keeps showing the original until the status is `ready`.

## Decisions

Small, with nothing to decide:

```
## Decisions

No decisions. The fix has one correct form.

### Defaults I'm taking (say if not)

- The shop's time zone, not the viewer's browser. The order page does the same.
```

Medium, with one real choice:

```
### 1. Where is the limit counted?

- Today there is no limit.
- The API runs on 3 instances behind a load balancer.
- **A, recommended:** in Redis, shared by all instances.
  - Exact per API key, whichever instance takes the request.
  - One extra Redis call (~1 ms) per request. Redis already holds sessions.
- **B:** in memory on each instance.
  - No new dependency.
  - A client effectively gets 3× the limit, and every deploy resets the counters.

### Defaults I'm taking (say if not)

- 600 requests/min per API key. The busiest legitimate client peaks at 210.
- If Redis is down, let requests through and log a warning. Availability beats the limit.
```

Large, two decisions, one of them anchored in code:

````
### 1. What happens when resizing fails?

```ts
// src/upload/handler.ts:42
await resize(file, 2048); // throws → the upload fails with 500
```

- Today a failure fails the upload. The user sees an error and retries.
- With a queue, the upload has already succeeded when resizing fails.
  - Example: a corrupt HEIC uploads fine, then fails in the worker. It shows a grey box forever.
- **A, recommended:** retry 3× with backoff, then set `failed` and show "couldn't process, re-upload".
  - The user finds out. Costs one status value and one UI state.
- **B:** retry forever and alert on a stuck queue.
  - No UI work. Broken photos stay grey until someone cleans them up by hand.

### 2. May thumbnails appear after the upload returns?

- Today the thumbnail exists when the upload request returns.
- With the queue, it appears 1–5 s later.
- **A, recommended:** yes. The browser shows the original, scaled down, until the status is `ready`.
- **B:** no. Keep the thumbnail in the request and queue only the large sizes.
  - Uploads of 4 MB+ photos stay slow, and that's the complaint.
````
