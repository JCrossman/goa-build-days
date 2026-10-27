import assert from "node:assert/strict";
import { request as httpRequest } from "node:http";
import { test } from "node:test";
import { buildApp } from "../src/web/app.js";
import { AgentProtocolException, type AgentTurn, type GuideAgent } from "../src/shared/contracts.js";

type App = Awaited<ReturnType<typeof buildApp>>;
type History = { messages: Array<{ role: string; text: string }>; lastTurn: AgentTurn | null };
function cookie(response: { headers: Record<string, unknown> }): string {
  const header = response.headers["set-cookie"];
  const first = Array.isArray(header) ? header[0] : header;
  assert.equal(typeof first, "string");
  return String(first).split(";")[0] ?? "";
}
async function offline() { return buildApp({ env: { SERVICE_GUIDE_MODE: "offline" } }); }
const turn: AgentTurn = {
  answer: "Reviewed fixture.", services: [], toolActivity: [],
  agent: { implementation: "foundry", name: "fixture", version: "1", isLive: true },
};
async function history(app: App, session: string) {
  return (await app.inject({ url: "/api/conversation", headers: { cookie: session } })).json<History>();
}
test("serves showcase, allowlisted packaged examples and security headers", async t => {
  const app = await offline();
  t.after(() => app.close());
  const root = await app.inject("/");
  assert.equal(root.statusCode, 200);
  assert.match(root.body, /Alberta driver's licence renewal guide/);
  assert.match(root.body, /https:\/\/www.alberta.ca\/renew-replace-drivers-licence/);
  assert.match(root.body, /https:\/\/www.alberta.ca\/lookup\/find-a-registry-agent.aspx/);
  assert.match(String(root.headers["content-security-policy"]), /default-src 'self'/);
  assert.equal(root.headers["x-content-type-options"], "nosniff");
  assert.equal(root.headers["referrer-policy"], "no-referrer");
  assert.deepEqual((await app.inject("/health")).json(), { status: "ok" });
  const native = await app.inject("/api/examples/native");
  assert.equal(native.statusCode, 200);
  assert.match(native.json<{ source: string }>().source, /createVersion/);
  for (const url of ["/api/examples/not-a-file", "/api/examples/maf", "/api/examples/__proto__", "/api/no-such-route", "/package.json", "/.env", "/src/shared/data/services.json"]) {
    assert.equal((await app.inject(url)).statusCode, 404, url);
  }
});
test("offline status/replies are explicit, with unchanged camel-case API", async t => {
  const app = await offline(); t.after(() => app.close());
  const status = (await app.inject("/api/status")).json<{ mode: string; isLive: boolean }>();
  assert.equal(status.mode, "offline");
  assert.equal(status.isLive, false);
  const response = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } });
  assert.equal(response.statusCode, 200);
  const result = response.json<AgentTurn>();
  assert.equal(result.agent.isLive, false);
  assert.equal(result.services[0]?.id, "AB-RENEW-01");
  assert.equal(result.services[0]?.reviewedOn, "2026-10-25");
  assert.equal(result.toolActivity[0]?.name, "lookup_service");
  assert.equal(response.headers["cache-control"], "no-store");
  assert.match(String(response.headers["set-cookie"]), /HttpOnly/i);
  assert.match(String(response.headers["set-cookie"]), /SameSite=Strict/i);
  assert.doesNotMatch(String(response.headers["set-cookie"]), /;\s*Secure/i);
});
test("cookies are Secure for HTTPS, never trusted from forwarded protocol", async t => {
  const app = await offline(); t.after(() => app.close());
  app.addHook("onRequest", async request => {
    if (request.headers["x-test-https"] === "yes") Object.defineProperty(request, "protocol", { value: "https" });
  });
  const secure = await app.inject({ url: "/api/conversation", headers: { "x-test-https": "yes" } });
  assert.match(String(secure.headers["set-cookie"]), /;\s*Secure/i);
  const forwarded = await app.inject({ url: "/api/conversation", headers: { "x-forwarded-proto": "https" } });
  assert.doesNotMatch(String(forwarded.headers["set-cookie"]), /;\s*Secure/i);
});
test("sessions are isolated, resettable and ignore malformed cookie identifiers", async t => {
  const app = await offline(); t.after(() => app.close());
  const response = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } });
  const session = cookie(response);
  assert.equal((await history(app, session)).messages.length, 2);
  assert.equal((await app.inject("/api/conversation")).json<History>().messages.length, 0);
  assert.equal((await app.inject({
    method: "POST", url: "/api/conversation/reset",
    headers: { cookie: session, "content-type": "application/json", "content-length": "0" },
  })).statusCode, 204);
  assert.equal((await history(app, session)).messages.length, 0);
  const malformed = await app.inject({ url: "/api/conversation", headers: { cookie: "service-guide-session=../not-a-session" } });
  assert.match(cookie(malformed), /^service-guide-session=[0-9a-f]{32}$/);
});
test("empty, malformed, oversized and cross-origin requests produce problem details", async t => {
  const app = await offline(); t.after(() => app.close());
  for (const message of ["", "  ", "x".repeat(1001), 17, null, [], {}]) {
    const response = await app.inject({ method: "POST", url: "/api/chat", payload: { message } });
    assert.equal(response.statusCode, 400);
    assert.match(String(response.headers["content-type"]), /application\/problem\+json/);
    assert.equal(typeof response.json<{ traceId: string }>().traceId, "string");
  }
  const malformed = await app.inject({ method: "POST", url: "/api/chat", headers: { "content-type": "application/json" }, payload: "{bad" });
  assert.equal(malformed.statusCode, 400);
  const oversized = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "x".repeat(16384) } });
  assert.equal(oversized.statusCode, 413);
  const cross = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" }, headers: { origin: "https://untrusted.example" } });
  assert.equal(cross.statusCode, 403);
  assert.equal((await app.inject({ method: "POST", url: "/api/conversation/reset", headers: { origin: "https://untrusted.example" } })).statusCode, 403);
  assert.equal((await app.inject({ url: "/health", headers: { host: "untrusted.example" } })).statusCode, 400);
});
test("conversation has an eight-turn maximum", async t => {
  const app = await offline(); t.after(() => app.close());
  let session = "";
  for (let i = 0; i < 8; i++) {
    const response = await app.inject({ method: "POST", url: "/api/chat", headers: session ? { cookie: session } : {}, payload: { message: "renewal" } });
    assert.equal(response.statusCode, 200);
    if (!session) session = cookie(response);
  }
  const response = await app.inject({ method: "POST", url: "/api/chat", headers: { cookie: session }, payload: { message: "renewal" } });
  assert.equal(response.statusCode, 409);
  assert.equal((await history(app, session)).messages.length, 16);
});
test("exact message and request-body boundaries are enforced without truncation", async t => {
  const app = await offline(); t.after(() => app.close());
  const message = "x".repeat(1000);
  assert.equal((await app.inject({ method: "POST", url: "/api/chat", payload: { message } })).statusCode, 200);
  const bodyFor = (bytes: number) => {
    const base = JSON.stringify({ message: "renewal", padding: "" });
    const body = JSON.stringify({ message: "renewal", padding: "x".repeat(bytes - Buffer.byteLength(base)) });
    assert.equal(Buffer.byteLength(body), bytes);
    return body;
  };
  for (const [bytes, expected] of [[16384, 200], [16385, 413]] as const) {
    assert.equal((await app.inject({
      method: "POST", url: "/api/chat", headers: { "content-type": "application/json" }, payload: bodyFor(bytes),
    })).statusCode, expected);
  }
});
test("missing live config and failed agent never commit history or silently run offline", async t => {
  for (const app of [
    await buildApp({ env: { SERVICE_GUIDE_MODE: "foundry", FOUNDRY_PROJECT_ENDPOINT: "" } }),
    await buildApp({ env: { SERVICE_GUIDE_MODE: "maf" } }),
    await buildApp({ agent: { async reply() { throw new AgentProtocolException("Injected failure"); } } }),
  ]) {
    t.after(() => app.close());
    const response = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } });
    assert.ok([502, 503].includes(response.statusCode));
    assert.equal((await history(app, cookie(response))).messages.length, 0);
    assert.match((await app.inject("/")).body, /Read the official renewal guide/);
  }
});
test("same-session concurrent chat conflicts while history waits for successful completion", async t => {
  let complete: ((value: AgentTurn) => void) | undefined;
  let entered: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const agent: GuideAgent = { reply: async () => {
    entered?.();
    return new Promise<AgentTurn>(resolve => { complete = resolve; });
  } };
  const app = await buildApp({ agent }); t.after(() => app.close());
  const session = cookie(await app.inject("/api/conversation"));
  const first = app.inject({ method: "POST", url: "/api/chat", headers: { cookie: session }, payload: { message: "renewal" } });
  await started;
  assert.equal((await app.inject({ method: "POST", url: "/api/chat", headers: { cookie: session }, payload: { message: "documents" } })).statusCode, 409);
  let historyFinished = false;
  const read = history(app, session).then(value => { historyFinished = true; return value; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(historyFinished, false);
  complete?.(turn);
  assert.equal((await first).statusCode, 200);
  assert.equal((await read).messages.length, 2);
});
test("timeout cancels underlying signal and never commits late successful reply", async t => {
  let signal: AbortSignal | undefined;
  let finish: ((value: AgentTurn) => void) | undefined;
  const app = await buildApp({ timeoutMs: 20, agent: { async reply(_messages, inputSignal) {
    signal = inputSignal;
    return new Promise<AgentTurn>(resolve => { finish = resolve; });
  } } }); t.after(() => app.close());
  const hold = setTimeout(() => {}, 1_000);
  const response = await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } });
  clearTimeout(hold);
  assert.equal(response.statusCode, 504);
  assert.equal(signal?.aborted, true);
  finish?.(turn);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal((await history(app, cookie(response))).messages.length, 0);
});
test("client disconnect propagates cancellation and does not commit its turn", async t => {
  let entered: (() => void) | undefined;
  let cancelled: (() => void) | undefined;
  const started = new Promise<void>(resolve => { entered = resolve; });
  const aborted = new Promise<void>(resolve => { cancelled = resolve; });
  const app = await buildApp({ agent: { async reply(_messages, signal) {
    entered?.();
    return new Promise<AgentTurn>((_resolve, reject) => {
      signal?.addEventListener("abort", () => { cancelled?.(); reject(signal.reason); }, { once: true });
    });
  } } });
  t.after(() => app.close());
  const address = await app.listen({ port: 0, host: "127.0.0.1" });
  const sessionResponse = await fetch(`${address}/api/conversation`);
  const session = sessionResponse.headers.get("set-cookie")?.split(";")[0];
  assert.ok(session);
  const request = httpRequest(`${address}/api/chat`, {
    method: "POST", headers: { cookie: session, "content-type": "application/json" },
  });
  request.on("error", () => {});
  request.end(JSON.stringify({ message: "renewal" }));
  await started;
  request.destroy();
  await Promise.race([aborted, new Promise<never>((_resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Client cancellation was not propagated")), 2_000);
    timer.unref();
  })]);
  assert.equal((await history(app, session)).messages.length, 0);
});
test("session cache is bounded at 100 and expires after 20 sliding minutes", async t => {
  let now = 0;
  const app = await buildApp({ env: { SERVICE_GUIDE_MODE: "offline" }, now: () => now });
  t.after(() => app.close());
  const first = cookie(await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } }));
  now += 19 * 60_000;
  assert.equal((await history(app, first)).messages.length, 2);
  now += 19 * 60_000;
  assert.equal((await history(app, first)).messages.length, 2, "expiry must slide");
  now += 20 * 60_000;
  assert.equal((await history(app, first)).messages.length, 0);
  const retained = cookie(await app.inject({ method: "POST", url: "/api/chat", payload: { message: "renewal" } }));
  for (let i = 0; i < 100; i++) await app.inject("/api/conversation");
  assert.equal((await history(app, retained)).messages.length, 0, "oldest session is evicted");
});
