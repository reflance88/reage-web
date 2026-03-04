import { defineConfig } from "drizzle-kit";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is required to run drizzle commands");
}

// MySQL(Manus 기본) vs PostgreSQL(Supabase) 자동 감지
const isPostgres =
  connectionString.startsWith("postgres://") ||
  connectionString.startsWith("postgresql://");

export default defineConfig({
  schema: "./drizzle/schema.ts",
  out: "./drizzle",
  dialect: isPostgres ? "postgresql" : "mysql",
  dbCredentials: {
    url: connectionString,
  },
});
