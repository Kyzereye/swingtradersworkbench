import { getUserBySession } from "./auth.js";
import { parseCookies } from "./cookies.js";
import { isValidGuestToken } from "./guestSession.js";

// Paths under /api that work without signing in.
const OPEN_API_PATHS = new Set([
  "/health",
  "/pageview",
  "/auth/register",
  "/auth/verify-email",
  "/auth/forgot-password",
  "/auth/login",
  "/auth/logout",
  "/auth/me",
  "/auth/guest",
  // The emailed confirmation link is clicked while signed out.
  "/profile/confirm-password-change",
]);

/** Express middleware for /api: lets through open paths, signed-in users, and guests. */
export async function requireApiLogin(req, res, next) {
  if (OPEN_API_PATHS.has(req.path)) {
    next();
    return;
  }

  const { session, guest } = parseCookies(req.headers.cookie);
  if (isValidGuestToken(guest)) {
    next();
    return;
  }

  try {
    const user = await getUserBySession(session);
    if (!user) {
      res.status(401).json({ error: "Not signed in." });
      return;
    }
    next();
  } catch (err) {
    next(err);
  }
}
