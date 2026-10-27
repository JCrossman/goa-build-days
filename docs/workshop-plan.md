# GoA Build Days: workshop plan

**Format:** Three hours of guided labs, followed by an optional, self-paced
capstone discussion.

**Status:** The Node.js/TypeScript starter, navigation skill, workflow example,
and copy-ready core labs are provided. Live participant-account rehearsal is
still required before the event.

## One use case, three skills

Use one application throughout: an **Alberta driver's licence renewal guide**.

A user asks how to renew, what to bring, or where to find a registry agent.
The agent looks up reviewed Alberta.ca guidance and gives the next step with
an official link and review date. The guidance is real; workshop user scenarios
are synthetic. The app cannot renew a licence, decide eligibility, or collect
documents. It is not an official Government of Alberta service.

The current workshop app uses Node.js 24.22.1 and TypeScript. Developers make
focused changes, not a whole app from scratch. The app has an explicitly
labelled offline rehearsal and a Foundry-backed prompt agent. A live agent
uses the saved guidance; it does not check Alberta.ca live.

Keep the roles distinct:

- **GitHub Copilot app:** helps the developer plan, build, and review changes.
- **Copilot cloud agent (CCA):** works on an assigned issue and raises a PR.
- **GitHub Agentic Workflows (GH-AW):** automate repository tasks in GitHub Actions.
- **Microsoft Foundry:** runs the agent that the application calls.

## Three-hour agenda

| Time | Activity | Result |
| --- | --- | --- |
| 00:00-00:10 | Welcome and short demo | See the finished experience and the three tools. |
| 00:10-00:50 | Lab 1: Specify and delegate to CCA | An issue, cloud-agent PR, and human review based on an app-reviewed plan. |
| 00:50-01:30 | Lab 2: Adapt the QA workflow | A GH-AW report and one issue for a labelled QA failure. |
| 01:30-01:40 | Break | |
| 01:40-02:50 | Lab 3: Create and use a Foundry agent | The application calls a live agent with a working lookup tool. |
| 02:50-03:00 | Review and capstone briefing | Save the results and choose a next use case. |

The core session does not include installations, infrastructure provisioning,
multi-agent orchestration, or production deployment of the web application.

## Before the session

**Every developer must pass these checks two working days before the event,
using their own approved accounts.** Portal sign-in alone is not enough.

| Owner | What must be ready |
| --- | --- |
| GitHub administrator | Copilot app and CCA access enabled; a published starter repository per developer; permission to create issues, push, review, merge, and run Actions. |
| GitHub administrator | GH-AW allowed and runner available. Reviewer authentication must be adapted for the workshop account and tested independently from the desktop app. |
| Azure administrator | Assigned Foundry project and existing model deployment; project-scoped permission to create and invoke agents, or an approved equivalent. No subscription-wide Owner requirement. |
| Azure administrator | Approved region, network, and data handling; enough quota for the class; spending limits and a resource owner. |
| Developer | Install Node 24.22.1, open the starter in the app, and pass the documented local checks. |
| Organisers | Rehearse CCA, GH-AW, and Foundry paths with a participant account. Agree the follow-on access period and cleanup owner. |

Resolve blocked access in a setup clinic. A facilitator demo, shared
credentials, or a mock response does not count as a developer's access check.

The checked-in GH-AW review workflow requests organization-billed
`copilot-requests: write`. A personal fork does not inherit that entitlement.
The repository owner must adapt the source for an approved authentication
method, recompile it with gh-aw v0.89.21, and configure any required GitHub-side
secrets before the personal-account reviewer exercise can run. Never request
secrets in chat or use a broad app token as a workaround.

Use synthetic user scenarios and reviewed public guidance. Keep credentials
out of code, prompts, and logs; share environment details privately. Do not
delete shared Foundry projects or models.

## Lab 1: Specify and delegate to CCA

**Goal:** Practise spec-driven development (SDD): agree what the change must do
before asking an agent to build it.

Use [Lab 1](labs/01-spec-and-cloud-agent.md) to plan the `paperwork` synonym
change in the app, create an issue containing that complete plan, and assign
it to CCA. The requested code change is deliberately small: update only the
catalogue keywords and focused catalogue tests, preserving every guidance
fact, text, URL, and review date. Learners choose GitHub's issue UI or a
supported assignment from the app; they do not launch both or substitute a
local task.

Review the resulting PR in the app, request any revision on that PR, and merge
only after human review and passing checks. No Foundry access is needed for
this small code change.

**Done:** A specification, issue, CCA PR, and passing acceptance checks.

Use the app's native flow. No separate specification framework is required.

## Lab 2: Adapt a QA workflow

**Goal:** Create and run QA automation, not just inspect a workflow.

