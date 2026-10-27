# Historical comparison: optional MAF hosted agent

The current Node.js/TypeScript fork has **no Microsoft Agent Framework (MAF)
runtime, hosted package, or MAF selector**. Do not follow this as a runnable
lab or copy its historical commands into the current fork.

The earlier optional example used C#/.NET and MAF to host custom agent code in
Foundry. It is preserved in the
[pre-migration baseline tree at `da785b022b5e2c924b0831acb68b56f5b3c766e9`](https://github.com/VeVarunSharma/goa-build-days/tree/da785b022b5e2c924b0831acb68b56f5b3c766e9),
including the [original optional lab](https://github.com/VeVarunSharma/goa-build-days/blob/da785b022b5e2c924b0831acb68b56f5b3c766e9/docs/labs/optional-maf-hosted.md),
[MAF example](https://github.com/VeVarunSharma/goa-build-days/tree/da785b022b5e2c924b0831acb68b56f5b3c766e9/examples/MafHosted),
and [hosted-agent implementation](https://github.com/VeVarunSharma/goa-build-days/blob/da785b022b5e2c924b0831acb68b56f5b3c766e9/src/ServiceGuide.Foundry/HostedGuideAgent.cs).

Use those links only to compare the former hosting design with the current
TypeScript Foundry prompt-agent example in [Lab 3](03-foundry-native.md). They
are historical source references; this repository's current supported run and
test commands are documented in the [README](../../README.md).
