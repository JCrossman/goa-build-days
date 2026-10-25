using ServiceGuide.Shared;

namespace ServiceGuide.Tests;

public sealed class CatalogueTests
{
    [Theory]
    [InlineData("How do I renew my driver's licence?", "AB-RENEW-01")]
    [InlineData("How do I renew my LICENSE?", "AB-RENEW-01")]
    [InlineData("Can I renew my licence online?", "AB-RENEW-02")]
    [InlineData("What should I bring to a registry?", "AB-RENEW-03")]
    [InlineData("My licence has expired", "AB-RENEW-04")]
    [InlineData("Where can I find a registry agent?", "AB-RENEW-05")]
    [InlineData("renewal fees", "AB-RENEW-06")]
    [InlineData("renew remotely", "AB-RENEW-07")]
    public void LookupPrioritizesTheSpecificRenewalTopic(string query, string id)
    {
        LookupResult result = new ServiceCatalogue().Lookup(query);
        Assert.Equal("found", result.Status);
        Assert.NotEmpty(result.Services);
        Assert.Equal(id, result.Services[0].Id);
        Assert.All(result.Services, service => Assert.True(ServiceCatalogue.HasReviewedSource(service)));
    }

    [Theory]
    [InlineData("")]
    [InlineData("  ")]
    [InlineData("Can you help me get started?")]
    public void AmbiguousRequestsNeedClarification(string query)
    {
        LookupResult result = new ServiceCatalogue().Lookup(query);
        Assert.Equal("needs_clarification", result.Status);
        Assert.Empty(result.Services);
    }

    [Theory]
    [InlineData("citizen tax credits")]
    [InlineData("meeting rooms")]
    [InlineData("renewable energy")]
    [InlineData("How do I renew my fishing licence?")]
    [InlineData("Renew my business license")]
    [InlineData("vehicle registration renewal")]
    public void UnknownWordsDoNotInventServices(string query)
    {
        LookupResult result = new ServiceCatalogue().Lookup(query);
        Assert.Equal("not_found", result.Status);
        Assert.Empty(result.Services);
    }

    [Theory]
    [InlineData("not json")]
    [InlineData("""{"query":"renewal","command":"remove files"}""")]
    [InlineData("""{"query":17}""")]
    [InlineData("""{"query":"renewal","query":"documents"}""")]
    [InlineData("null")]
    public void InvalidToolArgumentsAreReportedWithoutExecuting(string arguments)
    {
        LookupTool tool = new(new ServiceCatalogue());
        Assert.Equal("invalid_input", tool.ExecuteJson(arguments, "call-1").Status);
        Assert.Equal("invalid_input", Assert.Single(tool.Activity).Status);
        Assert.Empty(tool.Sources);
    }

    [Fact]
    public void QueryLimitIsMeasuredWithoutTruncating()
    {
        LookupTool tool = new(new ServiceCatalogue());
        Assert.Equal("invalid_input", tool.Execute(new string('x', GuideLimits.QueryLength + 1), "1").Status);
        Assert.Empty(tool.Sources);
    }

    [Fact]
    public void ToolFailureIsVisibleAndDoesNotProduceSources()
    {
        LookupTool tool = new(new UnavailableCatalogue());
        Assert.Equal("unavailable", tool.Execute("renewal", "1").Status);
        Assert.Equal("unavailable", Assert.Single(tool.Activity).Status);
        Assert.Empty(tool.Sources);
    }

    [Fact]
    public void ToolBudgetStopsTheNextCall()
    {
        LookupTool tool = new(new ServiceCatalogue());
        for (int i = 0; i < GuideLimits.ToolCalls; i++) tool.Execute("renewal", i.ToString());
        Assert.Throws<AgentProtocolException>(() => tool.Execute("renewal", "overflow"));
        Assert.Equal(GuideLimits.ToolCalls, tool.Activity.Count);
    }

