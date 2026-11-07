# Standards lens

**Owns**: conformance to the repository's instructions and fit with the existing code.

Look for:

- **Instruction files** from the brief: every rule the change breaks, cited as file plus rule.
- **Reuse**: helpers, utilities, or patterns already in the codebase that the change reimplements. Search the repository for them.
- **Duplication** within the change.
- **Naming**: names that hide intent, or that diverge from the codebase's existing term for the same concept.
- **Stale docs**: comments, READMEs, and instruction files the change made wrong.
- **Effect**: when the change uses Effect, run the `effect` cold review on the diff. When that skill is unavailable, say so and check against verified package sources. Review the change, not the codebase.

Rules:

- Skip what tooling enforces: lint, formatting, types.
- A broken documented rule can be `blocking`; everything else is a judgement call.

**Hand off**: boundaries and structure go to design; bugs to correctness.
