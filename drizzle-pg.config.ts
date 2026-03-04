/**
 * Supabase(PostgreSQL) 전용 Drizzle 설정 파일
 *
 * 사용 방법:
 *   pnpm db:push:pg     → Supabase에 스키마 푸시
 *   pnpm db:studio:pg   → Drizzle Studio (Supabase 연결)
 *
 * 필요 환경변수:
 *   SUPABASE_DATABASE_URL=postgresql://postgres:[password]@[host]:5432/postgres
 */

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";
dotenv.config();

if (!process.env.SUPABASE_DATABASE_URL) {
  throw new Error(
    "SUPABASE_DATABASE_URL 환경변수가 설정되지 않았습니다.\n" +
    "Supabase Dashboard → Settings → Database → Connection string (URI) 에서 복사하세요."
  );
}

export default defineConfig({
  schema: "./drizzle/schema-pg.ts",
  out: "./drizzle/migrations-pg",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.SUPABASE_DATABASE_URL,
  },
  verbose: true,
  strict: true,
});
