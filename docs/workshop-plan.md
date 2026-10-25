# GoA Build Days: workshop plan

**Format:** Three hours of guided labs, followed by an optional, self-paced capstone.

**Status:** The starter, navigation skill, workflow example, and copy-ready labs
are provided. Live participant-account rehearsal is still required before the event.

## One use case, three skills

Use one application throughout: an **Alberta driver's licence renewal guide**.

A user asks how to renew, what to bring, or where to find a registry agent.
The agent looks up reviewed Alberta.ca guidance and gives the next step with
an official link and review date. The guidance is real; workshop user scenarios
are synthetic. The app cannot renew a licence, decide eligibility, or collect
documents. It is not an official Government of Alberta service.

Use a C#/.NET starter with a web interface, server, tests, and Foundry
connection code. Developers make focused changes, not a whole app from scratch.
The same renewal guide is used for both agent implementations. A live agent
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
| 01:40-02:50 | Lab 3: Build and deploy a Foundry agent | The application calls a live agent with a working lookup tool. |
| 02:50-03:00 | Review and capstone briefing | Save the results and choose a next use case. |

The core session does not include installations, infrastructure provisioning,
multi-agent orchestration, or production deployment of the web application.

## Before the session

**Every developer must pass these checks two working days before the event,
using their own approved accounts.** Portal sign-in alone is not enough.

| Owner | What must be ready |
| --- | --- |
| GitHub administrator | Copilot app and CCA access enabled; a published starter repository per developer; permission to create issues, push, review, merge, and run Actions. |
| GitHub administrator | GH-AW allowed, runner available, and Copilot workflow engine authenticated separately from the desktop app. |
| Azure administrator | Assigned Foundry project and deployed model. Project-scoped Foundry User access (formerly Azure AI User), or an approved equivalent, to create, update, and invoke agents. No subscription-wide Owner requirement. |
| Azure administrator | Approved region, network, and data handling; enough quota for the class; spending limits and a resource owner. |
| Developer | Install tested tools. Open the starter in the app and pass its tests. Run a sample GH-AW. Create and invoke a disposable Foundry agent from the workshop machine. |
| Organisers | Rehearse with a participant account on the expected network. Agree the follow-on access period and cleanup owner. |

Resolve blocked access in a setup clinic. A facilitator demo, shared credentials,
or a mock response does not count as a developer's access check.

Use synthetic user scenarios and reviewed public guidance. Keep credentials
out of code, prompts, and logs; share environment details privately. Do not
delete shared Foundry projects or models.

## Lab 1: Specify and delegate to CCA

**Goal:** Practise spec-driven development (SDD): agree what the change must do
before asking an agent to build it.

Use [Lab 1](labs/01-spec-and-cloud-agent.md) to plan the `paperwork` synonym
change in the app, create an issue containing that complete plan, and assign
it to CCA. Learners choose GitHub's issue UI or a supported assignment from
the app; they do not launch both or substitute an app cloud-sandbox session.

Review the resulting PR in the app, request any revision on that PR, and merge
only after human review and passing checks. No Foundry access is needed for
this small code change.

**Done:** A specification, issue, CCA PR, and passing acceptance checks.

Use the app's native flow. No separate specification framework is required.

## Lab 2: Adapt a QA workflow

**Goal:** Create and run QA automation, not just inspect a workflow.

Use [Lab 2](labs/02-agentic-qa.md) to inspect and change the GH-AW Markdown,
compile it, and review the generated lock file. The normal Workshop QA
workflow runs deterministic tests. The manually launched QA reviewer reads
one completed run and explains its result.

A passing run produces a report without an issue. The opt-in failure fixture
produces a real failed assertion and at most one failure issue. The agent
must identify the intentional exercise rather than invent an app defect.
Rerun QA with the fixture disabled to return to a normal result.

The runner starts its own app, not the developer's localhost. Use synthetic
questions, reviewed guidance, and fixed agent responses. Live Foundry checks
happen in Lab 3; this workflow needs no Azure credentials.

Tests decide pass or fail; the AI explains the evidence, never overrides it.
Keep the agent's repository access read-only. Allow only issue creation through
a bounded safe output, and set run limits. No automatic merges or deployments.

