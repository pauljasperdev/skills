# Normalize a nonstandard brief

Use only for an explicit technical brief that did not come from `examine-issue`. Reorganize supplied evidence and decisions without adding new design work. If a material requirement, contract, or evidence needed for implementation is absent, report the gap before dispatch.

Use this shape, omitting empty optional subsections:

```text
# <issue or change> implementation handoff

Issue: <identifier/link or none> | Workspace: <slug or not applicable>

## Technical foundation

### Contracts and ownership
<technical direction, paths/symbols, required behavior and contracts with their authority, recommended design and rationale, and implementation freedom>

### Relevant library patterns and source evidence
<existing capabilities and conventions to use; supporting references; justification for necessary custom machinery>

### Assumptions, risks, and unresolved evidence
<material non-blocking uncertainty, its consequence, and what would resolve it>

### Acceptance scenarios and proposed validation
<observable outcomes and failure cases; verified commands and working directories; existing coverage versus tests still needed>
<distinguish proposed checks from any execution results actually supplied>

## Human review

### Problem and proposed solution
<plain-language problem, proposed change, and expected result>

### Expected behavior and what stays unchanged
<concrete success examples, acceptance boundaries, and non-goals>

### Important choices
<recommendation, reason, tradeoff, and any subsequent user decision>

### Decision status
<no blocking decisions found, or how the user resolved them; preserve material non-blocking assumptions>
```
