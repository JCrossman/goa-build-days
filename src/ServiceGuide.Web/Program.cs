using Azure.Core;
using Azure.Identity;
using ServiceGuide.Shared;
using ServiceGuide.Web;

var builder = WebApplication.CreateBuilder(args);
if (string.IsNullOrWhiteSpace(builder.Configuration["urls"]))
{
    builder.WebHost.UseUrls("http://127.0.0.1:5087");
}
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 16_384);
builder.Services.AddMemoryCache(options => options.SizeLimit = 100);
builder.Services.AddSingleton<ConversationStore>();
builder.Services.AddSingleton<IServiceCatalogue, ServiceCatalogue>();
builder.Services.AddSingleton<TokenCredential>(_ => new DefaultAzureCredential());
builder.Services.AddSingleton<AgentSelection>();
builder.Services.AddSingleton<IServiceGuideAgent>(services => services.GetRequiredService<AgentSelection>());
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<GuideExceptionHandler>();

var app = builder.Build();
app.UseExceptionHandler();
app.Use(async (context, next) =>
{
    context.Response.Headers.ContentSecurityPolicy = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'";
    context.Response.Headers.XContentTypeOptions = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    if (context.Request.Path.StartsWithSegments("/api"))
    {
        context.Response.Headers.CacheControl = "no-store";
        if (HttpMethods.IsPost(context.Request.Method) &&
            context.Request.Headers.TryGetValue("Origin", out var origin) &&
            origin.ToString() != $"{context.Request.Scheme}://{context.Request.Host}")
        {
            app.Logger.LogWarning("Rejected a cross-origin API request.");
            await Results.Problem(statusCode: 403, title: "Request blocked", detail: "Use this app from its own browser page.")
                .ExecuteAsync(context);
            return;
        }
    }
    await next(context);
});
app.UseDefaultFiles();
app.UseStaticFiles();

app.MapGet("/health", () => Results.Ok(new { status = "ok" }));
app.MapGet("/api/status", (AgentSelection selection) => selection.Status());
app.MapGet("/api/catalogue", () => ServiceCatalogue.All);
app.MapGet("/api/examples/{example}", (string example) => ExampleSources.Read(example));
app.MapGet("/api/conversation", async (HttpContext context, ConversationStore store) =>
{
    Conversation conversation = store.Get(context);
    await conversation.Gate.WaitAsync(context.RequestAborted);
    try
    {
        return Results.Ok(new { messages = conversation.Messages.ToArray(), lastTurn = conversation.LastTurn });
    }
    finally
    {
        conversation.Gate.Release();
    }
});
app.MapPost("/api/conversation/reset", (HttpContext context, ConversationStore store) =>
{
    store.Reset(context);
    return Results.NoContent();
});
app.MapPost("/api/chat", async (
    ChatRequest request,
    HttpContext context,
    ConversationStore store,
    IServiceGuideAgent agent) =>
{
    string? message = request.Message?.Trim();
    if (string.IsNullOrWhiteSpace(message) || message.Length > GuideLimits.MessageLength)
    {
        app.Logger.LogWarning("Rejected an empty or oversized chat request.");
        return Results.Problem(statusCode: 400, title: "Check your message",
            detail: $"Enter a message between 1 and {GuideLimits.MessageLength} characters.");
    }

    Conversation conversation = store.Get(context);
    if (!await conversation.Gate.WaitAsync(0, context.RequestAborted))
    {
        return Results.Problem(statusCode: 409, title: "A request is already running",
            detail: "Wait for it to finish or stop it before sending another.");
    }

    try
    {
        if (conversation.Messages.Count >= GuideLimits.ConversationTurns * 2)
        {
            return Results.Problem(statusCode: 409, title: "Start a new conversation",
                detail: $"This workshop limits each conversation to {GuideLimits.ConversationTurns} turns.");
        }

        using CancellationTokenSource timeout = CancellationTokenSource.CreateLinkedTokenSource(context.RequestAborted);
        timeout.CancelAfter(GuideLimits.RequestTimeout);
        List<DialogueMessage> messages = [.. conversation.Messages, new("user", message)];
        AgentTurn result = await agent.ReplyAsync(messages, timeout.Token);
        timeout.Token.ThrowIfCancellationRequested();
        conversation.Messages.Add(new("user", message));
        conversation.Messages.Add(new("assistant", result.Answer));
        conversation.LastTurn = result;
        return Results.Ok(result);
    }
    finally
    {
        conversation.Gate.Release();
    }
});
app.Map("/api/{**path}", () => Results.Problem(statusCode: 404, title: "API route not found"));
app.Run();

namespace ServiceGuide.Web
{
    public sealed class WebAppMarker;
}
