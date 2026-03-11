import { describe, it, expect } from "vitest";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// 샌드박스 환경에서는 외부 DB 포트(5432)가 방화벽으로 차단되어 있어
// SUPABASE_NETWORK_AVAILABLE 환경변수가 없으면 네트워크 연결 테스트를 건너뜁니다.
const canConnect = !!process.env.SUPABASE_NETWORK_AVAILABLE;

describe("Supabase PostgreSQL 연결 테스트", () => {
  it("SUPABASE_DATABASE_URL 환경변수가 설정되어 있어야 한다", () => {
    const url = process.env.SUPABASE_DATABASE_URL;
    expect(url).toBeTruthy();
    expect(url).toContain("supabase.co");
  });

  it.skipIf(!canConnect)("Supabase DB에 연결하고 쿼리를 실행할 수 있어야 한다 (배포 환경에서만 실행)", async () => {
    const url = process.env.SUPABASE_DATABASE_URL;
    if (!url) throw new Error("SUPABASE_DATABASE_URL not set");

    const db = drizzle(url);
    const result = await db.execute(sql`SELECT 1 AS ping`);
    expect(result.rows).toBeDefined();
    expect(result.rows.length).toBeGreaterThan(0);
    expect((result.rows[0] as any).ping).toBe(1);
  }, 15000);
});
