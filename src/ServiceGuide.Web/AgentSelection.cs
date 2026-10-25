using Azure.Core;
using ServiceGuide.Foundry;
using ServiceGuide.Shared;

namespace ServiceGuide.Web;

public sealed class AgentSelection(
    IConfiguration configuration,
    IServiceCatalogue catalogue,
    TokenCredential credential,
    ILogger<AgentSelection> logger) : IServiceGuideAgent
{
    public string Mode => configuration["SERVICE_GUIDE_MODE"]?.Trim().ToLowerInvariant() ?? "foundry";

    public object Status()
    {
        try
        {
            ValidateMode();
            if (Mode == "offline")
            {
                return new
                {
                    mode = Mode, configured = true, name = "Local rehearsal", version = "not deployed",
                    notice = "Offline rehearsal. No Foundry model is being called.", isLive = false
                };
            }

            FoundryConnection connection = FoundryConnection.Read(key => configuration[key], Mode == "maf");
            return new
            {
                mode = Mode, configured = true, name = connection.AgentName, version = connection.AgentVersion,
                notice = "Settings loaded. Send a request to verify the connection.", isLive = false
            };
        }
        catch (AgentConfigurationException exception)
        {
            return new
            {
                mode = Mode, configured = false, name = "Not connected", version = "not verified",
                notice = exception.Message, isLive = false
            };
        }
    }

    public async Task<AgentTurn> ReplyAsync(
        IReadOnlyList<DialogueMessage> messages,
        CancellationToken cancellationToken = default)
    {
        ValidateMode();
        IServiceGuideAgent agent = Mode == "offline"
            ? new OfflineGuideAgent(catalogue)
            : await FoundryAgents.ConnectAsync(
                FoundryConnection.Read(key => configuration[key], Mode == "maf"),
                catalogue, Mode == "maf", credential, cancellationToken);
        AgentTurn turn = await agent.ReplyAsync(messages, cancellationToken);
        foreach (ToolActivity call in turn.ToolActivity.Where(call => call.Status is "invalid_input" or "unavailable"))
        {
            logger.LogWarning("Lookup returned {Status} in {Mode} mode.", call.Status, Mode);
        }

        return turn;
    }

    private void ValidateMode()
    {
        if (Mode is not ("foundry" or "maf" or "offline"))
        {
            throw new AgentConfigurationException("SERVICE_GUIDE_MODE must be foundry, maf, or offline.");
        }
    }
}
