import Fastify, { type FastifyReply, type FastifyRequest } from "fastify";
import cookie from "@fastify/cookie";
import staticFiles from "@fastify/static";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { randomUUID } from "node:crypto";
import { APIError, APIUserAbortError, APIConnectionTimeoutError } from "openai";
import { AgentConfigurationException, AgentProtocolException, GuideLimits, type Catalogue, type GuideAgent } from "../shared/contracts.js";
import { type Environment } from "../shared/foundry-connection.js";
import { ServiceCatalogue } from "../shared/service-catalogue.js";
import { AgentSelection } from "./agent-selection.js";
import { ConversationStore } from "./conversation-store.js";

export interface AppOptions {
  env?: Environment;
  agent?: GuideAgent;
  catalogue?: Catalogue;
  now?: () => number;
  timeoutMs?: number;
}
export function problem(reply: FastifyReply, request: FastifyRequest, status: number, title: string, detail?: string): FastifyReply {
  if (status >= 400 && status < 500) {
    console.warn(JSON.stringify({ event: "request_rejected", status, traceId: request.id }));
  }
  return reply.code(status).type("application/problem+json").send({
    type: "about:blank", title, status, ...(detail === undefined ? {} : { detail }), traceId: request.id,
  });
}
function clientLifetime(request: FastifyRequest, reply: FastifyReply): { signal: AbortSignal; dispose(): void } {
  const controller = new AbortController();
  const aborted = (): void => controller.abort(new DOMException("The client disconnected.", "AbortError"));
  const closed = (): void => { if (!reply.raw.writableEnded) aborted(); };
  request.raw.on("aborted", aborted);
  reply.raw.on("close", closed);
  if (request.raw.aborted) aborted();
  return {
    signal: controller.signal,
    dispose() { request.raw.off("aborted", aborted); reply.raw.off("close", closed); },
  };
}
async function cancellable<T>(operation: Promise<T>, signal: AbortSignal): Promise<T> {
  signal.throwIfAborted();
  let cancel: () => void = () => {};
  const aborted = new Promise<never>((_resolve, reject) => {
    cancel = () => reject(signal.reason);
    signal.addEventListener("abort", cancel, { once: true });
  });
  try { return await Promise.race([operation, aborted]); }
  finally { signal.removeEventListener("abort", cancel); }
}
function httpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  if ("status" in error && typeof error.status === "number") return error.status;
  if ("statusCode" in error && typeof error.statusCode === "number") return error.statusCode;
  return undefined;
}
function errorResponse(error: Error): [number, string, string] {
  if (error instanceof AgentConfigurationException) return [503, "Setup needed", error.message];
  if (error instanceof AgentProtocolException) return [502, "The agent could not finish", error.message];
  if (!(error instanceof APIError) && (error.name === "AuthenticationError" || error.name === "AuthenticationRequiredError" ||
      error.name === "CredentialUnavailableError" || error.name === "AggregateAuthenticationError")) {
    return [503, "Azure sign-in needs attention", "Sign in with your approved Azure account and check access to the assigned Foundry project."];
  }
  if (error.name === "AbortError" || error.name === "TimeoutError" || error instanceof APIUserAbortError || error instanceof APIConnectionTimeoutError) {
    return [504, "The request stopped", "The request was cancelled or timed out. Check the last run before retrying."];
  }
  const status = httpStatus(error);
  if (status === 401 || status === 403) return [503, "Foundry access was denied", "Check your Azure identity and project permissions. A desktop Copilot sign-in does not grant Foundry access."];
  if (status === 429) return [503, "Foundry is at its request limit", "Wait before retrying, or ask the workshop owner to check model quota."];
  if (error instanceof APIError || error.name === "RestError" || status !== undefined && status >= 500) {
    return [502, "Foundry could not complete the request", "Check the project, deployed agent version, and Foundry run before retrying."];
  }
  return [500, "Something went wrong", "The request failed. Check the server log using the trace ID, then try again."];
}
export async function buildApp(options: AppOptions = {}) {
  const catalogue = options.catalogue ?? new ServiceCatalogue();
  const selection = new AgentSelection(options.env ?? process.env, catalogue);
  const agent = options.agent ?? selection;
  const store = new ConversationStore(options.now ?? Date.now);
  const app = Fastify({ bodyLimit: 16_384, logger: false, genReqId: () => randomUUID(), trustProxy: false });
  await app.register(cookie);
  app.addHook("onRequest", async (request, reply) => {
    reply.header("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
    reply.header("X-Content-Type-Options", "nosniff");
    reply.header("Referrer-Policy", "no-referrer");
    const path = request.url.split("?")[0] ?? "";
    const api = path === "/api" || path.startsWith("/api/");
    if (api) reply.header("Cache-Control", "no-store");
    const host = request.headers.host;
    let hostname: string | undefined;
    try {
      if (host && /^(?:localhost|127\.0\.0\.1|\[::1\])(?::[0-9]{1,5})?$/i.test(host)) {
        hostname = new URL(`http://${host}`).hostname;
      }
    }
    catch { /* Invalid hosts are rejected below. */ }
    if (!hostname || !["localhost", "127.0.0.1", "[::1]"].includes(hostname.toLowerCase())) {
      return problem(reply, request, 400, "Request blocked", "Use a local workshop host.");
    }
    if (api && request.method === "POST" && request.headers.origin !== undefined &&
        request.headers.origin !== `${request.protocol}://${host}`) {
      return problem(reply, request, 403, "Request blocked", "Use this app from its own browser page.");
    }
    // The browser sends JSON headers for bodyless reset requests; chat must still require valid JSON.
    if (path === "/api/conversation/reset" && request.method === "POST" &&
        request.headers["transfer-encoding"] === undefined &&
        (request.headers["content-length"] === undefined || request.headers["content-length"] === "0") &&
        request.headers["content-type"]?.split(";")[0]?.trim().toLowerCase() === "application/json") {
      delete request.headers["content-type"];
    }
  });
  app.setErrorHandler((error: Error & { code?: string }, request, reply) => {
    if (error.code === "FST_ERR_CTP_BODY_TOO_LARGE") {
      return problem(reply, request, 413, "Request too large", "Use a request body of at most 16384 bytes.");
    }
    if (error.code === "FST_ERR_CTP_INVALID_JSON_BODY" || error.code === "FST_ERR_CTP_EMPTY_JSON_BODY" || error.code === "FST_ERR_VALIDATION") {
      return problem(reply, request, 400, "Check your request", "Send a valid JSON request.");
    }
    if (error.code === "FST_ERR_CTP_INVALID_MEDIA_TYPE") {
      return problem(reply, request, 415, "Unsupported request format", "Send application/json.");
    }
    const [status, title, detail] = errorResponse(error);
    // Never log exception messages, request bodies, URLs, credentials, or SDK error objects.
    console.error(JSON.stringify({ event: "request_failed", status, traceId: request.id }));
    return problem(reply, request, status, title, detail);
  });
  await app.register(staticFiles, { root: fileURLToPath(new URL("../../public", import.meta.url)), index: "index.html" });
  app.get("/health", async () => ({ status: "ok" }));
  app.get("/api/status", async () => selection.status());
  app.get("/api/catalogue", async () => ServiceCatalogue.all);
  const examples: Readonly<Record<string, string>> = { native: "native.json", tool: "tool.json", instructions: "instructions.json" };
  app.get<{ Params: { example: string } }>("/api/examples/:example", async (request, reply) => {
    const filename = Object.hasOwn(examples, request.params.example) ? examples[request.params.example] : undefined;
    if (!filename) return problem(reply, request, 404, "Example not found");
    const value: unknown = JSON.parse(await readFile(new URL(`../../assets/examples/${filename}`, import.meta.url), "utf8"));
    if (typeof value !== "object" || value === null || !("file" in value) || typeof value.file !== "string" ||
        !("source" in value) || typeof value.source !== "string") throw new Error("The bundled example is invalid.");
    return { file: value.file, source: value.source };
  });
  app.get("/api/conversation", async (request, reply) => {
    const conversation = store.get(request, reply);
    const lifetime = clientLifetime(request, reply);
    let acquired = false;
    try {
      await conversation.gate.acquire(lifetime.signal);
      acquired = true;
      lifetime.signal.throwIfAborted();
      return { messages: [...conversation.messages], lastTurn: conversation.lastTurn };
    } finally {
      if (acquired) conversation.gate.release();
      lifetime.dispose();
    }
  });
  app.post("/api/conversation/reset", async (request, reply) => {
    store.reset(request, reply);
    return reply.code(204).send();
  });
  app.post("/api/chat", async (request, reply) => {
    const body = request.body;
    const raw = typeof body === "object" && body !== null && "message" in body ? body.message : undefined;
    const message = typeof raw === "string" ? raw.trim() : "";
    if (!message || message.length > GuideLimits.messageLength) {
      return problem(reply, request, 400, "Check your message", `Enter a message between 1 and ${GuideLimits.messageLength} characters.`);
    }
    const conversation = store.get(request, reply);
    if (!conversation.gate.tryAcquire()) {
      return problem(reply, request, 409, "A request is already running", "Wait for it to finish or stop it before sending another.");
    }
    const lifetime = clientLifetime(request, reply);
    const timeout = new AbortController();
    const timer = setTimeout(() => timeout.abort(new DOMException("The request timed out.", "TimeoutError")), options.timeoutMs ?? GuideLimits.requestTimeout);
    timer.unref();
    const signal = AbortSignal.any([lifetime.signal, timeout.signal]);
    try {
      if (conversation.messages.length >= GuideLimits.conversationTurns * 2) {
        return problem(reply, request, 409, "Start a new conversation", `This workshop limits each conversation to ${GuideLimits.conversationTurns} turns.`);
      }
      signal.throwIfAborted();
      const result = await cancellable(agent.reply([...conversation.messages, { role: "user", text: message }], signal), signal);
      signal.throwIfAborted();
      for (const call of result.toolActivity) {
        if (call.status === "invalid_input" || call.status === "unavailable") {
          console.warn(JSON.stringify({ event: "lookup_failed", status: call.status, traceId: request.id }));
        }
      }
      conversation.messages.push({ role: "user", text: message }, { role: "assistant", text: result.answer });
      conversation.lastTurn = result;
      return result;
    } finally {
      clearTimeout(timer);
      lifetime.dispose();
      conversation.gate.release();
    }
  });
  app.setNotFoundHandler((request, reply) => problem(reply, request, 404,
    request.url.split("?")[0]?.startsWith("/api") ? "API route not found" : "Not found"));
  return app;
}
