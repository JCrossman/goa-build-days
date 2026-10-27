# Workshop checkpoints

Keep your edits in your own Copilot app session. These are named completion
states, not pre-existing Git tags.

| Checkpoint | Keep | Check |
| --- | --- | --- |
| Specification and CCA | The issue, reviewed plan, linked cloud-agent PR, and review comments. | Acceptance checks pass before human merge. |
| Agentic QA | Markdown/lock files, QA run ID, tested commit SHA, review report, and failure issue. | The report matches the actual QA result; normal runs leave the failure input disabled. |
| Lookup | Reviewed shared lookup code and tests. | Catalogue and lookup tests pass. |
| Native agent | Agent name and explicit version returned by `create`. | `ask` and the app show a live lookup. |

The checked-in app is runnable; this fork's `main` includes the completed
`paperwork` exercise. For another attempt, use a new Copilot app worktree
from the facilitator's untouched Node starter revision `92f85be` and carry
over your specification. Apply dependency remediation `d138f0d` and
service-envelope fix `cad1f63` before live Foundry use.
Do not hard-reset or discard your current changes.

Do not reassign CCA to restart work that is already running. Use its existing
PR for follow-up instructions. For QA, preserve the failed run as evidence;
run the workflow normally rather than suppressing the exercise assertion.
If the repository owner has not adapted workflow authentication for the
participant account, record the reviewer run as blocked.

For an agent change, keep the previous version identifier. Point the app back
to it and restart if a new version fails. Do not delete shared models or
projects as a recovery step. The optional MAF material is historical only and
does not have a runtime checkpoint in this fork.
