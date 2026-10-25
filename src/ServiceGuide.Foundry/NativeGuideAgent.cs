// The pinned Foundry Responses SDK marks its API as experimental.
#pragma warning disable OPENAI001

using System.Text.Json;
using Azure.AI.Extensions.OpenAI;
using OpenAI.Responses;
using ServiceGuide.Shared;

namespace ServiceGuide.Foundry;

public sealed class NativeGuideAgent(
    ProjectResponsesClient client,
    AgentIdentity identity,
    IServiceCatalogue catalogue) : IServiceGuideAgent
{
    public async Task<AgentTurn> ReplyAsync(
        IReadOnlyList<DialogueMessage> messages,
        CancellationToken cancellationToken = default)
    {
        LookupTool lookup = new(catalogue);
        CreateResponseOptions options = ResponseRequests.Create(messages);
        HashSet<string> callIds = new(StringComparer.Ordinal);

        for (int round = 0; round <= GuideLimits.ToolCalls; round++)
        {
            ResponseResult response = (await client.CreateResponseAsync(options, cancellationToken)).Value;
            ResponseRequests.RequireCompleted(response);
            FunctionCallResponseItem[] calls = response.OutputItems.OfType<FunctionCallResponseItem>().ToArray();
            if (calls.Length == 0)
            {
                string answer = response.GetOutputText();
                if (string.IsNullOrWhiteSpace(answer))
                {
                    throw new AgentProtocolException("The agent returned no answer. Try a more specific request.");
                }

                return new(answer, lookup.Sources, lookup.Activity, identity);
            }

            options = new() { PreviousResponseId = response.Id, MaxOutputTokenCount = 1_200 };
            foreach (FunctionCallResponseItem call in calls)
            {
                if (call.FunctionName != LookupTool.Name || !callIds.Add(call.CallId))
                {
                    throw new AgentProtocolException("The agent requested an unknown or repeated tool call.");
                }

                LookupResult result = lookup.ExecuteJson(call.FunctionArguments.ToString(), call.CallId);
                options.InputItems.Add(ResponseItem.CreateFunctionCallOutputItem(
                    call.CallId, JsonSerializer.Serialize(result, GuideJson.Options)));
            }
        }

        throw new AgentProtocolException("The agent reached the tool-call limit without finishing its answer.");
    }
}

internal static class ResponseRequests
{
    public static CreateResponseOptions Create(IReadOnlyList<DialogueMessage> messages)
    {
        CreateResponseOptions options = new() { MaxOutputTokenCount = 1_200 };
        foreach (DialogueMessage message in messages)
        {
            options.InputItems.Add(message.Role switch
            {
                "user" => ResponseItem.CreateUserMessageItem(message.Text),
                "assistant" => ResponseItem.CreateAssistantMessageItem(message.Text),
                _ => throw new AgentProtocolException("Only user and assistant messages are allowed.")
            });
        }

        return options;
    }

    public static void RequireCompleted(ResponseResult response)
    {
        if (response.Status != ResponseStatus.Completed)
        {
            throw new AgentProtocolException($"The agent did not finish its response ({response.Status}). Try again or check the Foundry run.");
        }
    }
}
