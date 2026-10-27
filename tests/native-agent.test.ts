import assert from "node:assert/strict";
import { test } from "node:test";
import { AIProjectClient } from "@azure/ai-projects";
import { createHttpHeaders } from "@azure/core-rest-pipeline";
import { Readable } from "node:stream";
import { NativeGuideAgent, type ResponsesResponse, type ResponsesTransport } from "../src/foundry/native-guide-agent.js";
import { ServiceCatalogue } from "../src/shared/service-catalogue.js";
import { AgentProtocolException, CatalogueUnavailableException } from "../src/shared/contracts.js";

const identity = { implementation: "foundry", name: "native-fixture", version: "2", isLive: true };
function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
const functionCall = (call_id = "call-1", name = "lookup_service", args = '{"query":"renewal"}') => ({
  type: "function_call", id: `fc_${call_id}`, call_id, name, arguments: args, status: "completed",
});
const answer = (text: string) => ({
  type: "message", id: "msg_fixture", role: "assistant", status: "completed",
  content: [{ type: "output_text", text, annotations: [] }],
});
function transport(outputs: unknown[], status = "completed") {
  const requests: unknown[] = [];
  const signals: Array<AbortSignal | undefined> = [];
  const client: ResponsesTransport = {
    async create(body, options): Promise<ResponsesResponse> {
      requests.push(options?.body ?? body);
      signals.push(options?.signal ?? undefined);
      assert.ok(requests.length <= outputs.length, "Unexpected extra model request");
      return { id: `resp_${requests.length}`, status, output: [outputs[requests.length - 1]] };
    },
  };
  return { client, requests, signals };
}
test("official SDK transport sends explicit agent name AND version on every tool-loop request", async () => {
  const requests: Record<string, unknown>[] = [];
  const urls: string[] = [];
  const project = new AIProjectClient("https://example.services.ai.azure.com/api/projects/workshop",
    { async getToken() { return { token: "not-a-real-token", expiresOnTimestamp: Date.now() + 3_600_000 }; } },
    {
      additionalPolicies: [{
        position: "perCall",
        policy: { name: "recording policy", sendRequest: (request, next) => next(request) },
      }],
      httpClient: { async sendRequest(request) {
      urls.push(request.url);
      assert.ok(request.body instanceof Readable);
      const chunks: Buffer[] = [];
      for await (const chunk of request.body) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
      const body: unknown = JSON.parse(Buffer.concat(chunks).toString("utf8"));
      assert.ok(isRecord(body));
      requests.push(body);
      assert.ok(requests.length <= 2);
      const response = JSON.stringify({
        id: `resp_${requests.length}`, object: "response", status: "completed",
        created_at: 1_700_000_000, model: "unit-test-fixture",
        output: [requests.length === 1 ? functionCall() : answer("Read the reviewed registry guidance.")],
      });
      return {
        request, status: 200, headers: createHttpHeaders({ "content-type": "application/json" }),
        readableStreamBody: Readable.from([Buffer.from(response)]),
      };
    } },
  });
  const client = project.getOpenAIClient({ maxRetries: 0 });
  const result = await new NativeGuideAgent(client, identity, new ServiceCatalogue()).reply([{ role: "user", text: "renewal" }]);
  assert.equal(result.services[0]?.id, "AB-RENEW-01");
  assert.equal(result.toolActivity[0]?.status, "found");
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.deepEqual(request.agent, { type: "agent_reference", name: "native-fixture", version: "2" });
    assert.equal(request.max_output_tokens, 1_200);
    assert.equal(request.model, undefined, "must invoke versioned agent, not a direct model");
  }
  assert.equal(requests[1]?.previous_response_id, "resp_1");
  const output = JSON.stringify(requests[1]?.input);
  assert.match(output, /function_call_output/);
  assert.match(output, /AB-RENEW-01/);
  assert.match(output, /https:\/\/www.alberta.ca\/renew-replace-drivers-licence/);
  assert.match(output, /2026-10-25/);
  for (const url of urls) assert.match(url, /\/openai\/v1\/responses/);
});
test("lookup failure is sent back as unavailable, never as sources", async () => {
  const fixture = transport([functionCall(), answer("Guidance unavailable; check the official page.")]);
  const agent = new NativeGuideAgent(fixture.client, identity, {
    lookup() { throw new CatalogueUnavailableException("Test-only failure."); },
  });
  const result = await agent.reply([{ role: "user", text: "renewal" }]);
  assert.deepEqual(result.services, []);
  assert.equal(result.toolActivity[0]?.status, "unavailable");
  assert.match(JSON.stringify(fixture.requests[1]), /unavailable/);
});
test("unknown tool, repeated IDs and malformed calls are rejected", async () => {
  for (const outputs of [
    [functionCall("call-1", "run_shell")],
    [functionCall("same"), functionCall("same")],
    [{ type: "function_call", name: "lookup_service", call_id: "", arguments: "{}" }],
  ]) {
    const fixture = transport(outputs);
    await assert.rejects(new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }]), AgentProtocolException);
  }
});
test("strict duplicate-key arguments are reported without lookup execution", async () => {
  const fixture = transport([
    functionCall("one", "lookup_service", '{"query":"renewal","query":"documents"}'),
    answer("Check the query."),
  ]);
  const result = await new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }]);
  assert.equal(result.toolActivity[0]?.status, "invalid_input");
  assert.deepEqual(result.services, []);
});
test("incomplete and empty answers are explicit protocol errors", async () => {
  for (const fixture of [transport([answer("partial")], "incomplete"), transport([answer("  ")])]) {
    await assert.rejects(new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }]), AgentProtocolException);
  }
});
test("tool rounds enforce the four-call budget", async () => {
  const fixture = transport(Array.from({ length: 5 }, (_, i) => functionCall(`call-${i}`)));
  await assert.rejects(new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }]), AgentProtocolException);
  assert.equal(fixture.requests.length, 5);
});
test("four tool calls can complete, but five calls in one response cannot", async () => {
  const success = transport([...Array.from({ length: 4 }, (_, i) => functionCall(`call-${i}`)), answer("Reviewed guidance.")]);
  const result = await new NativeGuideAgent(success.client, identity).reply([{ role: "user", text: "renewal" }]);
  assert.equal(result.toolActivity.length, 4);
  const client: ResponsesTransport = { async create() {
    return { id: "resp_many", status: "completed", output: Array.from({ length: 5 }, (_, i) => functionCall(`call-${i}`)) };
  } };
  await assert.rejects(new NativeGuideAgent(client, identity).reply([{ role: "user", text: "renewal" }]), AgentProtocolException);
});
test("AbortSignal is propagated and cancellation cannot produce a successful turn", async () => {
  const controller = new AbortController();
  const fixture = transport([answer("fixture")]);
  await new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }], controller.signal);
  assert.equal(fixture.signals[0], controller.signal);
  controller.abort();
  await assert.rejects(new NativeGuideAgent(fixture.client, identity).reply([{ role: "user", text: "renewal" }], controller.signal),
    { name: "AbortError" });
});
