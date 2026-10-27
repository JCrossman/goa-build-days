import assert from "node:assert/strict";
import { test } from "node:test";
import { FoundryConnection } from "../src/shared/foundry-connection.js";
import { AgentConfigurationException } from "../src/shared/contracts.js";
import { AgentSelection } from "../src/web/agent-selection.js";
import { ServiceCatalogue } from "../src/shared/service-catalogue.js";

for (const value of [
  "http://example.services.ai.azure.com/api/projects/demo", "https://example.services.ai.azure.com/",
  "******example.services.ai.azure.com/api/projects/demo",
  "https://example.services.ai.azure.com/api/projects/demo?key=value",
  "https://untrusted.example/api/projects/demo", "your-project-endpoint",
  "https://user@example.services.ai.azure.com/api/projects/demo",
  "https://example.services.ai.azure.com:444/api/projects/demo",
]) {
  test(`invalid project endpoint rejected: ${value}`, () => {
    assert.throws(() => FoundryConnection.readEndpoint(() => value), AgentConfigurationException);
  });
}
test("configuration requires explicit numeric version, not latest or placeholders", () => {
  const env: Record<string, string> = {
    FOUNDRY_PROJECT_ENDPOINT: "https://example.services.ai.azure.com/api/projects/workshop",
    FOUNDRY_AGENT_NAME: "native-example", FOUNDRY_AGENT_VERSION: "latest",
  };
  assert.throws(() => FoundryConnection.read(key => env[key]), AgentConfigurationException);
  env.FOUNDRY_AGENT_VERSION = "2";
  assert.equal(FoundryConnection.read(key => env[key]).agentVersion, "2");
  env.FOUNDRY_AGENT_NAME = "your-placeholder";
  assert.throws(() => FoundryConnection.read(key => env[key]), AgentConfigurationException);
});
test("MAF is explicitly unsupported; status is not a claim of live access", () => {
  const catalogue = new ServiceCatalogue();
  const invalid = new AgentSelection({ SERVICE_GUIDE_MODE: "maf" }, catalogue);
  assert.equal(invalid.status().configured, false);
  const configured = new AgentSelection({
    FOUNDRY_PROJECT_ENDPOINT: "https://example.services.ai.azure.com/api/projects/workshop",
    FOUNDRY_AGENT_NAME: "fixture-agent", FOUNDRY_AGENT_VERSION: "1",
  }, catalogue);
  assert.equal(configured.status().configured, true);
  assert.equal(configured.status().isLive, false);
});
