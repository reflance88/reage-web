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
  /** consumer | professional */
  memberRole: mysqlEnum("memberRole", ["consumer", "professional"])
    .default("consumer")
    .notNull(),
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
  isProOnly: boolean("isProOnly").default(false).notNull(),
  stock: int("stock").default(999).notNull(),
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  visible: boolean("visible").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

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
