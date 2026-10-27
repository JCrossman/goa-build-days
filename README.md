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
| [Prework: tools and access](docs/prework.md) | Set up Node, GitHub access, and assigned Foundry access before starting a lab. |
| [Lab 1: SDD and Copilot cloud agent](docs/labs/01-spec-and-cloud-agent.md) | Review a specification, create its issue, delegate to CCA, and review the PR. |
| [Lab 2: agentic QA](docs/labs/02-agentic-qa.md) | Adapt a GH-AW example and inspect its QA report and failure issue. |
| [Lab 3: Foundry SDK](docs/labs/03-foundry-native.md) | Create a prompt agent with the TypeScript SDK and use it in the app. |
| [Historical MAF comparison](docs/labs/optional-maf-hosted.md) | Find the earlier optional .NET/MAF example; it is not runnable in this Node fork. |

See the [workshop plan](docs/workshop-plan.md) for the agenda and optional
capstone. Each runnable lab has numbered steps and copy-ready prompts. Work
through the core labs in order.

This fork's `main` now includes the completed `paperwork` and QA-reporting
lab changes. For an untouched Node exercise, start from
[`92f85be`](https://github.com/JCrossman/goa-build-days/tree/92f85bed54f3cfa3cca1ea9f37364b0de524a3f8);
apply dependency remediation `d138f0d` and service-envelope fix `cad1f63`
before using its Foundry path.
An organizer rehearsal is not proof of each participant's account access.

## Set up before the workshop

| Tool | Get ready |
| --- | --- |
| [Download the GitHub Copilot app](https://github.com/features/ai/github-app) | Install the app and sign in with your approved GitHub account. |
| [Node.js](https://nodejs.org/) | Install the pinned Node version, 24.22.1, and npm dependencies with `npm ci`. |
| [GitHub Agentic Workflows](https://github.github.com/gh-aw/) | Confirm Actions and Copilot workflow-engine access with the repository owner. |
| [Open Microsoft Foundry](https://ai.azure.com/) | Sign in and confirm access to your assigned project and an existing model deployment. |

The [prework guide](docs/prework.md) covers setup and access checks. Neither
.NET nor PowerShell is required for the current workshop fork. Do not install
or upgrade tools outside your organization's policy.

## Explore the GitHub files

Ask the app **"Show the .github files"** to use the
[`github-files` skill](.github/skills/github-files/SKILL.md). It uses the
optional .github Browser when available, or the standard Editor/file view.

Start with [the QA workflow source](.github/workflows/qa-review.md).
[Lab 2](docs/labs/02-agentic-qa.md) explains its generated lock file, manual
trigger, report, and one-issue limit. Nothing runs just by opening these files.

## What you'll build

The **Alberta driver's licence renewal guide** is a small TypeScript/Node web
app that explains renewal steps, what to prepare, and how to find a registry
agent. It uses reviewed Alberta.ca guidance with official links and visible
review dates. It cannot renew a licence and is not an official government
service.

Keep user scenarios synthetic: do not enter real licence numbers, personal
documents, or other identifying details. The current app supports an explicitly
labelled offline rehearsal and a Foundry-backed agent. It has no MAF runtime or
agent selector.

## Run the showcase

Use Node **24.22.1**, pinned in `.node-version` and `.nvmrc`:

```sh
npm ci
npm run build
SERVICE_GUIDE_MODE=offline npm start
```

In PowerShell, set the mode before starting the server:

```powershell
$env:SERVICE_GUIDE_MODE = "offline"
npm start
```

Open **http://127.0.0.1:5087**. The server runs the built
`dist/src/web/server.js`. Offline mode is an explicitly labelled rehearsal; it
makes no model calls and does not count as a deployed agent. Without offline
mode, the app uses the Foundry path and reports setup or live-call errors; it
does not silently fall back.

Official renewal and registry-finder links remain usable without chat. All
modes use saved guidance, not live website retrieval. A live agent response
does not mean Alberta.ca was checked live.

The Foundry command-line example is:

```sh
npm run foundry -- check
npm run foundry -- create
npm run foundry -- ask "How do I renew my driver's licence?"
```

Run `npm run build` first. `check` validates invocation settings only; it does
not verify live Foundry access. The `create` command creates a prompt-agent
version using the configured existing project and model deployment; `ask`
uses the explicitly configured name and version. Do not replace a failed live
call with offline output.

The environment reference in `.env.example` is **not loaded automatically**.
Set approved values in the process that runs the app or command. The app keeps
Azure credentials on the server and uses `DefaultAzureCredential`.

## Check the code

```sh
npm ci
npm run typecheck
npm run build
npm test
npx playwright install chromium
npm run test:browser
```

The test command runs the built Node.js built-in test runner. The browser suite
starts and stops its own offline server on port 5089, separate from the
preview. Current local verification passed 73 Node unit/HTTP/SDK checks and 20
browser checks across desktop and mobile viewports.
The core test coverage is ported into `tests/catalogue.test.ts`,
`tests/configuration.test.ts`, `tests/native-agent.test.ts`,
`tests/web.test.ts`, and `tests/workshop-qa.test.ts`. The historical MAF-only
`MafAgentTests` and hosted-envelope cases from `NativeAgentTests` are excluded:
this fork has no MAF runtime. No .NET test run is part of current validation.
See [behaviour checks](docs/behaviour-checks.md) for live-agent review and
[checkpoints](docs/checkpoints.md) for recovery.

To validate and regenerate the GH-AW lock file, use the repository command,
which requires exactly gh-aw v0.89.21:

```sh
GH_AW_CLI=/path/to/verified-gh-aw-v0.89.21-wrapper npm run compile:workflows
```

Use the verified isolated wrapper supplied by the facilitator; this keeps
an existing global extension unchanged. If `gh aw version` already reports
exactly v0.89.21, omit `GH_AW_CLI`. The command fails on another version rather
than upgrading it. Do not edit generated lock files by hand.

The ordinary test suite keeps the intentional `WorkshopQaExerciseTests`
failure disabled. Opting in is only for the labelled QA exercise:
`WORKSHOP_QA_DEMONSTRATE_FAILURE=true`. In GitHub Actions, the manual
`demonstrate_failure` input is false by default. Keep it disabled for normal
checks.

## Guidance sources

The [bundled summaries](src/shared/data/services.json) were reviewed on
**2026-10-25 (UTC)** against:

- [Renew or replace a driver's licence](https://www.alberta.ca/renew-replace-drivers-licence)
- [New driver's licence and identification cards](https://www.alberta.ca/new-drivers-licence-and-identification-cards)
- [Find a registry agent](https://www.alberta.ca/lookup/find-a-registry-agent.aspx)

At that review, Alberta.ca said online renewal was temporarily disabled.
Check the official page for current availability; do not treat this as a
permanent rule. Before a workshop, review each source and update its summary
and `reviewedOn` only after checking it. Saved guidance is not a live website
check.

After changing guidance or instructions, rebuild the app and create a new
prompt-agent version. The shared lookup verifies returned service records
against the bundled guidance snapshot before displaying them; it does not
claim a live source check or rely on a hosted-agent envelope.

## Migration history

This fork now uses Node.js and TypeScript for the core workshop. The original
.NET implementation and optional Microsoft Agent Framework (MAF) hosting
example remain available in the
[pre-migration baseline tree at `da785b022b5e2c924b0831acb68b56f5b3c766e9`](https://github.com/VeVarunSharma/goa-build-days/tree/da785b022b5e2c924b0831acb68b56f5b3c766e9)
and in the unchanged [upstream repository](https://github.com/VeVarunSharma/goa-build-days).
They are historical references, not supported commands or labs for this fork.

Inspired by the app-first approach in
[Build Days: Issue-first Agentic SDLC](https://github.com/VeVarunSharma/build-days-agentic-sdlc).
