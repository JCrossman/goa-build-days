#pragma warning disable OPENAI001

using System.ClientModel.Primitives;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Azure.AI.Extensions.OpenAI;
using Azure.Core;
using ServiceGuide.Foundry;
using ServiceGuide.Shared;

namespace ServiceGuide.Tests;

public sealed class NativeAgentTests
{
    [Fact]
    public async Task CallsTheRealLookupAndSendsItsOutputBackToTheSdk()
    {
        ResponseHandler handler = new(
            ToolCall("call-1", LookupTool.Name, """{"query":"renewal"}"""),
            Answer("Read the reviewed registry renewal guidance, AB-RENEW-01."));
        NativeGuideAgent agent = new(Client(handler), Identity, new ServiceCatalogue());
        AgentTurn result = await agent.ReplyAsync([new("user", "renewal")]);
        Assert.Equal("AB-RENEW-01", Assert.Single(result.Services).Id);
        Assert.Equal("found", Assert.Single(result.ToolActivity).Status);
        Assert.Equal(2, handler.Requests.Count);
        Assert.Contains("AB-RENEW-01", handler.Requests[1], StringComparison.Ordinal);
        Assert.Contains("https://www.alberta.ca/renew-replace-drivers-licence", handler.Requests[1], StringComparison.Ordinal);
        Assert.Contains("2026-10-25", handler.Requests[1], StringComparison.Ordinal);
        Assert.Contains("function_call_output", handler.Requests[1], StringComparison.Ordinal);
        using JsonDocument request = JsonDocument.Parse(handler.Requests[0]);
        Assert.Equal("native-fixture", request.RootElement.GetProperty("agent_reference").GetProperty("name").GetString());
        Assert.Equal("1", request.RootElement.GetProperty("agent_reference").GetProperty("version").GetString());
    }

    [Fact]
    public async Task ToolFailureIsSentAsAnErrorNotAFalseMatch()
    {
        ResponseHandler handler = new(
            ToolCall("call-1", LookupTool.Name, """{"query":"renewal"}"""),
            Answer("The reviewed guidance is unavailable. Check the official page."));
        AgentTurn result = await new NativeGuideAgent(Client(handler), Identity, new UnavailableCatalogue())
            .ReplyAsync([new("user", "renewal")]);
        Assert.Empty(result.Services);
        Assert.Equal("unavailable", Assert.Single(result.ToolActivity).Status);
        Assert.Contains("unavailable", handler.Requests[1], StringComparison.Ordinal);
    }

    [Fact]
    public async Task UnknownToolsCannotExecute()
    {
        ResponseHandler handler = new(ToolCall("call-1", "run_shell", """{"query":"renewal"}"""));
        await Assert.ThrowsAsync<AgentProtocolException>(() =>
            new NativeGuideAgent(Client(handler), Identity, new ServiceCatalogue())
                .ReplyAsync([new("user", "renewal")]));
        Assert.Single(handler.Requests);
    }

    [Fact]
    public async Task RepeatedCallIdsAreRejected()
    {
        ResponseHandler handler = new(
            ToolCall("same", LookupTool.Name, """{"query":"renewal"}"""),
            ToolCall("same", LookupTool.Name, """{"query":"renewal"}"""));
        await Assert.ThrowsAsync<AgentProtocolException>(() =>
            new NativeGuideAgent(Client(handler), Identity, new ServiceCatalogue())
                .ReplyAsync([new("user", "renewal")]));
    }

    [Fact]
    public async Task HostedClientRejectsAnUninstrumentedReply()
    {
        ResponseHandler handler = new(Answer("An ordinary model answer is not a hosted evidence envelope."));
        await Assert.ThrowsAsync<AgentProtocolException>(() =>
            new HostedGuideAgent(Client(handler), Identity).ReplyAsync([new("user", "renewal")]));
    }

