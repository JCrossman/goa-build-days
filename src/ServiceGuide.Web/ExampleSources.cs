namespace ServiceGuide.Web;

internal static class ExampleSources
{
    private static readonly IReadOnlyDictionary<string, (string File, string Resource)> Files =
        new Dictionary<string, (string, string)>(StringComparer.Ordinal)
        {
            ["native"] = ("FoundryAgents.cs", "Examples.Native"),
            ["maf"] = ("MafAgentFactory.cs", "Examples.Maf"),
            ["tool"] = ("LookupTool.cs", "Examples.Tool"),
            ["instructions"] = ("AgentInstructions.txt", "Examples.Instructions")
        };

    public static IResult Read(string example)
    {
        if (!Files.TryGetValue(example, out var file))
        {
            return Results.Problem(statusCode: 404, title: "Example not found");
        }

        using Stream stream = typeof(ExampleSources).Assembly.GetManifestResourceStream(file.Resource)
            ?? throw new InvalidOperationException($"Embedded example {file.Resource} is missing.");
        using StreamReader reader = new(stream);
        return Results.Ok(new { file = file.File, source = reader.ReadToEnd() });
    }
}
