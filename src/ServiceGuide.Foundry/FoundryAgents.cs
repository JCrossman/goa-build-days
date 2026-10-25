// The pinned Foundry Responses SDK marks its API as experimental.
#pragma warning disable OPENAI001

using Azure.Core;
using Azure.AI.Extensions.OpenAI;
using Azure.AI.Projects;
using Azure.AI.Projects.Agents;
using Azure.Identity;
using OpenAI.Responses;
using ServiceGuide.Shared;
using AgentIdentity = ServiceGuide.Shared.AgentIdentity;

namespace ServiceGuide.Foundry;

public static class FoundryAgents
{
    public static async Task<AgentIdentity> CreateNativeAsync(
        Uri projectEndpoint,
        string agentName,
        string modelDeployment,
        string instructions,
        TokenCredential? credential = null,
        CancellationToken cancellationToken = default)
    {
        AIProjectClient project = new(projectEndpoint, credential ?? new DefaultAzureCredential());
        DeclarativeAgentDefinition definition = new(modelDeployment)
        {
            Instructions = instructions,
            Tools =
            {
                ResponseTool.CreateFunctionTool(
                    LookupTool.Name,
                    BinaryData.FromString(LookupTool.Parameters),
                    strictModeEnabled: true,
                    functionDescription: LookupTool.Description)
            }
        };

        ProjectsAgentVersion version = (await project.AgentAdministrationClient
            .CreateAgentVersionAsync(agentName, new(definition), cancellationToken: cancellationToken)).Value;
        return new("foundry", version.Name, version.Version, true);
    }

    public static async Task<IServiceGuideAgent> ConnectAsync(
        FoundryConnection connection,
        IServiceCatalogue catalogue,
        bool hosted,
        TokenCredential? credential = null,
        CancellationToken cancellationToken = default)
    {
        AIProjectClient project = new(connection.ProjectEndpoint, credential ?? new DefaultAzureCredential());
        ProjectsAgentVersion version = (await project.AgentAdministrationClient.GetAgentVersionAsync(
            connection.AgentName, connection.AgentVersion, cancellationToken)).Value;

        if (hosted ? version.Definition is not HostedAgentDefinition : version.Definition is not DeclarativeAgentDefinition)
        {
            throw new AgentConfigurationException(hosted
                ? "The configured MAF agent is not a hosted agent."
                : "The configured core agent is not a prompt agent.");
        }

        ProjectResponsesClient client = project.ProjectOpenAIClient
            .GetProjectResponsesClientForAgent(new AgentReference(version.Name, version.Version));
        AgentIdentity identity = new(hosted ? "maf" : "foundry", version.Name, version.Version, true);
        return hosted
            ? new HostedGuideAgent(client, identity)
            : new NativeGuideAgent(client, identity, catalogue);
    }
}
