---
name: fix-ci
description: Get a pull request's checks green and its branch mergeable. Use when checks fail, the branch conflicts with its base, or CI bots left review threads.
disable-model-invocation: true
---

# Fix CI

Get one PR to a mergeable branch with every check green. Work on the PR's head: the checkout you were given, else `gh pr checkout <N>`. Push to its head branch. Run nothing locally; CI runs the checks.

1. **Conflicts first**: GitHub runs no checks on a conflicting PR. When the branch conflicts with its base, merge `origin/<base>` into it and keep both sides' intent.
2. **Failing checks**: for each failed check, read its log (`gh run view <id> --log-failed`) and fix the cause. Never skip, weaken, or rerun a check until it passes; a check that fails at random gets its cause fixed, or is reported with the evidence.
3. **Threads**: handle the unresolved review threads with `/resolve <PR URL>`.
4. **Push** to the head branch, wait for the checks (`gh pr checks <N> --watch`), and repeat while something fails, three rounds at most.

Done when the PR is mergeable and every check passed. Otherwise report what is left and why.
