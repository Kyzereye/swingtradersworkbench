/**
 * Test database access for e2e tests. Refuses any database whose name doesn't end in "_test".
 * playwright.config.mjs sets MYSQL_DATABASE before this runs.
 */

const TEST_EMAIL_PATTERN = "e2e+%@example.test";

let poolModule = null;

async function testPool() {
  const database = process.env.MYSQL_DATABASE || "";
  if (!database.endsWith("_test")) {
    throw new Error(`Refusing to use database "${database}". E2E tests only use a *_test database.`);
  }
  // Imported here, after the check, because db.js reads MYSQL_DATABASE when it loads.
  poolModule ??= await import("../../../backend/src/db.js");
  return poolModule.getPool();
}

/** A unique address for one test user. Cleanup deletes every address of this form. */
export function testEmail(label) {
  const unique = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
  return `e2e+${label}-${unique}@example.test`;
}

export async function verificationToken(email) {
  const pool = await testPool();
  const [rows] = await pool.query("SELECT verification_token FROM users WHERE email = ?", [email]);
  return rows[0]?.verification_token ?? null;
}

export async function passwordResetToken(email) {
  const pool = await testPool();
  const [rows] = await pool.query("SELECT password_reset_token FROM users WHERE email = ?", [email]);
  return rows[0]?.password_reset_token ?? null;
}

export async function deleteTestUsers() {
  const pool = await testPool();
  const [result] = await pool.query("DELETE FROM users WHERE email LIKE ?", [TEST_EMAIL_PATTERN]);
  return result.affectedRows;
}

export async function closeTestPool() {
  if (poolModule) await poolModule.closePool();
}
