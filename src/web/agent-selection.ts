import { AgentConfigurationException, type AgentTurn, type Catalogue, type DialogueMessage, type GuideAgent } from "../shared/contracts.js";
import { FoundryConnection, type Environment } from "../shared/foundry-connection.js";
import { OfflineGuideAgent } from "../shared/offline-guide-agent.js";
import { connectAgent } from "../foundry/agents.js";

export class AgentSelection implements GuideAgent {
  constructor(private readonly env: Environment, private readonly catalogue: Catalogue) {}
  get mode(): string { return this.env.SERVICE_GUIDE_MODE?.trim().toLowerCase() ?? "foundry"; }
  private validateMode(): void {
    if (this.mode !== "foundry" && this.mode !== "offline") {
      throw new AgentConfigurationException("SERVICE_GUIDE_MODE must be foundry or offline.");
    }
  }
  status(): { mode: string; configured: boolean; name: string; version: string; notice: string; isLive: boolean } {
    try {
      this.validateMode();
      if (this.mode === "offline") return {
        mode: this.mode, configured: true, name: "Local rehearsal", version: "not deployed",
        notice: "Offline rehearsal. No Foundry model is being called.", isLive: false,
      };
      const connection = FoundryConnection.read(key => this.env[key]);
      return {
        mode: this.mode, configured: true, name: connection.agentName, version: connection.agentVersion,
        notice: "Settings loaded. Send a request to verify the connection.", isLive: false,
      };
    } catch (error) {
      if (!(error instanceof AgentConfigurationException)) throw error;
      return {
        mode: this.mode, configured: false, name: "Not connected", version: "not verified",
        notice: error.message, isLive: false,
      };
    }
  }
  async reply(messages: readonly DialogueMessage[], signal?: AbortSignal): Promise<AgentTurn> {
    this.validateMode();
    signal?.throwIfAborted();
    const agent = this.mode === "offline" ? new OfflineGuideAgent(this.catalogue)
      : await connectAgent(FoundryConnection.read(key => this.env[key]), this.catalogue, undefined, signal);
    return agent.reply(messages, signal);
  }
}
