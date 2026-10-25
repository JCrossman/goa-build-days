using Azure.AI.Projects;
using Azure.Identity;
using Microsoft.Agents.AI;
using Microsoft.Extensions.AI;
using ServiceGuide.Shared;

namespace ServiceGuide.MafHosted;

public static class MafAgentFactory
{
    public static AIAgent Create(Uri projectEndpoint, string modelDeployment, IServiceCatalogue catalogue)
    {
        AIFunction lookup = AIFunctionFactory.Create(
            MafToolScope.Lookup, name: LookupTool.Name, description: LookupTool.Description);
        AIAgent agent = new AIProjectClient(projectEndpoint, new DefaultAzureCredential())
            .AsAIAgent(
                model: modelDeployment,
                name: "service-guide-maf",
                instructions: GuideInstructions.Text,
                tools: [lookup]);
        return new ObservedGuideAgent(agent, catalogue);
    }

    public static AIAgent Create(IChatClient chatClient, IServiceCatalogue catalogue)
    {
        AIFunction lookup = AIFunctionFactory.Create(
            MafToolScope.Lookup, name: LookupTool.Name, description: LookupTool.Description);
        AIAgent agent = chatClient.AsAIAgent(
            name: "service-guide-maf",
            instructions: GuideInstructions.Text,
            tools: [lookup]);
        return new ObservedGuideAgent(agent, catalogue);
    }
}
