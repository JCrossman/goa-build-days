using System.ComponentModel;
using System.Text.Json;

namespace ServiceGuide.Shared;

public sealed class LookupTool(IServiceCatalogue catalogue)
{
    public const string Name = "lookup_service";
    public const string Description = "Search reviewed Alberta driver's licence renewal guidance. Returns summaries, next steps, official source URLs, and review dates. This is a saved snapshot, not a live website check. It never renews a licence or submits anything.";

    public const string Parameters = """
        {
          "type": "object",
          "properties": {
            "query": {
              "type": "string",
              "description": "A short renewal topic: how to renew, online renewal, what to bring, expired licence, registry, fees, or remote renewal. Never include personal details."
            }
          },
          "required": ["query"],
          "additionalProperties": false
        }
        """;

    private readonly List<ToolActivity> activity = [];
    private readonly Dictionary<string, ServiceEntry> sources = new(StringComparer.Ordinal);

    public IReadOnlyList<ToolActivity> Activity => activity.AsReadOnly();
    public IReadOnlyList<ServiceEntry> Sources => sources.Values.ToArray();

    public LookupResult ExecuteJson(string arguments, string callId)
    {
        try
        {
            using JsonDocument document = JsonDocument.Parse(arguments);
            JsonElement root = document.RootElement;
            if (root.ValueKind != JsonValueKind.Object ||
                root.EnumerateObject().Count() != 1 ||
                !root.TryGetProperty("query", out JsonElement query) ||
                query.ValueKind != JsonValueKind.String)
            {
                return RecordError(callId, "", "invalid_input", "lookup_service requires exactly one string argument named query.");
            }

            return Execute(query.GetString()!, callId);
        }
        catch (JsonException)
        {
            return RecordError(callId, "", "invalid_input", "The lookup arguments were not valid JSON.");
        }
    }

    [Description(Description)]
    public LookupResult Lookup(
        [Description("A short driver's licence renewal question without personal details.")] string query) =>
        Execute(query, $"tool-{activity.Count + 1}");

    public LookupResult Execute(string query, string callId)
    {
        if (activity.Count >= GuideLimits.ToolCalls)
        {
            throw new AgentProtocolException("The agent reached the lookup limit. Start a new request with a more specific question.");
        }

        if (query is null || query.Length > GuideLimits.QueryLength)
        {
            return RecordError(callId, "", "invalid_input", $"The query must be a string of at most {GuideLimits.QueryLength} characters.");
        }

        LookupResult result;
        try
        {
            result = catalogue.Lookup(query);
        }
        catch (CatalogueUnavailableException)
        {
            return RecordError(callId, query, "unavailable", "The reviewed guidance is unavailable. Explain the failure and direct the user to the official renewal page or a registry agent; do not invent a result.");
        }

        foreach (ServiceEntry service in result.Services)
        {
            if (!ServiceCatalogue.MatchesSnapshot(service))
            {
                throw new AgentProtocolException("The lookup returned unreviewed guidance. Check the bundled source data before trying again.");
            }
            sources[service.Id] = service;
        }

        activity.Add(new(callId, Name, query, result.Status, result.Message,
            result.Services.Select(service => service.Id).ToArray()));
        return result;
    }

    private LookupResult RecordError(string callId, string query, string status, string message)
    {
        if (activity.Count >= GuideLimits.ToolCalls)
        {
            throw new AgentProtocolException("The agent reached the lookup limit.");
        }

        activity.Add(new(callId, Name, query, status, message, []));
        return new(status, message, []);
    }
}
