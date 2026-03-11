import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

describe("Supabase PostgreSQL 연결 테스트", () => {
  it("SUPABASE_DATABASE_URL 환경변수가 설정되어 있어야 한다", () => {
    const url = process.env.SUPABASE_DATABASE_URL;
    expect(url).toBeTruthy();
    expect(url).toContain("supabase.co");
  });

  it("Supabase DB에 연결하고 쿼리를 실행할 수 있어야 한다", async () => {
    const url = process.env.SUPABASE_DATABASE_URL;
    if (!url) throw new Error("SUPABASE_DATABASE_URL not set");
    
    const db = drizzle(url);
    const result = await db.execute(sql`SELECT 1 AS ping`);
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
    expect((result.rows[0] as any).ping).toBe(1);
  }, 15000);
});
