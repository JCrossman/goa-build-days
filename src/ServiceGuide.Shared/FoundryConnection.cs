using System.Text.RegularExpressions;

namespace ServiceGuide.Shared;

public sealed partial record FoundryConnection(Uri ProjectEndpoint, string AgentName, string AgentVersion)
{
    public static FoundryConnection Read(Func<string, string?> get, bool hosted = false)
    {
        string prefix = hosted ? "MAF" : "FOUNDRY";
        return new(ReadEndpoint(get), ReadName(get, $"{prefix}_AGENT_NAME"),
            Required(get, $"{prefix}_AGENT_VERSION"));
    }

    public static Uri ReadEndpoint(Func<string, string?> get)
    {
        string value = Required(get, "FOUNDRY_PROJECT_ENDPOINT");
        if (!Uri.TryCreate(value, UriKind.Absolute, out Uri? endpoint) ||
            endpoint.Scheme != Uri.UriSchemeHttps ||
            !endpoint.IsDefaultPort ||
            !endpoint.Host.EndsWith(".ai.azure.com", StringComparison.OrdinalIgnoreCase) ||
            endpoint.UserInfo.Length != 0 ||
            endpoint.Query.Length != 0 ||
            endpoint.Fragment.Length != 0 ||
            !ProjectPath().IsMatch(endpoint.AbsolutePath))
        {
            throw new AgentConfigurationException("FOUNDRY_PROJECT_ENDPOINT must be an HTTPS Azure Foundry URL ending in /api/projects/<project>.");
        }

        return endpoint;
    }

    public static string ReadName(Func<string, string?> get, string key)
    {
        string name = Required(get, key);
        if (!AgentNamePattern().IsMatch(name))
        {
            throw new AgentConfigurationException($"{key} must contain only letters, numbers, and hyphens, and start with a letter or number.");
        }

        return name;
    }

    public static string Required(Func<string, string?> get, string key)
    {
        string? value = get(key)?.Trim();
        if (string.IsNullOrEmpty(value) ||
            value.Contains('<', StringComparison.Ordinal) ||
            value.StartsWith("your-", StringComparison.OrdinalIgnoreCase))
        {
            throw new AgentConfigurationException($"Set {key} to the value for your approved workshop project.");
        }

        if (key.EndsWith("_VERSION", StringComparison.Ordinal) &&
            !VersionPattern().IsMatch(value))
        {
            throw new AgentConfigurationException($"{key} must be an explicit numeric version, not latest.");
        }

        return value;
    }

    [GeneratedRegex(@"^/api/projects/[A-Za-z0-9_.-]+/?$", RegexOptions.CultureInvariant)]
    private static partial Regex ProjectPath();

    [GeneratedRegex(@"^[A-Za-z0-9][A-Za-z0-9-]{0,62}$", RegexOptions.CultureInvariant)]
    private static partial Regex AgentNamePattern();

    [GeneratedRegex(@"^[1-9][0-9]*$", RegexOptions.CultureInvariant)]
    private static partial Regex VersionPattern();
}
