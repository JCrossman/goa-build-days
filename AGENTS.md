# Working in this repository

Keep the workshop simple: one app, one small use case, and clearly separated
core and optional examples. Define expected behaviour before changing code.
Use synthetic user scenarios, never real personal data. Service facts come from
reviewed Alberta.ca guidance with official links and review dates. Do not call
that saved guidance a live website check, even when the agent is live.
Never replace a failed live call with an offline response.

The core app is Node.js 24.22.1 and TypeScript. Use an isolated Node 24.22.1
installation pinned by `.node-version` and `.nvmrc`; do not change a shared
global runtime. Use `npm ci`,
`npm run typecheck`, `npm run build`, and `npm test` as appropriate. The browser
suite is `npx playwright install chromium` followed by
`npm run test:browser` (20 browser checks across desktop and mobile
viewports). Core tests are in `tests/{catalogue,configuration,native-agent,web,workshop-qa}.test.ts`.
The historical MAF-only `MafAgentTests` and hosted-envelope cases from
`NativeAgentTests` are excluded because this fork has no MAF runtime. The
intentional `WorkshopQaExerciseTests` failure is opt-in only; keep
`WORKSHOP_QA_DEMONSTRATE_FAILURE` false or unset for normal checks.

Foundry's core example is TypeScript and uses the official JavaScript SDKs and
`DefaultAzureCredential`. Before making Foundry-specific changes, read the
`microsoft-foundry` skill if installed. Otherwise consult the linked official
JavaScript documentation and the pinned dependency versions;
do not invent commands or substitute a direct model call. No manually
configured MCP server is required.

GH-AW source lives in `.github/workflows/*.md`. Use
`npm run compile:workflows` with gh-aw v0.89.21 to validate and regenerate lock
files. Use the verified isolated wrapper through `GH_AW_CLI`; the global
extension remains unchanged. Do not edit generated locks. Keep the intentional
QA failure disabled for normal checks.

The web app is a local workshop tool, not a production government service.
Do not create Azure resources, change access, or select a subscription
implicitly. Use the project's documented build and test commands before
claiming completion.
