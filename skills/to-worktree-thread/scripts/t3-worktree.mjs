#!/usr/bin/env node

import { realpath } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { openWorktreeThread, runCli } from "../../to-thread/scripts/t3-worktree.mjs";

export { openWorktreeThread };

const entryPath = process.argv[1] ? await realpath(process.argv[1]).catch(() => null) : null;
if (entryPath && import.meta.url === pathToFileURL(entryPath).href) {
  await runCli(openWorktreeThread);
}
