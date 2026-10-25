# Lab 2: understand and adapt an agentic QA workflow

**Goal:** Read a working GH-AW example, make a small change, and see it explain
a real QA result. A failed run produces a report and at most one issue.

Complete [prework](../prework.md) and [Lab 1](01-spec-and-cloud-agent.md).
Use your workshop repository, not the shared reference repo. Workflow runs
use Actions and Copilot usage; confirm access with the facilitator first.

## What runs where

| File | Job |
| --- | --- |
| [workshop-qa.yml](../../.github/workflows/workshop-qa.yml) | Runs build, .NET, and browser checks in GitHub Actions. Tests decide pass or fail. |
| [qa-review.md](../../.github/workflows/qa-review.md) | Human-readable instructions for Copilot to explain one QA run. |
| [qa-review.lock.yml](../../.github/workflows/qa-review.lock.yml) | Generated Actions workflow. Do not edit it by hand. |

The QA runner starts its own offline app. It does not call your laptop or
Foundry. The reviewer reads GitHub evidence; it cannot fix code or merge.
Before the agent starts, a deterministic job validates the selected run and
checks for an existing report. Issue creation is blocked for passing or
already-reported runs.

Copy each text prompt into the Copilot app chat. Replace `<QA_RUN_ID>` with
the numeric ID returned by the QA run, not a PR number or the review run's ID.

## 1. Open and understand the example

**Mode:** Interactive. **Context:** The three files above.

```text
Use the github-files skill to open .github/workflows/qa-review.md.
Use the standard Editor if the .github Browser extension is unavailable.
Explain its trigger, read permissions, Copilot engine, run limits, and safe output.
Compare it with workshop-qa.yml and qa-review.lock.yml.
Explain why a green review run does not turn a failed QA run green.
Do not edit, compile, publish, or run anything yet.
```

**Expect:** A clear explanation of tests versus AI investigation.

**Review:** Find `workflow_dispatch` and `create-issue` with `max: 1`.
There must be no automatic merge, deployment, or agent assignment.

## 2. Make one small workflow change

**Mode:** Interactive. **Context:** `qa-review.md`.

```text
Update the QA review instructions to include the tested commit SHA in
each report and failure issue, using the value from the inspected QA run.
Keep the trigger, validation step, permissions, limits, and safe outputs unchanged.
Edit only qa-review.md. Do not hand-edit the lock file or run the workflow.
Show the source diff for review.
```

**Expect:** A small change to the Markdown instructions.

**Review:** Confirm it changes reporting only, not the workflow's authority.

## 3. Compile and publish the reviewed change

**Mode:** Interactive. **Context:** The reviewed Markdown change.

```text
Run scripts/Compile-Workflows.ps1 to compile and validate qa-review.
Use gh-aw v0.89.21; do not upgrade tools implicitly.
Review the Markdown, generated lock file, and any compiler-required pin files.
If compilation succeeds, create a pull request containing only this workflow
change and its generated support changes. Return the PR link.
Do not merge or start any workflow run.
```

**Expect:** Source and generated output agree and are ready for review.

**Review:** Review and merge the PR into your workshop default branch. Manual
workflows must be present there before the next steps. Do not include unrelated
local changes or credentials.

## 4. Run normal QA

**Mode:** Interactive. **Context:** The published workshop repository.

```text
Run the Workshop QA workflow in this repository on its published default branch
with demonstrate_failure=false.
Track the exact run you start and return its URL, numeric run ID, and conclusion.
Do not start the agentic reviewer yet or report a pending run as passed.
```

**Expect:** Passing .NET and browser checks, an Actions summary, and test evidence.

**Review:** Open the run and confirm the actual result. If it failed, inspect
that failure before continuing.

## 5. Ask the agent to explain that run

**Mode:** Interactive. **Context:** The QA run ID from step 4.

```text
Run qa-review for run_id=<QA_RUN_ID> in this workshop repository.
Track the review run and show its report from the Actions summary and agent output.
For a passing QA run, confirm that no issue was created.
Do not rerun QA, edit files, assign CCA, or deploy.
```

**Expect:** An evidence-based report, with no issue for a passing run.

**Review:** Check that the report refers to the correct QA run and commit.

## 6. Observe the labelled failure exercise

**Mode:** Interactive. **Context:** The same published workflows.

```text
Run Workshop QA with demonstrate_failure=true in this workshop repository.
This opts into the labelled WorkshopQaExerciseTests failure, not an app defect.
After that QA run completes, run qa-review for that exact run ID.
Show the failed assertion, review report, and the one linked failure issue.
Do not suppress the assertion, change app code, or turn the failed run into a pass.
```

**Expect:** QA fails on the intentional fixture. The reviewer identifies the
exercise and opens at most one issue, or links the existing issue for that run.

**Review:** The issue must cite the real run and explain that the failure was
intentional. Missing evidence is not permission to invent a diagnosis.

## 7. Return to a normal run

**Mode:** Interactive. **Context:** The same workshop repository.

```text
Run Workshop QA again with demonstrate_failure=false.
Show the new run's result. Keep the earlier failed run and its issue as evidence.
Do not edit the fixture, close issues automatically, or launch another review.
```

**Done:** Your source change, compiled workflow, passing QA report, and labelled
failure issue show how the automation works. A successful review means the
analysis finished; the QA run's conclusion remains authoritative.

**Recovery:** Check the numeric QA run ID, workflow publication, permissions,
and engine authentication. Treat unavailable tools or logs as blocked. Do not
replace a failed live workflow with a fabricated report.

Use the pinned GH-AW compiler to validate its generated file. General Actions
linters may lag behind supported fields such as `copilot-requests` and
`concurrency.queue`; do not hand-edit the lock file to silence those warnings.

**Next:** [Lab 3: Foundry SDK](03-foundry-native.md).
