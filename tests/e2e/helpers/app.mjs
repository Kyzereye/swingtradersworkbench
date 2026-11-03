/**
 * Shared steps for e2e tests: create a verified user through the API, and log in through the UI.
 */

import { expect } from "@playwright/test";
import { testEmail, verificationToken } from "./db.mjs";

export const TEST_PASSWORD = "Testing123!";

/** Registers and verifies a user through the API. Returns { email, password }. */
export async function createVerifiedUser(request, label) {
  const email = testEmail(label);
  const register = await request.post("/api/auth/register", {
    data: { email, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD },
  });
  expect(register.ok(), await register.text()).toBe(true);

  const token = await verificationToken(email);
  const verify = await request.get(`/api/auth/verify-email?token=${token}`);
  expect(verify.ok(), await verify.text()).toBe(true);

  return { email, password: TEST_PASSWORD };
}

/** Fills and submits the login form. Doesn't check the result. */
export async function submitLogin(page, email, password) {
  await page.goto("/");
  await page.locator("#login-email").fill(email);
  await page.locator("#login-password").fill(password);
  await page.getByRole("button", { name: "Log in" }).click();
}

/**
 * Logs in, accepts the disclaimer, and waits for the dashboard.
 * The disclaimer shows once per browser tab, so a second login in the same tab skips it.
 */
export async function logIn(page, email, password) {
  await submitLogin(page, email, password);
  const agree = page.getByRole("button", { name: "I understand and agree" });
  const logOut = page.getByRole("button", { name: "Log out" });
  await expect(agree.or(logOut)).toBeVisible();
  if (await agree.isVisible()) await agree.click();
  await expect(logOut).toBeVisible();
}

export function loginError(page) {
  return page.locator(".error");
}
