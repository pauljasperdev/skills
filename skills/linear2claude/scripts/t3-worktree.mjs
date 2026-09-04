#!/usr/bin/env node

import { execFile as execFileCallback } from "node:child_process";
import { randomUUID } from "node:crypto";
import { access, readFile, realpath } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const DEFAULT_TIMEOUT_MS = 30_000;
const DISPATCH_TIMEOUT_MS = 180_000;
const VERIFY_TIMEOUT_MS = 20_000;
const EXAMINE_MODEL_SELECTION = Object.freeze({
  instanceId: "claudeAgent",
  model: "claude-fable-5-1",
  options: Object.freeze([Object.freeze({ id: "effort", value: "high" })]),
});

class Linear2ClaudeError extends Error {
  constructor(code, message, details = undefined) {
    super(message);
    this.name = "Linear2ClaudeError";
    this.code = code;
    this.details = details;
  }
}

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function fail(code, message, details) {
  throw new Linear2ClaudeError(code, message, details);
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
      headers: {
        connection: "close",
        ...(options.headers ?? {}),
      },
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
    fail(
      "T3_API_ERROR",
      `T3 returned HTTP ${response.status} for ${options.method ?? "GET"} ${url.pathname}.`,
      { status: response.status, body: trimForError(body) },
    );
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
      if (error instanceof Linear2ClaudeError) continue;
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
      descriptor = await fetchJson(
        new URL("/.well-known/t3/environment", state.origin),
        {},
        2_500,
      );
    } catch {
      continue;
    }
    if (
      typeof descriptor?.environmentId !== "string" ||
      typeof descriptor?.serverVersion !== "string"
    ) {
      continue;
    }
    return {
      ...state,
      ...descriptor,
      runtimePath,
      t3Home,
    };
  }
  fail("T3_SERVER_UNAVAILABLE", "No running T3 Code server was found. Start T3 Code and retry.", {
    t3Home,
  });
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
    "linear2claude",
    "--subject",
    "linear2claude",
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
      process.stderr.write("Warning: the temporary linear2claude API session could not be revoked.\n");
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
    socket.addEventListener("message", (event) => {
      void this.handleMessage(event.data);
    });
    socket.addEventListener("close", () => {
      this.closed = true;
      this.rejectAll(new Linear2ClaudeError("T3_RPC_CLOSED", "The T3 WebSocket closed unexpectedly."));
    });
    socket.addEventListener("error", () => {
      this.rejectAll(new Linear2ClaudeError("T3_RPC_FAILED", "The T3 WebSocket reported an error."));
    });
  }

  static async connect(url) {
    if (typeof globalThis.WebSocket !== "function") {
      fail("WEBSOCKET_UNAVAILABLE", "This adapter requires Node.js 22 or another runtime with WebSocket support.");
    }
    const socket = new globalThis.WebSocket(url);
    await new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Linear2ClaudeError("T3_RPC_TIMEOUT", "Timed out connecting to the T3 WebSocket.")),
        10_000,
      );
      socket.addEventListener(
        "open",
        () => {
          clearTimeout(timer);
          resolve();
        },
        { once: true },
      );
      socket.addEventListener(
        "error",
        () => {
          clearTimeout(timer);
          reject(new Linear2ClaudeError("T3_RPC_FAILED", "Could not connect to the T3 WebSocket."));
        },
        { once: true },
      );
    });
    return new RpcSocket(socket);
  }

  async handleMessage(data) {
    let decoded;
    try {
      decoded = JSON.parse(await dataToText(data));
    } catch (error) {
      this.rejectAll(
        error instanceof Linear2ClaudeError
          ? error
          : new Linear2ClaudeError("T3_RPC_PROTOCOL_ERROR", "T3 returned invalid WebSocket JSON."),
      );
      return;
    }

    const messages = Array.isArray(decoded) ? decoded : [decoded];
    for (const message of messages) {
      if (message?._tag === "Pong") continue;
      if (message?._tag === "ClientProtocolError") {
        this.rejectAll(
          new Linear2ClaudeError("T3_RPC_PROTOCOL_ERROR", "T3 rejected the WebSocket RPC protocol.", {
            error: trimForError(message.error),
          }),
        );
        continue;
      }
      if (message?._tag === "Defect") {
        this.rejectAll(
          new Linear2ClaudeError("T3_RPC_DEFECT", "T3 reported a WebSocket RPC defect.", {
            defect: trimForError(message.defect),
          }),
        );
        continue;
      }
      if (message?._tag !== "Exit") continue;
      const pending = this.pending.get(message.requestId);
      if (!pending) continue;
      this.pending.delete(message.requestId);
      clearTimeout(pending.timer);
      if (message.exit?._tag === "Success") {
        pending.resolve(message.exit.value);
      } else {
        pending.reject(
          new Linear2ClaudeError("T3_RPC_COMMAND_FAILED", `T3 rejected RPC ${pending.tag}.`, {
            cause: trimForError(message.exit?.cause),
          }),
        );
      }
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
      return Promise.reject(new Linear2ClaudeError("T3_RPC_CLOSED", "The T3 WebSocket is not open."));
    }
    const id = randomUUID();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Linear2ClaudeError("T3_RPC_TIMEOUT", `Timed out waiting for RPC ${tag}.`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer, tag });
      this.socket.send(
        JSON.stringify({
          _tag: "Request",
          id,
          tag,
          payload,
          headers: [],
        }),
      );
    });
  }

  close() {
    if (!this.closed) this.socket.close(1000);
    this.closed = true;
  }
}

