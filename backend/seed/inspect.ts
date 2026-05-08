import { db } from "../src/db";
import { account, user as userSchema } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  const users = await db.select().from(userSchema);
  const accounts = await db.select().from(account);
  console.log("USERS:", JSON.stringify(users.filter(u => u.email.includes("admin")), null, 2));
  console.log("ACCOUNTS:", JSON.stringify(accounts.filter(a => a.accountId.includes("admin") || a.userId.includes("admin")), null, 2));
}

run().finally(() => process.exit(0));
