import { ADMIN_NAV } from "@/admin/config/nav";
import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { useEffect, useState } from "react";

function getNavIcon(id: string) {
  switch (id) {
    case "dashboard":
      return "🏠";
    case "order":
      return "🛒";
    case "product":
      return "📦";
    case "customer":
      return "👤";
    case "board":
      return "📋";
    case "promotion":
      return "🎁";
    case "stats":
      return "📊";
    case "popup":
      return "🎯";
    case "design":
      return "🎨";
    default:
      return "";
  }
}

function getParentId(active: string) {
  return ADMIN_NAV.find((item) => item.children?.some((child) => child.id === active))?.id;
}

export function AdminSidebar({
  active,
  onSelect,
}: {
  active: string;
  onSelect: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {};
    for (const item of ADMIN_NAV) {
      if (item.children) {
        initialState[item.id] = false;
      }
    }
    const activeParentId = getParentId(active);
    if (activeParentId) {
      initialState[activeParentId] = true;
    }
    return initialState;
  });

  useEffect(() => {
    const activeParentId = getParentId(active);
    if (!activeParentId) {
      return;
    }
    setExpanded((current) => {
      if (current[activeParentId]) {
        return current;
      }
      return { ...current, [activeParentId]: true };
    });
  }, [active]);

  const toggle = (id: string) => {
    setExpanded((current) => ({ ...current, [id]: !current[id] }));
  };

  return (
    <nav
      style={{
        width: "220px",
        minWidth: "220px",
        background: C.sidebar,
        height: "100vh",
        position: "sticky",
        top: 0,
        overflowY: "auto",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ padding: "20px 16px 16px", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
        <a href="/" style={{ textDecoration: "none" }}>
          <span style={{ color: "#fff", fontSize: "20px", fontWeight: 800, letterSpacing: "0.1em" }}>REAGE</span>
        </a>
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: "11px", marginTop: "4px" }}>관리자</div>
      </div>

      <div style={{ flex: 1, padding: "8px 0" }}>
        {ADMIN_NAV.map((item) => (
          <div key={item.id}>
            {!item.children ? (
              <button
                onClick={() => onSelect(item.id)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 16px",
                  background: active === item.id ? C.sidebarActive : "transparent",
                  color: active === item.id ? "#fff" : C.sidebarText,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span style={{ fontSize: "16px" }}>{getNavIcon(item.id)}</span>
                {item.label}
              </button>
            ) : (
              <>
                <button
                  onClick={() => toggle(item.id)}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "10px 16px",
                    background: "transparent",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    letterSpacing: "0.05em",
                    opacity: 0.9,
                  }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span>{getNavIcon(item.id)}</span>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "10px", opacity: 0.6 }}>{expanded[item.id] ? "▲" : "▼"}</span>
                </button>
                {expanded[item.id] &&
                  item.children.map((child) => (
                    <button
                      key={child.id}
                      onClick={() => onSelect(child.id)}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 16px 8px 36px",
                        background: active === child.id ? C.sidebarActive : "transparent",
                        color: active === child.id ? "#fff" : C.sidebarText,
                        border: "none",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      {child.label}
                    </button>
                  ))}
              </>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
