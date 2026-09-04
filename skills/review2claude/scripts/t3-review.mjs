#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import { readFile, realpath } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const DEFAULT_TIMEOUT_MS = 30_000;
const DISPATCH_TIMEOUT_MS = 180_000;
const VERIFY_TIMEOUT_MS = 20_000;
const MAX_ARGS_CHARS = 500;
const REVIEW_MODEL_SELECTION = Object.freeze({
  instanceId: "claudeAgent",
  model: "claude-fable-5-1",
  options: Object.freeze([Object.freeze({ id: "effort", value: "high" })]),
});
const TITLE_SUFFIX = /\s*·\s*(implementation|review|examination)(\s+\d+)?$/i;

class ReviewError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "ReviewError";
    this.code = code;
    this.details = details;
  }
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function fail(code, message, details) {
  throw new ReviewError(code, message, details);
}

function trimForError(value, maxLength = 1_500) {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (!text) return "";
  return text.length <= maxLength ? text : `${text.slice(0, maxLength)}…`;
}

async function readJson(filePath, code) {
  try {
    return JSON.parse(await readFile(filePath, "utf8"));
  } catch {
    fail(code, `Could not read valid JSON from ${filePath}.`);
  }
}

async function fetchJson(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  let response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { connection: "close", ...(options.headers ?? {}) },
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    fail("T3_REQUEST_FAILED", `T3 request failed: ${options.method ?? "GET"} ${url.pathname}`);
  }

  const responseText = await response.text();
  let body = null;
  if (responseText.length > 0) {
    try {
      body = JSON.parse(responseText);
    } catch {
      body = responseText;
    }
  }
  if (!response.ok) {
    fail("T3_API_ERROR", `T3 returned HTTP ${response.status} for ${options.method ?? "GET"} ${url.pathname}.`, {
      status: response.status,
      body: trimForError(body),
    });
  }
  return body;
}

async function discoverRuntime(t3Home) {
  for (const stateDirectory of ["userdata", "dev"]) {
    const runtimePath = path.join(t3Home, stateDirectory, "server-runtime.json");
    let state;
    try {
      state = await readJson(runtimePath, "T3_RUNTIME_INVALID");
    } catch (error) {
      if (error instanceof ReviewError) continue;
      throw error;
    }
    if (
      state?.version !== 1 ||
      typeof state.origin !== "string" ||
      typeof state.port !== "number" ||
      typeof state.pid !== "number"
    ) {
      continue;
    }
    let descriptor;
    try {
      descriptor = await fetchJson(new URL("/.well-known/t3/environment", state.origin), {}, 2_500);
    } catch {
      continue;
    }
    if (typeof descriptor?.environmentId === "string" && typeof descriptor?.serverVersion === "string") {
      return { ...state, ...descriptor, runtimePath, t3Home };
    }
  }
  fail("T3_SERVER_UNAVAILABLE", "No running T3 Code server was found. Start T3 Code and retry.", { t3Home });
}

async function runT3Cli(runtime, args, { allowFailure = false } = {}) {
  try {
    return await execFile(
      "npx",
      ["--yes", `t3@${runtime.serverVersion}`, ...args, "--base-dir", runtime.t3Home],
      {
        cwd: tmpdir(),
        encoding: "utf8",
        maxBuffer: 4 * 1024 * 1024,
        timeout: 90_000,
        env: {
          ...process.env,
          npm_config_loglevel: "error",
          npm_config_update_notifier: "false",
        },
      },
    );
  } catch {
    if (allowFailure) return null;
    fail("T3_AUTH_CLI_FAILED", "The official T3 CLI could not issue a local API session.", {
      serverVersion: runtime.serverVersion,
    });
  }
}

