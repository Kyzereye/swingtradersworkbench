import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { getPool } from "./db.js";
import { sendTokenEmail } from "./utils/sendTokenEmail.js";

const BCRYPT_ROUNDS = 10;
const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;
const SESSION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+()\-.\s]{7,20}$/;

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export function validatePassword(password) {
  if (typeof password !== "string" || password.length <= 8) {
    return { ok: false, message: "Password must be more than 8 characters long." };
  }
  if (!/[a-z]/.test(password)) {
    return { ok: false, message: "Password must include a lowercase letter." };
  }
  if (!/[A-Z]/.test(password)) {
    return { ok: false, message: "Password must include an uppercase letter." };
  }
  if (!/[0-9]/.test(password)) {
    return { ok: false, message: "Password must include a number." };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { ok: false, message: "Password must include a special character." };
  }
  return { ok: true, message: "" };
}

export async function sendVerificationEmail(email, token) {
  const verifyUrl = `${FRONTEND_URL}/verify-email?token=${token}`;
  await sendTokenEmail({
    to: email,
    subject: "Verify your email — JJK Trading Labs",
    heading: "Welcome! Confirm your email",
    textBody: `Welcome to JJK Trading Labs!

Confirm your email address to activate your account:`,
    htmlIntro:
      "Thanks for signing up. Click the button below to verify your email address and activate your account.",
    buttonLabel: "Verify email",
    url: verifyUrl,
    expiryNote:
      "This link expires in 24 hours. If you didn't create this account, you can ignore this email.",
  });
}

export async function registerUser(rawEmail, password) {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  if (!EMAIL_RE.test(email)) {
    return { ok: false, status: 400, message: "Enter a valid email address." };
  }

  const passwordCheck = validatePassword(password);
  if (!passwordCheck.ok) {
    return { ok: false, status: 400, message: passwordCheck.message };
  }

  const pool = getPool();
  const [existing] = await pool.query("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0) {
    return { ok: false, status: 400, message: "An account with this email already exists." };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);

  try {
    await sendVerificationEmail(email, token);
  } catch (err) {
    console.error("Failed to send verification email:", err);
    return {
      ok: false,
      status: 500,
      message: "Could not send the verification email. Please try again later.",
    };
  }

  await pool.query(
    "INSERT INTO users (email, password_hash, verification_token, verification_token_expires) VALUES (?, ?, ?, ?)",
    [email, passwordHash, token, tokenExpires]
  );

  return {
    ok: true,
    status: 201,
    message: "Account created. Check your email to verify your account before signing in.",
  };
}

export async function verifyEmailToken(token) {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, message: "Missing verification token." };
  }

  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE verification_token = ? AND verification_token_expires > NOW()",
    [token]
  );
  if (rows.length === 0) {
    return { ok: false, message: "This verification link is invalid or has expired." };
  }

  await pool.query(
    "UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_token_expires = NULL WHERE id = ?",
    [rows[0].id]
  );

  return { ok: true, message: "Email verified. You can now sign in." };
}

export async function loginUser(rawEmail, password) {
  const email = typeof rawEmail === "string" ? rawEmail.trim().toLowerCase() : "";
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, password_hash, is_active, email_verified FROM users WHERE email = ?",
    [email]
  );
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return { ok: false, status: 401, message: "Invalid email or password." };
  }
  if (!user.is_active) {
    return { ok: false, status: 403, message: "This account is inactive." };
  }
  if (!user.email_verified) {
    return { ok: false, status: 403, message: "Please verify your email before signing in." };
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + SESSION_TOKEN_TTL_MS);
  await pool.query(
    "UPDATE users SET session_token = ?, session_token_expires = ?, last_login = NOW() WHERE id = ?",
    [token, tokenExpires, user.id]
  );

  return { ok: true, status: 200, token, email };
}

export async function logoutSession(token) {
  if (typeof token !== "string" || token.length === 0) return;
  const pool = getPool();
  await pool.query(
    "UPDATE users SET session_token = NULL, session_token_expires = NULL WHERE session_token = ?",
    [token]
  );
}

