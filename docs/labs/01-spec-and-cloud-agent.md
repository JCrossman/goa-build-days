# Lab 1: specify a change and send it to the cloud agent

**Goal:** Use the Copilot app to plan a small change, create an issue, and
review a pull request produced by Copilot cloud agent (CCA).

Complete [prework](../prework.md). Work in **your assigned workshop repository**
(an approved personal fork or organization copy),
with the starter and `copilot-setup-steps.yml` already on its default branch.
CCA cannot read uncommitted files or plans on your laptop.

Copy one **text prompt** at a time into the Copilot app chat. Wait for the
result and review it before continuing. Replace `<ISSUE_URL>` and `<PR_URL>`
with the links returned by the earlier steps.

## 1. Define the change before writing code

**Mode:** Plan. **Context:** `AGENTS.md`, `src/shared/data/services.json`,
and `tests/catalogue.test.ts`.

```text
Plan one small change to the renewal guide: recognize "paperwork" as a
synonym for documents. Do not implement it.
Acceptance checks:
- "paperwork" and "PAPERWORK" return AB-RENEW-03.
- The official source URL, review date, and guidance text stay unchanged.
- Existing lookup, no-match, and error behaviour still passes.
Change only the keywords in src/shared/data/services.json and add focused
coverage in tests/catalogue.test.ts. Preserve all guidance facts, wording,
source URLs, and review dates.
Run npm test after the change.
Show the implementation plan, focused tests, and anything unclear.
Do not change workflows, dependencies, or Azure resources.
```

**Expect:** A short specification and plan. The current starter does not
recognize `paperwork` alone; that is the change you will delegate.

**Review:** Confirm the scope and checks. Exit planning **without starting a
local build**; CCA will implement the change.

## 2. Create the issue from the reviewed plan

**Mode:** Interactive. **Context:** The reviewed plan from step 1.

```text
Create one GitHub issue in this workshop repository for the reviewed
"paperwork" synonym change. First verify the repository is my workshop copy.
Include the complete specification, accepted plan, allowed files, and test
expectations in the issue body so the cloud agent needs no local chat history.
Ask for a pull request linked to the issue with test evidence.
If this lab issue already exists, return its link instead of duplicating it.
Return the issue URL. Do not assign it, implement it, or merge anything yet.
```

**Expect:** An issue link containing enough detail for another developer or
agent to work independently.

**Review:** Open the issue and check its repository, scope, and acceptance checks.

## 3. Start CCA: choose one route

Both routes assign **the same issue** to Copilot. Do not use both.

### Route A: GitHub UI

1. Open your issue on GitHub.
2. Select **Assignees**, then **Copilot**.
3. In the assignment dialog, confirm your workshop repository and its published
   default branch. Complete the assignment.

**Expect:** Copilot begins a cloud task and creates a linked pull request.

### Route B: from the Copilot app

**Mode:** Interactive. **Context:** Your issue URL.

```text
Assign <ISSUE_URL> to GitHub Copilot cloud agent.
Verify the issue belongs to this workshop repository. If Copilot is already
assigned or a cloud-agent PR is linked, show that work instead of launching again.
Otherwise use the supported GitHub CLI operation:
gh issue edit "<ISSUE_URL>" --add-assignee "@copilot"
Do not implement locally, create an app cloud-sandbox session, or merge.
If assignment is unavailable, explain the blocker and show the GitHub UI route.
```

**Expect:** A confirmed Copilot assignment, not a local coding session.

**Review:** Check the issue's assignee and linked cloud work. An app **Cloud
sandbox** is a different execution option, not this issue-assignment flow.

## 4. Review the cloud-agent pull request

**Mode:** Interactive. **Context:** The issue URL.

```text
Find the Copilot cloud-agent pull request linked to <ISSUE_URL>.
If it is not available yet, report its actual status; do not start another task.
When it is ready, open the PR in the app for review.
Compare the diff with the issue's acceptance checks and allowed files.
Report test evidence, any unexpected changes, and missing requirements.
Do not edit code or merge the PR.
```

**Expect:** A PR with the bounded change and tests. If GitHub asks for workflow
approval, review the code before approving its checks.

**Review:** Confirm the `paperwork` behaviour and unchanged source information.
A cloud task finishing does not prove its tests passed.

## 5. Request a revision only if needed

**Mode:** Interactive. **Context:** The PR URL and your specific feedback.
Replace `<REVIEW_FEEDBACK>` before copying.

```text
Post this revision request on <PR_URL>, mentioning @copilot:
<REVIEW_FEEDBACK>
Keep the request within the original issue's scope.
Do not fix the code locally, create a second task, or merge.
Return the posted comment link.
```

**Expect:** CCA updates the existing PR. After assignment, put new instructions
on the **PR**, not in a later comment on the original issue.

**Review:** Inspect the new diff and checks. When satisfied, perform the human
review and merge through the app or GitHub. Open a new app session on the
updated workshop default branch for the next lab.

**Done:** The issue, CCA PR, reviewed diff, and passing checks form an evidence
chain from specification to implementation.

**Recovery:** If CCA is unavailable, check your repository access, policy, and
setup logs with the facilitator. Do not mark a local implementation as a CCA
result or remove/reassign Copilot repeatedly to retry.

**Next:** [Lab 2: agentic QA](02-agentic-qa.md).

References: [Assign an issue to Copilot](https://docs.github.com/en/copilot/how-tos/use-copilot-agents/cloud-agent/use-cloud-agent-on-github#assigning-an-issue-to-copilot)
and [GitHub CLI assignment](https://cli.github.com/manual/gh_issue_edit).
