import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["server/**/*.test.ts", "server/**/*.spec.ts"],
    env: {
      // 테스트 환경에서 Supabase 클라이언트 초기화 오류 방지용 더미 값
      // 실제 Supabase 연결이 필요한 테스트는 별도 통합 테스트로 분리
      SUPABASE_URL: process.env.SUPABASE_URL ?? "https://placeholder.supabase.co",
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-service-role-key",
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ?? "placeholder-anon-key",
    },
  },
});
