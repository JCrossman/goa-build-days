import { AgentProtocolException, CatalogueUnavailableException, GuideLimits, type Catalogue, type LookupResult, type ServiceEntry, type ToolActivity } from "./contracts.js";
import { matchesSnapshot } from "./service-catalogue.js";

// JSON.parse validates syntax; this scanner counts original top-level keys, including escaped duplicates.
function topLevelKeys(json: string): string[] {
  const keys: string[] = [];
  let depth = 0;
  for (let i = 0; i < json.length; i++) {
    const ch = json[i];
    if (ch === '"') {
      const start = i++;
      for (; i < json.length; i++) {
        if (json[i] === "\\") i++;
        else if (json[i] === '"') break;
      }
      let next = i + 1;
      while (/\s/.test(json[next] ?? "") && next < json.length) next++;
      if (depth === 1 && json[next] === ":") {
        const key: unknown = JSON.parse(json.slice(start, i + 1));
        if (typeof key === "string") keys.push(key);
      }
    } else if (ch === "{" || ch === "[") depth++;
    else if (ch === "}" || ch === "]") depth--;
  }
  return keys;
}
export class LookupTool {
  static readonly name = "lookup_service";
  static readonly description = "Search reviewed Alberta driver's licence renewal guidance. Returns summaries, next steps, official source URLs, and review dates. This is a saved snapshot, not a live website check. It never renews a licence or submits anything.";
  static readonly parameters = {
    type: "object" as const,
    properties: { query: { type: "string", description: "A short renewal topic: how to renew, online renewal, what to bring, expired licence, registry, fees, or remote renewal. Never include personal details." } },
    required: ["query"], additionalProperties: false,
  };
  private readonly activities: ToolActivity[] = [];
  private readonly sourceMap = new Map<string, ServiceEntry>();
  constructor(private readonly catalogue: Catalogue) {}
  get activity(): readonly ToolActivity[] { return [...this.activities]; }
  get sources(): readonly ServiceEntry[] { return [...this.sourceMap.values()]; }
  executeJson(argumentsJson: string, callId: string): LookupResult {
    let value: unknown;
    try { value = JSON.parse(argumentsJson); }
    catch (error) {
      if (!(error instanceof SyntaxError)) throw error;
      return this.recordError(callId, "", "invalid_input", "The lookup arguments were not valid JSON.");
    }
    const keys = topLevelKeys(argumentsJson);
    if (typeof value !== "object" || value === null || Array.isArray(value) ||
        keys.length !== 1 || keys[0] !== "query" || !("query" in value) || typeof value.query !== "string") {
      return this.recordError(callId, "", "invalid_input", "lookup_service requires exactly one string argument named query.");
    }
    return this.execute(value.query, callId);
  }
  execute(query: string, callId: string): LookupResult {
    this.checkBudget();
    if (typeof query !== "string" || query.length > GuideLimits.queryLength) {
      return this.recordError(callId, "", "invalid_input", `The query must be a string of at most ${GuideLimits.queryLength} characters.`);
    }
    let result: LookupResult;
    try { result = this.catalogue.lookup(query); }
    catch (error) {
      if (!(error instanceof CatalogueUnavailableException)) throw error;
      return this.recordError(callId, query, "unavailable", "The reviewed guidance is unavailable. Explain the failure and direct the user to the official renewal page or a registry agent; do not invent a result.");
    }
    for (const service of result.services) {
      if (!matchesSnapshot(service)) throw new AgentProtocolException("The lookup returned unreviewed guidance. Check the bundled source data before trying again.");
      this.sourceMap.set(service.id, service);
    }
    this.activities.push({ callId, name: LookupTool.name, query, status: result.status, message: result.message, sourceIds: result.services.map(service => service.id) });
    return result;
  }
  private checkBudget(): void {
    if (this.activities.length >= GuideLimits.toolCalls) throw new AgentProtocolException("The agent reached the lookup limit. Start a new request with a more specific question.");
  }
  private recordError(callId: string, query: string, status: string, message: string): LookupResult {
    this.checkBudget();
    this.activities.push({ callId, name: LookupTool.name, query, status, message, sourceIds: [] });
    return { status, message, services: [] };
  }
}
