using Azure.AI.AgentServer.Core;
using Microsoft.Agents.AI;
using Microsoft.Agents.AI.Foundry.Hosting;
using ServiceGuide.MafHosted;
using ServiceGuide.Shared;

if (args.Contains("--help", StringComparer.Ordinal))
{
    Console.WriteLine("""
        MAF hosted Service Guide
        Set FOUNDRY_PROJECT_ENDPOINT and AZURE_AI_MODEL_DEPLOYMENT_NAME.
        Run this project to serve the Foundry Responses protocol.
        Use --check to validate settings without calling Azure.
        See docs/labs/optional-maf-hosted.md for deployment.
        """);
    return 0;
}

try
{
    Func<string, string?> get = Environment.GetEnvironmentVariable;
    Uri endpoint = FoundryConnection.ReadEndpoint(get);
    string model = FoundryConnection.Required(get, "AZURE_AI_MODEL_DEPLOYMENT_NAME");
    if (args.Contains("--check", StringComparer.Ordinal))
    {
        Console.WriteLine("Runtime settings are valid. This check did not call Azure or verify access.");
        return 0;
    }

    AIAgent agent = MafAgentFactory.Create(endpoint, model, new ServiceCatalogue());
    var builder = AgentHost.CreateBuilder(args);
    builder.Services.AddFoundryResponses(agent);
    builder.RegisterProtocol("responses", routes => routes.MapFoundryResponses());
    var app = builder.Build();
    app.Run();
    return 0;
}
catch (AgentConfigurationException exception)
{
    Console.Error.WriteLine(exception.Message);
    return 1;
}
