/**
 * Supabase(PostgreSQL) 전용 Drizzle 스키마
 *
 * - 현재 Manus 환경의 MySQL 스키마(schema.ts)는 그대로 유지됩니다.
 * - 자체 서버 이전 시 이 파일을 기반으로 Supabase에 마이그레이션합니다.
 * - drizzle-pg.config.ts 와 함께 사용합니다.
 */

import {
  pgTable,
  pgEnum,
  serial,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  numeric,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─────────────────────────────────────────────
// ENUM 타입 정의
// ─────────────────────────────────────────────

export const userRoleEnum = pgEnum("user_role", ["user", "admin"]);
export const memberRoleEnum = pgEnum("member_role", ["consumer", "professional", "membership"]);
export const proVerificationStatusEnum = pgEnum("pro_verification_status", ["none", "pending", "approved", "rejected"]);
export const verificationStatusEnum = pgEnum("verification_status", ["none", "pending", "approved", "rejected"]);
export const orderStatusEnum = pgEnum("order_status", ["created", "paid", "failed", "cancelled"]);
export const shippingStatusEnum = pgEnum("shipping_status", ["pending_payment", "ready", "hold", "shipping", "delivered", "none"]);
export const thirdPartyStatusEnum = pgEnum("third_party_status", ["none", "synced", "error"]);
export const userRoleSnapshotEnum = pgEnum("user_role_snapshot", ["consumer", "professional"]);
export const proStatusSnapshotEnum = pgEnum("pro_status_snapshot", ["none", "pending", "approved", "rejected"]);
export const cancellationRequestedByEnum = pgEnum("cancellation_requested_by", ["buyer", "admin"]);
export const cancellationStatusEnum = pgEnum("cancellation_status", ["requested", "processing", "completed", "rejected"]);
export const cancelTypeEnum = pgEnum("cancel_type", ["pre_payment", "post_payment"]);
export const exchangeStatusEnum = pgEnum("exchange_status", ["requested", "processing", "ready", "completed", "rejected"]);
export const returnStatusEnum = pgEnum("return_status", ["requested", "processing", "hold", "completed", "rejected"]);
export const refundMethodEnum = pgEnum("refund_method", ["card", "bank", "point", "deposit", "mixed"]);
export const refundStatusEnum = pgEnum("refund_status", ["pending", "completed", "hold", "rejected"]);
export const refundTypeEnum = pgEnum("refund_type", ["full", "partial"]);
export const cardCancelTypeEnum = pgEnum("card_cancel_type", ["full", "partial"]);
export const thirdPartyResultEnum = pgEnum("third_party_result", ["success", "failed", "skipped"]);
export const postTypeEnum = pgEnum("post_type", ["gallery", "magazine"]);
export const popupTypeEnum = pgEnum("popup_type", ["pc", "mobile", "both"]);
export const linkTargetEnum = pgEnum("link_target", ["_self", "_blank"]);
export const bottomTextEnum = pgEnum("bottom_text", ["today", "week", "none"]);
export const deviceTypeEnum = pgEnum("device_type", ["pc", "mobile", "tablet"]);
export const reviewCategoryEnum = pgEnum("review_category", ["before_after", "device", "education", "event", "etc"]);

// ─────────────────────────────────────────────
// 1. users (회원)
// ─────────────────────────────────────────────
export const users = pgTable("users", {
  id:                      serial("id").primaryKey(),
  openId:                  varchar("openId", { length: 64 }).notNull().unique(),
  name:                    text("name"),
  email:                   varchar("email", { length: 320 }),
  loginMethod:             varchar("loginMethod", { length: 64 }),
  phone:                   varchar("phone", { length: 30 }),
  role:                    userRoleEnum("role").notNull().default("user"),
  memberRole:              memberRoleEnum("memberRole").notNull().default("consumer"),
  membershipDiscountRate:  integer("membershipDiscountRate").notNull().default(0),
  proVerificationStatus:   proVerificationStatusEnum("proVerificationStatus").notNull().default("none"),
  passwordHash:            varchar("passwordHash", { length: 255 }),
  emailVerified:           boolean("emailVerified").notNull().default(false),
  resetToken:              varchar("resetToken", { length: 128 }),
  resetTokenExpiresAt:     timestamp("resetTokenExpiresAt", { withTimezone: true }),
  lastSignedIn:            timestamp("lastSignedIn", { withTimezone: true }).notNull().defaultNow(),
  createdAt:               timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:               timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 2. business_verifications (사업자 인증)
// ─────────────────────────────────────────────
export const businessVerifications = pgTable("business_verifications", {
  id:             serial("id").primaryKey(),
  userId:         integer("userId").notNull().references(() => users.id),
  businessNumber: varchar("businessNumber", { length: 30 }).notNull(),
  businessName:   varchar("businessName", { length: 200 }).notNull(),
  contactPhone:   varchar("contactPhone", { length: 30 }),
  fileUrl:        text("fileUrl").notNull(),
  fileKey:        text("fileKey").notNull(),
  fileName:       varchar("fileName", { length: 300 }),
  status:         verificationStatusEnum("status").notNull().default("pending"),
  rejectReason:   text("rejectReason"),
  submittedAt:    timestamp("submittedAt", { withTimezone: true }).notNull().defaultNow(),
  reviewedAt:     timestamp("reviewedAt", { withTimezone: true }),
  createdAt:      timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:      timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 3. products (상품)
// ─────────────────────────────────────────────
export const products = pgTable("products", {
  id:            serial("id").primaryKey(),
  slug:          varchar("slug", { length: 100 }).notNull().unique(),
  name:          varchar("name", { length: 200 }).notNull(),
  description:   text("description"),
  priceConsumer: numeric("priceConsumer", { precision: 12, scale: 0 }).notNull(),
  pricePro:      numeric("pricePro", { precision: 12, scale: 0 }).notNull(),
  isProOnly:     boolean("isProOnly").notNull().default(false),
  stock:         integer("stock").notNull().default(999),
  imageUrl:      text("imageUrl"),
  isActive:      boolean("isActive").notNull().default(true),
  visible:       boolean("visible").notNull().default(true),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 4. orders (주문)
// ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id:                   serial("id").primaryKey(),
  orderId:              varchar("orderId", { length: 100 }).notNull().unique(),
  userId:               integer("userId").notNull().references(() => users.id),
  userRoleSnapshot:     userRoleSnapshotEnum("userRoleSnapshot").notNull(),
  proStatusSnapshot:    proStatusSnapshotEnum("proStatusSnapshot").notNull(),
  totalAmount:          numeric("totalAmount", { precision: 12, scale: 0 }).notNull(),
  status:               orderStatusEnum("status").notNull().default("created"),
  shippingStatus:       shippingStatusEnum("shippingStatus").notNull().default("none"),
  courierCode:          varchar("courierCode", { length: 50 }),
  courierName:          varchar("courierName", { length: 100 }),
  trackingNumber:       varchar("trackingNumber", { length: 100 }),
  shippedAt:            timestamp("shippedAt", { withTimezone: true }),
  deliveredAt:          timestamp("deliveredAt", { withTimezone: true }),
  recipientName:        varchar("recipientName", { length: 100 }),
  recipientPhone:       varchar("recipientPhone", { length: 30 }),
  shippingAddress:      text("shippingAddress"),
  shippingAddressDetail: text("shippingAddressDetail"),
  shippingZipCode:      varchar("shippingZipCode", { length: 10 }),
  shippingMemo:         text("shippingMemo"),
  externalOrderId:      varchar("externalOrderId", { length: 200 }),
  thirdPartyStatus:     thirdPartyStatusEnum("thirdPartyStatus").notNull().default("none"),
  thirdPartySyncedAt:   timestamp("thirdPartySyncedAt", { withTimezone: true }),
  adminMemo:            text("adminMemo"),
  paymentKey:           varchar("paymentKey", { length: 200 }),
  paymentMethod:        varchar("paymentMethod", { length: 50 }),
  paidAt:               timestamp("paidAt", { withTimezone: true }),
  orderName:            varchar("orderName", { length: 300 }),
  createdAt:            timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 5. order_items (주문 상품)
// ─────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id:          serial("id").primaryKey(),
  orderId:     integer("orderId").notNull().references(() => orders.id),
  productId:   integer("productId").notNull().references(() => products.id),
  productName: varchar("productName", { length: 200 }).notNull(),
  quantity:    integer("quantity").notNull(),
  unitPrice:   numeric("unitPrice", { precision: 12, scale: 0 }).notNull(),
  subtotal:    numeric("subtotal", { precision: 12, scale: 0 }).notNull(),
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 6. order_cancellations (취소 관리)
// ─────────────────────────────────────────────
export const orderCancellations = pgTable("order_cancellations", {
  id:           serial("id").primaryKey(),
  orderId:      integer("orderId").notNull().references(() => orders.id),
  orderItemId:  integer("orderItemId").references(() => orderItems.id),
  requestedBy:  cancellationRequestedByEnum("requestedBy").notNull().default("buyer"),
  reason:       text("reason"),
  status:       cancellationStatusEnum("status").notNull().default("requested"),
  cancelType:   cancelTypeEnum("cancelType").notNull().default("post_payment"),
  quantity:     integer("quantity"),
  cancelAmount: numeric("cancelAmount", { precision: 12, scale: 0 }),
  adminNote:    text("adminNote"),
  processedAt:  timestamp("processedAt", { withTimezone: true }),
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:    timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 7. order_exchanges (교환 관리)
// ─────────────────────────────────────────────
export const orderExchanges = pgTable("order_exchanges", {
  id:                    serial("id").primaryKey(),
  orderId:               integer("orderId").notNull().references(() => orders.id),
  orderItemId:           integer("orderItemId").references(() => orderItems.id),
  reason:                text("reason"),
  status:                exchangeStatusEnum("status").notNull().default("requested"),
  quantity:              integer("quantity"),
  returnTrackingNumber:  varchar("returnTrackingNumber", { length: 100 }),
  returnCourierName:     varchar("returnCourierName", { length: 100 }),
  reshipTrackingNumber:  varchar("reshipTrackingNumber", { length: 100 }),
  reshipCourierName:     varchar("reshipCourierName", { length: 100 }),
  adminNote:             text("adminNote"),
  processedAt:           timestamp("processedAt", { withTimezone: true }),
  createdAt:             timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 8. order_returns (반품 관리)
// ─────────────────────────────────────────────
export const orderReturns = pgTable("order_returns", {
  id:                   serial("id").primaryKey(),
  orderId:              integer("orderId").notNull().references(() => orders.id),
  orderItemId:          integer("orderItemId").references(() => orderItems.id),
  reason:               text("reason"),
  status:               returnStatusEnum("status").notNull().default("requested"),
  quantity:             integer("quantity"),
  returnTrackingNumber: varchar("returnTrackingNumber", { length: 100 }),
  returnCourierName:    varchar("returnCourierName", { length: 100 }),
  adminNote:            text("adminNote"),
  processedAt:          timestamp("processedAt", { withTimezone: true }),
  createdAt:            timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 9. order_refunds (환불 관리)
// ─────────────────────────────────────────────
export const orderRefunds = pgTable("order_refunds", {
  id:                   serial("id").primaryKey(),
  orderId:              integer("orderId").notNull().references(() => orders.id),
  cancellationId:       integer("cancellationId").references(() => orderCancellations.id),
  returnId:             integer("returnId").references(() => orderReturns.id),
  refundMethod:         refundMethodEnum("refundMethod").notNull().default("card"),
  refundAmount:         numeric("refundAmount", { precision: 12, scale: 0 }).notNull(),
  refundBank:           varchar("refundBank", { length: 50 }),
  refundAccount:        varchar("refundAccount", { length: 50 }),
  refundAccountHolder:  varchar("refundAccountHolder", { length: 100 }),
  status:               refundStatusEnum("status").notNull().default("pending"),
  refundType:           refundTypeEnum("refundType").notNull().default("full"),
  adminNote:            text("adminNote"),
  processedBy:          integer("processedBy").references(() => users.id),
  processedAt:          timestamp("processedAt", { withTimezone: true }),
  createdAt:            timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 10. card_cancellations (카드 취소 조회)
// ─────────────────────────────────────────────
export const cardCancellations = pgTable("card_cancellations", {
  id:           serial("id").primaryKey(),
  orderId:      integer("orderId").notNull().references(() => orders.id),
  paymentKey:   varchar("paymentKey", { length: 200 }),
  tid:          varchar("tid", { length: 200 }),
  cancelAmount: numeric("cancelAmount", { precision: 12, scale: 0 }).notNull(),
  cancelType:   cardCancelTypeEnum("cancelType").notNull().default("full"),
  processedBy:  varchar("processedBy", { length: 100 }),
  adminNote:    text("adminNote"),
  cancelledAt:  timestamp("cancelledAt", { withTimezone: true }).notNull().defaultNow(),
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 11. third_party_logs (3PL 연동 로그)
// ─────────────────────────────────────────────
export const thirdPartyLogs = pgTable("third_party_logs", {
  id:           serial("id").primaryKey(),
  orderId:      integer("orderId").references(() => orders.id),
  eventType:    varchar("eventType", { length: 100 }).notNull(),
  provider:     varchar("provider", { length: 100 }),
  payload:      text("payload"),
  result:       thirdPartyResultEnum("result").notNull().default("success"),
  errorMessage: text("errorMessage"),
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 12. admin_audit_logs (관리자 감사 로그)
// ─────────────────────────────────────────────
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id:          serial("id").primaryKey(),
  adminUserId: integer("adminUserId").notNull().references(() => users.id),
  actionType:  varchar("actionType", { length: 100 }).notNull(),
  targetType:  varchar("targetType", { length: 50 }).notNull(),
  targetId:    integer("targetId").notNull(),
  before:      text("before"),
  after:       text("after"),
  note:        text("note"),
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 13. gallery_posts (갤러리 게시글)
// ─────────────────────────────────────────────
export const galleryPosts = pgTable("gallery_posts", {
  id:            serial("id").primaryKey(),
  title:         varchar("title", { length: 300 }).notNull(),
  content:       text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      integer("authorId").references(() => users.id),
  viewCount:     integer("viewCount").notNull().default(0),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 14. magazine_posts (매거진 게시글)
// ─────────────────────────────────────────────
export const magazinePosts = pgTable("magazine_posts", {
  id:            serial("id").primaryKey(),
  title:         varchar("title", { length: 300 }).notNull(),
  subtitle:      varchar("subtitle", { length: 500 }),
  content:       text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      integer("authorId").references(() => users.id),
  viewCount:     integer("viewCount").notNull().default(0),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 15. post_images (게시글 이미지)
// ─────────────────────────────────────────────
export const postImages = pgTable("post_images", {
  id:        serial("id").primaryKey(),
  postType:  postTypeEnum("postType").notNull(),
  postId:    integer("postId").notNull(),
  imageUrl:  text("imageUrl").notNull(),
  imageKey:  text("imageKey").notNull(),
  fileName:  varchar("fileName", { length: 300 }),
  sortOrder: integer("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 16. popups (팝업 관리)
// ─────────────────────────────────────────────
export const popups = pgTable("popups", {
  id:              serial("id").primaryKey(),
  title:           varchar("title", { length: 300 }).notNull(),
  popupType:       popupTypeEnum("popupType").notNull().default("both"),
  isActive:        boolean("isActive").notNull().default(true),
  imageUrl:        text("imageUrl"),
  imageKey:        text("imageKey"),
  linkUrl:         text("linkUrl"),
  linkTarget:      linkTargetEnum("linkTarget").notNull().default("_blank"),
  displayPosition: varchar("displayPosition", { length: 100 }).notNull().default("main"),
  bottomText:      bottomTextEnum("bottomText").notNull().default("today"),
  startAt:         timestamp("startAt", { withTimezone: true }),
  endAt:           timestamp("endAt", { withTimezone: true }),
  clickCount:      integer("clickCount").notNull().default(0),
  sortOrder:       integer("sortOrder").notNull().default(0),
  createdAt:       timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:       timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 17. page_views (접속 통계)
// ─────────────────────────────────────────────
export const pageViews = pgTable("page_views", {
  id:         serial("id").primaryKey(),
  path:       varchar("path", { length: 500 }).notNull(),
  deviceType: deviceTypeEnum("deviceType").notNull().default("pc"),
  sessionId:  varchar("sessionId", { length: 128 }),
  userId:     integer("userId").references(() => users.id),
  referrer:   text("referrer"),
  userAgent:  text("userAgent"),
  duration:   integer("duration"),
  createdAt:  timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 18. reviews (후기 관리)
// ─────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id:            serial("id").primaryKey(),
  category:      reviewCategoryEnum("category").notNull().default("etc"),
  categoryLabel: varchar("categoryLabel", { length: 100 }),
  imageUrl:      text("imageUrl").notNull(),
  imageKey:      varchar("imageKey", { length: 500 }),
  title:         varchar("title", { length: 200 }),
  description:   text("description"),
  sortOrder:     integer("sortOrder").notNull().default(0),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      integer("authorId").references(() => users.id),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 19. certified_instructors (인증강사 갤러리)
// ─────────────────────────────────────────────
export const certifiedInstructors = pgTable("certified_instructors", {
  id:          serial("id").primaryKey(),
  imageUrl:    text("imageUrl").notNull(),
  imageKey:    varchar("imageKey", { length: 500 }),
  name:        varchar("name", { length: 200 }),
  description: text("description"),
  sortOrder:   integer("sortOrder").notNull().default(0),
  isPublished: boolean("isPublished").notNull().default(true),
  authorId:    integer("authorId").references(() => users.id),
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 20. coupons (쿠폰 관리)
// ─────────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id:                  serial("id").primaryKey(),
  name:                varchar("name", { length: 200 }).notNull(),
  description:         text("description"),
  benefitType:         varchar("benefitType", { length: 50 }).notNull().default("discount_rate"),
  benefitValue:        integer("benefitValue").notNull().default(0),
  issueType:           varchar("issueType", { length: 50 }).notNull().default("customer_download"),
  targetMember:        varchar("targetMember", { length: 20 }).notNull().default("all"),
  displayTiming:       varchar("displayTiming", { length: 20 }).notNull().default("immediate"),
  scheduledAt:         timestamp("scheduledAt", { withTimezone: true }),
  startDate:           timestamp("startDate", { withTimezone: true }),
  endDate:             timestamp("endDate", { withTimezone: true }),
  periodType:          varchar("periodType", { length: 30 }).notNull().default("fixed"),
  validDays:           integer("validDays"),
  usePc:               boolean("usePc").notNull().default(true),
  useMobile:           boolean("useMobile").notNull().default(true),
  applyScope:          varchar("applyScope", { length: 20 }).notNull().default("order"),
  productScope:        varchar("productScope", { length: 20 }).notNull().default("all"),
  minAmountType:       varchar("minAmountType", { length: 30 }).notNull().default("none"),
  minAmount:           integer("minAmount").notNull().default(0),
  calcBasis:           varchar("calcBasis", { length: 30 }).notNull().default("before_discount"),
  maxUsagePerOrder:    integer("maxUsagePerOrder").notNull().default(1),
  paymentMethodLimit:  varchar("paymentMethodLimit", { length: 20 }).notNull().default("none"),
  imageType:           varchar("imageType", { length: 20 }).notNull().default("default"),
  imageUrl:            text("imageUrl"),
  notifyOnLogin:       boolean("notifyOnLogin").notNull().default(false),
  sendSms:             boolean("sendSms").notNull().default(false),
  sendEmail:           boolean("sendEmail").notNull().default(false),
  status:              varchar("status", { length: 20 }).notNull().default("active"),
  totalIssued:         integer("totalIssued").notNull().default(0),
  authorId:            integer("authorId").references(() => users.id),
  createdAt:           timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 21. coupon_issues (쿠폰 발급 내역)
// ─────────────────────────────────────────────
export const couponIssues = pgTable("coupon_issues", {
  id:           serial("id").primaryKey(),
  couponNumber: varchar("couponNumber", { length: 30 }).notNull().unique(),
  couponId:     integer("couponId").notNull().references(() => coupons.id),
  userId:       integer("userId").references(() => users.id),
  isUsed:       boolean("isUsed").notNull().default(false),
  usedAt:       timestamp("usedAt", { withTimezone: true }),
  orderId:      integer("orderId"),
  isDeleted:    boolean("isDeleted").notNull().default(false),
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 22. discount_codes (할인코드)
// ─────────────────────────────────────────────
export const discountCodes = pgTable("discount_codes", {
  id:                    serial("id").primaryKey(),
  name:                  varchar("name", { length: 200 }).notNull(),
  code:                  varchar("code", { length: 100 }).notNull().unique(),
  discountRate:          integer("discountRate").notNull().default(0),
  truncateUnit:          integer("truncateUnit").notNull().default(0),
  maxDiscountPerProduct: integer("maxDiscountPerProduct"),
  startDate:             timestamp("startDate", { withTimezone: true }),
  endDate:               timestamp("endDate", { withTimezone: true }),
  applyScope:            varchar("applyScope", { length: 20 }).notNull().default("all"),
  minOrderAmountType:    varchar("minOrderAmountType", { length: 20 }).notNull().default("none"),
  minOrderAmount:        integer("minOrderAmount").notNull().default(0),
  maxUsageType:          varchar("maxUsageType", { length: 20 }).notNull().default("none"),
  maxUsageCount:         integer("maxUsageCount"),
  targetType:            varchar("targetType", { length: 20 }).notNull().default("none"),
  samePersonLimitType:   varchar("samePersonLimitType", { length: 20 }).notNull().default("none"),
  samePersonLimitCount:  integer("samePersonLimitCount"),
  usedCount:             integer("usedCount").notNull().default(0),
  authorId:              integer("authorId").references(() => users.id),
  createdAt:             timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// 23. remind_alerts (리마인드 Me 알림)
// ─────────────────────────────────────────────
export const remindAlerts = pgTable("remind_alerts", {
  id:               serial("id").primaryKey(),
  name:             varchar("name", { length: 200 }).notNull(),
  alertType:        varchar("alertType", { length: 50 }).notNull().default("cart"),
  isActive:         boolean("isActive").notNull().default(true),
  channel:          varchar("channel", { length: 10 }).notNull().default("email"),
  startDate:        timestamp("startDate", { withTimezone: true }),
  endDate:          timestamp("endDate", { withTimezone: true }),
  frequency:        varchar("frequency", { length: 20 }).notNull().default("weekly"),
  sendDayOfWeek:    integer("sendDayOfWeek").notNull().default(5),
  sendHour:         integer("sendHour").notNull().default(9),
  targetType:       varchar("targetType", { length: 50 }).notNull().default("all"),
  targetDays:       integer("targetDays").notNull().default(30),
  sendToOptOut:     boolean("sendToOptOut").notNull().default(false),
  sendToSpecial:    boolean("sendToSpecial").notNull().default(true),
  sendToBad:        boolean("sendToBad").notNull().default(true),
  senderName:       varchar("senderName", { length: 100 }),
  senderEmail:      varchar("senderEmail", { length: 200 }),
  emailSubject:     varchar("emailSubject", { length: 300 }),
  emailBody:        text("emailBody"),
  benefitEnabled:   boolean("benefitEnabled").notNull().default(false),
  benefitDays:      integer("benefitDays").notNull().default(30),
  benefitTrigger:   varchar("benefitTrigger", { length: 30 }).notNull().default("order_complete"),
  benefitContent:   varchar("benefitContent", { length: 30 }).notNull().default("coupon"),
  benefitCouponId:  integer("benefitCouponId").references(() => coupons.id),
  totalSent:        integer("totalSent").notNull().default(0),
  authorId:         integer("authorId").references(() => users.id),
  createdAt:        timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

// ─────────────────────────────────────────────
// Relations (Drizzle ORM 관계 정의)
// ─────────────────────────────────────────────

export const usersRelations = relations(users, ({ many }) => ({
  orders: many(orders),
  businessVerifications: many(businessVerifications),
  couponIssues: many(couponIssues),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(users, { fields: [orders.userId], references: [users.id] }),
  items: many(orderItems),
  cancellations: many(orderCancellations),
  exchanges: many(orderExchanges),
  returns: many(orderReturns),
  refunds: many(orderRefunds),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, { fields: [orderItems.orderId], references: [orders.id] }),
  product: one(products, { fields: [orderItems.productId], references: [products.id] }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  issues: many(couponIssues),
}));

export const couponIssuesRelations = relations(couponIssues, ({ one }) => ({
  coupon: one(coupons, { fields: [couponIssues.couponId], references: [coupons.id] }),
  user: one(users, { fields: [couponIssues.userId], references: [users.id] }),
}));
