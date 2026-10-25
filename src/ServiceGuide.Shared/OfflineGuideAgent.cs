namespace ServiceGuide.Shared;

// Explicit rehearsal mode only. It never calls a model or reports a live agent version.
public sealed class OfflineGuideAgent(IServiceCatalogue catalogue) : IServiceGuideAgent
{
    public Task<AgentTurn> ReplyAsync(
        IReadOnlyList<DialogueMessage> messages,
        CancellationToken cancellationToken = default)
    {
        cancellationToken.ThrowIfCancellationRequested();
        string query = messages.Last(message => message.Role == "user").Text;
        if (query.Contains("eligib", StringComparison.OrdinalIgnoreCase) ||
            query.Contains("qualif", StringComparison.OrdinalIgnoreCase) ||
            query.Contains("submit", StringComparison.OrdinalIgnoreCase) ||
            query.Contains("ignore your", StringComparison.OrdinalIgnoreCase))
        {
            return Task.FromResult(new AgentTurn(
                "I can explain reviewed Alberta driver's licence renewal guidance, but cannot decide eligibility or submit a renewal. Use the official links or contact a registry agent. Do not share personal details here.",
                [], [], Identity));
        }

        LookupTool tool = new(catalogue);
        LookupResult result = tool.Execute(query, "offline-lookup");
        string answer = result.Status == "found"
            ? $"{result.Services[0].Summary}\n\nSource reviewed {result.Services[0].ReviewedOn:yyyy-MM-dd}. The official source and next step are below."
            : result.Message;

        return Task.FromResult(new AgentTurn(answer, tool.Sources, tool.Activity, Identity));
    }

    private static AgentIdentity Identity => new("offline", "Local rehearsal", "not deployed", false);
}
