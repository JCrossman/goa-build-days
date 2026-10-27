import { AIProjectClient } from "@azure/ai-projects";
import { DefaultAzureCredential } from "@azure/identity";
import type { TokenCredential } from "@azure/core-auth";
import { AgentConfigurationException, type AgentIdentity, type Catalogue } from "../shared/contracts.js";
import { FoundryConnection, readEndpoint, readName, required } from "../shared/foundry-connection.js";
import { LookupTool } from "../shared/lookup.js";
import { ServiceCatalogue } from "../shared/service-catalogue.js";
import { NativeGuideAgent } from "./native-guide-agent.js";

export interface CreateNativeAgentSettings {
  projectEndpoint: string;
  agentName: string;
  modelDeployment: string;
  instructions: string;
  signal?: AbortSignal;
}
function validateIdentity(name: string, version: string): void {
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,62}$/.test(name) || !/^[1-9][0-9]*$/.test(version)) {
    throw new AgentConfigurationException("Foundry returned an invalid agent name or version.");
  }
}
export async function createNativeAgent(settings: CreateNativeAgentSettings, credential?: TokenCredential): Promise<AgentIdentity> {
  const env: Readonly<Record<string, string>> = {
    FOUNDRY_PROJECT_ENDPOINT: settings.projectEndpoint,
    FOUNDRY_AGENT_NAME: settings.agentName,
    AZURE_AI_MODEL_DEPLOYMENT_NAME: settings.modelDeployment,
  };
  const get = (key: string): string | undefined => env[key];
  const endpoint = readEndpoint(get);
  const name = readName(get);
  const model = required(get, "AZURE_AI_MODEL_DEPLOYMENT_NAME");
  if (!settings.instructions.trim()) throw new AgentConfigurationException("The instructions file must not be empty.");
  settings.signal?.throwIfAborted();
  const project = new AIProjectClient(endpoint, credential ?? new DefaultAzureCredential());
  const version = await project.agents.createVersion(name, {
    kind: "prompt", model, instructions: settings.instructions,
    tools: [{ type: "function", name: LookupTool.name, description: LookupTool.description, parameters: LookupTool.parameters, strict: true }],
  }, settings.signal === undefined ? {} : { abortSignal: settings.signal });
  settings.signal?.throwIfAborted();
  validateIdentity(version.name, version.version);
  if (version.name !== name || version.definition.kind !== "prompt") {
    throw new AgentConfigurationException("Foundry returned a different agent or agent kind than requested.");
  }
  return { implementation: "foundry", name: version.name, version: version.version, isLive: true };
}
export async function connectAgent(
  connection: FoundryConnection,
  catalogue: Catalogue = new ServiceCatalogue(),
  credential?: TokenCredential,
  signal?: AbortSignal,
): Promise<NativeGuideAgent> {
  const env: Readonly<Record<string, string>> = {
    FOUNDRY_PROJECT_ENDPOINT: connection.projectEndpoint,
    FOUNDRY_AGENT_NAME: connection.agentName,
    FOUNDRY_AGENT_VERSION: connection.agentVersion,
  };
  const validated = FoundryConnection.read(key => env[key]);
  signal?.throwIfAborted();
  const project = new AIProjectClient(validated.projectEndpoint, credential ?? new DefaultAzureCredential());
  const version = await project.agents.getVersion(validated.agentName, validated.agentVersion,
    signal === undefined ? {} : { abortSignal: signal });
  signal?.throwIfAborted();
  if (version.definition.kind !== "prompt") throw new AgentConfigurationException("The configured core agent is not a prompt agent.");
  validateIdentity(version.name, version.version);
  if (version.name !== validated.agentName || version.version !== validated.agentVersion) {
    throw new AgentConfigurationException("Foundry returned a different agent version than the configured pinned version.");
  }
  return new NativeGuideAgent(project.getOpenAIClient(), {
    implementation: "foundry", name: version.name, version: version.version, isLive: true,
  }, catalogue);
}
