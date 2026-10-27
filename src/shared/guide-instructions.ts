import { readFileSync } from "node:fs";
export const instructions = readFileSync(new URL("../../assets/AgentInstructions.txt", import.meta.url), "utf8");
