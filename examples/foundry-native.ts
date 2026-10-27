import { readFile } from "node:fs/promises";
import { createNativeAgent, connectAgent } from "../src/foundry/agents.js";
import { AgentConfigurationException, AgentProtocolException, GuideLimits } from "../src/shared/contracts.js";
import { FoundryConnection, readEndpoint, readName, required } from "../src/shared/foundry-connection.js";
import { instructions } from "../src/shared/guide-instructions.js";
import { ServiceCatalogue } from "../src/shared/service-catalogue.js";

async function main(args: string[]): Promise<number> {
  if (args.length === 0 || args[0] === "--help" || args[0] === "-h") {
    console.log(`Foundry-native prompt agent
  create [instructions-file]   Create a prompt agent version from TypeScript.
  ask "your question"          Call the configured, pinned agent version.
  check                       Read configuration without calling Azure.

Required: FOUNDRY_PROJECT_ENDPOINT, FOUNDRY_AGENT_NAME.
create:   AZURE_AI_MODEL_DEPLOYMENT_NAME.
ask:      FOUNDRY_AGENT_VERSION.
Sign in with your approved Azure identity. No keys are used.`);
    return 0;
  }
  const get = (key: string): string | undefined => process.env[key];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException("The request timed out.", "TimeoutError")), GuideLimits.requestTimeout);
  const cancelled = (): void => controller.abort(new DOMException("The request was cancelled.", "AbortError"));
  process.once("SIGINT", cancelled);
  process.once("SIGTERM", cancelled);
  try {
    if (args[0] === "create" && args.length <= 2) {
      const created = await createNativeAgent({
        projectEndpoint: readEndpoint(get), agentName: readName(get),
        modelDeployment: required(get, "AZURE_AI_MODEL_DEPLOYMENT_NAME"),
        instructions: args[1] === undefined ? instructions : await readFile(args[1], { encoding: "utf8", signal: controller.signal }),
        signal: controller.signal,
      });
      console.log(JSON.stringify(created));
      console.log(`Set FOUNDRY_AGENT_VERSION=${created.version} before running the app.`);
      return 0;
    }
    if (args[0] === "ask" && args.length === 2) {
      const question = args[1];
      if (!question?.trim() || question.length > GuideLimits.messageLength) {
        throw new AgentConfigurationException(`Use a question between 1 and ${GuideLimits.messageLength} characters.`);
      }
      const agent = await connectAgent(FoundryConnection.read(get), new ServiceCatalogue(), undefined, controller.signal);
      console.log(JSON.stringify(await agent.reply([{ role: "user", text: question }], controller.signal), null, 2));
      return 0;
    }
    if (args[0] === "check" && args.length === 1) {
      FoundryConnection.read(get);
      console.log("Invocation settings are valid. This check did not call Azure or verify access.");
      return 0;
    }
    console.error("Unknown command or arguments. Run with --help.");
    return 2;
  } catch (error) {
    if (error instanceof AgentConfigurationException || error instanceof AgentProtocolException) {
      console.error(error.message);
    } else if (controller.signal.aborted || error instanceof Error && (error.name === "AbortError" || error.name === "TimeoutError")) {
      console.error("The agent request stopped or timed out. Check the Foundry run before retrying.");
    } else {
      console.error("The command failed. Check the input file, approved Azure sign-in, project access, agent version, and model quota.");
    }
    return 1;
  } finally {
    clearTimeout(timer);
    process.off("SIGINT", cancelled);
    process.off("SIGTERM", cancelled);
  }
}
process.exitCode = await main(process.argv.slice(2));
