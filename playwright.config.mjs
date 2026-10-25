import { defineConfig, devices } from "@playwright/test";
import { join } from "node:path";

const baseURL = "http://127.0.0.1:5089";

export default defineConfig({
  testDir: join("tests", "browser"),
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop", use: { browserName: "chromium", viewport: { width: 1360, height: 960 } } },
    { name: "mobile", use: { ...devices["Pixel 5"], browserName: "chromium" } },
  ],
  webServer: {
    command: `dotnet run --project "${join("src", "ServiceGuide.Web")}" --no-build --no-launch-profile --urls ${baseURL}`,
    url: `${baseURL}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
    env: { SERVICE_GUIDE_MODE: "offline", ASPNETCORE_ENVIRONMENT: "Development" },
  },
});
