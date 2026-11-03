import { test, beforeEach } from "node:test";
import assert from "node:assert/strict";

import {
  GUEST_SESSION_TTL_MS,
  isGuestLoginEnabled,
  createGuestToken,
  isValidGuestToken,
} from "../../backend/src/guestSession.js";

const NOW = Date.UTC(2026, 10, 3, 12, 0, 0);

beforeEach(() => {
  process.env.GUEST_LOGIN_ENABLED = "true";
  process.env.GUEST_SESSION_SECRET = "test-secret-one";
});

test("guest login is on only with the flag and a secret", () => {
  assert.equal(isGuestLoginEnabled(), true);

  process.env.GUEST_LOGIN_ENABLED = "false";
  assert.equal(isGuestLoginEnabled(), false);

  process.env.GUEST_LOGIN_ENABLED = "true";
  process.env.GUEST_SESSION_SECRET = "";
  assert.equal(isGuestLoginEnabled(), false);
});

test("a fresh token is valid until it expires", () => {
  const token = createGuestToken(NOW);
  assert.equal(isValidGuestToken(token, NOW), true);
  assert.equal(isValidGuestToken(token, NOW + GUEST_SESSION_TTL_MS - 1), true);
  assert.equal(isValidGuestToken(token, NOW + GUEST_SESSION_TTL_MS), false);
});

test("an altered token is rejected", () => {
  const token = createGuestToken(NOW);
  const [expires, signature] = token.split(".");
  const laterExpiry = String(Number(expires) + 60 * 60 * 1000);
  const flippedSignature = (signature[0] === "a" ? "b" : "a") + signature.slice(1);

  assert.equal(isValidGuestToken(`${laterExpiry}.${signature}`, NOW), false, "changed expiry");
  assert.equal(isValidGuestToken(`${expires}.${flippedSignature}`, NOW), false, "changed signature");
  assert.equal(isValidGuestToken(`${expires}.`, NOW), false, "missing signature");
});

test("a token signed with another secret is rejected", () => {
  const token = createGuestToken(NOW);
  process.env.GUEST_SESSION_SECRET = "test-secret-two";
  assert.equal(isValidGuestToken(token, NOW), false);
});

test("tokens are rejected when guest login is turned off", () => {
  const token = createGuestToken(NOW);
  process.env.GUEST_LOGIN_ENABLED = "false";
  assert.equal(isValidGuestToken(token, NOW), false);
});

test("empty or malformed tokens are rejected", () => {
  for (const token of [undefined, null, "", "abc", "123", "notanumber.abcd"]) {
    assert.equal(isValidGuestToken(token, NOW), false, String(token));
  }
});
