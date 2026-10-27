# Before you start

Use your own approved GitHub and Azure accounts. Use synthetic user scenarios,
not real licence numbers, birth dates, addresses, health numbers, medical
details, or documents. The app uses reviewed public Alberta.ca guidance and
cannot renew a licence.

## 1. Get the tools

- [GitHub Copilot app](https://github.com/features/ai/github-app), with access
  and its organization policy enabled.
- Git and [GitHub CLI](https://cli.github.com/).
- An isolated Node.js **24.22.1** installation, pinned by `.node-version` and
  `.nvmrc`, with npm. Do not change a shared global Node installation.
- [GitHub Agentic Workflows](https://github.github.com/gh-aw/) access for the
  workflow exercise.
- An approved identity and access to your assigned Foundry project for Lab 3.

No .NET SDK or PowerShell installation is required. Install Playwright's
Chromium browser when you prepare to run browser checks:

```sh
npm ci
npx playwright install chromium
```

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
Otherwise use the GitHub issue UI. `@copilot` assignment is not supported on
GitHub Enterprise Server.

CCA gets the issue and published repository, not your local chat history. Its
setup installs the pinned Node version, runs `npm ci`, then type-checks and
builds the starter; it needs no Azure credentials for the Lab 1 change. Keep
its firewall enabled.

## 3. Prepare GH-AW

Use the workshop's pinned compiler, **gh-aw v0.89.21**. Do not upgrade a
globally installed extension implicitly. The repository's
`npm run compile:workflows` checks the compiler version and supports the
verified isolated CLI wrapper through `GH_AW_CLI`; this leaves the global
extension unchanged. Use the wrapper path supplied by the facilitator:

```sh
GH_AW_CLI=/path/to/verified-gh-aw-v0.89.21-wrapper npm run compile:workflows
```

The current review workflow requests `copilot-requests: write` for
organization-billed Copilot usage. That configured auth is not compatible
with a personal token just because the repository is a personal fork. In
particular, the `JCrossman` personal fork account does not inherit the
`EMS/jcrossman_microsoft` organization's billing entitlement. Until the
repository owner adapts the workflow source for an approved authentication
method, recompiles it with the pinned compiler, and configures any required
secrets in GitHub settings, treat Lab 2's live reviewer as **blocked**.

Do not paste secrets into chat, reuse a broad app `GH_TOKEN`, or try to claim
organization entitlement through an API flag. The repository owner must
configure the least-privilege approved workflow authentication. Signing into
the desktop app does not authenticate the workflow engine.

Confirm Actions runner availability and usage approval. Publish the workflow
source, generated lock file, and pin files before trying manual runs.

## 4. Prepare Foundry access

Open [Microsoft Foundry](https://ai.azure.com/). The facilitator or project
owner will provide the assigned project endpoint, an existing model deployment
name, and a unique agent name for your exercise. Confirm permission to create
and invoke agents in that project. Do not choose another subscription, create
resources, or change access to work around a blocker.

The core uses the official JavaScript SDKs `@azure/ai-projects` 2.9.0 and
`@azure/identity` 4.14.0 with `DefaultAzureCredential`. A subscription-wide
Owner role or API key is not required for the code example. Foundry runs the
agent in the cloud; the app and read-only guidance lookup run locally. No
manually configured MCP server is required.

The Microsoft Foundry skill is not required for this exercise. Use the linked
[official JavaScript SDK documentation](https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-projects-readme?view=azure-node-latest)
and the pinned package versions rather than guessing commands or substituting
a direct model call.

## 5. Check readiness locally

From the repository root:

```sh
npm ci
npm run typecheck
npm run build
npm test
```

If your organization's network requires it and public npm is approved, you may
use the public registry for this install invocation only:

```sh
NPM_CONFIG_REGISTRY=https://registry.npmjs.org npm ci
```

Do not change global npm configuration to work around a proxy or registry
failure; ask the facilitator if this approved per-command setting does not help.

The intentional failure is disabled by default. Keep
`WORKSHOP_QA_DEMONSTRATE_FAILURE` unset or false for normal checks. To run the
offline preview after building:

```sh
SERVICE_GUIDE_MODE=offline npm start
```

PowerShell users can set the same mode for their current process with:

```powershell
$env:SERVICE_GUIDE_MODE = "offline"
npm start
```

Offline mode is only a local rehearsal, not proof of Foundry access or live
agent behaviour. The `.env.example` file is a reference and is not loaded
automatically. Set private values in your own shell or approved local
environment; never commit them.

Use this copy-ready prompt for an app-assisted readiness review:

```text
Read docs/prework.md and check the local workshop tools and repository.
Confirm the intended remote/default branch and which required files are published.
Run npm ci, npm run typecheck, npm run build, and npm test with the failure
exercise disabled.
List pass, blocked, or not verified for local setup, CCA access, GH-AW engine
authentication, and Foundry access. A login alone does not prove permission.
Do not create issues, assign CCA, run remote workflows, change access,
or provision or deploy Azure resources during this check.
```

Resolve blockers with the facilitator. Before the event, organizers must
rehearse the live CCA, GH-AW, and Foundry steps with a participant account.
Agree usage limits, follow-on access period, and cleanup owner.

Do not disable TLS checks or delete shared Foundry projects/models to recover.

**Next:** [Lab 1: SDD and Copilot cloud agent](labs/01-spec-and-cloud-agent.md).
