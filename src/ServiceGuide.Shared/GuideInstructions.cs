namespace ServiceGuide.Shared;

public static class GuideInstructions
{
    public static string Text { get; } = Load();

    private static string Load()
    {
        using Stream stream = typeof(GuideInstructions).Assembly
            .GetManifestResourceStream("ServiceGuide.Shared.AgentInstructions.txt")
            ?? throw new InvalidOperationException("The embedded agent instructions are missing.");
        using StreamReader reader = new(stream);
        return reader.ReadToEnd();
    }
}
