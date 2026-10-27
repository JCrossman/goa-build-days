# Alberta driver's licence renewal guide

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users and purpose

GoA Build Days participants use this TypeScript/Node app to connect a short
specification, working code, QA, and an agent running in Microsoft Foundry.
The concrete use case is explaining renewal steps, what to prepare, and how
to find an Alberta registry agent.

## Capabilities and constraints

- One local Node.js web app and a core Foundry SDK prompt agent.
- Reviewed summaries of real Alberta.ca guidance and a read-only lookup tool.
- Official source links and review dates, including direct renewal and registry
  links that work without chat.
- Useful next steps and actual tool activity, not hidden model reasoning.
- No citizen data, eligibility decisions, applications, or production services.
- Offline exercises are explicitly labelled and never count as live validation.
- Live agents still use the saved guidance snapshot, not live website retrieval.
- Only user scenarios are synthetic. Never request personal licence details or
  documents; this app cannot renew a licence.
- The current fork does not include a Microsoft Agent Framework (MAF) runtime
  or a MAF selector. The earlier .NET/MAF example is a historical reference
  linked from the optional comparison page.

## Voice and accessibility

Use simple language, clear controls, keyboard navigation, and explicit loading
and error states. Do not imply that this demo is an official government service.
