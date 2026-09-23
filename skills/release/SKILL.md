---
name: release
description: Bump the version and open a release PR to main summarizing changes since the last version.
disable-model-invocation: true
---

# Release

1. Read the branch's git log back to the last version bump and inspect the diff since that commit.
2. Bump the root version (patch by default, or minor/major when requested), commit as `release: vX.Y.Z`, and push. Skip local checks.
3. Create or update the branch's PR to `main`, titled `Release vX.Y.Z`, with a concise summary of those commits and the diff. Return the PR link and stop.