export async function getUserBySession(token) {
  if (typeof token !== "string" || token.length === 0) return null;
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, email FROM users WHERE session_token = ? AND session_token_expires > NOW()",
    [token]
  );
  return rows[0] || null;
}

export async function getProfile(userId) {
  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT u.email, p.phone_number AS phoneNumber
     FROM users u
     LEFT JOIN user_profile p ON p.user_id = u.id
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0] || null;
}

export async function upsertPhoneNumber(userId, rawPhoneNumber) {
  const phoneNumber = typeof rawPhoneNumber === "string" ? rawPhoneNumber.trim() : "";
  if (phoneNumber && !PHONE_RE.test(phoneNumber)) {
    return { ok: false, status: 400, message: "Enter a valid phone number." };
  }

  const pool = getPool();
  await pool.query(
    `INSERT INTO user_profile (user_id, phone_number) VALUES (?, ?)
     ON DUPLICATE KEY UPDATE phone_number = VALUES(phone_number)`,
    [userId, phoneNumber || null]
  );

  return { ok: true, status: 200, phoneNumber: phoneNumber || null };
}

export async function requestPasswordChange(userId, email, newPassword, confirmNewPassword) {
  if (newPassword !== confirmNewPassword) {
    return { ok: false, status: 400, message: "Passwords do not match." };
  }
  const passwordCheck = validatePassword(newPassword);
  if (!passwordCheck.ok) {
    return { ok: false, status: 400, message: passwordCheck.message };
  }

  const pendingHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  const token = crypto.randomBytes(32).toString("hex");
  const tokenExpires = new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS);
  const confirmUrl = `${FRONTEND_URL}/confirm-password-change?token=${token}`;

  try {
    await sendTokenEmail({
      to: email,
      subject: "Confirm your password change — JJK Trading Labs",
      heading: "Confirm your password change",
      textBody: `We received a request to change your JJK Trading Labs password.

Confirm this change:`,
      htmlIntro:
        "We received a request to change your password. Click the button below to confirm this change.",
      buttonLabel: "Confirm change",
      url: confirmUrl,
      expiryNote:
        "This link expires in 24 hours. If you didn't request this change, you can ignore this email and your password will stay the same.",
    });
  } catch (err) {
    console.error("Failed to send password-change confirmation email:", err);
    return {
      ok: false,
      status: 500,
      message: "Could not send the confirmation email. Please try again later.",
    };
  }

  const pool = getPool();
  await pool.query(
    "UPDATE users SET pending_password_hash = ?, password_reset_token = ?, password_reset_token_expires = ? WHERE id = ?",
    [pendingHash, token, tokenExpires, userId]
  );

  return {
    ok: true,
    status: 200,
    message: "Check your email to confirm this password change.",
  };
}

export async function confirmPasswordChange(token) {
  if (typeof token !== "string" || token.length === 0) {
    return { ok: false, message: "Missing confirmation token." };
  }

  const pool = getPool();
  const [rows] = await pool.query(
    `SELECT id, pending_password_hash FROM users
     WHERE password_reset_token = ? AND password_reset_token_expires > NOW()`,
    [token]
  );
  const user = rows[0];
  if (!user || !user.pending_password_hash) {
    return { ok: false, message: "This confirmation link is invalid or has expired." };
  }

  await pool.query(
    `UPDATE users SET
       password_hash = ?,
       pending_password_hash = NULL,
       password_reset_token = NULL,
       password_reset_token_expires = NULL,
       session_token = NULL,
       session_token_expires = NULL
     WHERE id = ?`,
    [user.pending_password_hash, user.id]
  );

  return { ok: true, message: "Password changed. Please sign in with your new password." };
}

export async function deleteAccount(userId, password) {
  const pool = getPool();
  const [rows] = await pool.query("SELECT password_hash FROM users WHERE id = ?", [userId]);
  const user = rows[0];
  if (!user || !(await bcrypt.compare(password || "", user.password_hash))) {
    return { ok: false, status: 401, message: "Incorrect password." };
  }

  await pool.query("DELETE FROM users WHERE id = ?", [userId]);
  return { ok: true, status: 200, message: "Account deleted." };
}