Use [Lab 2](labs/02-agentic-qa.md) after Lab 1. Adapt the GH-AW Markdown to
report the exact tested commit SHA from the selected QA run, compile it, and
review the generated lock file. The normal Workshop QA workflow runs
type-check, build, Node tests, and browser tests. The manually launched QA
reviewer reads one completed run and explains its result.

A passing run produces a report without an issue. The opt-in failure fixture
produces a real failed assertion and at most one failure issue. The agent must
identify the intentional exercise rather than invent an app defect. Rerun QA
with the fixture disabled to return to a normal result.

The runner starts its own offline app, not the developer's localhost. Use
synthetic questions, reviewed guidance, and fixed test responses. Live Foundry
checks happen in Lab 3; the QA runner needs no Azure credentials.

Tests decide pass or fail; the AI explains the evidence, never overrides it.
Keep the agent's repository access read-only. Allow only issue creation through
a bounded safe output, and set run limits. No automatic merges or deployments.

**Done:** Source and compiled output, a passing report, a labelled failed run
with a useful issue, and a subsequent normal run. Successful analysis does
not change the QA result. If the repository owner has not adapted workflow
authentication for the participant account, mark the live review as blocked.

Issue triage and documentation updates are follow-on examples, not extra labs.

## Lab 3: Create and use a Foundry agent

**Goal:** Let the user state a need and have the agent guide the next step.

Follow the copy-ready prompts in [Lab 3](labs/03-foundry-native.md).

1. Review the TypeScript prompt-agent definition and its shared read-only
   lookup. Use the existing reviewed guidance, not new service facts.
2. Use the Foundry CLI example to create a versioned, service-managed agent
   in the assigned project and existing model deployment.
3. Connect the local app server using the developer's approved identity. The
   cloud agent requests a lookup; the server runs the tool and returns data.
4. Run five checks: normal request, unclear request, no match, out-of-scope
   request, and tool failure. Answers must use the reviewed guidance and
   explain limits rather than invent results. Fix and rerun failed checks.

The **agent runs in Foundry**; the web interface and tool server stay local.
The Foundry `check` subcommand validates invocation settings only; it does
not prove live access. Full app hosting and Teams publishing are out of scope.

**Done:** Agent name and explicit version, an authenticated call from the app,
a visible tool call, and five passing checks. A model call or playground-only
demo is not enough.

## Historical example: MAF hosted agent

The current Node fork has no MAF runtime or selector. The former optional
.NET/MAF hosting example is available in the
[pre-migration baseline tree](https://github.com/VeVarunSharma/goa-build-days/tree/da785b022b5e2c924b0831acb68b56f5b3c766e9)
and on the unchanged [upstream repository](https://github.com/VeVarunSharma/goa-build-days).
Use it only as a historical comparison; it is not a current lab or app path.

## Optional capstone: discuss a next use case

Choose an approved use case to explore after the workshop, such as a developer
onboarding helper, document guide, or service-request assistant. Use only
approved or synthetic data.

Start with one user goal, one agent, and one useful tool or data source. Reuse
the app-based specification and review process. This repository does not
implement a capstone or provide an additional application framework.

## What to build in this repository next

1. Publish the reviewed starter and confirm the required account/policy setup.
2. Rehearse the CCA, QA workflow, and Foundry paths with a participant account.
3. Rehearse the full 180 minutes before calling the workshop ready.

Available now: [prework](prework.md), [SDD and CCA](labs/01-spec-and-cloud-agent.md),
[agentic QA](labs/02-agentic-qa.md), [the core Foundry example](labs/03-foundry-native.md),
[historical MAF comparison](labs/optional-maf-hosted.md), [behaviour checks](behaviour-checks.md),
and [recovery checkpoints](checkpoints.md).

Keep each lab to one goal, numbered actions, a completion check, and a recovery
path. Each action names the app mode, context, copy-ready prompt, expected
result, and review decision. Keep historical and optional work separate.

Pin tested GH-AW and SDK/runtime versions. Confirm the model and app UI during
rehearsal. Record unavailable capabilities as blocked, not completed.

## Authoring references

- [GitHub Copilot app](https://docs.github.com/en/copilot/concepts/copilot-surfaces/github-copilot-app)
- [Create a GitHub Agentic Workflow](https://github.github.com/gh-aw/setup/creating-workflows/)
- [GH-AW safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/)
- [Foundry JavaScript SDK](https://learn.microsoft.com/en-us/javascript/api/overview/azure/ai-projects-readme?view=azure-node-latest)
- [Current Foundry agent endpoints](https://learn.microsoft.com/azure/foundry/agents/how-to/migrate-agent-applications)
- [Foundry access roles](https://learn.microsoft.com/azure/foundry/concepts/rbac-foundry)
