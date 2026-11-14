---
name: review-security
description: Security review of a change. Looks for the vulnerabilities it introduces.
disable-model-invocation: true
---

# Security review

Find the vulnerabilities the change introduces. Use OWASP and CWE categories.

Look for:

- **Access control**: a new endpoint, job, or download without the check its siblings have, or with a hand-written check instead of the shared one; data not scoped to the caller (another user's or department's records) in lists, counts, search, and exports as well as single reads; one scope rule written twice; identity or role taken from client input; guards whose rule differs from the intended one.
- **Personal data**: patient names, record text, or model input and output in logs, errors, job payloads, URLs, or committed files; whole error or request objects logged; raw upstream errors shown to users.
- **Secrets and privileges**: hard-coded credentials; secrets, tokens, or sign-in links in logs, output, or client bundles; roles, policies, and CI jobs with more access than they need, above all jobs that run PR code with credentials.
- **Authentication**: links or tokens that can be reused, never expire, or show attacker-chosen data; deactivation that leaves sessions alive; cookies shared across environments; state-changing cookie routes without CSRF protection.
- **Injection**: shell, SQL, path, HTML, or XML built from untrusted input, including uploaded files and model output; user files served inline from the app's origin.
- **Unsafe defaults**: checks that fail open; disabled verification, permissive CORS, weak cryptography; dev-only behaviour reachable in production.
- **Dependencies**: every new package exists, is the intended one rather than a typo or invented name, and is pinned per repository convention; executed code fetched by a mutable reference.

Each finding traces the path from the untrusted source to the sink, names who can reach it (anyone, any user, another department, an admin), and whether the environment holds real personal data. Skip what needs a compromised admin, exposes nothing new, or is a trade-off the repository already records.

Out of scope: bugs that are not vulnerabilities.
