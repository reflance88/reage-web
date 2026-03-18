import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import type { ReactNode } from "react";

export function AdminLayout({
  sidebar,
  children,
}: {
  sidebar: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: C.bg,
        fontFamily: "'Pretendard', 'Apple SD Gothic Neo', sans-serif",
      }}
    >
      {sidebar}
      <main style={{ flex: 1, padding: "28px 32px", overflowY: "auto", minWidth: 0 }}>{children}</main>
    </div>
  );
}
