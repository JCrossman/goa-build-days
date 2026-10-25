using System.ClientModel;
using Azure.Identity;
using Microsoft.AspNetCore.Diagnostics;
using ServiceGuide.Shared;

namespace ServiceGuide.Web;

public sealed class GuideExceptionHandler(ILogger<GuideExceptionHandler> logger) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(
        HttpContext context,
        Exception exception,
        CancellationToken cancellationToken)
    {
        (int status, string title, string detail) = exception switch
        {
            AgentConfigurationException error => (503, "Setup needed", error.Message),
            AgentProtocolException error => (502, "The agent could not finish", error.Message),
            AuthenticationFailedException => (503, "Azure sign-in needs attention",
                "Sign in with your approved Azure account and check access to the assigned Foundry project."),
            ClientResultException error when error.Status is 401 or 403 => (503, "Foundry access was denied",
                "Check your Azure identity and project permissions. A desktop Copilot sign-in does not grant Foundry access."),
            ClientResultException error when error.Status == 429 => (503, "Foundry is at its request limit",
                "Wait before retrying, or ask the workshop owner to check model quota."),
            ClientResultException => (502, "Foundry could not complete the request",
                "Check the project, deployed agent version, and Foundry run before retrying."),
            OperationCanceledException => (504, "The request stopped",
                "The request was cancelled or timed out. Check the last run before retrying."),
            _ => (500, "Something went wrong", "The request failed. Check the server log using the trace ID, then try again.")
        };

        logger.LogError("Request failed with {ExceptionType}, HTTP {Status}; trace {TraceId}.",
            exception.GetType().Name, status, context.TraceIdentifier);
        await Results.Problem(
            title: title,
            detail: detail,
            statusCode: status,
            extensions: new Dictionary<string, object?> { ["traceId"] = context.TraceIdentifier })
            .ExecuteAsync(context);
        return true;
    }
}
