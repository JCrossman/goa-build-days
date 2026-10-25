# Optional: host the same agent with MAF

**Goal:** Run custom C# agent code in Foundry while keeping the same app and
reviewed guidance. This is not required for the core workshop.

Complete the [hosting prerequisites](../prework.md#optional-maf-hosting).
Copy each text prompt into the Copilot app chat. Reuse the approved endpoint
and model from Lab 3; replace the two new placeholders in step 1.

## 1. Compare the code and check hosting access

**Mode:** Interactive. **Context:** [MafAgentFactory.cs](../../examples/MafHosted/MafAgentFactory.cs),
[ObservedGuideAgent.cs](../../examples/MafHosted/ObservedGuideAgent.cs), and
[Deploy-Hosted.ps1](../../scripts/Deploy-Hosted.ps1).

```text
Explain how this MAF example differs from the native Foundry prompt agent.
Show where it registers the shared lookup and records actual tool evidence.
For optional hosting, use only this existing target:
- Foundry project resource ID: <PROJECT_RESOURCE_ID>
- My unique hosted-agent name: <MAF_AGENT_NAME>
Reuse the approved project endpoint and existing model deployment from Lab 3.
Check hosting availability, deployment access, runtime identity, and quota.
Do not provision resources, deploy, or change roles. Ask if a required value
is missing; do not choose another project or subscription.
```

**Expect:** MAF defines the agent logic. Foundry will run that code and the
bundled lookup together; the web app stays local.

**Review:** Confirm the target and extra hosting permissions before continuing.

## 2. Check and package the example locally

**Mode:** Interactive. **Context:** The approved settings and existing scripts.

```text
Build and run the focused MafAgentTests, then run MafHosted with --check
using the approved endpoint and model environment values.
Run scripts/Prepare-Hosted.ps1 to prepare the Linux code package.
Use a new output directory if one already exists; do not delete old work.
Confirm the package contains MafHosted.dll and ServiceGuide.Shared.dll.
Return the package path. Do not deploy, and do not call these local checks
proof of a hosted agent.
```

**Expect:** A complete package containing the shared lookup and embedded
guidance. No laptop connection is needed by the hosted lookup.

**Review:** Local tests use a scripted model; no cloud deployment has happened.

## 3. Review the deployment target

**Mode:** Interactive. **Context:** The package path and approved target.

```text
Use scripts/Deploy-Hosted.ps1 with -WhatIf for the package just prepared,
the approved project resource ID, model deployment, and unique MAF agent name.
Show the intended target and explain what the real deployment will create
or update. Do not deploy or run azd provision.
```

**Expect:** A target preview with no Azure changes.

**Review:** Only proceed if the package, project, model, and agent name are right.

## 4. Deploy the reviewed package

**Mode:** Interactive. **Context:** The target reviewed in step 3.
Copy this only when you approve that deployment.

```text
I approve deploying the reviewed MAF package to the exact existing project
and agent name shown in the previous step.
Run scripts/Deploy-Hosted.ps1 with those values and the existing model.
Do not create a project or model or change access. Stop if extra changes
or permissions are required.
Report the actual deployment result and retrieve the deployed agent version.
Do not guess a version or claim success after a failed command.
```

**Expect:** Custom MAF code deployed as a hosted agent in Foundry.

**Review:** Keep the returned name/version and deployment evidence.

## 5. Connect the same app

**Mode:** Interactive. **Context:** The deployed version and approved endpoint.

```text
Start our ServiceGuide.Web preview with SERVICE_GUIDE_MODE=maf,
the approved FOUNDRY_PROJECT_ENDPOINT, and the actual MAF_AGENT_NAME and
MAF_AGENT_VERSION from the deployment. Set these in the process you start.
Replace only a preview process you started for this lab.
Ask "How do I renew my driver's licence?" and show the real hosted tool activity.
Compare the answer, official source, review date, and behaviour checks with
the native example. Do not switch to offline mode if the hosted call fails.
```

**Done:** A live hosted response and actual tool activity prove this is more
than a local MAF process or a client wrapping the core prompt agent.

The app rejects the old fictional-service envelope and a different guidance
snapshot. After guidance changes, rebuild the app and hosted package, deploy
the reviewed package, and select its actual returned version.

**Recovery:** Preserve the working core path. Record hosting or deployment
failures as blocked. Never delete shared projects or models to retry.

**Next:** Choose a [capstone use case](../workshop-plan.md#optional-capstone-build-your-own-use-case).