**Done:** Source and compiled output, a passing report, a labelled failed run
with a useful issue, and a subsequent normal run. Successful analysis does
not change the QA result.

Issue triage and documentation updates are follow-on examples, not extra labs.

## Lab 3: Build and deploy a Foundry agent

**Goal:** Let the user state a need and have the agent guide the next step.

Follow the copy-ready prompts in [Lab 3](labs/03-foundry-native.md).

1. Add the agent's purpose and limits to the specification. Use the app to
   write its instructions and connect the Lab 1 lookup as a read-only tool.
2. Create a versioned, service-managed agent in Foundry using the assigned
   project and model. Use the current agent endpoint flow.
3. Connect the starter server using the developer's approved identity. The
   cloud agent requests a lookup; the server runs the tool and returns data.
4. Run five checks: normal request, unclear request, no match, out-of-scope
   request, and tool failure. Answers must use the reviewed guidance and explain
   limits rather than invent results. Fix and rerun failed checks.

The **agent runs in Foundry**; the web interface and tool server stay local.
Full app hosting and Teams publishing are out of scope.

**Done:** Agent name and version, an authenticated call from the app, a visible
tool call, and five passing checks. A model call or playground-only demo is
not enough.

## Optional example: MAF hosted agent

Build the same service guide with Microsoft Agent Framework (MAF) in C#.
Register the shared lookup as a function tool, run the agent locally, and deploy
its code to Foundry. The existing app then calls the hosted agent.
Follow the [optional lab](labs/optional-maf-hosted.md).

Keep the contrast clear: the core example defines a prompt agent through the
Foundry SDK; the optional example runs custom MAF code in Foundry. Both use the
same guidance snapshot, interface, and behaviour checks. This is not a second
app or an extra requirement for completing the core.

Show a live code change in each example: change the instructions, create a new
version, and repeat the request. Display real tool activity alongside the reply.
Rebuild both paths when changing the embedded guidance; the MAF app connection
rejects a different snapshot. Keep the review date distinct from a live run.

## Optional capstone: build your own use case

Choose any approved use case: for example, a developer onboarding helper,
document guide, or service-request assistant. Use approved or synthetic data.

Start with one user goal, one Foundry agent, and one useful tool or data source.
Reuse the app-based specification and review process.

**Finish with:** A specification, reviewed code, an app using a live Foundry
agent, one running GH-AW, five behaviour checks, and a two-minute demo. Explain
the agent's limits and when a person takes over.

## What to build in this repository next

1. Publish the reviewed starter and confirm the required account/policy setup.
2. Rehearse the CCA, QA workflow, and Foundry paths with a participant account.
3. Add a short standalone capstone brief and facilitator timing sheet if needed.
4. Rehearse the full 180 minutes before calling the workshop ready.

Available now: [prework](prework.md), [SDD and CCA](labs/01-spec-and-cloud-agent.md),
[agentic QA](labs/02-agentic-qa.md), [the core Foundry example](labs/03-foundry-native.md),
[optional MAF hosting](labs/optional-maf-hosted.md), [behaviour checks](behaviour-checks.md),
and [recovery checkpoints](checkpoints.md).

Keep each lab to one goal, numbered actions, a completion check, and a recovery
path. Each action names the app mode, context, copy-ready prompt, expected
result, and review decision. Keep optional work separate.

Pin tested GH-AW and SDK/runtime versions. Confirm the model and app UI during
rehearsal. Record unavailable capabilities as blocked, not completed.

## Authoring references

- [GitHub Copilot app](https://docs.github.com/en/copilot/concepts/copilot-surfaces/github-copilot-app)
- [Create a GitHub Agentic Workflow](https://github.github.com/gh-aw/setup/creating-workflows/)
- [GH-AW safe outputs](https://github.github.com/gh-aw/reference/safe-outputs/)
- [Create a Foundry prompt agent](https://learn.microsoft.com/azure/foundry/agents/quickstarts/prompt-agent)
- [Current Foundry agent endpoints](https://learn.microsoft.com/azure/foundry/agents/how-to/migrate-agent-applications)
- [Foundry access roles](https://learn.microsoft.com/azure/foundry/concepts/rbac-foundry)
