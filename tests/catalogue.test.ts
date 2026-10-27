import assert from "node:assert/strict";
import { test } from "node:test";
import { ServiceCatalogue } from "../src/shared/service-catalogue.js";
import { LookupTool } from "../src/shared/lookup.js";
import { OfflineGuideAgent } from "../src/shared/offline-guide-agent.js";
import { AgentProtocolException, CatalogueUnavailableException } from "../src/shared/contracts.js";

const catalogue = new ServiceCatalogue();
const topics = [
  ["How do I renew my driver's licence?", "AB-RENEW-01"],
  ["How do I renew my LICENSE?", "AB-RENEW-01"],
  ["Can I renew my licence online?", "AB-RENEW-02"],
  ["What should I bring to a registry?", "AB-RENEW-03"],
  ["paperwork", "AB-RENEW-03"],
  ["PAPERWORK", "AB-RENEW-03"],
  ["My licence has expired", "AB-RENEW-04"],
  ["Where can I find a registry agent?", "AB-RENEW-05"],
  ["renewal fees", "AB-RENEW-06"],
  ["renew remotely", "AB-RENEW-07"],
] as const;
for (const [query, id] of topics) {
  test(`lookup prioritizes ${id}: ${query}`, () => {
    const result = catalogue.lookup(query);
    assert.equal(result.status, "found");
    assert.equal(result.services[0]?.id, id);
    for (const service of result.services) {
      assert.equal(ServiceCatalogue.hasReviewedSource(service), true);
      assert.equal(ServiceCatalogue.matchesSnapshot(service), true);
    }
  });
}
for (const query of ["", "  ", "Can you help me get started?"]) {
  test(`ambiguous request needs clarification: ${JSON.stringify(query)}`, () => {
    assert.deepEqual(catalogue.lookup(query).services, []);
    assert.equal(catalogue.lookup(query).status, "needs_clarification");
  });
}
for (const query of [
  "citizen tax credits", "meeting rooms", "renewable energy",
  "How do I renew my fishing licence?", "Renew my business license", "vehicle registration renewal",
]) {
  test(`unsupported request does not invent a match: ${query}`, () => {
    assert.equal(catalogue.lookup(query).status, "not_found");
    assert.deepEqual(catalogue.lookup(query).services, []);
  });
}
for (const input of [
  "not json", '{"query":"renewal","command":"remove files"}', '{"query":17}',
  '{"query":"renewal","query":"documents"}', '{"qu\\u0065ry":"renewal","query":"documents"}',
  '{"query":{"query":"renewal"}}', '{"query":["renewal"]}', "null", "[]",
]) {
  test(`invalid JSON tool arguments are reported without execution: ${input}`, () => {
    const tool = new LookupTool(catalogue);
    assert.equal(tool.executeJson(input, "call-1").status, "invalid_input");
    assert.equal(tool.activity.length, 1);
    assert.equal(tool.activity[0]?.status, "invalid_input");
    assert.deepEqual(tool.sources, []);
  });
}
test("query length is measured without truncating; call budget stops fifth call", () => {
  assert.equal(new LookupTool(catalogue).execute("x".repeat(240), "boundary").status, "not_found");
  const tool = new LookupTool(catalogue);
  assert.equal(tool.execute("x".repeat(241), "too-long").status, "invalid_input");
  assert.deepEqual(tool.sources, []);
  const normal = new LookupTool(catalogue);
  for (let i = 0; i < 4; i++) normal.execute("renewal", `${i}`);
  assert.throws(() => normal.execute("renewal", "overflow"), AgentProtocolException);
  assert.equal(normal.activity.length, 4);
});
test("unavailable lookup records error and no sources", () => {
  const tool = new LookupTool({
    lookup() { throw new CatalogueUnavailableException("Test-only injected failure."); },
  });
  assert.equal(tool.execute("renewal", "failure").status, "unavailable");
  assert.equal(tool.activity[0]?.status, "unavailable");
  assert.deepEqual(tool.sources, []);
});
test("offline response never claims live evidence", async () => {
  const result = await new OfflineGuideAgent(catalogue).reply([{ role: "user", text: "renewal" }]);
  assert.deepEqual(result.agent, {
    implementation: "offline", name: "Local rehearsal", version: "not deployed", isLive: false,
  });
  assert.equal(result.toolActivity.length, 1);
  assert.match(result.answer, /registry agent/);
  assert.match(result.answer, /reviewed/);
  assert.doesNotMatch(result.answer, /matching service/);
});
test("online availability is qualified by review date", async () => {
  const result = await new OfflineGuideAgent(catalogue).reply([{ role: "user", text: "Can I renew online?" }]);
  assert.match(result.answer, /At the last source review/);
  assert.match(result.answer, /temporarily disabled/);
  assert.match(result.answer, /cannot confirm/);
  assert.equal(result.services.length, 1);
  assert.equal(result.services[0]?.reviewedOn, "2026-10-25");
  assert.equal(result.services[0]?.sourceUrl, "https://www.alberta.ca/renew-replace-drivers-licence");
});
test("offline personal decisions refer to registry without lookup", async () => {
  const result = await new OfflineGuideAgent(catalogue).reply([
    { role: "user", text: "Decide if I qualify for a licence renewal." },
  ]);
  assert.deepEqual(result.services, []);
  assert.deepEqual(result.toolActivity, []);
  assert.match(result.answer, /cannot decide eligibility/);
  assert.match(result.answer, /Do not share personal details/);
});
test("catalogue snapshots and dates are validated", () => {
  assert.equal(ServiceCatalogue.all.length, 7);
  assert.equal(ServiceCatalogue.revision.length, 64);
  const entry = ServiceCatalogue.all[0];
  assert.ok(entry);
  for (const service of ServiceCatalogue.all) {
    assert.match(service.id, /^AB-RENEW-/);
    assert.equal(ServiceCatalogue.hasReviewedSource(service), true);
    assert.equal(ServiceCatalogue.matchesSnapshot(service), true);
  }
  for (const reviewedOn of ["", "0000-01-01", "0001-01-01", "2026-02-30", "2099-01-01"]) {
    assert.equal(ServiceCatalogue.hasReviewedSource({ ...entry, reviewedOn }), false);
  }
  assert.equal(ServiceCatalogue.hasReviewedSource({ ...entry, sourceTitle: "" }), false);
  assert.equal(ServiceCatalogue.matchesSnapshot({ ...entry, nextStep: "Invented requirements." }), false);
});
for (const sourceUrl of [
  "", "javascript:alert(1)", "http://www.alberta.ca/renew-replace-drivers-licence",
  "https://www.alberta.ca.untrusted.example/renew-replace-drivers-licence",
  "https://www.alberta.ca@untrusted.example/renew-replace-drivers-licence",
  "https://www.alberta.ca/not-a-reviewed-page",
]) {
  test(`unreviewed links rejected: ${sourceUrl}`, () => {
    const entry = ServiceCatalogue.all[0];
    assert.ok(entry);
    const altered = { ...entry, sourceUrl };
    assert.equal(ServiceCatalogue.hasReviewedSource(altered), false);
    assert.equal(ServiceCatalogue.matchesSnapshot(altered), false);
    const tool = new LookupTool({ lookup: () => ({ status: "found", message: "Fixture", services: [altered] }) });
    assert.throws(() => tool.execute("renewal", "1"), AgentProtocolException);
  });
}
