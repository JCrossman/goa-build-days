using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using ServiceGuide.Shared;

namespace ServiceGuide.MafHosted;

// The host, not the model, writes the evidence envelope consumed by the showcase.
internal sealed class ObservedGuideAgent(AIAgent innerAgent, IServiceCatalogue catalogue)
    : DelegatingAIAgent(innerAgent)
{
    protected override async Task<AgentResponse> RunCoreAsync(
        IEnumerable<ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        CancellationToken cancellationToken = default)
    {
        using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeout.CancelAfter(GuideLimits.RequestTimeout);
        LookupTool tool = new(catalogue);
        MafToolScope.State? previous = MafToolScope.Current.Value;
        MafToolScope.Current.Value = new(tool, timeout);
        try
        {
            AgentResponse response = await InnerAgent.RunAsync(messages, session, options, timeout.Token);
            if (string.IsNullOrWhiteSpace(response.Text))
            {
                throw new AgentProtocolException("The MAF agent returned no answer.");
            }

            HostedReply reply = new(HostedReply.CurrentFormat, ServiceCatalogue.Revision, response.Text, tool.Sources, tool.Activity);
            response.Messages = [new ChatMessage(ChatRole.Assistant, JsonSerializer.Serialize(reply, GuideJson.Options))];
            return response;
        }
        finally
        {
            MafToolScope.Current.Value = previous;
        }
    }

    protected override async IAsyncEnumerable<AgentResponseUpdate> RunCoreStreamingAsync(
        IEnumerable<ChatMessage> messages,
        AgentSession? session = null,
        AgentRunOptions? options = null,
        [EnumeratorCancellation] CancellationToken cancellationToken = default)
    {
        AgentResponse response = await RunCoreAsync(messages, session, options, cancellationToken);
        foreach (AgentResponseUpdate update in response.ToAgentResponseUpdates())
        {
            yield return update;
        }
    }
}

internal static class MafToolScope
{
    internal sealed record State(LookupTool Tool, CancellationTokenSource Cancellation);
    internal static AsyncLocal<State?> Current { get; } = new();

    public static LookupResult Lookup(string query)
    {
        State state = Current.Value ?? throw new AgentProtocolException("A lookup was requested outside an agent run.");
        lock (state.Tool)
        {
            if (state.Tool.Activity.Count >= GuideLimits.ToolCalls)
            {
                state.Cancellation.Cancel();
                throw new AgentProtocolException("The MAF agent reached the lookup limit.");
            }

            return state.Tool.Lookup(query);
        }
    }
}
