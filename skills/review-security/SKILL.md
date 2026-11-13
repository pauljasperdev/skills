---
name: review-security
description: Security review of a change. Looks for the vulnerabilities it introduces.
disable-model-invocation: true
---

# Security review

Find the vulnerabilities the change introduces. Use OWASP and CWE categories.

Look for:

- **Injection**: shell, SQL, path traversal, or HTML built from untrusted input.
- **Access control**: missing or bypassable authentication and authorization; data not scoped to the caller (another user's or department's records); guards whose rule differs from the intended one; trusting client-supplied identity.
- **Secrets**: hard-coded credentials; secrets in logs, errors, or client bundles.
- **Exposure**: over-broad responses, personal data in logs.
- **Unsafe defaults**: disabled verification, permissive CORS, weak cryptography; dev-only behaviour (seed users, debug routes) reachable in production.
- **Dependencies**: every new package exists in its registry, is the intended one rather than a typo or invented name, and is pinned per repository convention.

Each finding traces the path from the untrusted source to the sink.

Out of scope: bugs that are not vulnerabilities.
