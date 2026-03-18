import { AdminGuard } from "@/admin/app/AdminGuard";
import { AdminLayout } from "@/admin/app/AdminLayout";
import { AdminSidebar } from "@/admin/app/AdminSidebar";
import { Suspense, lazy, startTransition, useState } from "react";

const AdminBoardSection = lazy(() =>
  import("@/admin/features/board/BoardSection").then((module) => ({ default: module.BoardSection })),
);
const AdminCustomerSection = lazy(() =>
  import("@/admin/features/customers/CustomerSection").then((module) => ({ default: module.CustomerSection })),
);
const AdminDashboardSection = lazy(() =>
  import("@/admin/features/dashboard/DashboardSection").then((module) => ({ default: module.DashboardSection })),
);
const AdminDesignSection = lazy(() =>
  import("@/admin/features/design/DesignSection").then((module) => ({ default: module.DesignSection })),
);
const AdminOrderSection = lazy(() =>
  import("@/admin/features/orders/OrderSection").then((module) => ({ default: module.OrderSection })),
);
const AdminPopupSection = lazy(() =>
  import("@/admin/features/popup/PopupSection").then((module) => ({ default: module.PopupSection })),
);
const AdminProductSection = lazy(() =>
  import("@/admin/features/products/ProductSection").then((module) => ({ default: module.ProductSection })),
);
const AdminStatsSection = lazy(() =>
  import("@/admin/features/stats/StatsSection").then((module) => ({ default: module.StatsSection })),
);
const PromotionSection = lazy(() => import("./PromotionSection"));

function AdminSectionLoading() {
  return (
    <div
      style={{
        minHeight: "320px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "16px",
        background: "#fff",
        border: "1px solid #E7E1DA",
        color: "#7A6F63",
        fontSize: "14px",
        fontWeight: 600,
      }}
    >
      관리자 화면을 불러오는 중...
    </div>
  );
}

export default function AdminPage() {
  const [activePage, setActivePage] = useState("dashboard");
  const [orderInitialFilter, setOrderInitialFilter] = useState<string | undefined>(undefined);

  const navigateTo = (page: string, opts?: { statusFilter?: string }) => {
    startTransition(() => {
      if (opts?.statusFilter !== undefined) setOrderInitialFilter(opts.statusFilter);
      else setOrderInitialFilter(undefined);
      setActivePage(page);
    });
  };

  const renderContent = () => {
    if (activePage === "dashboard") return <AdminDashboardSection />;
    if (activePage.startsWith("order-") || activePage === "order") {
      return <AdminOrderSection subPage={activePage} onNavigate={(page, opts) => navigateTo(page, opts)} initialStatusFilter={orderInitialFilter} />;
    }
    if (activePage.startsWith("product-") || activePage === "product") return <AdminProductSection subPage={activePage} />;
    if (activePage.startsWith("customer-") || activePage === "customer") return <AdminCustomerSection subPage={activePage} />;
    if (activePage.startsWith("board-") || activePage === "board") return <AdminBoardSection subPage={activePage} />;
    if (activePage.startsWith("stats-") || activePage === "stats") return <AdminStatsSection subPage={activePage} />;
    if (activePage.startsWith("popup-") || activePage === "popup") return <AdminPopupSection subPage={activePage} onNavigate={setActivePage} />;
    if (activePage.startsWith("promotion-") || activePage === "promotion") return <PromotionSection subPage={activePage} onNavigate={setActivePage} />;
    if (activePage.startsWith("design-") || activePage === "design") return <AdminDesignSection subPage={activePage} />;
    return <AdminDashboardSection />;
  };

  return (
    <AdminGuard>
      <AdminLayout sidebar={<AdminSidebar active={activePage} onSelect={(page) => navigateTo(page)} />}>
        <Suspense fallback={<AdminSectionLoading />}>{renderContent()}</Suspense>
      </AdminLayout>
    </AdminGuard>
  );
}
