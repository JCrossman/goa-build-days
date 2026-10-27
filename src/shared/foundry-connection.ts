import { AgentConfigurationException } from "./contracts.js";

export type Environment = Readonly<Record<string, string | undefined>>;
type Get = (key: string) => string | undefined;
export function required(get: Get, key: string): string {
  const value = get(key)?.trim();
  if (!value || value.includes("<") || value.toLowerCase().startsWith("your-")) {
    throw new AgentConfigurationException(`Set ${key} to the value for your approved workshop project.`);
  }
  if (key.endsWith("_VERSION") && !/^[1-9][0-9]*$/.test(value)) {
    throw new AgentConfigurationException(`${key} must be an explicit numeric version, not latest.`);
  }
  return value;
}
export function readEndpoint(get: Get): string {
  const value = required(get, "FOUNDRY_PROJECT_ENDPOINT");
  let endpoint: URL;
  try { endpoint = new URL(value); }
  catch { throw new AgentConfigurationException("FOUNDRY_PROJECT_ENDPOINT must be an HTTPS Azure Foundry URL ending in /api/projects/<project>."); }
  if (endpoint.protocol !== "https:" || endpoint.port !== "" ||
      !endpoint.hostname.toLowerCase().endsWith(".ai.azure.com") ||
      endpoint.username || endpoint.password || endpoint.search || endpoint.hash ||
      !/^\/api\/projects\/[A-Za-z0-9_.-]+\/?$/.test(endpoint.pathname)) {
    throw new AgentConfigurationException("FOUNDRY_PROJECT_ENDPOINT must be an HTTPS Azure Foundry URL ending in /api/projects/<project>.");
  }
  return endpoint.href;
}
export function readName(get: Get, key = "FOUNDRY_AGENT_NAME"): string {
  const value = required(get, key);
  if (!/^[A-Za-z0-9][A-Za-z0-9-]{0,62}$/.test(value)) {
    throw new AgentConfigurationException(`${key} must contain only letters, numbers, and hyphens, and start with a letter or number.`);
  }
  return value;
}
export class FoundryConnection {
  constructor(readonly projectEndpoint: string, readonly agentName: string, readonly agentVersion: string) {}
  static readonly readEndpoint = readEndpoint;
  static readonly readName = readName;
  static readonly required = required;
  static read(get: Get): FoundryConnection {
    return new FoundryConnection(readEndpoint(get), readName(get), required(get, "FOUNDRY_AGENT_VERSION"));
  }
}
