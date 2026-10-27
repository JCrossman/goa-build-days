import { spawnSync } from "node:child_process";

const command = process.env.GH_AW_CLI || "gh";
const version = spawnSync(command, ["aw", "version"], { encoding: "utf8" });
if (version.error || version.status !== 0 ||
    `${version.stdout ?? ""}${version.stderr ?? ""}`.trim() !== "gh aw version v0.89.21") {
  console.error("This workshop requires gh-aw v0.89.21. See docs/prework.md; do not upgrade implicitly.");
  process.exit(1);
}
const result = spawnSync(command, ["aw", "compile", "qa-review", "--validate", "--no-check-update"], {
  stdio: "inherit", cwd: new URL("..", import.meta.url),
});
if (result.error) {
  console.error(`Cannot start gh-aw: ${result.error.message}`);
}
process.exit(result.status ?? 1);
