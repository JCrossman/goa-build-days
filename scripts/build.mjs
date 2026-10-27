import { cp, mkdir, readFile, writeFile } from "node:fs/promises";

await mkdir("dist/assets/examples", { recursive: true });
await cp("public", "dist/public", { recursive: true });
await cp("src/shared/data/services.json", "dist/assets/services.json");
await cp("src/shared/AgentInstructions.txt", "dist/assets/AgentInstructions.txt");
const examples = {
  native: "src/foundry/agents.ts",
  tool: "src/shared/lookup.ts",
  instructions: "src/shared/AgentInstructions.txt",
};
for (const [name, file] of Object.entries(examples)) {
  await writeFile(`dist/assets/examples/${name}.json`, JSON.stringify({
    file, source: await readFile(file, "utf8"),
  }));
}
