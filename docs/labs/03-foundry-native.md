# Lab 3: create a Foundry agent from C#

**Goal:** Create a real prompt agent, use it in the renewal app, and inspect
its lookup. Complete [prework](../prework.md) first.

Copy one text prompt at a time into the Copilot app. Replace the values in
step 1 with those supplied by the facilitator. Never paste passwords or tokens.
Keep this lab in one app conversation so later prompts can reuse those values.

## 1. Check the approved target

**Mode:** Interactive. **Context:** `AGENTS.md`, `.env.example`, and the supplied
project details.

```text
Use the microsoft-foundry skill if available; otherwise use this repo's
linked official documentation and pinned SDK examples.
For this lab, use only:
- Project endpoint: <FOUNDRY_PROJECT_ENDPOINT>
- Existing model deployment: <MODEL_DEPLOYMENT>
- My unique prompt-agent name: <AGENT_NAME>
Check the local tools and approved identity. Report missing access or settings.
Do not create resources, select a different subscription, or ask for API keys.
Set the needed environment values in each command's process; do not assume
variables from another terminal or tool call persist. Do not commit them.
```

**Expect:** A clear target and prerequisite result, not a deployment.

**Review:** Confirm the endpoint, model, and name belong to the assigned
workshop project. Resolve blockers before proceeding.

## 2. Read the agent definition

**Mode:** Plan. **Context:** [FoundryAgents.cs](../../src/ServiceGuide.Foundry/FoundryAgents.cs),
[instructions](../../src/ServiceGuide.Shared/AgentInstructions.txt),
[LookupTool.cs](../../src/ServiceGuide.Shared/LookupTool.cs), and
[NativeGuideAgent.cs](../../src/ServiceGuide.Foundry/NativeGuideAgent.cs).

```text
Explain this repo's Foundry-native prompt agent in simple terms.
Show where C# defines the model, instructions, and lookup_service schema,
creates an agent version, and sends tool results back to Foundry.
Check that it uses reviewed Alberta.ca guidance, source links, and review dates.
Identify where lookup_service runs. Do not change code or create an agent yet.
```

**Expect:** Foundry runs the agent; the local .NET server runs the lookup.
This example does not use MAF or fetch Alberta.ca live.

**Review:** Confirm it is information-only. Exit Plan mode without starting
an implementation.

## 3. Create the agent version

**Mode:** Interactive. **Context:** The approved settings from step 1.

```text
Create a version of the approved prompt agent using examples/FoundryNative
and its existing "create" command. Set FOUNDRY_PROJECT_ENDPOINT,
AZURE_AI_MODEL_DEPLOYMENT_NAME, and FOUNDRY_AGENT_NAME in that command's process.
Use the checked-in instructions and existing model deployment.
Do not provision a project, deploy a model, or change access.
Return the actual agent name and version. Stop on an error; do not use a mock.
```

**Expect:** A real agent name and version from Foundry.

**Review:** Keep the returned version. Never substitute `latest` or guess it.

## 4. Invoke it and open the app

**Mode:** Interactive. **Context:** The returned name/version and approved
project settings.

```text
Using exactly the agent version just created, run the FoundryNative "ask"
command with "How do I renew my driver's licence?"
Show the returned answer, AB-RENEW-01 source, and actual lookup_service activity.
Then start ServiceGuide.Web with SERVICE_GUIDE_MODE=foundry and the same
FOUNDRY_PROJECT_ENDPOINT, FOUNDRY_AGENT_NAME, and FOUNDRY_AGENT_VERSION.
Open the app preview. Replace only a preview process you started for this lab.
Do not switch to offline mode if the live call fails.
```

**Expect:** The app shows a live response, an official source, and a review date.
The agent is live; the guidance remains a saved snapshot.

**Review:** Compare the agent/version and source information in **Behind the
reply**. A direct model call or a playground-only demo is not completion.

## 5. Make a small instruction change

**Mode:** Plan, then approve an Interactive build. **Context:** The instructions
file and [behaviour checks](../behaviour-checks.md).

```text
Plan a small instruction change: end successful guidance answers with
"Check Alberta.ca for current requirements."
Keep the read-only lookup, official sources, review dates, privacy limits,
and existing error behaviour. Do not change the catalogue facts.
Show the plan before editing. After I approve, make the focused change
and run the relevant local checks. Do not deploy it yet.
```

**Expect:** A small reviewed diff, not another application.

**Review:** Approve only the intended instruction change.

## 6. Create a new version and compare

**Mode:** Interactive. **Context:** The approved change and existing project.

```text
Rebuild and run FoundryNative "create" using the same approved project,
model deployment, and agent name. Record the new version.
Invoke that exact version with the same renewal question, then restart
our app preview with the new version. Preserve the old version as a checkpoint.
Compare the result with docs/behaviour-checks.md and record pass, fail, or
not run for each case. Do not invent evidence or damage shared resources
to exercise a failure.
```

**Done:** Agent versions, live app responses, tool activity, and honest
behaviour-check results demonstrate the code-to-agent loop.

**Recovery:** Keep your changes and previous agent version. Check the approved
settings, access, and Foundry run; never hide a failed live call with offline
output. Source or instruction changes require a rebuild and an appropriate
new agent version.

**Next:** [Optional MAF hosted agent](optional-maf-hosted.md), or choose your
[capstone use case](../workshop-plan.md#optional-capstone-build-your-own-use-case).
