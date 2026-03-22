/**
 * Push the Drizzle schema to your Supabase PostgreSQL database.
 *
 * Usage:
 *   npx tsx scripts/db-push.ts
 *
 * Requires DATABASE_URL env var pointing to your Supabase connection string.
 * Example: postgresql://postgres.[ref]:[password]@aws-0-us-east-1.pooler.supabase.com:6543/postgres
 */

import { execSync } from "child_process";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  console.error("ERROR: DATABASE_URL is not set.");
  console.error("");
  console.error("Set it in .env or export it:");
  console.error("  export DATABASE_URL=postgresql://postgres.[ref]:[pw]@aws-0-us-east-1.pooler.supabase.com:6543/postgres");
  process.exit(1);
}

console.log("Pushing schema to database...");
console.log(`  Host: ${dbUrl.split("@")[1]?.split("/")[0] || "localhost"}`);
console.log("");

try {
  execSync("npx drizzle-kit push", { stdio: "inherit", cwd: __dirname + "/.." });
  console.log("");
  console.log("Schema pushed successfully!");
} catch {
  console.error("Failed to push schema. Check your DATABASE_URL and try again.");
  process.exit(1);
}
