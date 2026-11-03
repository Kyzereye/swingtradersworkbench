import { test, expect } from "@playwright/test";

async function continueAsGuest(page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Continue as guest" }).click();
  await page.getByRole("button", { name: "I understand and agree" }).click();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
}

test("a guest can see the dashboard and systems, but not Profile", async ({ page }) => {
  await continueAsGuest(page);

  await expect(page.locator(".app-header-account")).toContainText("Guest");
  await expect(page.getByRole("button", { name: "Profile" })).toHaveCount(0);

  await page.getByRole("button", { name: "Systems", exact: true }).click();
  await page.getByRole("button", { name: "RSI mean reversion / failure swing" }).click();
  await expect(page.locator("canvas").first()).toBeVisible();

  const profile = await page.request.get("/api/profile");
  expect(profile.status()).toBe(401);
});

test("a guest stays in after a reload, and Log out ends it", async ({ page }) => {
  await continueAsGuest(page);

  await page.reload();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.locator("#login-email")).toBeVisible();

  const scanner = await page.request.get("/api/scanner?top=1");
  expect(scanner.status()).toBe(401);
});
