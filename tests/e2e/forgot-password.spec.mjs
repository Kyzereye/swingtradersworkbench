import { test, expect } from "@playwright/test";
import { testEmail, passwordResetToken } from "./helpers/db.mjs";
import { createVerifiedUser, submitLogin, logIn, loginError } from "./helpers/app.mjs";

const NEW_PASSWORD = "Changed456!";
const SENT_MESSAGE = "If an account exists for that email, we sent a link to confirm your new password.";

async function requestReset(page, email) {
  await page.goto("/");
  await page.getByRole("button", { name: "Forgot password?" }).click();
  await page.locator("#forgot-email").fill(email);
  await page.locator("#forgot-new-password").fill(NEW_PASSWORD);
  await page.locator("#forgot-confirm-password").fill(NEW_PASSWORD);
  await page.getByRole("button", { name: "Send confirmation link" }).click();
}

test("reset the password through the emailed link", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "forgot");

  await requestReset(page, user.email);
  await expect(page.getByText(SENT_MESSAGE)).toBeVisible();

  const token = await passwordResetToken(user.email);
  expect(token).toBeTruthy();
  await page.goto(`/confirm-password-change?token=${token}`);
  await expect(page.getByText("Password changed. Please sign in with your new password.")).toBeVisible();

  await submitLogin(page, user.email, user.password);
  await expect(loginError(page)).toHaveText("Invalid email or password.");

  await logIn(page, user.email, NEW_PASSWORD);
});

test("an unknown email gets the same message", async ({ page }) => {
  await requestReset(page, testEmail("nobody"));
  await expect(page.getByText(SENT_MESSAGE)).toBeVisible();
});

test("a used confirmation link doesn't work twice", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "reuse");
  await requestReset(page, user.email);
  await expect(page.getByText(SENT_MESSAGE)).toBeVisible();
  const token = await passwordResetToken(user.email);

  const first = await request.get(`/api/profile/confirm-password-change?token=${token}`);
  expect(first.ok()).toBe(true);
  const second = await request.get(`/api/profile/confirm-password-change?token=${token}`);
  expect(second.status()).toBe(400);
});
