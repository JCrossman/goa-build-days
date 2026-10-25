# GoA Build Days

```text
      ____         _           [o_o]
     / ___| ___   / \         /|___|\
    | |  _ / _ \ / _ \          / \
    | |_| | (_) / ___ \
     \____|\___/_/   \_\

          B U I L D   D A Y S
      Ideas -> Specs -> Code -> Agents
```

A **three-hour, hands-on workshop** for Government of Alberta developers.

Learn app-native spec-driven development (SDD), QA automation with GitHub
Agentic Workflows, and agent development with Microsoft Foundry.

## Start here

| Guide | What to do |
| --- | --- |
| [Prework: tools and access](docs/prework.md) | Complete setup before starting a lab. |
| [Lab 1: SDD and Copilot cloud agent](docs/labs/01-spec-and-cloud-agent.md) | Review a specification, create its issue, delegate to CCA, and review the PR. |
| [Lab 2: agentic QA](docs/labs/02-agentic-qa.md) | Adapt a GH-AW example and inspect its QA report and failure issue. |
| [Lab 3: Foundry SDK](docs/labs/03-foundry-native.md) | Create a prompt agent in C# and use it in the app. |
| [Optional lab: MAF hosted agent](docs/labs/optional-maf-hosted.md) | Run the same agent and lookup in Foundry with Microsoft Agent Framework. |

See the [workshop plan](docs/workshop-plan.md) for the full agenda and optional
capstone. Each lab has numbered steps and text prompts to copy into the
Copilot app. Work through the core labs in order.

## Set up before the workshop

| Tool | Get ready |
| --- | --- |
| [Download the GitHub Copilot app](https://github.com/features/ai/github-app) | Install the app and sign in with your approved GitHub account. |
| [GitHub Agentic Workflows](https://github.github.com/gh-aw/) | Follow the setup guidance and confirm Actions and Copilot workflow-engine access with your administrator. |
| [Open Microsoft Foundry](https://ai.azure.com/) | Sign in and confirm access to your assigned project and an existing model deployment. |

The [prework guide](docs/prework.md) covers the .NET SDK, Azure tools, and
access checks. Every developer needs working access before the event.
The examples use pinned preview Foundry/MAF SDKs; confirm that these are
allowed in the workshop environment.

## Explore the GitHub files

Ask the app **"Show the .github files"** to use the
[`github-files` skill](.github/skills/github-files/SKILL.md). It uses the optional
.github Browser when available, or the standard Editor/file view.

Start with [the QA workflow source](.github/workflows/qa-review.md).
[Lab 2](docs/labs/02-agentic-qa.md) explains its generated lock file, manual
trigger, report, and one-issue limit. Nothing runs just by opening these files.

## What you'll build

The **Alberta driver's licence renewal guide** is a small C#/.NET app that
explains renewal steps, what to prepare, and how to find a registry agent.
It uses reviewed Alberta.ca guidance with official links and visible review
dates. It cannot renew a licence and is not an official government service.

Keep user scenarios synthetic: do not enter real licence numbers, personal
documents, or other identifying details. Both agent examples use the same
read-only guidance and code viewer.

## Run the showcase

Use the .NET SDK in `global.json` and PowerShell:

```powershell
dotnet restore
dotnet build --no-restore
$env:SERVICE_GUIDE_MODE = "offline"
dotnet run --project .\src\ServiceGuide.Web --no-launch-profile
```

Open **http://127.0.0.1:5087**. Offline mode is an explicitly labelled rehearsal;
it makes no model calls and does not count as a deployed agent. Without this
setting, the app uses the Foundry SDK path and shows setup errors rather than
silently falling back.

Official renewal and registry-finder links remain usable without chat.
All modes use saved guidance, not live website retrieval. A live agent
response does not mean Alberta.ca was checked live.

For real agents, complete [prework](docs/prework.md), then follow the core guide.
The app keeps Azure credentials on the server. `.env.example` lists settings
but is not loaded automatically.

## Check the code

```powershell
dotnet test .\tests\ServiceGuide.Tests --no-restore
npm ci
npx playwright install chromium
npm run test:browser
```

Node is only needed for browser checks, not to run the app. The browser suite
starts and stops its own offline server on port 5089, separate from the preview.

See [behaviour checks](docs/behaviour-checks.md) for the live-agent review and
[checkpoints](docs/checkpoints.md) for recovery.

To regenerate the agentic workflow with the pinned gh-aw compiler:

```powershell
.\scripts\Compile-Workflows.ps1
```

The ordinary test suite passes by default. Lab 2's `demonstrate_failure=true`
input intentionally fails one labelled fixture; it is not an app defect.
Cloud-agent and workflow runs still require a published workshop repository
and approved access. Rehearse those live steps before the event.

## Guidance sources

The [bundled summaries](src/ServiceGuide.Shared/Data/services.json) were reviewed
on **2026-10-25 (UTC)** against:

- [Renew or replace a driver's licence](https://www.alberta.ca/renew-replace-drivers-licence)
- [New driver's licence and identification cards](https://www.alberta.ca/new-drivers-licence-and-identification-cards)
- [Find a registry agent](https://www.alberta.ca/lookup/find-a-registry-agent.aspx)

At that review, Alberta.ca said online renewal was temporarily disabled.
Check the official page for current availability; do not treat this as a
permanent rule. Before a workshop, review each source and update its summary
and `reviewedOn` only after checking it.

After changing guidance or instructions, rebuild the app and create a new
prompt-agent version. The MAF example also needs a new hosted package/version.
Its response includes the guidance revision; the app rejects mismatched or
old fictional-service responses rather than silently mixing them.

Inspired by the app-first approach in
[Build Days: Issue-first Agentic SDLC](https://github.com/VeVarunSharma/build-days-agentic-sdlc).
