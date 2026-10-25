using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using ServiceGuide.Shared;
using ServiceGuide.Web;

namespace ServiceGuide.Tests;

public sealed class WebTests : IClassFixture<GuideWebFactory>
{
    private readonly GuideWebFactory factory;
    public WebTests(GuideWebFactory factory) => this.factory = factory;

    [Fact]
    public async Task ServesTheShowcaseAndEmbeddedCode()
    {
        using HttpClient client = factory.CreateClient();
        string html = await client.GetStringAsync("/");
        Assert.Contains("Alberta driver's licence renewal guide", html, StringComparison.Ordinal);
        Assert.Contains("https://www.alberta.ca/renew-replace-drivers-licence", html, StringComparison.Ordinal);
        Assert.Contains("https://www.alberta.ca/lookup/find-a-registry-agent.aspx", html, StringComparison.Ordinal);
        JsonElement source = await client.GetFromJsonAsync<JsonElement>("/api/examples/native");
        Assert.Contains("CreateAgentVersionAsync", source.GetProperty("source").GetString(), StringComparison.Ordinal);
        Assert.Equal(HttpStatusCode.NotFound, (await client.GetAsync("/api/examples/not-a-file")).StatusCode);
    }

    [Fact]
    public async Task OfflineStatusAndRepliesAreExplicit()
    {
        using HttpClient client = factory.CreateClient();
        JsonElement status = await client.GetFromJsonAsync<JsonElement>("/api/status");
        Assert.Equal("offline", status.GetProperty("mode").GetString());
        Assert.False(status.GetProperty("isLive").GetBoolean());
        HttpResponseMessage response = await client.PostAsJsonAsync("/api/chat", new { message = "renewal" });
        response.EnsureSuccessStatusCode();
        AgentTurn turn = (await response.Content.ReadFromJsonAsync<AgentTurn>())!;
        Assert.False(turn.Agent.IsLive);
        Assert.Equal("AB-RENEW-01", Assert.Single(turn.Services).Id);
        Assert.True(ServiceCatalogue.HasReviewedSource(turn.Services[0]));
    }

    [Fact]
    public async Task SessionsAreIsolatedAndResettable()
    {
        using HttpClient first = factory.CreateClient();
        using HttpClient second = factory.CreateClient();
        (await first.PostAsJsonAsync("/api/chat", new { message = "renewal" })).EnsureSuccessStatusCode();
        JsonElement firstHistory = await first.GetFromJsonAsync<JsonElement>("/api/conversation");
        JsonElement secondHistory = await second.GetFromJsonAsync<JsonElement>("/api/conversation");
        Assert.Equal(2, firstHistory.GetProperty("messages").GetArrayLength());
        Assert.Equal(0, secondHistory.GetProperty("messages").GetArrayLength());
        (await first.PostAsync("/api/conversation/reset", null)).EnsureSuccessStatusCode();
        JsonElement reset = await first.GetFromJsonAsync<JsonElement>("/api/conversation");
        Assert.Equal(0, reset.GetProperty("messages").GetArrayLength());
    }

    [Theory]
    [InlineData("")]
    [InlineData("   ")]
    public async Task RejectsEmptyMessages(string message)
    {
        using HttpClient client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/chat", new { message })).StatusCode);
    }

    [Fact]
    public async Task RejectsOversizedAndCrossOriginRequests()
    {
        using HttpClient client = factory.CreateClient();
        Assert.Equal(HttpStatusCode.BadRequest, (await client.PostAsJsonAsync("/api/chat",
            new { message = new string('a', GuideLimits.MessageLength + 1) })).StatusCode);
        using HttpRequestMessage request = new(HttpMethod.Post, "/api/chat")
        {
            Content = JsonContent.Create(new { message = "renewal" })
        };
        request.Headers.Add("Origin", "https://untrusted.example");
        Assert.Equal(HttpStatusCode.Forbidden, (await client.SendAsync(request)).StatusCode);
    }

    [Fact]
    public async Task EnforcesTheConversationLimit()
    {
        using HttpClient client = factory.CreateClient();
        for (int i = 0; i < GuideLimits.ConversationTurns; i++)
        {
            (await client.PostAsJsonAsync("/api/chat", new { message = "renewal" })).EnsureSuccessStatusCode();
        }
        Assert.Equal(HttpStatusCode.Conflict,
            (await client.PostAsJsonAsync("/api/chat", new { message = "renewal" })).StatusCode);
    }

    [Fact]
    public async Task MissingLiveConfigurationDoesNotFallBackToOffline()
    {
        using var liveFactory = factory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(new Dictionary<string, string?>
                {
                    ["SERVICE_GUIDE_MODE"] = "foundry",
                    ["FOUNDRY_PROJECT_ENDPOINT"] = ""
                })));
        using HttpClient client = liveFactory.CreateClient();
        HttpResponseMessage response = await client.PostAsJsonAsync("/api/chat", new { message = "renewal" });
        Assert.Equal(HttpStatusCode.ServiceUnavailable, response.StatusCode);
        string html = await client.GetStringAsync("/");
        Assert.Contains("Read the official renewal guide", html, StringComparison.Ordinal);
        Assert.Contains("https://www.alberta.ca/lookup/find-a-registry-agent.aspx", html, StringComparison.Ordinal);
        JsonElement history = await client.GetFromJsonAsync<JsonElement>("/api/conversation");
        Assert.Equal(0, history.GetProperty("messages").GetArrayLength());
    }

    [Fact]
    public async Task AFailedAgentReplyDoesNotCommitTheUserTurn()
    {
        using var failingFactory = factory.WithWebHostBuilder(builder => builder.ConfigureServices(services =>
        {
            services.RemoveAll<IServiceGuideAgent>();
            services.AddSingleton<IServiceGuideAgent, FailingAgent>();
        }));
        using HttpClient client = failingFactory.CreateClient();
        Assert.Equal(HttpStatusCode.BadGateway,
            (await client.PostAsJsonAsync("/api/chat", new { message = "renewal" })).StatusCode);
        JsonElement history = await client.GetFromJsonAsync<JsonElement>("/api/conversation");
        Assert.Equal(0, history.GetProperty("messages").GetArrayLength());
    }

    private sealed class FailingAgent : IServiceGuideAgent
    {
        public Task<AgentTurn> ReplyAsync(IReadOnlyList<DialogueMessage> messages, CancellationToken cancellationToken = default) =>
            throw new AgentProtocolException("Injected failure for the test.");
    }
}

public sealed class GuideWebFactory : WebApplicationFactory<WebAppMarker>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureAppConfiguration((_, configuration) =>
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SERVICE_GUIDE_MODE"] = "offline",
                ["AllowedHosts"] = "localhost"
            }));
    }
}
