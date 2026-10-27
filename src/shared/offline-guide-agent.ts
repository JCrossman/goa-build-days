import { type AgentTurn, type Catalogue, type DialogueMessage, type GuideAgent } from "./contracts.js";
import { LookupTool } from "./lookup.js";
import { ServiceCatalogue } from "./service-catalogue.js";

export class OfflineGuideAgent implements GuideAgent {
  constructor(private readonly catalogue: Catalogue = new ServiceCatalogue()) {}
  async reply(messages: readonly DialogueMessage[], signal?: AbortSignal): Promise<AgentTurn> {
    signal?.throwIfAborted();
    const query = messages.findLast(message => message.role === "user")?.text;
    if (query === undefined) throw new Error("A user message is required.");
    const agent = { implementation: "offline", name: "Local rehearsal", version: "not deployed", isLive: false };
    if (["eligib", "qualif", "submit", "ignore your"].some(word => query.toLowerCase().includes(word))) {
      return { answer: "I can explain reviewed Alberta driver's licence renewal guidance, but cannot decide eligibility or submit a renewal. Use the official links or contact a registry agent. Do not share personal details here.", services: [], toolActivity: [], agent };
    }
    const tool = new LookupTool(this.catalogue);
    const result = tool.execute(query, "offline-lookup");
    const first = result.services[0];
    const answer = result.status === "found" && first
      ? `${first.summary}\n\nSource reviewed ${first.reviewedOn}. The official source and next step are below.`
      : result.message;
    signal?.throwIfAborted();
    return { answer, services: tool.sources, toolActivity: tool.activity, agent };
  }
}
