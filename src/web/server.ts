import { buildApp } from "./app.js";
import { AgentConfigurationException } from "../shared/contracts.js";

const portText = process.env.PORT ?? "5087";
const port = Number(portText);
if (!/^[0-9]+$/.test(portText) || !Number.isInteger(port) || port < 1 || port > 65_535) {
  throw new AgentConfigurationException("PORT must be an integer between 1 and 65535.");
}
const host = process.env.HOST ?? "127.0.0.1";
if (!["localhost", "127.0.0.1", "::1"].includes(host)) {
  throw new AgentConfigurationException("HOST must be localhost, 127.0.0.1, or ::1 for this local workshop.");
}
const app = await buildApp();
for (const signal of ["SIGINT", "SIGTERM"] as const) {
  process.once(signal, () => { void app.close(); });
}
try {
  await app.listen({ port, host });
  console.log(`Local workshop listening on http://${host === "::1" ? "[::1]" : host}:${port}`);
} catch {
  console.error("The local workshop could not start. Check the configured host and port.");
  process.exitCode = 1;
}
