export interface ServiceEntry {
  id: string;
  title: string;
  category: string;
  summary: string;
  nextStep: string;
  keywords: readonly string[];
  sourceTitle: string;
  sourceUrl: string;
  reviewedOn: string;
}

export interface LookupResult {
  status: string;
  message: string;
  services: readonly ServiceEntry[];
}
export interface ToolActivity {
  callId: string;
  name: string;
  query: string;
  status: string;
  message: string;
  sourceIds: readonly string[];
}
export interface DialogueMessage { role: "user" | "assistant"; text: string }
export interface AgentIdentity { implementation: string; name: string; version: string; isLive: boolean }
export interface AgentTurn {
  answer: string;
  services: readonly ServiceEntry[];
  toolActivity: readonly ToolActivity[];
  agent: AgentIdentity;
}
export interface GuideAgent {
  reply(messages: readonly DialogueMessage[], signal?: AbortSignal): Promise<AgentTurn>;
}
export interface Catalogue { lookup(query: string): LookupResult }
export const GuideLimits = Object.freeze({
  messageLength: 1_000, queryLength: 240, conversationTurns: 8, toolCalls: 4, requestTimeout: 90_000,
});
export class AgentConfigurationException extends Error {}
export class AgentProtocolException extends Error {}
export class CatalogueUnavailableException extends Error {}
export {
  AgentConfigurationException as AgentConfigurationError,
  AgentProtocolException as AgentProtocolError,
  CatalogueUnavailableException as CatalogueUnavailableError,
};
