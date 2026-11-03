import { test, expect } from "@playwright/test";
import { testEmail, passwordResetToken, verificationToken } from "./helpers/db.mjs";
import { createVerifiedUser, submitLogin, logIn, loginError } from "./helpers/app.mjs";

test("change the password from the profile page", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "profilepw");
  const newPassword = "Profile789!";

  await logIn(page, user.email, user.password);
  await page.getByRole("button", { name: "Profile" }).click();
  await page.locator("#profile-new-password").fill(newPassword);
  await page.locator("#profile-confirm-new-password").fill(newPassword);
  await page.getByRole("button", { name: "Change password" }).click();
  await expect(page.getByText("Check your email to confirm this password change.")).toBeVisible();

  const token = await passwordResetToken(user.email);
  await page.goto(`/confirm-password-change?token=${token}`);
  await expect(page.getByText("Password changed.")).toBeVisible();

  await submitLogin(page, user.email, user.password);
  await expect(loginError(page)).toHaveText("Invalid email or password.");
  await logIn(page, user.email, newPassword);
});

test("change the email, verify it, and log in with the new address", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "profileemail");
  const newEmail = testEmail("newemail");

  await logIn(page, user.email, user.password);
  await page.getByRole("button", { name: "Profile" }).click();
  await page.locator("#profile-email").fill(newEmail);
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByText("Check your new email address to confirm this change.")).toBeVisible();

  // The change signs the user out.
  await expect(page.locator("#login-email")).toBeVisible();

  await submitLogin(page, newEmail, user.password);
  await expect(loginError(page)).toContainText("verify your email");

  const token = await verificationToken(newEmail);
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByText("Email verified.")).toBeVisible();
  await logIn(page, newEmail, user.password);
});
