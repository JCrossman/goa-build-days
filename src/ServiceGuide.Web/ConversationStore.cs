using Microsoft.Extensions.Caching.Memory;
using ServiceGuide.Shared;

namespace ServiceGuide.Web;

public sealed class ConversationStore(IMemoryCache cache)
{
    private const string CookieName = "service-guide-session";
    private readonly object creationLock = new();

    public Conversation Get(HttpContext context)
    {
        lock (creationLock)
        {
            string? key = context.Request.Cookies[CookieName];
            if (Guid.TryParseExact(key, "N", out _) && cache.TryGetValue(key!, out Conversation? found))
            {
                return found!;
            }

            string newKey = Guid.NewGuid().ToString("N");
            Conversation conversation = new();
            cache.Set(newKey, conversation, new MemoryCacheEntryOptions
            {
                Size = 1,
                SlidingExpiration = TimeSpan.FromMinutes(20)
            });
            context.Response.Cookies.Append(CookieName, newKey, new CookieOptions
            {
                HttpOnly = true,
                Secure = context.Request.IsHttps,
                SameSite = SameSiteMode.Strict,
                IsEssential = true,
                Path = "/"
            });
            return conversation;
        }
    }

    public void Reset(HttpContext context)
    {
        string? key = context.Request.Cookies[CookieName];
        if (Guid.TryParseExact(key, "N", out _))
        {
            cache.Remove(key!);
        }
        context.Response.Cookies.Delete(CookieName, new CookieOptions { Path = "/", SameSite = SameSiteMode.Strict });
    }
}

public sealed class Conversation
{
    public SemaphoreSlim Gate { get; } = new(1, 1);
    public List<DialogueMessage> Messages { get; } = [];
    public AgentTurn? LastTurn { get; set; }
}

public sealed record ChatRequest(string? Message);
