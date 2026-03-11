import {
  boolean,
  decimal,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  phone: varchar("phone", { length: 30 }),
  /** 'user' = 일반, 'admin' = 관리자 */
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  /** consumer | professional | membership */
  memberRole: mysqlEnum("memberRole", ["consumer", "professional", "membership"])
    .default("consumer")
    .notNull(),
  /** 멤버십 할인율 (%) - membership 등급 전용, null이면 기본값 사용 */
  membershipDiscountRate: int("membershipDiscountRate").default(0).notNull(),
  /** none | pending | approved | rejected */
  proVerificationStatus: mysqlEnum("proVerificationStatus", [
    "none",
    "pending",
    "approved",
    "rejected",
  ])
    .default("none")
    .notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
  /** 이메일/비밀번호 로그인 시 bcrypt 해시 */
  passwordHash: varchar("passwordHash", { length: 255 }),
  /** 이메일 인증 여부 */
  emailVerified: boolean("emailVerified").default(false).notNull(),
  /** 비밀번호 재설정 토큰 */
  resetToken: varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt: timestamp("resetTokenExpiresAt"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ─── Business Verifications ───────────────────────────────────────────────────
export const businessVerifications = mysqlTable("business_verifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  businessNumber: varchar("businessNumber", { length: 30 }).notNull(),
  businessName: varchar("businessName", { length: 200 }).notNull(),
  contactPhone: varchar("contactPhone", { length: 30 }),
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  fileName: varchar("fileName", { length: 300 }),
  status: mysqlEnum("status", ["none", "pending", "approved", "rejected"])
    .default("pending")
    .notNull(),
  rejectReason: text("rejectReason"),
  submittedAt: timestamp("submittedAt").defaultNow().notNull(),
  reviewedAt: timestamp("reviewedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessVerification = typeof businessVerifications.$inferSelect;
export type InsertBusinessVerification = typeof businessVerifications.$inferInsert;

// ─── Products ─────────────────────────────────────────────────────────────────
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  description: text("description"),
  priceConsumer: decimal("priceConsumer", { precision: 12, scale: 0 }).notNull(),
  pricePro: decimal("pricePro", { precision: 12, scale: 0 }).notNull(),
  priceMembership: decimal("priceMembership", { precision: 12, scale: 0 }),
  isProOnly: boolean("isProOnly").default(false).notNull(),
  stock: int("stock").default(999).notNull(),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  visible: boolean("visible").default(true).notNull(),
  // 카페24 스타일 추가 필드
  productCode: varchar("productCode", { length: 50 }),
  productStatus: mysqlEnum("productStatus", ["new", "used", "refurbished"]).default("new"),
  summaryDescription: varchar("summaryDescription", { length: 255 }),
  shortDescription: text("shortDescription"),
  priceSupply: decimal("priceSupply", { precision: 12, scale: 0 }),
  priceConsumerOriginal: decimal("priceConsumerOriginal", { precision: 12, scale: 0 }),
  taxType: mysqlEnum("taxType", ["taxable", "tax_free", "exempt"]).default("taxable"),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).default("10.00"),
  shippingType: mysqlEnum("shippingType", ["direct", "warehouse", "other"]).default("direct"),
  weight: decimal("weight", { precision: 8, scale: 2 }).default("1.00"),
  manufacturer: varchar("manufacturer", { length: 100 }),
  brand: varchar("brand", { length: 100 }),
  origin: varchar("origin", { length: 100 }),
  seoTitle: varchar("seoTitle", { length: 200 }),
  seoDescription: text("seoDescription"),
  seoKeywords: varchar("seoKeywords", { length: 500 }),
  seoImageAlt: varchar("seoImageAlt", { length: 200 }),
  adminMemo: text("adminMemo"),
  // 동적 상세페이지 콘텐츠 필드
  features: text("features"),           // JSON string: [{icon, title, desc}]
  howToUse: text("howToUse"),            // 사용법 텍스트
  ingredients: text("ingredients"),      // 성분 텍스트
  thumbnailUrl: text("thumbnailUrl"),
  detailPageUrl: varchar("detailPageUrl", { length: 500 }),
  sortOrder: int("sortOrder").default(0),
  isRecommended: boolean("isRecommended").default(false).notNull(),
  isNew: boolean("isNew").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─── Design Files (파일업로더) ────────────────────────────────────────────────
export const designFiles = mysqlTable("design_files", {
  id: int("id").autoincrement().primaryKey(),
  fileName: varchar("fileName", { length: 300 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"),
  folder: varchar("folder", { length: 200 }).default("ROOT"),
  uploadedBy: int("uploadedBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DesignFile = typeof designFiles.$inferSelect;
export type InsertDesignFile = typeof designFiles.$inferInsert;

// ─── Design Folders ───────────────────────────────────────────────────────────
export const designFolders = mysqlTable("design_folders", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 200 }).notNull(),
  parentId: int("parentId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type DesignFolder = typeof designFolders.$inferSelect;

// ─── Orders ───────────────────────────────────────────────────────────────────
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  orderId: varchar("orderId", { length: 100 }).notNull().unique(),
  userId: int("userId")
    .notNull()
    .references(() => users.id),
  userRoleSnapshot: mysqlEnum("userRoleSnapshot", ["consumer", "professional"]).notNull(),
  proStatusSnapshot: mysqlEnum("proStatusSnapshot", ["none", "pending", "approved", "rejected"]).notNull(),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 0 }).notNull(),
  /**
   * 결제 상태: created(주문생성) | paid(결제완료) | failed(결제실패) | cancelled(취소)
   */
  status: mysqlEnum("status", ["created", "paid", "failed", "cancelled"])
    .default("created")
    .notNull(),
  /**
   * 배송 상태 (3PL 연동 포함)
   * pending_payment  : 입금전 (무통장 입금 대기)
   * ready            : 배송 준비중 (결제완료, 출고 전)
   * hold             : 배송 대기 (출고 보류)
   * shipping         : 배송 중 (송장번호 발급됨)
   * delivered        : 배송 완료
   * none             : 해당없음 (결제실패/취소)
   */
  shippingStatus: mysqlEnum("shippingStatus", [
    "pending_payment",
    "ready",
    "hold",
    "shipping",
    "delivered",
    "none",
  ])
    .default("none")
    .notNull(),
  /** 택배사 코드 (예: LOTTE, CJ, HANJIN, LOGEN, POST) */
  courierCode: varchar("courierCode", { length: 50 }),
  /** 택배사 이름 */
  courierName: varchar("courierName", { length: 100 }),
  /** 송장번호 */
  trackingNumber: varchar("trackingNumber", { length: 100 }),
  /** 배송 시작일 */
  shippedAt: timestamp("shippedAt"),
  /** 배송 완료일 */
  deliveredAt: timestamp("deliveredAt"),
  /** 수령인 이름 */
  recipientName: varchar("recipientName", { length: 100 }),
  /** 수령인 전화번호 */
  recipientPhone: varchar("recipientPhone", { length: 30 }),
  /** 배송지 주소 */
  shippingAddress: text("shippingAddress"),
  /** 배송지 상세주소 */
  shippingAddressDetail: text("shippingAddressDetail"),
  /** 배송지 우편번호 */
  shippingZipCode: varchar("shippingZipCode", { length: 10 }),
  /** 배송 메모 */
  shippingMemo: text("shippingMemo"),
  /** 3PL 외부 주문 ID (3PL 시스템에서 발급) */
  externalOrderId: varchar("externalOrderId", { length: 200 }),
  /** 3PL 연동 상태: none | synced | error */
  thirdPartyStatus: mysqlEnum("thirdPartyStatus", ["none", "synced", "error"])
    .default("none")
    .notNull(),
  /** 3PL 마지막 동기화 시각 */
  thirdPartySyncedAt: timestamp("thirdPartySyncedAt"),
  /** 관리자 메모 */
  adminMemo: text("adminMemo"),
  paymentKey: varchar("paymentKey", { length: 200 }),
  paymentMethod: varchar("paymentMethod", { length: 50 }),
  paidAt: timestamp("paidAt"),
  orderName: varchar("orderName", { length: 300 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─── Order Items ──────────────────────────────────────────────────────────────
export const orderItems = mysqlTable("order_items", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId")
    .notNull()
    .references(() => orders.id),
  productId: int("productId")
    .notNull()
    .references(() => products.id),
  productName: varchar("productName", { length: 200 }).notNull(),
  quantity: int("quantity").notNull(),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 0 }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 0 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─── Admin Audit Log ─────────────────────────────────────────────────────────────────
export const adminAuditLogs = mysqlTable("admin_audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  adminUserId: int("adminUserId").notNull().references(() => users.id),
  actionType: varchar("actionType", { length: 100 }).notNull(),
  // e.g. APPROVE_PRO, REJECT_PRO, UPDATE_PRODUCT_PRICE, TOGGLE_PRODUCT_VISIBILITY
  targetType: varchar("targetType", { length: 50 }).notNull(),
  // user | pro_verification | product | order
  targetId: int("targetId").notNull(),
  before: text("before"),  // JSON string
  after: text("after"),   // JSON string
  note: text("note"),     // optional human note
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// ─── Gallery Posts ────────────────────────────────────────────────────────────
export const galleryPosts = mysqlTable("gallery_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  content: text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished: boolean("isPublished").default(true).notNull(),
  authorId: int("authorId").references(() => users.id),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GalleryPost = typeof galleryPosts.$inferSelect;
export type InsertGalleryPost = typeof galleryPosts.$inferInsert;

// ─── Magazine Posts ───────────────────────────────────────────────────────────
export const magazinePosts = mysqlTable("magazine_posts", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  subtitle: varchar("subtitle", { length: 500 }),
  content: text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished: boolean("isPublished").default(true).notNull(),
  authorId: int("authorId").references(() => users.id),
  viewCount: int("viewCount").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MagazinePost = typeof magazinePosts.$inferSelect;
export type InsertMagazinePost = typeof magazinePosts.$inferInsert;

// ─── Post Images ──────────────────────────────────────────────────────────────
export const postImages = mysqlTable("post_images", {
  id: int("id").autoincrement().primaryKey(),
  postType: mysqlEnum("postType", ["gallery", "magazine"]).notNull(),
  postId: int("postId").notNull(),
  imageUrl: text("imageUrl").notNull(),
  imageKey: text("imageKey").notNull(),
  fileName: varchar("fileName", { length: 300 }),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PostImage = typeof postImages.$inferSelect;
export type InsertPostImage = typeof postImages.$inferInsert;

// ─── Popups ───────────────────────────────────────────────────────────────────
export const popups = mysqlTable("popups", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 300 }).notNull(),
  popupType: mysqlEnum("popupType", ["pc", "mobile", "both"]).default("both").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  imageUrl: text("imageUrl"),
  imageKey: text("imageKey"),
  linkUrl: text("linkUrl"),
  linkTarget: mysqlEnum("linkTarget", ["_self", "_blank"]).default("_blank").notNull(),
  displayPosition: varchar("displayPosition", { length: 100 }).default("main").notNull(),
  bottomText: mysqlEnum("bottomText", ["today", "week", "none"]).default("today").notNull(),
  startAt: timestamp("startAt"),
  endAt: timestamp("endAt"),
  clickCount: int("clickCount").default(0).notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Popup = typeof popups.$inferSelect;
export type InsertPopup = typeof popups.$inferInsert;

// ─── Page Views (접속 통계) ───────────────────────────────────────────────────
export const pageViews = mysqlTable("page_views", {
  id: int("id").autoincrement().primaryKey(),
  path: varchar("path", { length: 500 }).notNull(),
  deviceType: mysqlEnum("deviceType", ["pc", "mobile", "tablet"]).default("pc").notNull(),
  sessionId: varchar("sessionId", { length: 128 }),
  userId: int("userId").references(() => users.id),
  referrer: text("referrer"),
  userAgent: text("userAgent"),
  duration: int("duration"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;
// ─── Order Cancellations (취소 관리) ──────────────────────────────────────────
export const orderCancellations = mysqlTable("order_cancellations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  orderItemId: int("orderItemId").references(() => orderItems.id),
  /** 취소 구분: buyer(구매자), admin(관리자) */
  requestedBy: mysqlEnum("requestedBy", ["buyer", "admin"]).default("buyer").notNull(),
  reason: text("reason"),
  /** 취소 상태: requested(취소신청) | processing(취소처리중) | completed(취소완료) | rejected(접수거부/철회) */
  status: mysqlEnum("status", ["requested", "processing", "completed", "rejected"])
    .default("requested")
    .notNull(),
  /** 취소 유형: pre_payment(입금전취소) | post_payment(결제후취소) */
  cancelType: mysqlEnum("cancelType", ["pre_payment", "post_payment"])
    .default("post_payment")
    .notNull(),
  quantity: int("quantity"),
  cancelAmount: decimal("cancelAmount", { precision: 12, scale: 0 }),
  adminNote: text("adminNote"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderCancellation = typeof orderCancellations.$inferSelect;
export type InsertOrderCancellation = typeof orderCancellations.$inferInsert;

// ─── Order Exchanges (교환 관리) ──────────────────────────────────────────────
export const orderExchanges = mysqlTable("order_exchanges", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  orderItemId: int("orderItemId").references(() => orderItems.id),
  reason: text("reason"),
  /** 교환 상태: requested(교환신청) | processing(교환처리중) | ready(교환준비/보류) | completed(교환완료) | rejected(접수거부/철회) */
  status: mysqlEnum("status", ["requested", "processing", "ready", "completed", "rejected"])
    .default("requested")
    .notNull(),
  quantity: int("quantity"),
  /** 수거 송장번호 */
  returnTrackingNumber: varchar("returnTrackingNumber", { length: 100 }),
  returnCourierName: varchar("returnCourierName", { length: 100 }),
  /** 재발송 송장번호 */
  reshipTrackingNumber: varchar("reshipTrackingNumber", { length: 100 }),
  reshipCourierName: varchar("reshipCourierName", { length: 100 }),
  adminNote: text("adminNote"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderExchange = typeof orderExchanges.$inferSelect;
export type InsertOrderExchange = typeof orderExchanges.$inferInsert;

// ─── Order Returns (반품 관리) ────────────────────────────────────────────────
export const orderReturns = mysqlTable("order_returns", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  orderItemId: int("orderItemId").references(() => orderItems.id),
  reason: text("reason"),
  /** 반품 상태: requested(반품신청) | processing(반품처리중) | hold(반품보류) | completed(반품완료) | rejected(접수거부/철회) */
  status: mysqlEnum("status", ["requested", "processing", "hold", "completed", "rejected"])
    .default("requested")
    .notNull(),
  quantity: int("quantity"),
  /** 수거 송장번호 */
  returnTrackingNumber: varchar("returnTrackingNumber", { length: 100 }),
  returnCourierName: varchar("returnCourierName", { length: 100 }),
  adminNote: text("adminNote"),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderReturn = typeof orderReturns.$inferSelect;
export type InsertOrderReturn = typeof orderReturns.$inferInsert;

// ─── Order Refunds (환불 관리) ────────────────────────────────────────────────
export const orderRefunds = mysqlTable("order_refunds", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  /** 연결된 취소/반품 ID */
  cancellationId: int("cancellationId").references(() => orderCancellations.id),
  returnId: int("returnId").references(() => orderReturns.id),
  /** 환불 수단: card(신용카드) | bank(계좌이체) | point(적립금) | deposit(예치금) | mixed(복합) */
  refundMethod: mysqlEnum("refundMethod", ["card", "bank", "point", "deposit", "mixed"])
    .default("card")
    .notNull(),
  refundAmount: decimal("refundAmount", { precision: 12, scale: 0 }).notNull(),
  /** 환불 은행 */
  refundBank: varchar("refundBank", { length: 50 }),
  /** 환불 계좌번호 */
  refundAccount: varchar("refundAccount", { length: 50 }),
  /** 환불 예금주 */
  refundAccountHolder: varchar("refundAccountHolder", { length: 100 }),
  /** 환불 상태: pending(환불전) | completed(환불완료) | hold(환불보류) | rejected(환불철회) */
  status: mysqlEnum("status", ["pending", "completed", "hold", "rejected"])
    .default("pending")
    .notNull(),
  /** 환불 구분: full(전체환불) | partial(부분환불) */
  refundType: mysqlEnum("refundType", ["full", "partial"]).default("full").notNull(),
  adminNote: text("adminNote"),
  processedBy: int("processedBy").references(() => users.id),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrderRefund = typeof orderRefunds.$inferSelect;
export type InsertOrderRefund = typeof orderRefunds.$inferInsert;

// ─── Card Cancellations (카드 취소 조회) ─────────────────────────────────────
export const cardCancellations = mysqlTable("card_cancellations", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull().references(() => orders.id),
  paymentKey: varchar("paymentKey", { length: 200 }),
  /** PG사 거래 ID */
  tid: varchar("tid", { length: 200 }),
  cancelAmount: decimal("cancelAmount", { precision: 12, scale: 0 }).notNull(),
  /** 취소 구분: full(전체취소) | partial(부분취소) */
  cancelType: mysqlEnum("cancelType", ["full", "partial"]).default("full").notNull(),
  /** 처리자 */
  processedBy: varchar("processedBy", { length: 100 }),
  adminNote: text("adminNote"),
  cancelledAt: timestamp("cancelledAt").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CardCancellation = typeof cardCancellations.$inferSelect;
export type InsertCardCancellation = typeof cardCancellations.$inferInsert;

// ─── 3PL Webhook Logs (3PL 연동 로그) ────────────────────────────────────────
export const thirdPartyLogs = mysqlTable("third_party_logs", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").references(() => orders.id),
  /** 이벤트 타입: order_created | tracking_updated | delivered | error */
  eventType: varchar("eventType", { length: 100 }).notNull(),
  /** 3PL 제공자 이름 */
  provider: varchar("provider", { length: 100 }),
  /** 원본 페이로드 JSON */
  payload: text("payload"),
  /** 처리 결과: success | failed | skipped */
  result: mysqlEnum("result", ["success", "failed", "skipped"]).default("success").notNull(),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ThirdPartyLog = typeof thirdPartyLogs.$inferSelect;
export type InsertThirdPartyLog = typeof thirdPartyLogs.$inferInsert;

// ─── Reviews (후기 관리) ──────────────────────────────────────────────────────
export const reviews = mysqlTable("reviews", {
  id: int("id").autoincrement().primaryKey(),
  /** 카테고리: before_after | device | education | event | etc */
  category: mysqlEnum("category", [
    "before_after",
    "device",
    "education",
    "event",
    "etc",
  ])
    .default("etc")
    .notNull(),
  /** 카테고리 표시명 (자유 입력 가능) */
  categoryLabel: varchar("categoryLabel", { length: 100 }),
  /** 이미지 S3 URL */
  imageUrl: text("imageUrl").notNull(),
  /** 이미지 S3 Key */
  imageKey: varchar("imageKey", { length: 500 }),
  /** 제목 또는 설명 */
  title: varchar("title", { length: 200 }),
  /** 추가 설명 */
  description: text("description"),
  /** 정렬 순서 */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** 공개 여부 */
  isPublished: boolean("isPublished").default(true).notNull(),
  /** 등록자 */
  authorId: int("authorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─── Certified Instructors (인증강사 갤러리) ──────────────────────────────────
export const certifiedInstructors = mysqlTable("certified_instructors", {
  id: int("id").autoincrement().primaryKey(),
  /** 이미지 S3 URL */
  imageUrl: text("imageUrl").notNull(),
  /** 이미지 S3 Key */
  imageKey: varchar("imageKey", { length: 500 }),
  /** 강사 이름 또는 제목 */
  name: varchar("name", { length: 200 }),
  /** 설명 */
  description: text("description"),
  /** 정렬 순서 */
  sortOrder: int("sortOrder").default(0).notNull(),
  /** 공개 여부 */
  isPublished: boolean("isPublished").default(true).notNull(),
  /** 등록자 */
  authorId: int("authorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type CertifiedInstructor = typeof certifiedInstructors.$inferSelect;
export type InsertCertifiedInstructor = typeof certifiedInstructors.$inferInsert;

// ─── Coupons (쿠폰 관리) ─────────────────────────────────────────────────────
export const coupons = mysqlTable("coupons", {
  id: int("id").autoincrement().primaryKey(),
  /** 쿠폰 이름 */
  name: varchar("name", { length: 200 }).notNull(),
  /** 쿠폰 설명 */
  description: text("description"),
  /** 혜택구분: discount_amount(할인금액), discount_rate(할인율), point_amount(적립금액), point_rate(적립율), free_basic_shipping(기본배송비할인), free_all_shipping(전체배송비할인), instant_point(즉시적립) */
  benefitType: varchar("benefitType", { length: 50 }).notNull().default("discount_rate"),
  /** 혜택 값 (금액 또는 %) */
  benefitValue: int("benefitValue").default(0).notNull(),
  /** 발급구분: target(대상자 지정), conditional_auto(조건부 자동), customer_download(고객 다운로드), periodic_auto(정기 자동) */
  issueType: varchar("issueType", { length: 50 }).notNull().default("customer_download"),
  /** 대상 회원: all(전체), specific(특정 회원) */
  targetMember: varchar("targetMember", { length: 20 }).notNull().default("all"),
  /** 노출시점: immediate(즉시), scheduled(지정 시점) */
  displayTiming: varchar("displayTiming", { length: 20 }).notNull().default("immediate"),
  /** 노출 예정 시각 (지정 시점인 경우) */
  scheduledAt: timestamp("scheduledAt"),
  /** 사용 시작일 */
  startDate: timestamp("startDate"),
  /** 사용 종료일 */
  endDate: timestamp("endDate"),
  /** 기간 유형: fixed(기간 설정), days_from_issue(발급일로부터 N일) */
  periodType: varchar("periodType", { length: 30 }).notNull().default("fixed"),
  /** 발급일로부터 유효 일수 */
  validDays: int("validDays"),
  /** 사용 범위: PC쇼핑몰 */
  usePc: boolean("usePc").default(true).notNull(),
  /** 사용 범위: 모바일쇼핑몰 */
  useMobile: boolean("useMobile").default(true).notNull(),
  /** 적용 범위: order(주문서 쿠폰), product(상품 쿠폰) */
  applyScope: varchar("applyScope", { length: 20 }).notNull().default("order"),
  /** 쿠폰 적용 상품: all(전체상품), specific(특정상품), exclude(제외상품) */
  productScope: varchar("productScope", { length: 20 }).notNull().default("all"),
  /** 사용가능 기준금액: none(제한없음), order_amount(주문금액 기준), product_amount(상품금액 기준) */
  minAmountType: varchar("minAmountType", { length: 30 }).notNull().default("none"),
  /** 최소 주문/상품 금액 */
  minAmount: int("minAmount").default(0).notNull(),
  /** 적용 계산 기준: before_discount(할인 적용 전), after_discount(할인 적용 후) */
  calcBasis: varchar("calcBasis", { length: 30 }).notNull().default("before_discount"),
  /** 동일 쿠폰 주문당 사용 가능 수 */
  maxUsagePerOrder: int("maxUsagePerOrder").default(1).notNull(),
  /** 사용가능 결제수단: none(제한없음), specific(결제수단 선택) */
  paymentMethodLimit: varchar("paymentMethodLimit", { length: 20 }).notNull().default("none"),
  /** 개별 이미지 설정: default(기본 이미지), custom(직접 업로드) */
  imageType: varchar("imageType", { length: 20 }).notNull().default("default"),
  /** 개별 이미지 URL */
  imageUrl: text("imageUrl"),
  /** 로그인 시 쿠폰 발급 알림: true=사용함 */
  notifyOnLogin: boolean("notifyOnLogin").default(false).notNull(),
  /** 쿠폰 발급 SMS 발송: true=발송함 */
  sendSms: boolean("sendSms").default(false).notNull(),
  /** 쿠폰 발급 이메일 발송: true=발송함 */
  sendEmail: boolean("sendEmail").default(false).notNull(),
  /** 상태: active(발급중), paused(발급중지), expired(만료) */
  status: varchar("status", { length: 20 }).notNull().default("active"),
  /** 총 발급 수 */
  totalIssued: int("totalIssued").default(0).notNull(),
  /** 등록자 */
  authorId: int("authorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ─── Coupon Issues (쿠폰 발급 내역) ─────────────────────────────────────────
export const couponIssues = mysqlTable("coupon_issues", {
  id: int("id").autoincrement().primaryKey(),
  /** 쿠폰 번호 (16자리 숫자) */
  couponNumber: varchar("couponNumber", { length: 30 }).notNull().unique(),
  /** 쿠폰 ID */
  couponId: int("couponId").notNull().references(() => coupons.id),
  /** 발급 대상 회원 ID */
  userId: int("userId").references(() => users.id),
  /** 사용 여부 */
  isUsed: boolean("isUsed").default(false).notNull(),
  /** 사용 일시 */
  usedAt: timestamp("usedAt"),
  /** 사용된 주문 ID */
  orderId: int("orderId"),
  /** 삭제 여부 */
  isDeleted: boolean("isDeleted").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type CouponIssue = typeof couponIssues.$inferSelect;
export type InsertCouponIssue = typeof couponIssues.$inferInsert;

// ─── Discount Codes (할인코드) ───────────────────────────────────────────────
export const discountCodes = mysqlTable("discount_codes", {
  id: int("id").autoincrement().primaryKey(),
  /** 할인코드 이름 */
  name: varchar("name", { length: 200 }).notNull(),
  /** 입력 코드 (고객이 입력하는 코드) */
  code: varchar("code", { length: 100 }).notNull().unique(),
  /** 할인율 (%) */
  discountRate: int("discountRate").default(0).notNull(),
  /** 절사단위: none(절사안함), 10(10원), 100(100원), 1000(1000원) */
  truncateUnit: int("truncateUnit").default(0).notNull(),
  /** 상품당 최대 할인금액 */
  maxDiscountPerProduct: int("maxDiscountPerProduct"),
  /** 사용 시작일 */
  startDate: timestamp("startDate"),
  /** 사용 종료일 */
  endDate: timestamp("endDate"),
  /** 적용범위: all(전체 상품), specific(특정 상품), category(특정 분류) */
  applyScope: varchar("applyScope", { length: 20 }).notNull().default("all"),
  /** 사용가능 최소 주문금액 제한: none(제한없음), limited(제한함) */
  minOrderAmountType: varchar("minOrderAmountType", { length: 20 }).notNull().default("none"),
  /** 최소 주문금액 */
  minOrderAmount: int("minOrderAmount").default(0).notNull(),
  /** 최대 사용 가능 횟수 제한: none(제한없음), limited(제한함) */
  maxUsageType: varchar("maxUsageType", { length: 20 }).notNull().default("none"),
  /** 최대 사용 횟수 */
  maxUsageCount: int("maxUsageCount"),
  /** 사용가능 대상: none(제한없음), member_only(회원만) */
  targetType: varchar("targetType", { length: 20 }).notNull().default("none"),
  /** 동일인 사용 가능 횟수 제한: none(제한없음), limited(제한함) */
  samePersonLimitType: varchar("samePersonLimitType", { length: 20 }).notNull().default("none"),
  /** 동일인 사용 가능 횟수 */
  samePersonLimitCount: int("samePersonLimitCount"),
  /** 현재 사용 횟수 */
  usedCount: int("usedCount").default(0).notNull(),
  /** 등록자 */
  authorId: int("authorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;

// ─── Remind Alerts (리마인드 Me 알림) ────────────────────────────────────────
export const remindAlerts = mysqlTable("remind_alerts", {
  id: int("id").autoincrement().primaryKey(),
  /** 알림 이름 (관리자용) */
  name: varchar("name", { length: 200 }).notNull(),
  /** 알림 유형: viewed(최근 조회 상품), purchased(구매 후 추천), cart(장바구니), wishlist(관심상품), point(적립금), coupon(쿠폰), login(로그인 유도), dormant(휴면 예정) */
  alertType: varchar("alertType", { length: 50 }).notNull().default("cart"),
  /** 사용 여부 */
  isActive: boolean("isActive").default(true).notNull(),
  /** 알림 수단: email(이메일), sms(SMS) */
  channel: varchar("channel", { length: 10 }).notNull().default("email"),
  /** 알림 기간 시작일 */
  startDate: timestamp("startDate"),
  /** 알림 기간 종료일 (null이면 기간 한없음) */
  endDate: timestamp("endDate"),
  /** 알림 주기: daily(매일), weekly(매주), monthly(매월) */
  frequency: varchar("frequency", { length: 20 }).notNull().default("weekly"),
  /** 발송 요일 (weekly인 경우, 0=일~6=토) */
  sendDayOfWeek: int("sendDayOfWeek").default(5).notNull(),
  /** 발송 시각 (0~23) */
  sendHour: int("sendHour").default(9).notNull(),
  /** 수신 대상: all(전체), dormant_N_days(N일 전 휴면 예정) */
  targetType: varchar("targetType", { length: 50 }).notNull().default("all"),
  /** 수신 대상 일수 (dormant_N_days인 경우) */
  targetDays: int("targetDays").default(30).notNull(),
  /** 수신거부 회원 발송 여부 */
  sendToOptOut: boolean("sendToOptOut").default(false).notNull(),
  /** 특별관리회원 발송 여부 */
  sendToSpecial: boolean("sendToSpecial").default(true).notNull(),
  /** 불량회원 발송 여부 */
  sendToBad: boolean("sendToBad").default(true).notNull(),
  /** 보내는 사람 이름 */
  senderName: varchar("senderName", { length: 100 }),
  /** 보내는 이메일 주소 */
  senderEmail: varchar("senderEmail", { length: 200 }),
  /** 메일 제목 */
  emailSubject: varchar("emailSubject", { length: 300 }),
  /** 메일 내용 (HTML) */
  emailBody: text("emailBody"),
  /** 혜택 설정 사용 여부 */
  benefitEnabled: boolean("benefitEnabled").default(false).notNull(),
  /** 혜택 기간 (일) */
  benefitDays: int("benefitDays").default(30).notNull(),
  /** 혜택 지급 시점: order_complete(주문완료 시), login(로그인 시) */
  benefitTrigger: varchar("benefitTrigger", { length: 30 }).notNull().default("order_complete"),
  /** 혜택 내용: coupon(쿠폰 발급) */
  benefitContent: varchar("benefitContent", { length: 30 }).notNull().default("coupon"),
  /** 연결된 쿠폰 ID */
  benefitCouponId: int("benefitCouponId").references(() => coupons.id),
  /** 총 발송 수 */
  totalSent: int("totalSent").default(0).notNull(),
  /** 등록자 */
  authorId: int("authorId").references(() => users.id),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type RemindAlert = typeof remindAlerts.$inferSelect;
export type InsertRemindAlert = typeof remindAlerts.$inferInsert;
