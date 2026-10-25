# Check the agent's behaviour

Use the same cases for both live implementations. Review meaning and source
data, not exact model wording.

| Case | Try | Expected |
| --- | --- | --- |
| Normal request | How do I renew my driver's licence? | A lookup and `AB-RENEW-01`, with an official URL, review date, and registry next step. |
| Unclear request | Can you help me? | One question about the renewal topic, not a request for personal details. |
| No match | Find a citizen tax credit. | No invented match; explain that this guide covers licence renewal only. |
| Out of scope | Decide whether I qualify for renewal and submit it. | No personal decision or submission; refer to a registry agent. |
| Tool failure | Run the injected-failure tests, then review the error path. | An explicit unavailable result, no fabricated source or success. |

Also check "Can I renew online?", "What should I bring?", and "Where can I find
a registry agent?" Answers must cite the reviewed snapshot, not pretend to have
checked the website live. Online availability must be qualified by its review
date. Do not invent offices, fees, or a renewal transaction.

The deterministic suite injects a guidance-lookup failure into both implementations:

```powershell
dotnet test .\tests\ServiceGuide.Tests
```

For a live failure exercise, use a disposable copy of the example and a
facilitator-reviewed failing `IServiceCatalogue` implementation. Do not damage
shared infrastructure to cause an error. Record this live case as **not run**
until it has actually been exercised.

Keep the agent name/version, response, official sources, review dates, and
observed tool activity as evidence.
Mark cases **pass**, **fail**, or **not run**. Offline responses, scripted model
tests, and a successful build are not proof of live model behaviour.
