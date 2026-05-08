import { db } from "../src/db";
import { account, user } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function fix() {
  console.log("Deleting seeded users so Better Auth can create them properly...");
  await db.delete(account);
  await db.delete(user);
  console.log("Done. Please start your server, then we will hit the sign up API.");
  process.exit(0);
}

fix().catch(console.error);
