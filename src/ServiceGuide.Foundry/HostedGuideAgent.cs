// The pinned Foundry Responses SDK marks its API as experimental.
#pragma warning disable OPENAI001

using System.Text.Json;
using Azure.AI.Extensions.OpenAI;
using OpenAI.Responses;
using ServiceGuide.Shared;

namespace ServiceGuide.Foundry;

public sealed class HostedGuideAgent(ProjectResponsesClient client, AgentIdentity identity) : IServiceGuideAgent
{
    public async Task<AgentTurn> ReplyAsync(
        IReadOnlyList<DialogueMessage> messages,
        CancellationToken cancellationToken = default)
    {
        ResponseResult response = (await client.CreateResponseAsync(
            ResponseRequests.Create(messages), cancellationToken)).Value;
        ResponseRequests.RequireCompleted(response);

        if (response.OutputItems.OfType<FunctionCallResponseItem>().Any())
        {
            throw new AgentProtocolException("The hosted agent asked the app to execute a tool. Deploy the MAF example with its bundled lookup.");
        }

        HostedReply? reply;
        try
        {
            reply = JsonSerializer.Deserialize<HostedReply>(response.GetOutputText(), GuideJson.Options);
        }
        catch (JsonException)
        {
            throw new AgentProtocolException("The hosted agent did not return the Service Guide response format. Check the deployed example and version.");
        }

        if (reply is null || reply.Format != HostedReply.CurrentFormat ||
            string.IsNullOrWhiteSpace(reply.Answer) || reply.Services is null ||
            reply.ToolActivity is null || reply.ToolActivity.Count > GuideLimits.ToolCalls)
        {
            throw new AgentProtocolException("The hosted agent returned an incomplete or outdated renewal response. Rebuild and redeploy the MAF example, then select its new version.");
        }

        if (reply.GuidanceRevision != ServiceCatalogue.Revision)
        {
            throw new AgentProtocolException("The hosted agent has a different guidance snapshot. Rebuild and redeploy it from the same source as this app.");
        }

        HashSet<string> knownIds = ServiceCatalogue.All.Select(service => service.Id).ToHashSet(StringComparer.Ordinal);
        if (reply.Services.Any(service => !ServiceCatalogue.MatchesSnapshot(service)) ||
            reply.ToolActivity.Any(call => call is null || call.Name != LookupTool.Name ||
                call.SourceIds is null || call.SourceIds.Any(id => !knownIds.Contains(id))))
        {
            throw new AgentProtocolException("The hosted agent returned guidance or links that do not match the reviewed snapshot.");
        }

        return new(reply.Answer, reply.Services, reply.ToolActivity, identity);
    }
}
