using System.Reflection;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;

namespace ServiceGuide.Shared;

public sealed partial class ServiceCatalogue : IServiceCatalogue
{
    private static readonly HashSet<string> FillerWords =
    [
        "a", "an", "and", "are", "can", "do", "find", "for", "help", "i", "in",
        "information", "is", "it", "me", "my", "need", "of", "on", "please",
        "service", "services", "some", "something", "the", "to", "want", "with",
        "you", "get", "started", "what", "would", "like", "s"
    ];

    private static readonly HashSet<string> OfficialSources = new(StringComparer.Ordinal)
    {
        "https://www.alberta.ca/renew-replace-drivers-licence",
        "https://www.alberta.ca/new-drivers-licence-and-identification-cards",
        "https://www.alberta.ca/lookup/find-a-registry-agent.aspx"
    };

    private static readonly IReadOnlyList<ServiceEntry> Entries = Load();

    public static IReadOnlyList<ServiceEntry> All => Entries;
    public static string Revision { get; } = Convert.ToHexString(
        SHA256.HashData(JsonSerializer.SerializeToUtf8Bytes(Entries, GuideJson.Options))).ToLowerInvariant();

    public LookupResult Lookup(string query)
    {
        ArgumentNullException.ThrowIfNull(query);
        if (query.Length > GuideLimits.QueryLength)
        {
            throw new ArgumentException($"Use a query of at most {GuideLimits.QueryLength} characters.", nameof(query));
        }

        HashSet<string> words = WordPattern().Matches(query.ToLowerInvariant())
            .Select(match => match.Value)
            .Where(word => !FillerWords.Contains(word))
            .ToHashSet(StringComparer.Ordinal);

        if (words.Count == 0)
        {
            return new("needs_clarification", "Would you like help with renewing your driver's licence, what to bring, or finding a registry agent? Do not share personal details.", []);
        }

        if (words.Overlaps(["business", "fishing", "hunting", "vehicle", "registration", "tax", "taxes", "benefit", "benefits"]) &&
            !words.Overlaps(["driver", "drivers", "driving"]))
        {
            return NoMatch();
        }

        var scored = Entries
            .Select(service => (Service: service, Score: service.Keywords.Count(words.Contains)))
            .Where(match => match.Score > 0)
            .ToArray();
        // General licence words should not outrank a specific renewal question.
        var specific = scored.Where(match => match.Service.Id != "AB-RENEW-01").ToArray();
        ServiceEntry[] matches = (specific.Length > 0 ? specific : scored)
            .OrderByDescending(match => match.Score)
            .ThenBy(match => match.Service.Id, StringComparer.Ordinal)
            .Take(3)
            .Select(match => match.Service)
            .ToArray();

        return matches.Length == 0
            ? NoMatch()
            : new("found", "These are saved summaries of Alberta.ca guidance. Use each review date and official link to check current requirements; this is not a live website lookup.", matches);
    }

    private static LookupResult NoMatch() =>
        new("not_found", "This guide only covers Alberta driver's licence renewal. I do not have reviewed guidance for that question. Check Alberta.ca or contact a registry agent.", []);

    public static bool HasReviewedSource(ServiceEntry? service) =>
        service is not null &&
        !string.IsNullOrWhiteSpace(service.SourceTitle) &&
        OfficialSources.Contains(service.SourceUrl) &&
        service.ReviewedOn != default &&
        service.ReviewedOn <= DateOnly.FromDateTime(DateTime.UtcNow);

    public static bool MatchesSnapshot(ServiceEntry? service)
    {
        ServiceEntry? current = Entries.FirstOrDefault(entry => entry.Id == service?.Id);
        return service is not null && current is not null &&
            service.Title == current.Title && service.Category == current.Category &&
            service.Summary == current.Summary && service.NextStep == current.NextStep &&
            service.SourceTitle == current.SourceTitle && service.SourceUrl == current.SourceUrl &&
            service.ReviewedOn == current.ReviewedOn &&
            service.Keywords is not null && service.Keywords.SequenceEqual(current.Keywords, StringComparer.Ordinal);
    }

    private static IReadOnlyList<ServiceEntry> Load()
    {
        using Stream stream = Assembly.GetExecutingAssembly()
            .GetManifestResourceStream("ServiceGuide.Shared.Data.services.json")
            ?? throw new InvalidOperationException("The embedded service catalogue is missing.");
        ServiceEntry[] services = JsonSerializer.Deserialize<ServiceEntry[]>(stream, GuideJson.Options)
            ?? throw new InvalidOperationException("The service catalogue is empty.");
        if (services.Length == 0 || services.Any(service =>
                service is null || string.IsNullOrWhiteSpace(service.Id) ||
                string.IsNullOrWhiteSpace(service.Title) ||
                string.IsNullOrWhiteSpace(service.Category) ||
                string.IsNullOrWhiteSpace(service.Summary) ||
                string.IsNullOrWhiteSpace(service.NextStep) ||
                service.Keywords is null || service.Keywords.Length == 0 ||
                service.Keywords.Any(string.IsNullOrWhiteSpace) ||
                !HasReviewedSource(service)) ||
            services.Select(service => service.Id).Distinct(StringComparer.Ordinal).Count() != services.Length)
        {
            throw new InvalidOperationException("The renewal guidance contains invalid or duplicate entries, or missing official source/review metadata.");
        }

        return Array.AsReadOnly(services);
    }

    [GeneratedRegex(@"[\p{L}\p{Nd}]+", RegexOptions.CultureInvariant)]
    private static partial Regex WordPattern();
}