async function withSession(runtime, run) {
  const issuedResult = await runT3Cli(runtime, [
    "auth",
    "session",
    "issue",
    "--json",
    "--ttl",
    "10m",
    "--label",
    "review2claude",
    "--subject",
    "review2claude",
  ]);

  let session;
  try {
    session = JSON.parse(issuedResult.stdout);
  } catch {
    fail("T3_AUTH_INVALID", "The official T3 CLI returned an invalid session credential.");
  }
  if (typeof session?.sessionId !== "string" || typeof session?.token !== "string") {
    fail("T3_AUTH_INVALID", "The official T3 CLI returned an incomplete session credential.");
  }

  try {
    return await run(session.token);
  } finally {
    const revoked = await runT3Cli(
      runtime,
      ["auth", "session", "revoke", session.sessionId],
      { allowFailure: true },
    );
    if (revoked === null) {
      process.stderr.write("Warning: the temporary review2claude API session could not be revoked.\n");
    }
  }
}

async function dataToText(data) {
  if (typeof data === "string") return data;
  if (data instanceof ArrayBuffer) return new TextDecoder().decode(data);
  if (ArrayBuffer.isView(data)) {
    return new TextDecoder().decode(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  }
  if (typeof Blob !== "undefined" && data instanceof Blob) return await data.text();
  fail("T3_RPC_PROTOCOL_ERROR", "T3 returned an unsupported WebSocket message type.");
}

class RpcSocket {
  constructor(socket) {
    this.socket = socket;
    this.pending = new Map();
    this.closed = false;
    socket.addEventListener("message", (event) => void this.handleMessage(event.data));
    socket.addEventListener("close", () => {
      this.closed = true;
      this.rejectAll(new ReviewError("T3_RPC_CLOSED", "The T3 WebSocket closed unexpectedly."));
    });
    socket.addEventListener("error", () => {
      this.rejectAll(new ReviewError("T3_RPC_FAILED", "The T3 WebSocket reported an error."));
    });
  }

  static async connect(url) {
    if (typeof globalThis.WebSocket !== "function") {
      fail("WEBSOCKET_UNAVAILABLE", "This adapter requires Node.js 22 or another runtime with WebSocket support.");
    }
    const socket = new globalThis.WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new ReviewError("T3_RPC_TIMEOUT", "Timed out connecting to the T3 WebSocket.")),
        10_000,
      );
      socket.addEventListener("open", () => {
        clearTimeout(timer);
        resolve();
      }, { once: true });
      socket.addEventListener("error", () => {
        clearTimeout(timer);
        reject(new ReviewError("T3_RPC_FAILED", "Could not connect to the T3 WebSocket."));
      }, { once: true });
    });
    return new RpcSocket(socket);
  }

  async handleMessage(data) {
    let decoded;
    try {
      decoded = JSON.parse(await dataToText(data));
    } catch (error) {
      this.rejectAll(error instanceof ReviewError
        ? error
        : new ReviewError("T3_RPC_PROTOCOL_ERROR", "T3 returned invalid WebSocket JSON."));
      return;
    }
    for (const message of Array.isArray(decoded) ? decoded : [decoded]) {
      if (message?._tag === "Pong") continue;
      if (message?._tag === "ClientProtocolError") {
        this.rejectAll(new ReviewError("T3_RPC_PROTOCOL_ERROR", "T3 rejected the WebSocket RPC protocol.", {
          error: trimForError(message.error),
        }));
        continue;
      }
      if (message?._tag === "Defect") {
        this.rejectAll(new ReviewError("T3_RPC_DEFECT", "T3 reported a WebSocket RPC defect.", {
          defect: trimForError(message.defect),
        }));
        continue;
      }
      if (message?._tag !== "Exit") continue;
      const pending = this.pending.get(message.requestId);
      if (!pending) continue;
      this.pending.delete(message.requestId);
      clearTimeout(pending.timer);
      if (message.exit?._tag === "Success") pending.resolve(message.exit.value);
      else pending.reject(new ReviewError("T3_RPC_COMMAND_FAILED", `T3 rejected RPC ${pending.tag}.`, {
        cause: trimForError(message.exit?.cause),
      }));
    }
  }

  rejectAll(error) {
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.reject(error);
    }
    this.pending.clear();
  }

  call(tag, payload, timeoutMs = DEFAULT_TIMEOUT_MS) {
    if (this.closed || this.socket.readyState !== globalThis.WebSocket.OPEN) {
      return Promise.reject(new ReviewError("T3_RPC_CLOSED", "The T3 WebSocket is not open."));
    }
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new ReviewError("T3_RPC_TIMEOUT", `Timed out waiting for RPC ${tag}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, tag });
      this.socket.send(JSON.stringify({ _tag: "Request", id, tag, payload, headers: [] }));
    });
  }

  close() {
    if (!this.closed) this.socket.close(1000);
    this.closed = true;
  }
}

async function withRpc(runtime, token, run) {
  const issued = await fetchJson(new URL("/api/auth/websocket-ticket", runtime.origin), {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
  });
  if (typeof issued?.ticket !== "string" || issued.ticket.length === 0) {
    fail("T3_WS_TICKET_INVALID", "T3 returned an invalid WebSocket ticket.");
  }
  const url = new URL(runtime.origin);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = "/ws";
  url.search = "";
  url.searchParams.set("wsTicket", issued.ticket);
  const rpc = await RpcSocket.connect(url);
  try {
    await rpc.call("server.probe", {});
    return await run(rpc);
  } finally {
    rpc.close();
  }
}

async function authenticatedGet(runtime, token, pathname) {
  return await fetchJson(new URL(pathname, runtime.origin), {
    headers: { authorization: `Bearer ${token}` },
  });
}

async function canonicalPath(inputPath) {
  try {
    return await realpath(path.resolve(inputPath));
  } catch {
    fail("WORKSPACE_NOT_FOUND", `Workspace does not exist: ${inputPath}`);
  }
}

async function gitTopLevel(cwd) {
  try {
    const result = await execFile("git", ["-C", cwd, "rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      maxBuffer: 1024 * 1024,
      timeout: 30_000,
    });
    return await canonicalPath(result.stdout.trim());
  } catch {
    fail("WORKTREE_NOT_FOUND", `${cwd} is not inside a Git worktree.`);
  }
}

async function gitOutput(cwd, args, code, message) {
  try {
    const result = await execFile("git", ["-C", cwd, ...args], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 30_000,
    });
    return result.stdout.trim();
  } catch {
    fail(code, message, { cwd, args });
  }
}

function validateFableProvider(config) {
  const provider = (config?.providers ?? []).find(
    (candidate) => candidate?.instanceId === REVIEW_MODEL_SELECTION.instanceId,
  );
  if (!provider || provider.status !== "ready") {
    fail("T3_REVIEW_PROVIDER_UNAVAILABLE", "The Claude Code provider is not ready in T3.", {
      instanceId: REVIEW_MODEL_SELECTION.instanceId,
      status: provider?.status ?? "missing",
    });
  }
  const model = (provider.models ?? []).find(
    (candidate) => candidate?.slug === REVIEW_MODEL_SELECTION.model,
  );
  if (!model) {
    fail("T3_REVIEW_MODEL_UNAVAILABLE", "Claude Code does not expose the required Fable 5.1 model.", {
      model: REVIEW_MODEL_SELECTION.model,
    });
  }
  const supportsHigh = (model.capabilities?.optionDescriptors ?? []).some(
    (descriptor) => descriptor?.id === "effort" &&
      (descriptor.options ?? []).some((option) => option?.id === "high"),
  );
  if (!supportsHigh) {
    fail("T3_REVIEW_OPTIONS_UNAVAILABLE", "Claude Code does not support high effort for Fable 5.1.");
  }
}

function validateSpec(spec) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    fail("INPUT_INVALID", "open --json expects one JSON object on stdin.");
  }
  if (spec.cwd !== undefined && (typeof spec.cwd !== "string" || spec.cwd.length === 0)) {
    fail("CWD_INVALID", "cwd must be a non-empty path when supplied.");
  }
  if (spec.args !== undefined) {
    if (typeof spec.args !== "string") fail("ARGS_INVALID", "args must be a string when supplied.");
    if (spec.args.length > MAX_ARGS_CHARS) {
      fail("ARGS_TOO_LARGE", `args exceeds ${MAX_ARGS_CHARS} characters.`);
    }
    if (spec.args.includes("\n")) fail("ARGS_INVALID", "args must be a single line.");
  }
  return spec;
}

async function gitCommonDirectory(cwd) {
  try {
    const result = await execFile("git", ["-C", cwd, "rev-parse", "--git-common-dir"], {
      encoding: "utf8",
      maxBuffer: 4 * 1024 * 1024,
      timeout: 30_000,
    });
    const commonDirectory = result.stdout.trim();
    return await realpath(
      path.isAbsolute(commonDirectory) ? commonDirectory : path.resolve(cwd, commonDirectory),
    );
  } catch {
    return null;
  }
}

async function resolveProject(shell, cwd) {
  const exactMatches = [];
  for (const project of shell.projects ?? []) {
    if (typeof project?.workspaceRoot !== "string") continue;
    try {
      if ((await realpath(project.workspaceRoot)) === cwd) exactMatches.push(project);
    } catch {
      // Ignore stale saved projects.
    }
  }
  if (exactMatches.length === 1) return { project: exactMatches[0], matchedBy: "exact-path" };
  if (exactMatches.length > 1) {
    fail("T3_PROJECT_AMBIGUOUS", `Multiple saved T3 projects exactly match ${cwd}.`, {
      matches: exactMatches.map((project) => project.id),
    });
  }

  const commonDirectory = await gitCommonDirectory(cwd);
  const repositoryMatches = [];
  if (commonDirectory !== null) {
    for (const project of shell.projects ?? []) {
      if (typeof project?.workspaceRoot !== "string") continue;
      if ((await gitCommonDirectory(project.workspaceRoot)) === commonDirectory) {
        repositoryMatches.push(project);
      }
    }
  }
  if (repositoryMatches.length === 1) {
    return { project: repositoryMatches[0], matchedBy: "git-common-directory" };
  }
  if (repositoryMatches.length > 1) {
    fail("T3_PROJECT_AMBIGUOUS", `Multiple saved T3 projects use the Git repository for ${cwd}.`, {
      commonDirectory,
      matches: repositoryMatches.map((project) => project.id),
    });
  }
  fail("T3_PROJECT_NOT_FOUND", `No saved T3 project matches the checkout at ${cwd}.`, {
    commonDirectory,
    savedProjects: (shell.projects ?? [])
      .filter((project) => typeof project?.workspaceRoot === "string")
      .map((project) => project.workspaceRoot),
  });
}

async function collectWorktreeThreads(shell, worktreePath) {
  const matches = [];
  for (const thread of shell.threads ?? []) {
    if (thread?.archivedAt != null || typeof thread?.worktreePath !== "string") continue;
    try {
      if ((await realpath(thread.worktreePath)) === worktreePath) matches.push(thread);
    } catch {
      // Ignore stale thread paths.
    }
  }
  return matches;
}

function stripTitleSuffix(title) {
  let stripped = typeof title === "string" ? title.trim() : "";
  let previous = null;
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripped.replace(TITLE_SUFFIX, "").trim();
  }
  return stripped;
}

function titleFromBranch(branch) {
  const leaf = branch.split("/").pop() ?? branch;
  const issueMatch = leaf.match(/^([A-Za-z][A-Za-z0-9]*-\d+)-(.+)$/);
  if (!issueMatch) return leaf.replace(/[-_]+/g, " ").trim() || branch;
  const slug = issueMatch[2].replace(/[-_]+/g, " ").trim();
  return slug.length > 0 ? `${issueMatch[1].toUpperCase()} — ${slug}` : issueMatch[1].toUpperCase();
}

function resolveBaseTitle(threads, branch) {
  const candidates = threads
    .map((thread) => stripTitleSuffix(thread.title))
    .filter((title) => title.length > 0)
    .sort((left, right) => left.length - right.length || left.localeCompare(right));
  return candidates[0] ?? titleFromBranch(branch);
}

function reviewPrompt(args) {
  const suffix = typeof args === "string" && args.trim().length > 0 ? ` ${args.trim()}` : "";
  return `/review${suffix}`;
}

async function verifyCreated(runtime, token, expected) {
  const deadline = Date.now() + VERIFY_TIMEOUT_MS;
  let lastObserved = {};
  while (Date.now() < deadline) {
    const shell = await authenticatedGet(runtime, token, "/api/orchestration/shell");
    const thread = (shell.threads ?? []).find((candidate) => candidate?.id === expected.threadId);
    if (!thread) {
      lastObserved = { thread: "missing" };
      await sleep(250);
      continue;
    }
    const detail = await authenticatedGet(
      runtime,
      token,
      `/api/orchestration/threads/${encodeURIComponent(expected.threadId)}?turnLimit=1`,
    );
    const messagePresent = (detail?.thread?.messages ?? []).some(
      (message) => message?.id === expected.messageId && message?.text === expected.prompt,
    );
    const options = new Map(
      (thread.modelSelection?.options ?? []).map((option) => [option?.id, option?.value]),
    );
    const valid =
      thread.projectId === expected.projectId &&
      thread.title === expected.title &&
      thread.worktreePath === expected.worktreePath &&
      thread.branch === expected.branch &&
      thread.modelSelection?.instanceId === REVIEW_MODEL_SELECTION.instanceId &&
      thread.modelSelection?.model === REVIEW_MODEL_SELECTION.model &&
      options.get("effort") === "high" &&
      messagePresent &&
      ["running", "completed"].includes(detail?.thread?.latestTurn?.state ?? thread.latestTurn?.state);
    if (valid) return thread;
    lastObserved = {
      title: thread.title,
      projectId: thread.projectId,
      worktreePath: thread.worktreePath,
      branch: thread.branch,
      modelSelection: thread.modelSelection,
      messagePresent,
      turnState: detail?.thread?.latestTurn?.state ?? thread.latestTurn?.state,
    };
    await sleep(250);
  }
  fail("T3_VERIFICATION_TIMEOUT", "T3 started the review thread but verification timed out.", lastObserved);
}

async function openReview(rawSpec, t3Home, dryRun) {
  const spec = validateSpec(rawSpec);
  const requestedCwd = await canonicalPath(spec.cwd ?? process.cwd());
  const worktreePath = await gitTopLevel(requestedCwd);
  const branch = await gitOutput(
    worktreePath,
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    "WORKTREE_DETACHED",
    "review2claude requires a branch-backed worktree.",
  );
  const runtime = await discoverRuntime(t3Home);
  return await withSession(runtime, async (token) => {
    const shell = await authenticatedGet(runtime, token, "/api/orchestration/shell");
    const siblings = await collectWorktreeThreads(shell, worktreePath);
    let projectId;
    let matchedBy;
    if (siblings.length > 0) {
      const projectIds = [...new Set(siblings.map((thread) => thread.projectId))];
      if (projectIds.length !== 1) {
        fail("T3_PROJECT_AMBIGUOUS", "Threads on this worktree disagree about the saved T3 project.", {
          worktreePath,
          projectIds,
        });
      }
      projectId = projectIds[0];
      matchedBy = "worktree-thread";
      if (!(shell.projects ?? []).some((candidate) => candidate?.id === projectId)) {
        fail("T3_PROJECT_NOT_FOUND", "The worktree's saved T3 project is unavailable.", { projectId });
      }
    } else {
      const resolved = await resolveProject(shell, worktreePath);
      projectId = resolved.project.id;
      matchedBy = resolved.matchedBy;
    }

    const baseTitle = resolveBaseTitle(siblings, branch);
    const issue = baseTitle.match(/\b[A-Z][A-Z0-9]*-\d+\b/)?.[0]
      ?? branch.match(/\b[A-Za-z][A-Za-z0-9]*-\d+\b/)?.[0]?.toUpperCase()
      ?? null;
    const reviewPattern = new RegExp(
      `^${baseTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*·\\s*review(\\s+\\d+)?$`,
      "i",
    );
    const existingReviews = siblings.filter((thread) => reviewPattern.test(thread.title ?? ""));
    if (existingReviews.length > 0 && spec.allowDuplicate !== true) {
      const existing = existingReviews[existingReviews.length - 1];
      return {
        ok: true,
        action: "existing",
        issue,
        branch,
        worktreePath,
        projectMatchedBy: matchedBy,
        thread: {
          id: existing.id,
          title: existing.title,
          worktreePath: existing.worktreePath,
          modelSelection: existing.modelSelection,
        },
      };
    }
    const ordinal = existingReviews.length + 1;
    const title = ordinal === 1 ? `${baseTitle} · review` : `${baseTitle} · review ${ordinal}`;

    return await withRpc(runtime, token, async (rpc) => {
      validateFableProvider(await rpc.call("server.getConfig", {}));
      const threadId = randomUUID();
      const messageId = randomUUID();
      const prompt = reviewPrompt(spec.args);
      const createdAt = new Date().toISOString();
      const command = {
        type: "thread.turn.start",
        commandId: randomUUID(),
        threadId,
        message: { messageId, role: "user", text: prompt, attachments: [] },
        modelSelection: REVIEW_MODEL_SELECTION,
        runtimeMode: "full-access",
        interactionMode: "default",
        bootstrap: {
          createThread: {
            projectId,
            title,
            modelSelection: REVIEW_MODEL_SELECTION,
            runtimeMode: "full-access",
            interactionMode: "default",
            branch,
            worktreePath,
            createdAt,
          },
          runSetupScript: false,
        },
        createdAt,
      };

      if (dryRun) {
        return {
          ok: true,
          action: "dry-run",
          issue,
          branch,
          worktreePath,
          projectMatchedBy: matchedBy,
          thread: { id: threadId, title, modelSelection: REVIEW_MODEL_SELECTION, prompt },
        };
      }

      const dispatch = await rpc.call("orchestration.dispatchCommand", command, DISPATCH_TIMEOUT_MS);
      const verified = await verifyCreated(runtime, token, {
        threadId,
        messageId,
        prompt,
        title,
        projectId,
        worktreePath,
        branch,
      });
      return {
        ok: true,
        action: "created",
        issue,
        branch,
        worktreePath,
        projectMatchedBy: matchedBy,
        prompt,
        dispatch,
        thread: {
          id: verified.id,
          title: verified.title,
          branch: verified.branch,
          worktreePath: verified.worktreePath,
          modelSelection: verified.modelSelection,
          turnState: verified.latestTurn?.state,
        },
      };
    });
  });
}

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (argument === "--json" || argument === "--dry-run") {
      options[argument.slice(2)] = true;
      continue;
    }
    if (argument === "--t3-home") {
      const value = rest[index + 1];
      if (value === undefined) fail("ARGUMENT_INVALID", `${argument} requires a value.`);
      options[argument.slice(2)] = value;
      index += 1;
      continue;
    }
    fail("ARGUMENT_INVALID", `Unknown argument: ${argument}`);
  }
  return { command, options };
}

async function readStdinJson() {
  let input = "";
  for await (const chunk of process.stdin) input += chunk;
  if (input.trim().length === 0) fail("INPUT_REQUIRED", "Expected a JSON object on stdin.");
  try {
    return JSON.parse(input);
  } catch {
    fail("INPUT_INVALID", "stdin did not contain valid JSON.");
  }
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const t3Home = path.resolve(options["t3-home"] ?? process.env.T3CODE_HOME ?? path.join(homedir(), ".t3"));
  if (command === "open") {
    if (options.json !== true) fail("ARGUMENT_INVALID", "open requires --json.");
    return await openReview(await readStdinJson(), t3Home, options["dry-run"] === true);
  }
  if (command === "help" || command === "--help" || command === undefined) {
    process.stdout.write("Usage:\n  node t3-review.mjs open --json [--dry-run]\n");
    return null;
  }
  fail("ARGUMENT_INVALID", `Unknown command: ${command}`);
}

try {
  const result = await main();
  if (result !== null) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const normalized = error instanceof ReviewError
    ? error
    : new ReviewError("UNEXPECTED", error instanceof Error ? error.message : "Unexpected failure.");
  process.stderr.write(`${JSON.stringify({
    ok: false,
    error: {
      code: normalized.code,
      message: normalized.message,
      ...(normalized.details === undefined ? {} : { details: normalized.details }),
    },
  }, null, 2)}\n`);
  process.exitCode = 1;
}