async function withRpc(runtime, token, run) {
  const issued = await fetchJson(
    new URL("/api/auth/websocket-ticket", runtime.origin),
    {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    },
  );
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
    fail(
      "T3_PROJECT_NOT_FOUND",
      `Multiple saved T3 projects exactly match ${cwd}.`,
      { matches: exactMatches.map((project) => project.id) },
    );
  }

  const commonDirectory = await gitCommonDirectory(cwd);
  const repositoryMatches = [];
  if (commonDirectory !== null) {
    for (const project of shell.projects ?? []) {
      if (typeof project?.workspaceRoot !== "string") continue;
      const projectCommonDirectory = await gitCommonDirectory(project.workspaceRoot);
      if (projectCommonDirectory === commonDirectory) repositoryMatches.push(project);
    }
  }
  if (repositoryMatches.length === 1) {
    return { project: repositoryMatches[0], matchedBy: "git-common-directory" };
  }
  if (repositoryMatches.length > 1) {
    fail("T3_PROJECT_NOT_FOUND", `Multiple saved T3 projects use the Git repository for ${cwd}.`, {
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

function validateExamineProvider(config) {
  const provider = (config?.providers ?? []).find(
    (candidate) => candidate?.instanceId === EXAMINE_MODEL_SELECTION.instanceId,
  );
  if (!provider || provider.status !== "ready") {
    fail("T3_EXAMINE_PROVIDER_UNAVAILABLE", "The Claude Code provider is not ready in T3.", {
      instanceId: EXAMINE_MODEL_SELECTION.instanceId,
      status: provider?.status ?? "missing",
    });
  }
  const model = (provider.models ?? []).find(
    (candidate) => candidate?.slug === EXAMINE_MODEL_SELECTION.model,
  );
  if (!model) {
    fail("T3_EXAMINE_MODEL_UNAVAILABLE", "Claude Code does not expose the required Fable 5.1 model.", {
      instanceId: EXAMINE_MODEL_SELECTION.instanceId,
      model: EXAMINE_MODEL_SELECTION.model,
    });
  }
  const descriptors = model.capabilities?.optionDescriptors ?? [];
  const supports = (id, value) =>
    descriptors.some(
      (descriptor) =>
        descriptor?.id === id &&
        (descriptor.options ?? []).some((option) => option?.id === value),
    );
  if (!supports("effort", "high")) {
    fail("T3_EXAMINE_OPTIONS_UNAVAILABLE", "Claude Code does not support the required high effort.", {
      instanceId: EXAMINE_MODEL_SELECTION.instanceId,
      model: EXAMINE_MODEL_SELECTION.model,
    });
  }
  return {
    instanceId: provider.instanceId,
    driver: provider.driver,
    status: provider.status,
    model: model.slug,
    effort: "high",
  };
}

function findExistingThread(shell, projectId, issue) {
  return (shell.threads ?? []).find(
    (thread) =>
      thread?.projectId === projectId &&
      thread?.archivedAt == null &&
      typeof thread?.title === "string" &&
      thread.title.includes(issue),
  );
}

async function runGit(cwd, args, code, message) {
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

async function resolveBaseBranch(cwd, requested) {
  if (requested !== undefined) {
    if (typeof requested !== "string" || requested.trim().length === 0) {
      fail("BASE_BRANCH_INVALID", "baseBranch must be a non-empty string when supplied.");
    }
    await runGit(
      cwd,
      ["rev-parse", "--verify", `refs/heads/${requested.trim()}`],
      "BASE_BRANCH_NOT_FOUND",
      `Local base branch does not exist: ${requested.trim()}`,
    );
    return requested.trim();
  }
  return await runGit(
    cwd,
    ["symbolic-ref", "--quiet", "--short", "HEAD"],
    "DETACHED_BASE_CHECKOUT",
    "The saved project checkout is detached; select a base branch explicitly.",
  );
}

function issueBranchFragment(issue, title) {
  const normalized = `${issue}-${title}`
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/[^a-z0-9_-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return normalized.slice(0, 64).replace(/[._-]+$/g, "");
}

async function resolveIssueBranch(cwd, issue, title) {
  const fragment = issueBranchFragment(issue, title);
  const existing = new Set(
    (await runGit(
      cwd,
      ["for-each-ref", "--format=%(refname:short)", "refs/heads"],
      "BRANCH_LIST_FAILED",
      "Could not inspect existing Git branches before T3 creation.",
    ))
      .split("\n")
      .filter(Boolean),
  );
  const build = (suffix = "") => `t3code/${fragment.slice(0, 64 - suffix.length)}${suffix}`;
  let candidate = build();
  let sequence = 2;
  while (existing.has(candidate)) {
    candidate = build(`-${sequence}`);
    sequence += 1;
  }
  return candidate;
}

function validateIssue(issue) {
  if (typeof issue !== "string" || !/^[A-Z][A-Z0-9]*-\d+$/.test(issue)) {
    fail("ISSUE_INVALID", "issue must be a Linear identifier such as GEM-61.");
  }
  return issue;
}

function validateWorkspace(workspace) {
  if (typeof workspace !== "string" || !/^[a-z0-9][a-z0-9-]*$/.test(workspace)) {
    fail("WORKSPACE_INVALID", "workspace must be a Linear workspace slug such as gemhog.");
  }
  return workspace;
}

function validateTitle(title) {
  if (typeof title !== "string" || title.trim().length === 0) {
    fail("TITLE_INVALID", "title must be a non-empty Linear issue title.");
  }
  if (title.includes("\n") || title.includes("\r")) {
    fail("TITLE_INVALID", "title must be a single line.");
  }
  return title.trim();
}

function issuePrompt(issue, workspace) {
  return `T3 owns this worktree and has started its configured worktree setup automatically. Wait for setup to finish successfully and do not run bootstrap again. If setup fails, stop and report the failure without invoking issue reconnaissance. Once setup is ready, use /examine-issue to examine ${issue} in Linear workspace ${workspace}. Resolve the repository's committed Linear config and pass --workspace ${workspace} to every Linear CLI read; refuse any mismatched workspace. Keep Linear and the repository read-only; the dispatcher owns the issue's workflow-state transition. Make the consequential technical design decisions: define interfaces and ownership, choose appropriate seams and data flow, and explain how every affected library or framework should be used according to its conventions, with particular attention to Effect and React when present. Leave Codex latitude over incidental implementation details such as local control flow and naming. Do not produce a waterfall implementation plan or start implementation. Finish with a concise technical foundation that can be handed to /handoff2codex.`;
}

function makeBootstrapCommand({ project, baseBranch, worktreeBranch, startFromOrigin, workspace, issue, title }) {
  const createdAt = new Date().toISOString();
  const threadId = randomUUID();
  const messageId = randomUUID();
  const threadTitle = `${issue} — ${title}`;
  const prompt = issuePrompt(issue, workspace);
  const modelSelection = EXAMINE_MODEL_SELECTION;
  const runtimeMode = "full-access";
  const interactionMode = "default";

  return {
    threadId,
    messageId,
    worktreeBranch,
    expectedWorktreeName: worktreeBranch.replaceAll("/", "-"),
    threadTitle,
    prompt,
    command: {
      type: "thread.turn.start",
      commandId: randomUUID(),
      threadId,
      message: {
        messageId,
        role: "user",
        text: prompt,
        attachments: [],
      },
      modelSelection,
      runtimeMode,
      interactionMode,
      bootstrap: {
        createThread: {
          projectId: project.id,
          title: threadTitle,
          modelSelection,
          runtimeMode,
          interactionMode,
          branch: baseBranch,
          worktreePath: null,
          createdAt,
        },
        prepareWorktree: {
          projectCwd: project.workspaceRoot,
          baseBranch,
          branch: worktreeBranch,
          ...(startFromOrigin ? { startFromOrigin: true } : {}),
        },
        runSetupScript: true,
      },
      createdAt,
    },
  };
}

async function worktreeIsRegistered(projectCwd, worktreePath) {
  const output = await runGit(
    projectCwd,
    ["worktree", "list", "--porcelain"],
    "WORKTREE_LIST_FAILED",
    "Could not inspect Git worktrees after T3 creation.",
  );
  const registered = output
    .split("\n")
    .filter((line) => line.startsWith("worktree "))
    .map((line) => line.slice("worktree ".length));
  let target;
  try {
    target = await realpath(worktreePath);
  } catch {
    return false;
  }
  for (const candidate of registered) {
    try {
      if ((await realpath(candidate)) === target) return true;
    } catch {
      // Ignore stale entries while verifying the target.
    }
  }
  return false;
}

async function verifyCreated(runtime, token, expected, project) {
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
    if (thread.title !== expected.threadTitle || thread.projectId !== project.id) {
      fail("T3_THREAD_MISMATCH", "T3 created a thread with unexpected metadata.", {
        threadId: expected.threadId,
        title: thread.title,
        projectId: thread.projectId,
      });
    }
    if (thread.latestTurn?.state === "error") {
      fail("T3_TURN_FAILED", "The first T3 reconnaissance turn failed to start.", {
        threadId: expected.threadId,
        lastError: trimForError(thread.session?.lastError),
      });
    }
    if (typeof thread.worktreePath !== "string" || thread.worktreePath.length === 0) {
      lastObserved = { thread: "present", worktreePath: null, turnState: thread.latestTurn?.state };
      await sleep(250);
      continue;
    }

    const detail = await authenticatedGet(
      runtime,
      token,
      `/api/orchestration/threads/${encodeURIComponent(expected.threadId)}?turnLimit=1`,
    );
    const body = detail?.thread;
    const messagePresent = (body?.messages ?? []).some(
      (message) =>
        message?.id === expected.messageId &&
        message?.role === "user" &&
        message?.text === expected.prompt,
    );
    const setupFailure = (body?.activities ?? []).find(
      (activity) => activity?.kind === "setup-script.failed",
    );
    if (setupFailure) {
      fail("T3_SETUP_FAILED", "T3 could not start the configured worktree setup script.", {
        threadId: expected.threadId,
        worktreePath: thread.worktreePath,
        detail: trimForError(setupFailure.payload?.detail ?? setupFailure.summary),
      });
    }
    const setupStarted = (body?.activities ?? []).some(
      (activity) => activity?.kind === "setup-script.started",
    );
    const setupExpected = (project.scripts ?? []).some(
      (script) => script?.runOnWorktreeCreate === true,
    );
    const registered = await worktreeIsRegistered(project.workspaceRoot, thread.worktreePath);
    let branch = null;
    try {
      await access(thread.worktreePath);
      branch = await runGit(
        thread.worktreePath,
        ["symbolic-ref", "--quiet", "--short", "HEAD"],
        "T3_WORKTREE_DETACHED",
        "T3 created a detached worktree instead of a branch-backed worktree.",
      );
    } catch (error) {
      if (error instanceof Linear2ClaudeError) throw error;
    }

    const turnState = body?.latestTurn?.state ?? thread.latestTurn?.state;
    const turnStarted = turnState === "running" || turnState === "completed";
    const branchMatches =
      typeof branch === "string" &&
      branch === thread.branch &&
      branch === expected.worktreeBranch;
    const worktreeNameMatches = path.basename(thread.worktreePath) === expected.expectedWorktreeName;
    const modelOptions = new Map(
      (thread.modelSelection?.options ?? []).map((option) => [option?.id, option?.value]),
    );
    const modelMatches =
      thread.modelSelection?.instanceId === EXAMINE_MODEL_SELECTION.instanceId &&
      thread.modelSelection?.model === EXAMINE_MODEL_SELECTION.model &&
      modelOptions.get("effort") === "high";
    if (
      messagePresent &&
      turnStarted &&
      registered &&
      branchMatches &&
      worktreeNameMatches &&
      modelMatches &&
      (!setupExpected || setupStarted)
    ) {
      return {
        id: thread.id,
        title: thread.title,
        branch,
        worktreePath: thread.worktreePath,
        modelSelection: thread.modelSelection,
        turnState,
        setup: setupExpected ? "started" : "not-configured",
      };
    }
    lastObserved = {
      thread: "present",
      worktreePath: thread.worktreePath,
      messagePresent,
      turnState,
      registered,
      branch,
      threadBranch: thread.branch,
      expectedBranch: expected.worktreeBranch,
      worktreeName: path.basename(thread.worktreePath),
      expectedWorktreeName: expected.expectedWorktreeName,
      modelSelection: thread.modelSelection,
      modelMatches,
      setupExpected,
      setupStarted,
    };
    await sleep(250);
  }
  fail("T3_VERIFICATION_TIMEOUT", "T3 accepted the request but concrete worktree verification timed out.", {
    threadId: expected.threadId,
    ...lastObserved,
  });
}

function summarizeProject(project) {
  return {
    id: project.id,
    title: project.title,
    workspaceRoot: project.workspaceRoot,
    configuredDefaultModelSelection: project.defaultModelSelection,
    examineModelSelection: EXAMINE_MODEL_SELECTION,
    setupScripts: (project.scripts ?? [])
      .filter((script) => script?.runOnWorktreeCreate === true)
      .map((script) => ({ id: script.id, name: script.name, command: script.command })),
  };
}

async function doctor(cwd, t3Home) {
  const canonicalCwd = await canonicalPath(cwd);
  const runtime = await discoverRuntime(t3Home);
  return await withSession(runtime, async (token) => {
    const shell = await authenticatedGet(runtime, token, "/api/orchestration/shell");
    const { project, matchedBy } = await resolveProject(shell, canonicalCwd);
    const projectCwd = await canonicalPath(project.workspaceRoot);
    const baseBranch = await resolveBaseBranch(projectCwd);
    const rpcState = await withRpc(runtime, token, async (rpc) => {
      const config = await rpc.call("server.getConfig", {});
      const settings = await rpc.call("server.getSettings", {});
      return { settings, examineProvider: validateExamineProvider(config) };
    });
    return {
      ok: true,
      action: "doctor",
      runtime: {
        origin: runtime.origin,
        serverVersion: runtime.serverVersion,
        environmentId: runtime.environmentId,
      },
      checkout: {
        requestedPath: canonicalCwd,
        projectPath: projectCwd,
        matchedBy,
      },
      project: summarizeProject(project),
      worktreeDefaults: {
        baseBranch,
        startFromOrigin: rpcState.settings?.newWorktreesStartFromOrigin === true,
        branchPattern: "t3code/<issue-id>-<issue-title>",
      },
      examineProvider: rpcState.examineProvider,
      nativeBootstrapRpc: true,
    };
  });
}

async function openIssue(spec, t3Home, dryRun) {
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    fail("INPUT_INVALID", "open --json expects one JSON object on stdin.");
  }
  const issue = validateIssue(spec.issue);
  const workspace = validateWorkspace(spec.workspace);
  const title = validateTitle(spec.title);
  const cwd = await canonicalPath(spec.cwd ?? process.cwd());
  const runtime = await discoverRuntime(t3Home);

  return await withSession(runtime, async (token) => {
    let shell = await authenticatedGet(runtime, token, "/api/orchestration/shell");
    const { project } = await resolveProject(shell, cwd);
    const projectCwd = await canonicalPath(project.workspaceRoot);
    const existing = findExistingThread(shell, project.id, issue);
    if (existing && spec.allowDuplicate !== true) {
      return {
        ok: true,
        action: "existing",
        issue,
        workspace,
        project: summarizeProject(project),
        thread: {
          id: existing.id,
          title: existing.title,
          branch: existing.branch,
          worktreePath: existing.worktreePath,
          archivedAt: existing.archivedAt,
        },
      };
    }

    const baseBranch = await resolveBaseBranch(projectCwd, spec.baseBranch);
    return await withRpc(runtime, token, async (rpc) => {
      validateExamineProvider(await rpc.call("server.getConfig", {}));
      const settings = await rpc.call("server.getSettings", {});
      const startFromOrigin = settings?.newWorktreesStartFromOrigin === true;

      shell = await authenticatedGet(runtime, token, "/api/orchestration/shell");
      const racedExisting = findExistingThread(shell, project.id, issue);
      if (racedExisting && spec.allowDuplicate !== true) {
        return {
          ok: true,
          action: "existing",
          issue,
          workspace,
          project: summarizeProject(project),
          thread: {
            id: racedExisting.id,
            title: racedExisting.title,
            branch: racedExisting.branch,
            worktreePath: racedExisting.worktreePath,
            archivedAt: racedExisting.archivedAt,
          },
        };
      }

      const worktreeBranch = await resolveIssueBranch(projectCwd, issue, title);
      const prepared = makeBootstrapCommand({
        project,
        baseBranch,
        worktreeBranch,
        startFromOrigin,
        workspace,
        issue,
        title,
      });

      if (dryRun) {
        return {
          ok: true,
          action: "dry-run",
          issue,
          workspace,
          runtime: { origin: runtime.origin, serverVersion: runtime.serverVersion },
          project: summarizeProject(project),
          worktree: {
            baseBranch,
            branch: prepared.worktreeBranch,
            name: prepared.expectedWorktreeName,
            startFromOrigin,
          },
          thread: {
            id: prepared.threadId,
            title: prepared.threadTitle,
            modelSelection: EXAMINE_MODEL_SELECTION,
            runtimeMode: prepared.command.runtimeMode,
            interactionMode: prepared.command.interactionMode,
            prompt: prepared.prompt,
          },
        };
      }

      const dispatch = await rpc.call(
        "orchestration.dispatchCommand",
        prepared.command,
        DISPATCH_TIMEOUT_MS,
      );
      const verified = await verifyCreated(runtime, token, prepared, project);
      return {
        ok: true,
        action: "created",
        issue,
        workspace,
        project: summarizeProject(project),
        dispatch,
        thread: verified,
        worktree: {
          baseBranch,
          branch: verified.branch,
          name: path.basename(verified.worktreePath),
          startFromOrigin,
          detached: false,
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
    if (argument === "--cwd" || argument === "--t3-home") {
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

function printHelp() {
  process.stdout.write(`Usage:\n  node t3-worktree.mjs doctor [--cwd PATH]\n  node t3-worktree.mjs open --json [--dry-run]\n\nopen JSON: {"cwd":"/repo","workspace":"gemhog","issue":"GEM-61","title":"Issue title"}\n`);
}

async function main() {
  const { command, options } = parseArgs(process.argv.slice(2));
  const t3Home = path.resolve(options["t3-home"] ?? process.env.T3CODE_HOME ?? path.join(homedir(), ".t3"));
  if (command === "doctor") {
    return await doctor(options.cwd ?? process.cwd(), t3Home);
  }
  if (command === "open") {
    if (options.json !== true) fail("ARGUMENT_INVALID", "open requires --json.");
    return await openIssue(await readStdinJson(), t3Home, options["dry-run"] === true);
  }
  if (command === "help" || command === "--help" || command === undefined) {
    printHelp();
    return null;
  }
  fail("ARGUMENT_INVALID", `Unknown command: ${command}`);
}

try {
  const result = await main();
  if (result !== null) process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
} catch (error) {
  const normalized =
    error instanceof Linear2ClaudeError
      ? error
      : new Linear2ClaudeError("UNEXPECTED", error instanceof Error ? error.message : "Unexpected failure.");
  process.stderr.write(
    `${JSON.stringify(
      {
        ok: false,
        error: {
          code: normalized.code,
          message: normalized.message,
          ...(normalized.details === undefined ? {} : { details: normalized.details }),
        },
      },
      null,
      2,
    )}\n`,
  );
  process.exitCode = 1;
}
