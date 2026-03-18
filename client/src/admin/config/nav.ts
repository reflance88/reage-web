export type AdminNavChild = {
  id: string;
  label: string;
};

export type AdminNavItem = {
  id: string;
  label: string;
  children?: AdminNavChild[];
};

export const ADMIN_NAV: AdminNavItem[] = [
  {
    id: "dashboard",
    label: "대시보드",
  },
  {
    id: "order",
    label: "주문",
    children: [
      { id: "order-dashboard", label: "주문 대시보드" },
      { id: "order-all", label: "전체 주문 조회" },
      { id: "order-unpaid", label: "입금전 관리" },
      { id: "order-preparing", label: "배송 준비중 관리" },
      { id: "order-waiting", label: "배송 대기 관리" },
      { id: "order-shipping", label: "배송 중 관리" },
      { id: "order-done", label: "배송 완료 조회" },
      { id: "order-cancel-pre", label: "입금전 취소 관리" },
      { id: "order-cancel", label: "취소 관리" },
      { id: "order-exchange", label: "교환 관리" },
      { id: "order-return", label: "반품 관리" },
      { id: "order-refund", label: "환불 관리" },
      { id: "order-card-cancel", label: "카드 취소 조회" },
      { id: "order-admin-refund", label: "관리자 환불 관리" },
    ],
  },
  {
    id: "product",
    label: "상품",
    children: [
      { id: "product-dashboard", label: "상품 대시보드" },
      { id: "product-list", label: "상품 목록" },
      { id: "product-register", label: "상품 등록" },
      { id: "product-manage", label: "상품 관리" },
      { id: "product-category", label: "분류 관리" },
      { id: "product-stock", label: "재고 관리" },
    ],
  },
  {
    id: "customer",
    label: "고객",
    children: [
      { id: "customer-dashboard", label: "고객 대시보드" },
      { id: "customer-search", label: "회원 조회" },
      { id: "customer-manage", label: "회원 관리" },
      { id: "customer-verification", label: "사업자 인증" },
      { id: "customer-membership", label: "멤버십 관리" },
      { id: "customer-inquiry", label: "문의 관리" },
    ],
  },
  {
    id: "board",
    label: "게시판",
    children: [
      { id: "board-dashboard", label: "게시판 대시보드" },
      { id: "board-review", label: "후기 관리" },
      { id: "board-gallery", label: "갤러리 관리" },
      { id: "board-instructor", label: "인증강사 관리" },
      { id: "board-magazine", label: "매거진 관리" },
    ],
  },
  {
    id: "promotion",
    label: "프로모션",
    children: [
      { id: "promotion-dashboard", label: "프로모션 대시보드" },
      { id: "promotion-coupon-create", label: "쿠폰 만들기" },
      { id: "promotion-coupon-list", label: "쿠폰 발급/조회" },
      { id: "promotion-discount-create", label: "할인코드 등록" },
      { id: "promotion-discount-list", label: "할인코드 조회" },
      { id: "promotion-remind", label: "리마인드 Me" },
    ],
  },
  {
    id: "stats",
    label: "통계",
    children: [
      { id: "stats-dashboard", label: "통계 대시보드" },
      { id: "stats-inquiry", label: "문의 통계" },
      { id: "stats-sales", label: "매출 분석" },
      { id: "stats-product", label: "상품 분석" },
      { id: "stats-customer", label: "고객 분석" },
      { id: "stats-access", label: "접속 통계" },
    ],
  },
  {
    id: "popup",
    label: "팝업",
    children: [
      { id: "popup-list", label: "팝업 목록" },
      { id: "popup-register", label: "팝업 등록" },
    ],
  },
  {
    id: "design",
    label: "디자인",
    children: [
      { id: "design-dashboard", label: "디자인 대시보드" },
      { id: "design-library", label: "디자인 보관함" },
      { id: "design-add", label: "디자인 추가" },
      { id: "design-files", label: "파일업로더" },
    ],
  },
];
