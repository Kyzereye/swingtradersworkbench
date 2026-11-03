import crypto from "node:crypto";

// Guest access: a signed cookie instead of a user account. Turned on and off with
// GUEST_LOGIN_ENABLED in backend/.env; signed with GUEST_SESSION_SECRET.

export const GUEST_SESSION_TTL_MS = 3 * 60 * 60 * 1000;

export function isGuestLoginEnabled() {
  return process.env.GUEST_LOGIN_ENABLED === "true" && Boolean(process.env.GUEST_SESSION_SECRET);
}

function sign(expiresAtMs) {
  return crypto
    .createHmac("sha256", process.env.GUEST_SESSION_SECRET)
    .update(`guest.${expiresAtMs}`)
    .digest("hex");
}

/** Token format: "<expiry ms>.<signature>". */
export function createGuestToken(nowMs = Date.now()) {
  const expiresAtMs = nowMs + GUEST_SESSION_TTL_MS;
  return `${expiresAtMs}.${sign(expiresAtMs)}`;
}

export function isValidGuestToken(token, nowMs = Date.now()) {
  if (!isGuestLoginEnabled()) return false;
  if (typeof token !== "string") return false;

  const [expiresPart, signature] = token.split(".");
  const expiresAtMs = Number(expiresPart);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= nowMs) return false;
  if (typeof signature !== "string") return false;

  const expected = Buffer.from(sign(expiresAtMs), "hex");
  const actual = Buffer.from(signature, "hex");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}
