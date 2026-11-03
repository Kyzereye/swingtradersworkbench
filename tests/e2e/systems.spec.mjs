/**
 * Each catalog system opens with AAPL: it pulls the optimized settings from its scan table,
 * draws the chart, and lists opens and closes. Needs the seed data and test:seed-scans.
 */

import { test, expect } from "@playwright/test";
import { createVerifiedUser, logIn } from "./helpers/app.mjs";

// Card name in the Systems tab → route segment of its /pair endpoint.
const SYSTEMS = [
  { name: "Moving average crossover", route: "ma-crossover" },
  { name: "Triple Moving Average Alignment", route: "triple-ma" },
  { name: "MACD system", route: "macd" },
  { name: "RSI mean reversion / failure swing", route: "rsi" },
  { name: "Donchian Breakout (Turtle)", route: "donchian" },
  { name: "Keltner Channel Trend", route: "keltner" },
  { name: "Bollinger Band Squeeze & Reversion", route: "bollinger-squeeze" },
  { name: "Darvas Box", route: "darvas" },
  { name: "Fibonacci retracement / extension", route: "fibonacci" },
  { name: "Point & figure", route: "point-figure" },
];

let user;

test.beforeAll(async ({ request }) => {
  user = await createVerifiedUser(request, "systems");
});

for (const system of SYSTEMS) {
  test(`${system.name} loads AAPL with optimized settings`, async ({ page }) => {
    await logIn(page, user.email, user.password);
    await page.getByRole("button", { name: "Systems", exact: true }).click();

    const pairResponse = page.waitForResponse(
      (response) => response.url().includes(`/api/systems/${system.route}/pair?`)
    );
    await page.getByRole("button", { name: system.name }).click();

    const response = await pairResponse;
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.pair, "scan row for AAPL (run test:seed-scans)").not.toBeNull();

    await expect(page.locator("canvas").first()).toBeVisible();
    await expect(page.getByText(/Opens & Closes \(\d+/)).toBeVisible();
    expect(await page.locator(".trades-table tbody tr").count()).toBeGreaterThan(0);
  });
}
