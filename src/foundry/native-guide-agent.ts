import type OpenAI from "openai";
import type { ResponseCreateParamsNonStreaming, ResponseInput } from "openai/resources/responses/responses";
import { AgentConfigurationException, AgentProtocolException, GuideLimits, type AgentIdentity, type AgentTurn, type Catalogue, type DialogueMessage, type GuideAgent } from "../shared/contracts.js";
import { LookupTool } from "../shared/lookup.js";
import { ServiceCatalogue } from "../shared/service-catalogue.js";

export interface ResponsesResponse {
  id: string;
  status?: string;
  output: readonly unknown[];
  output_text?: string;
}
export interface ResponsesTransport {
  create(body: ResponseCreateParamsNonStreaming, options?: OpenAI.RequestOptions): Promise<ResponsesResponse>;
}
export interface ResponsesClient { responses: ResponsesTransport }
function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function outputText(response: ResponsesResponse): string {
  const text: string[] = [];
  for (const item of response.output) {
    if (!record(item) || item.type !== "message" || !Array.isArray(item.content)) continue;
    for (const content of item.content) {
      if (record(content) && content.type === "output_text" && typeof content.text === "string") text.push(content.text);
    }
  }
  return text.length ? text.join("") : response.output_text ?? "";
}
export class NativeGuideAgent implements GuideAgent {
  private readonly transport: ResponsesTransport;
  private readonly identity: AgentIdentity;
  constructor(
    client: ResponsesTransport | ResponsesClient,
    identity: AgentIdentity,
    private readonly catalogue: Catalogue = new ServiceCatalogue(),
  ) {
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,62}$/.test(identity.name) || !/^[1-9][0-9]*$/.test(identity.version)) {
      throw new AgentConfigurationException("The native agent requires an explicit agent name and numeric version.");
    }
    this.transport = "responses" in client ? client.responses : client;
    this.identity = Object.freeze({ ...identity });
  }
  async reply(messages: readonly DialogueMessage[], signal?: AbortSignal): Promise<AgentTurn> {
    signal?.throwIfAborted();
    const lookup = new LookupTool(this.catalogue);
    const callIds = new Set<string>();
    let request: ResponseCreateParamsNonStreaming = {
      input: messages.map(message => {
        if (message.role !== "user" && message.role !== "assistant") {
          throw new AgentProtocolException("Only user and assistant messages are allowed.");
        }
        return { role: message.role, content: message.text };
      }),
      max_output_tokens: 1_200,
      stream: false,
    };
    for (let round = 0; round <= GuideLimits.toolCalls; round++) {
      signal?.throwIfAborted();
      const response = await this.transport.create(request, {
        ...(signal === undefined ? {} : { signal }),
        // Include the complete payload so an injected official OpenAI client also preserves input.
        body: { ...request, agent_reference: { type: "agent_reference", name: this.identity.name, version: this.identity.version } },
      });
      signal?.throwIfAborted();
      if (response.status !== "completed") {
        throw new AgentProtocolException("The agent did not finish its response. Try again or check the Foundry run.");
      }
      if (!Array.isArray(response.output)) throw new AgentProtocolException("The agent returned invalid response output.");
      const calls = response.output.filter(item => record(item) && item.type === "function_call");
      if (!calls.length) {
        const answer = outputText(response);
        if (!answer.trim()) throw new AgentProtocolException("The agent returned no answer. Try a more specific request.");
        return { answer, services: lookup.sources, toolActivity: lookup.activity, agent: this.identity };
      }
      if (!response.id?.trim()) throw new AgentProtocolException("The agent returned no response ID for its tool calls.");
      const input: ResponseInput = [];
      for (const call of calls) {
        if (!record(call) || call.name !== LookupTool.name || typeof call.call_id !== "string" ||
            !call.call_id.trim() || callIds.has(call.call_id) || typeof call.arguments !== "string") {
          throw new AgentProtocolException("The agent requested an unknown or repeated tool call.");
        }
        callIds.add(call.call_id);
        const result = lookup.executeJson(call.arguments, call.call_id);
        input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(result) });
      }
      request = { previous_response_id: response.id, max_output_tokens: 1_200, input, stream: false };
    }
    throw new AgentProtocolException("The agent reached the tool-call limit without finishing its answer.");
  }
}
