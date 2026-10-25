# Before you start

Use your own approved GitHub and Azure accounts. Use synthetic user scenarios,
not real licence numbers, birth dates, addresses, health numbers, medical
details, or documents. The app uses reviewed public Alberta.ca guidance and
cannot renew a licence.

## 1. Get the tools

- [GitHub Copilot app](https://github.com/features/ai/github-app), with access
  and its organization policy enabled.
- Git, [GitHub CLI](https://cli.github.com/), and the .NET SDK named in `global.json`.
- [PowerShell 7](https://learn.microsoft.com/powershell/scripting/install/install-powershell)
  for the repository's `.ps1` scripts.
- Node 24 and Playwright for browser checks.
- Azure CLI for the Foundry lab; sign in yourself to the approved tenant.

In the app, open your workshop repository. The repository's
[`github-files` skill](../.github/skills/github-files/SKILL.md) is a navigation
helper, not another required installation. Ask **"Show the .github files"**.
The .github Browser extension is optional; the helper can use the Editor.

## 2. Prepare your workshop repository and CCA access

Your repository must contain the published starter on its default branch
before Lab 1. A local folder or an unpushed worktree is not enough for CCA.

Ask the facilitator or repository owner to confirm:

- You can create issues, push changes, review PRs, and run Actions.
- Copilot cloud agent is enabled and available to your account.
- [copilot-setup-steps.yml](../.github/workflows/copilot-setup-steps.yml) is on
  the default branch and its setup check succeeds.

For the app-driven CCA route, `gh issue edit --help` must list `@copilot`.
The workshop verified this with GitHub CLI 2.102.1. Otherwise use the GitHub
issue UI. `@copilot` assignment is not supported on GitHub Enterprise Server.

CCA gets the issue and published repository, not your local chat history.
Its setup installs .NET and restores locked dependencies; it needs no Azure
credentials for the Lab 1 change. Keep its firewall enabled.

## 3. Prepare GH-AW

Use [GitHub Agentic Workflows](https://github.github.com/gh-aw/) and the
workshop's pinned compiler, **v0.89.21**.

If the extension is not installed, run this in your local terminal:

```powershell
gh extension install github/gh-aw --pin v0.89.21
gh aw version
```

If another version is installed, ask the facilitator how to use the pinned
version. Do not upgrade or replace an existing installation implicitly.

The repository owner must configure approved
[Copilot engine authentication](https://github.github.com/gh-aw/engines/copilot/).
This example uses `copilot-requests: write` for organization-billed usage;
use an approved organization workshop repository with that capability enabled.
For a different authentication setup, the repository owner must adapt the
source using the linked guidance and recompile it before the class.
Adding a personal token alone does not override this example's billing mode.
Never paste credentials into chat or code. Signing into the desktop app does
not authenticate the workflow engine.

Confirm Actions runner availability and usage approval. Publish the workflow
source, generated lock file, and pin files before trying manual runs.

## 4. Prepare Foundry access

Open [Microsoft Foundry](https://ai.azure.com/). Obtain:

- Your assigned project endpoint and existing model deployment name.
- Permission to create and invoke agents in that project.
- A unique agent name for your exercise.

Confirm that the pinned preview SDKs are approved. No subscription-wide Owner
role or API key is required for the core code example. Keep configuration
local and use the approved identity; never choose another subscription to
work around a failure.

The [Microsoft Foundry skill](https://learn.microsoft.com/azure/foundry/how-to/develop/use-microsoft-foundry-skill)
can help when approved and installed. The examples do not require a Foundry
MCP connection.

## Optional MAF hosting

Also install Azure Developer CLI (`azd`) with the `azure.ai.agents` and
`azure.ai.projects` extensions. The deployment recipe was checked with
azd 1.35.1; confirm the supported flags with help.

Obtain the existing project's full Azure resource ID. Check hosted-agent
availability, deployment permissions, runtime identity permissions, and quota.
These are separate from prompt-agent access. The code package uses
`dotnet_10`; Docker is not required.

## 5. Check readiness in the app

**Mode:** Interactive. **Context:** This guide and your workshop repository.

```text
Read docs/prework.md and check the local workshop tools and repository.
Confirm the intended remote/default branch and which required files are published.
Run the documented local build and tests with the failure exercise disabled.
List pass, blocked, or not verified for local setup, CCA access, GH-AW engine
authentication, and Foundry access. A login alone does not prove permission.
Do not create issues, assign CCA, run remote workflows, change access,
or provision or deploy Azure resources during this check.
```

Resolve blockers with the facilitator. Before the event, organizers must
rehearse the live CCA, GH-AW, and Foundry steps with a participant account.
Agree the usage limits, follow-on access period, and cleanup owner.

If NuGet is unreachable, use an approved source. This public Microsoft mirror
is an alternative where permitted:

```powershell
dotnet restore --source https://pkgs.dev.azure.com/dnceng/public/_packaging/dotnet-public/nuget/v3/index.json
```

Do not disable TLS checks or delete shared Foundry projects/models to recover.

**Next:** [Lab 1: SDD and Copilot cloud agent](labs/01-spec-and-cloud-agent.md).
