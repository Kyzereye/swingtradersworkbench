import { test, expect } from "@playwright/test";
import { createVerifiedUser } from "./helpers/app.mjs";

const DATA_ROUTES = ["/api/scanner?top=1", "/api/systems/rsi/pair?symbol=AAPL", "/api/symbols?q=AA"];

test("data routes need a login", async ({ request }) => {
  for (const route of DATA_ROUTES) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(401);
  }
});

test("health, session check, and auth routes stay open", async ({ request }) => {
  expect((await request.get("/api/health")).ok()).toBe(true);

  const me = await request.get("/api/auth/me");
  expect(me.ok()).toBe(true);
  expect((await me.json()).authenticated).toBe(false);

  const badLogin = await request.post("/api/auth/login", { data: { email: "x@example.test", password: "x" } });
  expect(badLogin.status()).toBe(401);
  expect((await badLogin.json()).error).toBe("Invalid email or password.");
});

test("data routes work after logging in", async ({ request }) => {
  const user = await createVerifiedUser(request, "apiaccess");
  const login = await request.post("/api/auth/login", { data: { email: user.email, password: user.password } });
  expect(login.ok()).toBe(true);

  for (const route of DATA_ROUTES) {
    const response = await request.get(route);
    expect(response.status(), route).toBe(200);
  }
});
