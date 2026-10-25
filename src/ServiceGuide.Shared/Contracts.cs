using System.Text.Json;

namespace ServiceGuide.Shared;

public sealed record ServiceEntry(
    string Id,
    string Title,
    string Category,
    string Summary,
    string NextStep,
    string[] Keywords,
    string SourceTitle,
    string SourceUrl,
    DateOnly ReviewedOn);

public sealed record LookupResult(
    string Status,
    string Message,
    IReadOnlyList<ServiceEntry> Services);

public sealed record ToolActivity(
    string CallId,
    string Name,
    string Query,
    string Status,
    string Message,
    IReadOnlyList<string> SourceIds);

public sealed record DialogueMessage(string Role, string Text);

public sealed record AgentIdentity(
    string Implementation,
    string Name,
    string Version,
    bool IsLive);

public sealed record AgentTurn(
    string Answer,
    IReadOnlyList<ServiceEntry> Services,
    IReadOnlyList<ToolActivity> ToolActivity,
    AgentIdentity Agent);

public sealed record HostedReply(
    string Format,
    string GuidanceRevision,
    string Answer,
    IReadOnlyList<ServiceEntry> Services,
    IReadOnlyList<ToolActivity> ToolActivity)
{
    public const string CurrentFormat = "alberta-renewal-maf-v2";
}

public interface IServiceGuideAgent
{
    Task<AgentTurn> ReplyAsync(
        IReadOnlyList<DialogueMessage> messages,
        CancellationToken cancellationToken = default);
}

public interface IServiceCatalogue
{
    LookupResult Lookup(string query);
}

public static class GuideJson
{
    public static JsonSerializerOptions Options { get; } = new(JsonSerializerDefaults.Web);
}

public static class GuideLimits
{
    public const int MessageLength = 1_000;
    public const int QueryLength = 240;
    public const int ConversationTurns = 8;
    public const int ToolCalls = 4;
    public static TimeSpan RequestTimeout { get; } = TimeSpan.FromSeconds(90);
}

public sealed class AgentConfigurationException(string message) : Exception(message);
public sealed class AgentProtocolException(string message) : Exception(message);
public sealed class CatalogueUnavailableException(string message) : Exception(message);
