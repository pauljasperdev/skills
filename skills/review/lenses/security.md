# Security lens

**Owns**: vulnerabilities the change introduces. Use OWASP and CWE categories.

Look for:

- **Injection**: shell, SQL, path traversal, or HTML built from untrusted input.
- **Access control**: missing or bypassable authentication and authorization; trusting client-supplied identity.
- **Secrets**: hard-coded credentials; secrets in logs, errors, or client bundles.
- **Exposure**: over-broad responses, personal data in logs.
- **Unsafe defaults**: disabled verification, permissive CORS, weak cryptography.
- **Dependencies**: every new package exists in its registry, is the intended one rather than a typo or invented name, and is pinned per repository convention.

Put the path from untrusted source to sink in each finding's `evidence`.

**Hand off**: non-security bugs go to correctness.
