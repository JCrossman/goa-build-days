using System.ClientModel;
using System.Text.Json;
using Azure.Identity;
using ServiceGuide.Foundry;
using ServiceGuide.Shared;

if (args.Length == 0 || args[0] is "--help" or "-h")
{
    Console.WriteLine("""
        Foundry-native prompt agent
          create [instructions-file]   Create a version from C#.
          ask "your question"          Call the configured, pinned agent version.
          check                        Read configuration without calling Azure.

        Required: FOUNDRY_PROJECT_ENDPOINT, FOUNDRY_AGENT_NAME.
        create:   AZURE_AI_MODEL_DEPLOYMENT_NAME.
        ask:      FOUNDRY_AGENT_VERSION.
        Sign in with your approved Azure identity. No keys are used.
        """);
    return 0;
}

try
{
    using CancellationTokenSource timeout = new(GuideLimits.RequestTimeout);
    Func<string, string?> get = Environment.GetEnvironmentVariable;
    switch (args[0])
    {
        case "create" when args.Length <= 2:
            Uri endpoint = FoundryConnection.ReadEndpoint(get);
            string name = FoundryConnection.ReadName(get, "FOUNDRY_AGENT_NAME");
            string model = FoundryConnection.Required(get, "AZURE_AI_MODEL_DEPLOYMENT_NAME");
            string instructions = args.Length == 2 ? await File.ReadAllTextAsync(args[1]) : GuideInstructions.Text;
            if (string.IsNullOrWhiteSpace(instructions))
            {
                throw new AgentConfigurationException("The instructions file must not be empty.");
            }
            AgentIdentity created = await FoundryAgents.CreateNativeAsync(
                endpoint, name, model, instructions, cancellationToken: timeout.Token);
            Console.WriteLine(JsonSerializer.Serialize(created, GuideJson.Options));
            Console.WriteLine($"Set FOUNDRY_AGENT_VERSION={created.Version} before running the app.");
            return 0;

        case "ask" when args.Length == 2:
            if (string.IsNullOrWhiteSpace(args[1]) || args[1].Length > GuideLimits.MessageLength)
            {
                throw new AgentConfigurationException($"Use a question between 1 and {GuideLimits.MessageLength} characters.");
            }
            FoundryConnection connection = FoundryConnection.Read(get);
            IServiceGuideAgent agent = await FoundryAgents.ConnectAsync(
                connection, new ServiceCatalogue(), hosted: false, cancellationToken: timeout.Token);
            AgentTurn answer = await agent.ReplyAsync([new("user", args[1])], timeout.Token);
            Console.WriteLine(JsonSerializer.Serialize(answer, new JsonSerializerOptions(GuideJson.Options) { WriteIndented = true }));
            return 0;

        case "check" when args.Length == 1:
            FoundryConnection.Read(get);
            Console.WriteLine("Invocation settings are valid. This check did not call Azure or verify access.");
            return 0;

        default:
            Console.Error.WriteLine("Unknown command or arguments. Run with --help.");
            return 2;
    }
}
catch (Exception exception) when (exception is AgentConfigurationException or AgentProtocolException or
    AuthenticationFailedException or IOException or UnauthorizedAccessException)
{
    Console.Error.WriteLine(exception.Message);
    return 1;
}
catch (ClientResultException exception)
{
    Console.Error.WriteLine($"Foundry returned HTTP {exception.Status}. Check the project, agent version, access, and model quota.");
    return 1;
}
catch (OperationCanceledException)
{
    Console.Error.WriteLine("The agent request timed out. Check the Foundry run before retrying.");
    return 1;
}
