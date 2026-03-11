import { defineConfig } from "drizzle-kit";

// Supabase PostgreSQL 연결 (SUPABASE_DATABASE_URL 우선, 없으면 DATABASE_URL)
const connectionString = process.env.SUPABASE_DATABASE_URL || process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("SUPABASE_DATABASE_URL or DATABASE_URL is required to run drizzle commands");
}

export default defineConfig({
  schema: "./drizzle/schema-pg.ts",
  out: "./drizzle/migrations-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: connectionString,
  },
});
