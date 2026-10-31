import { readConfig } from "../../../server/src/config/store.js";
import { initDb, getDb, closeDb } from "../../../server/src/db/connection.js";

export async function resetTestUser() {
  const config = readConfig();
  if (config) {
    await initDb(config.database);
    const db = getDb();
    // User 5 ('Titan Test 01', TF-491297)
    await db("users").where({ id: 5 }).update({
      must_change_password: true,
      is_code_login_enabled: true,
    });
    console.log("Reset user 5 (TF-491297) to must_change_password = true");
    await closeDb();
  }
}

if (process.argv[1]?.endsWith("resetTestUser.mjs")) {
  resetTestUser().then(() => process.exit(0)).catch(err => {
    console.error("Reset error:", err);
    process.exit(1);
  });
}