    [Fact]
    public async Task HostedClientReadsActualEvidenceEnvelope()
    {
        LookupTool tool = new(new ServiceCatalogue());
        tool.Execute("renewal", "host-call");
        HostedReply reply = new(HostedReply.CurrentFormat, ServiceCatalogue.Revision, "Reviewed renewal guidance.", tool.Sources, tool.Activity);
        ResponseHandler handler = new(Answer(JsonSerializer.Serialize(reply, GuideJson.Options)));
        AgentTurn result = await new HostedGuideAgent(Client(handler), Identity).ReplyAsync([new("user", "renewal")]);
        Assert.Equal("host-call", Assert.Single(result.ToolActivity).CallId);
        Assert.Equal("AB-RENEW-01", Assert.Single(result.Services).Id);
        Assert.True(ServiceCatalogue.MatchesSnapshot(result.Services[0]));
    }

    [Theory]
    [InlineData("link")]
    [InlineData("date")]
    [InlineData("text")]
    public async Task HostedClientRejectsAlteredGuidanceEvenWithAKnownSourceId(string change)
    {
        ServiceEntry entry = ServiceCatalogue.All[0];
        ServiceEntry altered = change switch
        {
            "link" => entry with { SourceUrl = "https://untrusted.example/pay" },
            "date" => entry with { ReviewedOn = default },
            _ => entry with { Summary = "Your renewal was approved." }
        };
        HostedReply reply = new(HostedReply.CurrentFormat, ServiceCatalogue.Revision, "Renewal reply.", [altered], []);
        ResponseHandler handler = new(Answer(JsonSerializer.Serialize(reply, GuideJson.Options)));
        await Assert.ThrowsAsync<AgentProtocolException>(() =>
            new HostedGuideAgent(Client(handler), Identity).ReplyAsync([new("user", "renewal")]));
    }

    [Theory]
    [InlineData("service-guide-maf-v1", false)]
    [InlineData(HostedReply.CurrentFormat, true)]
    public async Task HostedClientRejectsOldContractsOrSnapshotsEvenWithoutSources(string format, bool staleSnapshot)
    {
        HostedReply reply = new(format, staleSnapshot ? "old-guidance" : ServiceCatalogue.Revision,
            "Please clarify.", [], []);
        ResponseHandler handler = new(Answer(JsonSerializer.Serialize(reply, GuideJson.Options)));
        await Assert.ThrowsAsync<AgentProtocolException>(() =>
            new HostedGuideAgent(Client(handler), Identity).ReplyAsync([new("user", "help")]));
    }

    private static AgentIdentity Identity => new("foundry", "native-fixture", "1", true);

    private static ProjectResponsesClient Client(ResponseHandler handler) => new(
        new Uri("https://example.services.ai.azure.com/api/projects/workshop"),
        new FixtureCredential(),
        new AgentReference("native-fixture", "1"),
        defaultConversationId: null,
        new ProjectResponsesClientOptions
        {
            Transport = new HttpClientPipelineTransport(new HttpClient(handler)),
            RetryPolicy = new ClientRetryPolicy(0)
        });

    private static object ToolCall(string id, string name, string arguments) => new
    {
        type = "function_call", id = $"fc_{id}", call_id = id, name, arguments, status = "completed"
    };

    private static object Answer(string text) => new
    {
        type = "message", id = "msg_fixture", role = "assistant", status = "completed",
        content = new[] { new { type = "output_text", text, annotations = Array.Empty<object>() } }
    };

    private sealed class ResponseHandler(params object[] outputs) : HttpMessageHandler
    {
        public List<string> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            Requests.Add(await request.Content!.ReadAsStringAsync(cancellationToken));
            if (Requests.Count > outputs.Length) throw new InvalidOperationException("Unexpected extra model request.");
            return new(HttpStatusCode.OK)
            {
                Content = JsonContent.Create(new
                {
                    id = $"resp_{Requests.Count}", @object = "response", status = "completed",
                    created_at = 1_700_000_000, model = "unit-test-fixture",
                    output = new[] { outputs[Requests.Count - 1] }
                })
            };
        }
    }
}

internal sealed class FixtureCredential : TokenCredential
{
    public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
        new("not-a-real-token", DateTimeOffset.UtcNow.AddHours(1));

    public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
        ValueTask.FromResult(GetToken(requestContext, cancellationToken));
}
