import { Btn } from "@/admin/shared/legacy-primitives";
import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import type { ReactNode } from "react";
import { useLocation } from "wouter";

export function AdminGuard({ children }: { children: ReactNode }) {
  const [, navigate] = useLocation();
  const me = trpc.auth.me.useQuery();

  if (me.isLoading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontSize: "14px",
          color: C.muted,
        }}
      >
        로딩 중...
      </div>
    );
  }

  if (!me.data || me.data.role !== "admin") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          gap: "16px",
        }}
      >
        <div style={{ fontSize: "48px" }}>🔒</div>
        <div style={{ fontSize: "18px", fontWeight: 700 }}>접근 권한이 없습니다</div>
        <div style={{ fontSize: "14px", color: C.muted }}>관리자 계정으로 로그인해 주세요.</div>
        <Btn onClick={() => navigate("/login")}>로그인 페이지로</Btn>
      </div>
    );
  }

  return <>{children}</>;
}
