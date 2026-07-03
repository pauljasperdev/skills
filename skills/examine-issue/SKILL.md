---
name: examine-issue
description: Pull a Linear issue with the linear CLI, send many narrow scout subagents plus a context-builder over the codebase, then return a concise rundown. Use when the user invokes /examine-issue, asks to examine a Linear issue before implementation, or wants a subagent-backed TODO breakdown for an issue id, issue URL, or issue title.
allowed-tools: Bash(linear:*), Bash(mkdir:*), Bash(rm:*), Bash(jq:*), subagent
---

# Examine Issue

Use this as read-only triage before implementation. Do not edit project files.

## Workflow

1. Resolve the issue id from the input. If only a title/search term is given:
   ```bash
   linear issue query --search "<term>" --all-states --limit 10 --json
   ```
   Ask the user to choose if there is no obvious single match.

2. Pull the issue into `/tmp` for subagents to read:
   ```bash
   ISSUE_ID="GEM-123"
   ISSUE_FILE="/tmp/pi-examine-issue-$ISSUE_ID.md"
   linear issue view "$ISSUE_ID" --no-pager --show-resolved-threads --no-download > "$ISSUE_FILE"
   ```

3. List available subagents, then run a fresh-context chain: parallel narrow `scout` tasks first, then one `context-builder` synthesis.

   Default scouts, dropping only clearly irrelevant ones:
   - `issue-scope`: read only the Linear issue; extract requested outcome, constraints, non-goals.
   - `code-search`: search for keywords/routes/services named by the issue; return candidate files only.
   - `existing-patterns`: inspect 1-3 analogous implementations; return patterns to copy/avoid.
   - `data-config-infra`: inspect env/config/db/infra touchpoints if the issue might need them.
   - `tests-validation`: find existing tests, scripts, QA flows, and likely validation commands.
   - `risk-questions`: identify unclear decisions, cross-package boundaries, migration/release risks.

   Keep scout prompts small. Each scout gets `ISSUE_ID`, `ISSUE_FILE`, one narrow objective, and a hard limit of about 5-10 bullets. Scouts should not synthesize the whole plan; they should return evidence-backed findings with file paths.

   The final `context-builder` reads the issue plus all scout outputs and turns them into TODOs, acceptance criteria, risks/questions, and validation ideas.

   Tell every child: read-only, no project/source edits, concise evidence-backed findings.

4. Report back with this shape:
   ```text
   Issue: <ID> — <title>
   Rundown:
   - <1-3 sentence summary>

   Likely TODOs:
   - [ ] <todo> (<file/path or area>)

   Relevant files/areas:
   - <path> — <why>

   Risks / questions:
   - <risk or question>

   Validation:
   - <command or manual check>
   ```
