---
name: examine-issue
disable-model-invocation: true
description: Read-only Linear issue triage with scout subagents and a TODO rundown.
allowed-tools: Bash(linear:*), Bash(mkdir:*), Bash(rm:*), Bash(jq:*), Bash(cat:*), Bash(printf:*), subagent
---

# Examine Issue

`examine-issue` is reconnaissance before implementation. Keep it read-only: do not edit project files, change Linear state, create branches, install dependencies, or start implementation.

## Steps

1. Resolve exactly one Linear issue.
   - If the input includes an id like `GEM-123` or a Linear URL, use that id.
   - If the input is a title/search term, run:
     ```bash
     linear issue query --search "<term>" --all-states --limit 10 --json
     ```
     Ask the user to choose if there is no obvious single match.

   Completion criterion: exactly one issue id is known.

2. Snapshot the issue into `/tmp` for child agents.
   ```bash
   ISSUE_ID="GEM-123"
   WORK_DIR="/tmp/pi-examine-issue-$ISSUE_ID"
   ISSUE_FILE="$WORK_DIR/issue.md"
   rm -rf "$WORK_DIR"
   mkdir -p "$WORK_DIR"
   linear issue view "$ISSUE_ID" --no-pager --show-resolved-threads --no-download > "$ISSUE_FILE"
   ```

   Completion criterion: `ISSUE_FILE` exists and contains the issue title, description, comments, and resolved threads available from Linear.

3. Send a scout fanout.
   - First list available subagents.
   - Use fresh context for scouts so each one does independent legwork.
   - Prefer `context-builder` for scout tasks when available; otherwise use the most read-only-capable available agent.
   - Run relevant scouts in parallel. Drop a scout only when the issue clearly cannot touch that area.
   - Tell every scout: read-only, no project/source edits, concise evidence-backed findings, file paths when available, no full implementation plan.

   Scout pack:
   - `issue-scope`: read only `ISSUE_FILE`; extract requested outcome, constraints, non-goals, and acceptance hints.
   - `code-search`: search keywords/routes/services named by the issue; return candidate files/areas only.
   - `existing-patterns`: inspect 1-3 analogous implementations; return patterns to copy or avoid.
   - `data-config-infra`: inspect env/config/db/infra touchpoints if the issue might need them.
   - `tests-validation`: find existing tests, scripts, QA flows, and likely validation commands.
   - `risk-questions`: identify unclear decisions, cross-package boundaries, migrations, rollout, and release risks.

   Completion criterion: every relevant scout returns either evidence-backed findings or an explicit “no relevant evidence found”; no scout edits files or writes the whole plan.

4. Synthesize the scout outputs.
   Use `context-builder` for the final synthesis when available; otherwise synthesize inline. Feed it `ISSUE_FILE` plus every scout result. The synthesis should turn evidence into TODOs, acceptance criteria, risks/questions, and validation ideas without implementing anything.

   Completion criterion: every scout finding is either represented in the rundown or intentionally omitted as irrelevant.

5. Report the rundown.
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

   Completion criterion: the report contains the issue, likely TODOs, relevant files/areas, risks/questions, and validation, with no implementation changes made.
