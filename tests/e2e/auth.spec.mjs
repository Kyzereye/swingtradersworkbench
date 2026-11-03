import { test, expect } from "@playwright/test";
import { testEmail, verificationToken } from "./helpers/db.mjs";
import { TEST_PASSWORD, createVerifiedUser, submitLogin, logIn, loginError } from "./helpers/app.mjs";

test("sign up, verify the email, and log in", async ({ page }) => {
  const email = testEmail("signup");

  await page.goto("/");
  await page.getByRole("button", { name: "Sign up" }).click();
  await page.locator("#register-email").fill(email);
  await page.locator("#register-password").fill(TEST_PASSWORD);
  await page.locator("#register-confirm-password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByText("Check your email to verify")).toBeVisible();

  const token = await verificationToken(email);
  expect(token).toBeTruthy();
  await page.goto(`/verify-email?token=${token}`);
  await expect(page.getByText("Email verified. You can now sign in.")).toBeVisible();

  await logIn(page, email, TEST_PASSWORD);
  await expect(page.getByText(email)).toBeVisible();
});

test("logging in before verifying shows a note", async ({ page, request }) => {
  const email = testEmail("unverified");
  const register = await request.post("/api/auth/register", {
    data: { email, password: TEST_PASSWORD, confirmPassword: TEST_PASSWORD },
  });
  expect(register.ok()).toBe(true);

  await submitLogin(page, email, TEST_PASSWORD);
  await expect(loginError(page)).toContainText("verify your email");
});

test("a wrong password shows an error", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "wrongpw");

  await submitLogin(page, user.email, "Wrong-password-1");
  await expect(loginError(page)).toHaveText("Invalid email or password.");
});

test("log out returns to the login page", async ({ page, request }) => {
  const user = await createVerifiedUser(request, "logout");

  await logIn(page, user.email, user.password);
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.locator("#login-email")).toBeVisible();
});
