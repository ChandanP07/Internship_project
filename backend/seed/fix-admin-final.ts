import { db } from "../src/db";
import { account } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function run() {
  console.log("Fixing the database for ava.admin@classroom.dev...");
  
  // We grab any valid better-auth hash from the temp accounts we made.
  // temp3 was mkpe5SfYZFxwHSg8pANqy8xdLJkeFaus
  const validHash = "293ee5d6b33da51d5ed1fe5294d2cec6:f8914056d766086ab323097fdbc2f836a66b79de88f193909fdda2c0d4fae6bfa4d0db60cf776d4e54764bc85179bcb8516bf2c3776e15189cdcba873d3335c6";

  // The account table's userId for the seeded admin is "admin_1".
  // Better Auth expects accountId = userId, providerId = "credential", and a hashed password!
  await db.update(account).set({
    password: validHash,
    providerId: "credential",
    accountId: "admin_1" 
  }).where(eq(account.userId, "admin_1"));

  console.log("Database fixed. The admin should log in successfully now.");
}

run().catch(console.error).finally(() => process.exit(0));