    [Fact]
    public async Task OfflineResponsesNeverClaimToBeLive()
    {
        AgentTurn result = await new OfflineGuideAgent(new ServiceCatalogue()).ReplyAsync([new("user", "renewal")]);
        Assert.False(result.Agent.IsLive);
        Assert.Equal("offline", result.Agent.Implementation);
        Assert.Equal("not deployed", result.Agent.Version);
        Assert.Single(result.ToolActivity);
        Assert.Contains("registry agent", result.Answer, StringComparison.Ordinal);
        Assert.Contains("reviewed", result.Answer, StringComparison.Ordinal);
        Assert.DoesNotContain("matching service", result.Answer, StringComparison.Ordinal);
    }

    [Fact]
    public async Task OnlineAvailabilityIsQualifiedByTheSourceReview()
    {
        AgentTurn result = await new OfflineGuideAgent(new ServiceCatalogue())
            .ReplyAsync([new("user", "Can I renew online?")]);
        Assert.Contains("At the last source review", result.Answer, StringComparison.Ordinal);
        Assert.Contains("temporarily disabled", result.Answer, StringComparison.Ordinal);
        Assert.Contains("cannot confirm", result.Answer, StringComparison.Ordinal);
        ServiceEntry source = Assert.Single(result.Services);
        Assert.Equal(new DateOnly(2026, 10, 25), source.ReviewedOn);
        Assert.Equal("https://www.alberta.ca/renew-replace-drivers-licence", source.SourceUrl);
    }

    [Fact]
    public async Task OfflinePersonalDecisionsReferToTheRegistry()
    {
        AgentTurn result = await new OfflineGuideAgent(new ServiceCatalogue())
            .ReplyAsync([new("user", "Decide if I qualify for a licence renewal.")]);
        Assert.Empty(result.Services);
        Assert.Empty(result.ToolActivity);
        Assert.Contains("cannot decide eligibility", result.Answer, StringComparison.Ordinal);
        Assert.Contains("Do not share personal details", result.Answer, StringComparison.Ordinal);
    }

    [Fact]
    public void AllTopicsHaveValidOfficialSourcesAndReviewDates()
    {
        Assert.All(ServiceCatalogue.All, service =>
        {
            Assert.True(ServiceCatalogue.HasReviewedSource(service));
            Assert.True(ServiceCatalogue.MatchesSnapshot(service));
            Assert.StartsWith("AB-RENEW-", service.Id, StringComparison.Ordinal);
        });
        Assert.Equal(64, ServiceCatalogue.Revision.Length);
        ServiceEntry entry = ServiceCatalogue.All[0];
        Assert.False(ServiceCatalogue.HasReviewedSource(entry with { ReviewedOn = default }));
        Assert.False(ServiceCatalogue.HasReviewedSource(entry with { SourceTitle = "" }));
        Assert.False(ServiceCatalogue.HasReviewedSource(entry with { ReviewedOn = DateOnly.FromDateTime(DateTime.UtcNow).AddDays(1) }));
        Assert.False(ServiceCatalogue.MatchesSnapshot(entry with { NextStep = "Invented requirements." }));
    }

    [Theory]
    [InlineData("")]
    [InlineData("javascript:alert(1)")]
    [InlineData("http://www.alberta.ca/renew-replace-drivers-licence")]
    [InlineData("https://www.alberta.ca.untrusted.example/renew-replace-drivers-licence")]
    [InlineData("https://www.alberta.ca@untrusted.example/renew-replace-drivers-licence")]
    [InlineData("https://www.alberta.ca/not-a-reviewed-page")]
    public void UnreviewedLinksAreRejected(string url)
    {
        ServiceEntry entry = ServiceCatalogue.All[0] with { SourceUrl = url };
        Assert.False(ServiceCatalogue.HasReviewedSource(entry));
        Assert.False(ServiceCatalogue.MatchesSnapshot(entry));
        LookupTool tool = new(new UnreviewedCatalogue(entry));
        Assert.Throws<AgentProtocolException>(() => tool.Execute("renewal", "1"));
    }

    private sealed class UnreviewedCatalogue(ServiceEntry entry) : IServiceCatalogue
    {
        public LookupResult Lookup(string query) => new("found", "Unreviewed fixture.", [entry]);
    }
}

internal sealed class UnavailableCatalogue : IServiceCatalogue
{
    public LookupResult Lookup(string query) => throw new CatalogueUnavailableException("Test-only injected failure.");
}
