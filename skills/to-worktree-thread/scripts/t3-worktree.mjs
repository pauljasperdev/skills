#!/usr/bin/env node

import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { openWorktreeThread, runCli } from "../../to-thread/scripts/t3-worktree.mjs";

export { openWorktreeThread };

if (process.argv[1] && import.meta.url === pathToFileURL(await realpath(process.argv[1])).href) {
  await runCli(openWorktreeThread);
}
