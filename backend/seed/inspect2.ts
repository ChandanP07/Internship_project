import { db } from "../src/db";
import { account, user as userSchema } from "../src/db/schema";
import * as fs from "fs";

async function run() {
  const users = await db.select().from(userSchema);
  const accounts = await db.select().from(account);
  fs.writeFileSync("seed/inspect.json", JSON.stringify({
    users,
    accounts
  }, null, 2));
}

run().finally(() => process.exit(0));
