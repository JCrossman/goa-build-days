# Working in this repository

Keep the workshop simple: one app, one small use case, and clearly separated
core and optional examples. Define the expected behaviour before changing code.
Use synthetic user scenarios, never real personal data. Service facts come from
reviewed Alberta.ca guidance with official links and review dates. Do not call
that saved guidance a live website check, even when the agent is live.
Never replace a failed live call with an offline response.

This project was built with the microsoft-foundry skill. Before working on or
answering questions about foundry agents, read the microsoft-foundry skill first.
If it is not installed, use the linked official documentation and pinned SDK
examples rather than inventing tool commands. The Foundry examples do not
require a manually configured MCP server.

GH-AW source lives in `.github/workflows/*.md`. Use
`scripts/Compile-Workflows.ps1` with gh-aw v0.89.21 to validate and regenerate
lock files. Do not edit generated locks or silently upgrade the compiler.
The intentional QA failure is opt-in; keep it disabled for normal checks.

The web app is a local workshop tool, not a production government service.
Do not create Azure resources, change access, or select a subscription implicitly.
Use the project's documented build and test commands before claiming completion.
