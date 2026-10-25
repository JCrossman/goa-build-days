# Workshop checkpoints

Keep your edits in your own Copilot app session. These are named completion
states, not pre-existing Git tags.

| Checkpoint | Keep | Check |
| --- | --- | --- |
| Specification and CCA | The issue, reviewed plan, linked cloud-agent PR, and review comments. | Acceptance checks pass before human merge. |
| Agentic QA | Markdown/lock files, QA run ID, review report, and failure issue. | The report matches the actual QA result; normal runs leave the failure input disabled. |
| Lookup | Reviewed shared-tool code and tests. | Catalogue and tool tests pass. |
| Native agent | Agent name and explicit version returned by `create`. | `ask` and the app show a live lookup. |
| Hosted agent | Prepared package, generated azd configuration, and deployed version. | The app shows the MAF result and hosted tool activity. |

The checked-in app is runnable; the `paperwork` synonym is deliberately left
as the Lab 1 exercise. The agent examples are references, not a duplicate app.
For another attempt, use a new Copilot app worktree from the facilitator's
starter revision and carry over your specification. Do not hard-reset or
discard your current changes.

Do not reassign CCA to restart work that is already running. Use its existing
PR for follow-up instructions. For QA, preserve the failed run as evidence;
run the workflow normally rather than suppressing the exercise assertion.

For an agent change, keep the previous version identifier. Point the app back
to it and restart if a new version fails. Do not delete shared models or
projects as a recovery step.
