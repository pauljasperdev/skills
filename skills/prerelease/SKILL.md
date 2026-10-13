---
name: prerelease
description: Open or update the single dev-to-pre promotion PR for CI to deploy and tag as a release candidate.
disable-model-invocation: true
---

# Prerelease

1. Read the repository's release procedure and applicable agent guidance. Resolve the canonical repository and fetch its `dev`, `pre`, and tags. Use the remote branch heads even when the current checkout is a feature branch. Inspect the commits and diff between `pre` and `dev`, using the latest release tag for context. If there are no changes to promote, report that and stop.
2. Find the existing open PR from this repository's `dev` branch to `pre`, or create it when absent. Use the title `Prerelease` and a concise summary of the changes being promoted. Keep one promotion PR; preparation leaves source files and the checkout unchanged. Do not create release branches or preparation PRs, bump manifest versions, commit, push to protected branches, or change branch protections.
3. Select the bump through the promotion PR's labels: no bump label for patch (the default), `release:minor` for an explicitly requested minor release, or `release:major` for an explicitly requested major release. Remove the other bump labels so the selection is unambiguous. Create the requested label if it does not exist. CI tags the deployed `pre` commit as the next release candidate of that version.
4. Read the state of the deployment check the procedure requires for this promotion on the PR's head commit. When no deployment run for that commit has passed, is running, or is queued, dispatch the repository's deployment workflow for `dev` as the procedure describes. Do not wait for the run.
5. Verify the PR has this repository's `dev` as its head and `pre` as its base, with the intended bump selection. Return its link and the deployment check's state: passed, failed with the failing step, or running with the run link. Then stop. The owner merges with a merge commit; do not merge, enable auto-merge, tag, or publish as part of this skill.
