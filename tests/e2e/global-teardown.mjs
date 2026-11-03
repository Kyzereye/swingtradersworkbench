import { deleteTestUsers, closeTestPool } from "./helpers/db.mjs";

export default async function globalTeardown() {
  const deleted = await deleteTestUsers();
  console.log(`Removed ${deleted} e2e test user(s) from ${process.env.MYSQL_DATABASE}.`);
  await closeTestPool();
}
