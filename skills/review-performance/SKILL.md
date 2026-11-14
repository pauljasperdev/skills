---
name: review-performance
description: Performance review of a change. Looks for work, data, and cost that grow with input or load.
disable-model-invocation: true
---

# Performance review

Find the work, data, and cost the change adds that grow with input or load. Judge from the code: estimate sizes from the schema, input caps, and domain.

Look for:

- **Repeated work**: a query, model call, external request, or file read per row, item, or request where one would do; the same data loaded again on every call; independent calls awaited one after another.
- **Reads**: filters, joins, or sorts on a growing table with no fitting index; a whole set loaded and then filtered or paged in memory; rows or columns fetched that nothing uses; result sets without a limit.
- **Unbounded fan-out**: loops, retries, pages, or frames whose count comes from user input or stored data with no cap.
- **Paid calls**: model and third-party calls whose size grows with input; calls repeated on retry or reload that could be stored.
- **Blocking**: long work (model calls, OCR, document parsing) on a request path instead of a job; a slow job holding a single-worker queue.
- **Memory and payloads**: whole files, documents, or tables held in memory where a stream or page would do; large payloads sent to the client or through a queue where an id would do.
- **Growth**: tables, job rows, logs, caches, or stored files that grow per run with no expiry or bound.

Each finding names the path that reaches it today, the size at which it hurts, and why that size is realistic here.

Out of scope: micro-optimisations; code with no caller yet; sets the domain keeps small or inputs already capped; correctness.
