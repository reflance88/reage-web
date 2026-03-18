import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
}

export function DashboardCharts({
  orderStats,
  signupStats,
  verificationStats,
}: {
  orderStats: any[];
  signupStats: any[];
  verificationStats?: { pending?: number; approved?: number; rejected?: number };
}) {
  const colors = [C.orange, C.green, "#991B1B"];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>일별 주문 수</div>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={orderStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Area type="monotone" dataKey="orderCount" stroke={C.primary} fill={C.primary} fillOpacity={0.15} name="주문 수" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>매출 추이</div>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={orderStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={(value) => (value / 10000).toFixed(0) + "만"} />
            <Tooltip formatter={(value: number) => krw(value)} />
            <Line type="monotone" dataKey="revenue" stroke={C.gold} strokeWidth={2} dot={false} name="매출" />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>신규 가입자</div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={signupStats}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.border} />
            <XAxis dataKey="day" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} />
            <Tooltip />
            <Bar dataKey="signupCount" fill={C.blue} name="가입자" />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div style={{ background: C.white, borderRadius: "12px", padding: "20px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>사업자 인증 현황</div>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={[
                { name: "대기", value: verificationStats?.pending ?? 0 },
                { name: "승인", value: verificationStats?.approved ?? 0 },
                { name: "반려", value: verificationStats?.rejected ?? 0 },
              ]}
              cx="50%"
              cy="50%"
              outerRadius={70}
              dataKey="value"
              label={({ name, value }) => `${name}: ${value}`}
            >
              {colors.map((color, index) => (
                <Cell key={index} fill={color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
