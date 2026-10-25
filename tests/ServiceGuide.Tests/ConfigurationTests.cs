using ServiceGuide.Shared;

namespace ServiceGuide.Tests;

public sealed class ConfigurationTests
{
    [Theory]
    [InlineData("http://example.services.ai.azure.com/api/projects/demo")]
    [InlineData("https://example.services.ai.azure.com/")]
    [InlineData("https://user:pass@example.services.ai.azure.com/api/projects/demo")]
    [InlineData("https://example.services.ai.azure.com/api/projects/demo?key=value")]
    [InlineData("https://untrusted.example/api/projects/demo")]
    [InlineData("your-project-endpoint")]
    public void RejectsInvalidProjectEndpoints(string value)
    {
        Assert.Throws<AgentConfigurationException>(() =>
            FoundryConnection.ReadEndpoint(key => value));
    }

    [Fact]
    public void RequiresAnExplicitVersionAndSeparateMafSettings()
    {
        Dictionary<string, string?> settings = new()
        {
            ["FOUNDRY_PROJECT_ENDPOINT"] = "https://example.services.ai.azure.com/api/projects/workshop",
            ["FOUNDRY_AGENT_NAME"] = "native-example",
            ["FOUNDRY_AGENT_VERSION"] = "latest"
        };
        string? Get(string key) => settings.GetValueOrDefault(key);
        Assert.Throws<AgentConfigurationException>(() => FoundryConnection.Read(Get));
        settings["FOUNDRY_AGENT_VERSION"] = "2";
        Assert.Equal("2", FoundryConnection.Read(Get).AgentVersion);
        Assert.Throws<AgentConfigurationException>(() => FoundryConnection.Read(Get, hosted: true));
    }
}
