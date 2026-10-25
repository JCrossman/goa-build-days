using System.Runtime.CompilerServices;
using System.Text.Json;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using ServiceGuide.MafHosted;
using ServiceGuide.Shared;

namespace ServiceGuide.Tests;

public sealed class MafAgentTests
{
    [Theory]
    [InlineData("renewal", "found", "AB-RENEW-01")]
    [InlineData("documents", "found", "AB-RENEW-03")]
    [InlineData("help", "needs_clarification", null)]
    [InlineData("tax credits", "not_found", null)]
    public async Task MafRunsTheSharedFunctionAndProducesEvidence(string query, string status, string? source)
    {
        AIAgent agent = MafAgentFactory.Create(new ToolCallingClient(), new ServiceCatalogue());
        AgentResponse response = await agent.RunAsync(query);
        HostedReply reply = JsonSerializer.Deserialize<HostedReply>(response.Text, GuideJson.Options)!;
        Assert.Equal(HostedReply.CurrentFormat, reply.Format);
        Assert.Equal(ServiceCatalogue.Revision, reply.GuidanceRevision);
        Assert.Equal(status, Assert.Single(reply.ToolActivity).Status);
        if (source is null) Assert.Empty(reply.Services);
        else
        {
            Assert.Equal(source, Assert.Single(reply.Services).Id);
            Assert.True(ServiceCatalogue.MatchesSnapshot(reply.Services[0]));
        }
    }

    [Fact]
    public async Task FailedLookupDoesNotInventEvidence()
    {
        AIAgent agent = MafAgentFactory.Create(new ToolCallingClient(), new UnavailableCatalogue());
        HostedReply reply = JsonSerializer.Deserialize<HostedReply>((await agent.RunAsync("renewal")).Text, GuideJson.Options)!;
        Assert.Equal("unavailable", Assert.Single(reply.ToolActivity).Status);
        Assert.Empty(reply.Services);
    }

    [Fact]
    public async Task ConcurrentRunsDoNotShareToolEvidence()
    {
        AIAgent agent = MafAgentFactory.Create(new ToolCallingClient(), new ServiceCatalogue());
        AgentResponse[] responses = await Task.WhenAll(agent.RunAsync("renewal"), agent.RunAsync("documents"));
        HostedReply first = JsonSerializer.Deserialize<HostedReply>(responses[0].Text, GuideJson.Options)!;
        HostedReply second = JsonSerializer.Deserialize<HostedReply>(responses[1].Text, GuideJson.Options)!;
        Assert.Equal("AB-RENEW-01", Assert.Single(first.Services).Id);
        Assert.Equal("AB-RENEW-03", Assert.Single(second.Services).Id);
        Assert.Single(first.ToolActivity);
        Assert.Single(second.ToolActivity);
    }

    [Fact]
    public async Task AnOutOfScopeReplyDoesNotAcquireInventedToolActivity()
    {
        AIAgent agent = MafAgentFactory.Create(new ToolCallingClient(), new ServiceCatalogue());
        HostedReply reply = JsonSerializer.Deserialize<HostedReply>((await agent.RunAsync("Decide my eligibility.")).Text, GuideJson.Options)!;
        Assert.Empty(reply.ToolActivity);
        Assert.Empty(reply.Services);
        Assert.Contains("cannot", reply.Answer, StringComparison.Ordinal);
    }

    private sealed class ToolCallingClient : IChatClient
    {
        public async Task<ChatResponse> GetResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            CancellationToken cancellationToken = default)
        {
            await Task.Delay(5, cancellationToken);
            List<ChatMessage> history = messages.ToList();
            string query = history.Last(message => message.Role == ChatRole.User).Text;
            if (query.Contains("eligibility", StringComparison.Ordinal))
            {
                return new(new ChatMessage(ChatRole.Assistant, "I cannot decide eligibility. Contact an Alberta registry agent."))
                {
                    FinishReason = ChatFinishReason.Stop
                };
            }
            FunctionResultContent? result = history.SelectMany(message => message.Contents)
                .OfType<FunctionResultContent>().LastOrDefault();
            if (result is not null)
            {
                return new(new ChatMessage(ChatRole.Assistant, "The reply uses the reviewed Alberta.ca guidance."))
                {
                    FinishReason = ChatFinishReason.Stop,
                    ResponseId = Guid.NewGuid().ToString()
                };
            }

            return new(new ChatMessage(ChatRole.Assistant,
                [new FunctionCallContent("fixture-call", LookupTool.Name, new Dictionary<string, object?> { ["query"] = query })]))
            {
                FinishReason = ChatFinishReason.ToolCalls,
                ResponseId = Guid.NewGuid().ToString()
            };
        }

        public async IAsyncEnumerable<ChatResponseUpdate> GetStreamingResponseAsync(
            IEnumerable<ChatMessage> messages,
            ChatOptions? options = null,
            [EnumeratorCancellation] CancellationToken cancellationToken = default)
        {
            ChatResponse response = await GetResponseAsync(messages, options, cancellationToken);
            foreach (ChatResponseUpdate update in response.ToChatResponseUpdates()) yield return update;
        }

        public object? GetService(Type serviceType, object? serviceKey = null) =>
            serviceType == typeof(ChatClientMetadata) ? new ChatClientMetadata("test-fixture") : null;

        public void Dispose() { }
    }
}
