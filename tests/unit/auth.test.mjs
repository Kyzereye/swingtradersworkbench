import { test, after } from "node:test";
import assert from "node:assert/strict";

import { isPasswordValid, passwordsMatch } from "../../frontend/src/passwordRules.js";
import { validatePassword } from "../../backend/src/auth.js";
import { parseCookies, serializeCookie } from "../../backend/src/cookies.js";
import { closePool } from "../../backend/src/db.js";

// auth.js imports db.js, which creates (but never uses here) a MySQL pool.
after(() => closePool());

const PASSWORD_CASES = [
  { password: "Abcdefgh1!", valid: true, why: "meets every rule" },
  { password: "Abcdef1!", valid: false, why: "only 8 characters" },
  { password: "Abcdefg1!", valid: true, why: "9 characters, just over the minimum" },
  { password: "abcdefgh1!", valid: false, why: "no uppercase" },
  { password: "ABCDEFGH1!", valid: false, why: "no lowercase" },
  { password: "Abcdefghi!", valid: false, why: "no number" },
  { password: "Abcdefghi1", valid: false, why: "no special character" },
  { password: "", valid: false, why: "empty" },
];

test("frontend and backend password rules agree", () => {
  for (const { password, valid, why } of PASSWORD_CASES) {
    assert.equal(isPasswordValid(password), valid, `frontend: "${password}" (${why})`);
    assert.equal(validatePassword(password).ok, valid, `backend: "${password}" (${why})`);
  }
});

test("both sides reject a password that isn't a string", () => {
  assert.equal(isPasswordValid(undefined), false);
  assert.equal(validatePassword(undefined).ok, false);
});

test("passwords match only when both are the same and not empty", () => {
  assert.equal(passwordsMatch("Abcdefgh1!", "Abcdefgh1!"), true);
  assert.equal(passwordsMatch("Abcdefgh1!", "Abcdefgh1?"), false);
  assert.equal(passwordsMatch("", ""), false);
});

test("parseCookies reads name=value pairs and decodes values", () => {
  assert.deepEqual(parseCookies("session=abc123; theme=dark%20blue"), {
    session: "abc123",
    theme: "dark blue",
  });
  assert.deepEqual(parseCookies(""), {});
  assert.deepEqual(parseCookies(undefined), {});
  assert.deepEqual(parseCookies("novalue; a=1"), { a: "1" });
});

test("serializeCookie sets HttpOnly, SameSite, and Max-Age", () => {
  assert.equal(
    serializeCookie("session", "abc", { maxAgeSeconds: 10800 }),
    "session=abc; Path=/; HttpOnly; SameSite=Lax; Max-Age=10800"
  );
  assert.equal(serializeCookie("session", "", {}), "session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0");
});

test("serializeCookie adds Secure in production", () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    assert.match(serializeCookie("session", "abc", { maxAgeSeconds: 60 }), /; Secure;/);
  } finally {
    process.env.NODE_ENV = previous;
  }
});
