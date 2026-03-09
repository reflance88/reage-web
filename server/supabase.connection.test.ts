/**
 * Supabase API 연결 및 환경변수 검증 테스트
 * 
 * 이 테스트는 Supabase API key가 올바르게 설정되어 있는지 확인합니다.
 * 실제 DB 연결은 샌드박스 환경의 DNS 제한으로 불가능하므로
 * REST API를 통해 연결 상태를 검증합니다.
 */

import { describe, it, expect } from "vitest";

const SUPABASE_PROJECT_URL = "https://pblsxhfghmcqpcefzvfd.supabase.co";

describe("Supabase 환경변수 및 API 연결 검증", () => {
  it("SUPABASE_ANON_KEY가 올바른 JWT 형식으로 설정되어 있어야 한다", () => {
    const key = process.env.SUPABASE_ANON_KEY;
    expect(key, "SUPABASE_ANON_KEY가 설정되지 않음").toBeTruthy();
    expect(key!.startsWith("eyJ"), "JWT 형식이 아님 (eyJ로 시작해야 함)").toBe(true);
    expect(key!.length, "JWT 토큰이 너무 짧음").toBeGreaterThan(100);
  });

  it("SUPABASE_SERVICE_ROLE_KEY가 올바른 JWT 형식으로 설정되어 있어야 한다", () => {
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(key, "SUPABASE_SERVICE_ROLE_KEY가 설정되지 않음").toBeTruthy();
    expect(key!.startsWith("eyJ"), "JWT 형식이 아님 (eyJ로 시작해야 함)").toBe(true);
    expect(key!.length, "JWT 토큰이 너무 짧음").toBeGreaterThan(100);
  });

  it("SUPABASE_DATABASE_URL이 postgresql:// 형식으로 설정되어 있어야 한다", () => {
    const url = process.env.SUPABASE_DATABASE_URL;
    expect(url, "SUPABASE_DATABASE_URL이 설정되지 않음").toBeTruthy();
    expect(
      url!.startsWith("postgresql://") || url!.startsWith("postgres://"),
      "postgresql:// 형식이 아님"
    ).toBe(true);
  });

  it("Supabase REST API에 anon key로 접근할 수 있어야 한다", async () => {
    const anonKey = process.env.SUPABASE_ANON_KEY;
    if (!anonKey) {
      console.warn("SUPABASE_ANON_KEY not set, skipping API test");
      return;
    }

    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/`, {
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
    });

    // 200 = connected (tables exist), 401 = wrong key, 404 = no tables yet
    // All except 401 are acceptable for this connectivity test
    expect(res.status, "API key가 거부됨 (401 Unauthorized)").not.toBe(401);
    console.log(`Supabase REST API status: ${res.status}`);
  });

  it("Supabase REST API에 service_role key로 접근할 수 있어야 한다", async () => {
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      console.warn("SUPABASE_SERVICE_ROLE_KEY not set, skipping API test");
      return;
    }

    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    });

    expect(res.status, "service_role key가 거부됨 (401 Unauthorized)").not.toBe(401);
    console.log(`Supabase REST API (service_role) status: ${res.status}`);
  });
});
