import { test, expect } from "@playwright/test";

test("skip link is clipped until keyboard focus", async ({ page }) => {
  await page.goto("/");
  const skip = page.getByRole("link", { name: "Skip to your message" });
  await expect(skip).toHaveCSS("clip-path", "inset(50%)");
  await skip.focus();
  await expect(skip).toHaveCSS("clip-path", "none");
  await skip.press("Enter");
  await expect(page.getByLabel("Your message", { exact: true })).toBeFocused();
});

test("looks up a source and clearly labels offline evidence", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("/");
  await expect(page.locator("#mode-badge")).toHaveText("Offline rehearsal");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Alberta driver's licence renewal guide");
  await page.getByLabel("Your message", { exact: true }).fill("How do I renew my driver's licence?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#service-results")).toContainText("Renew in person");
  await expect(page.locator("#tool-activity")).toContainText("AB-RENEW-01");
  await expect(page.locator("#service-results a")).toHaveAttribute("href", "https://www.alberta.ca/renew-replace-drivers-licence");
  await expect(page.locator("#service-results time")).toHaveAttribute("datetime", "2026-10-25");
  await expect(page.locator("#guidance-note")).toContainText("not a live website check");
  await expect(page.locator("#message-help")).toContainText("Do not enter licence numbers");
  await expect(page.locator("#run-version")).toHaveText("not deployed");
  await expect(page.locator("#connection-notice")).toContainText("No Foundry model");
  expect(errors).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});

test("keyboard submission and resetting keep conversation state clear", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByLabel("Your message", { exact: true }).fill("documents");
  await page.getByLabel("Your message", { exact: true }).press("Enter");
  await expect(page.locator("#service-results")).toContainText("Prepare your documents");
  await expect(page.locator("#service-results a")).toHaveAttribute("href", "https://www.alberta.ca/new-drivers-licence-and-identification-cards");
  await page.reload();
  await expect(page.locator("#service-results")).toContainText("Prepare your documents");
  await page.getByRole("button", { name: "New conversation" }).click();
  await expect(page.locator("#welcome")).toBeVisible();
  await expect(page.locator("#messages .message")).toHaveCount(0);
  await expect(page.locator("#run-agent")).toHaveText("Not called yet");
});

test("the code viewer shows the real TypeScript implementation", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Explore the code" }).click();
  await expect(page.locator("#source-code")).toContainText("createVersion");
  await expect(page.getByRole("button", { name: "MAF hosted Optional" })).toHaveCount(0);
  await page.getByRole("button", { name: "Shared lookup", exact: true }).click();
  await expect(page.locator("#source-code")).toContainText("catalogue.lookup");
});

test("a failed request is visible and never becomes a successful conversation", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({
    status: 503,
    contentType: "application/problem+json",
    body: JSON.stringify({ detail: "Foundry access was denied. Check your workshop identity." }),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByLabel("Your message", { exact: true }).fill("renewal");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("Foundry access was denied");
  await expect(page.locator("#messages .message.assistant")).toHaveCount(0);
  await expect(page.getByLabel("Your message", { exact: true })).toHaveValue("renewal");
});

test("user content is rendered as text, not HTML", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByLabel("Your message", { exact: true }).fill('<img src=x onerror="window.injected=true"> renewal');
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#messages .message.user")).toContainText("<img");
  await expect(page.locator("#messages img")).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
});

test("official next steps remain available without a configured agent", async ({ page }) => {
  await page.route("**/api/status", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({ mode: "foundry", configured: false, notice: "Foundry is not configured.", isLive: false }),
  }));
  await page.goto("/");
  await expect(page.locator("#mode-badge")).toHaveText("Setup needed");
  await expect(page.getByRole("button", { name: "Send message" })).toBeDisabled();
  const official = page.getByRole("navigation", { name: "Official Alberta.ca pages" });
  await expect(official.getByRole("link", { name: "Read the official renewal guide" })).toBeVisible();
  await expect(official.getByRole("link", { name: "Read the official renewal guide" }))
    .toHaveAttribute("href", "https://www.alberta.ca/renew-replace-drivers-licence");
  await expect(official.getByRole("link", { name: "Find a registry agent" }))
    .toHaveAttribute("href", "https://www.alberta.ca/lookup/find-a-registry-agent.aspx");
  await expect(page.getByText("Workshop demo, not an official government service.", { exact: true })).toBeVisible();
});

test("online status is dated guidance rather than a promised online renewal", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByLabel("Your message", { exact: true }).fill("Can I renew my licence online?");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#service-results")).toContainText("At the last source review");
  await expect(page.locator("#service-results")).toContainText("temporarily disabled");
  await expect(page.locator("#service-results")).toContainText("cannot confirm");
  await expect(page.locator("#service-results time")).toHaveText("Source reviewed 2026-10-25");
  await expect(page.getByRole("link", { name: "Renew now", exact: true })).toHaveCount(0);
});

test("registry guidance opens the official finder rather than inventing an office", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByRole("button", { name: "Where can I find a registry?" }).click();
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.locator("#service-results")).toContainText("does not know which office is nearest");
  await expect(page.locator("#service-results a")).toHaveAttribute("href", "https://www.alberta.ca/lookup/find-a-registry-agent.aspx");
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("unreviewed source links are not rendered", async ({ page }) => {
  await page.route("**/api/chat", (route) => route.fulfill({
    contentType: "application/json",
    body: JSON.stringify({
      answer: "Bad source fixture.",
      services: [{
        id: "AB-RENEW-01", title: "Renew in person", summary: "A test fixture.",
        nextStep: "Do not visit this link.", sourceTitle: "Spoofed source",
        sourceUrl: "https://www.alberta.ca.untrusted.example/pay", reviewedOn: "2026-10-25",
      }],
      toolActivity: [],
      agent: { implementation: "foundry", name: "test", version: "1", isLive: true },
    }),
  }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Send message" })).toBeEnabled();
  await page.getByLabel("Your message", { exact: true }).fill("renewal");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByRole("alert")).toContainText("reviewed official source");
  await expect(page.locator('a[href*="untrusted.example"]')).toHaveCount(0);
  await expect(page.locator("#messages .message.assistant")).toHaveCount(0);
});
