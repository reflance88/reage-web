import { ADMIN_COLORS as C } from "@/admin/shared/theme";

export function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const bg =
    variant === "primary"
      ? C.primary
      : variant === "danger"
        ? "#991B1B"
        : variant === "success"
          ? "#166534"
          : variant === "secondary"
            ? C.gold
            : "#fff";
  const color = variant === "outline" ? C.text : "#fff";
  const border = variant === "outline" ? `1.5px solid ${C.border}` : "none";
  const pad = size === "sm" ? "5px 12px" : "8px 18px";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: pad,
        borderRadius: "8px",
        border,
        background: bg,
        color,
        fontSize: size === "sm" ? "12px" : "13px",
        fontWeight: 700,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}
