/**
 * Supabase(PostgreSQL) 전용 Drizzle 스키마
 *
 * - auth.users 기반 인증 구조로 전환 (2026-03-12)
 * - public.users 제거 → public.profiles (uuid PK, auth.users 참조)
 * - 모든 userId/authorId/adminUserId FK: integer → uuid
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
  uuid,
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
export const userRoleSnapshotEnum = pgEnum("user_role_snapshot", ["consumer", "professional", "membership"]);
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
export const productStatusEnum = pgEnum("product_status", ["new", "used", "refurbished"]);
export const taxTypeEnum = pgEnum("tax_type", ["taxable", "tax_free", "exempt"]);
export const shippingTypeEnum = pgEnum("shipping_type", ["direct", "warehouse", "other"]);

// ─────────────────────────────────────────────
// 1. profiles (회원 프로필 — auth.users 연동)
//    id: auth.users.id (uuid) 를 PK이자 FK로 참조
//    인증 원본은 Supabase auth.users, 비즈니스 정보만 여기에 저장
// ─────────────────────────────────────────────
export const profiles = pgTable("profiles", {
  id:                      uuid("id").primaryKey(),  // auth.users.id 참조 (DB 레벨 FK)
  openId:                  varchar("openId", { length: 64 }).unique(),  // Manus OAuth 식별자 (소셜 콜백용)
  name:                    text("name"),
  email:                   varchar("email", { length: 320 }),
  loginMethod:             varchar("loginMethod", { length: 64 }),
  phone:                   varchar("phone", { length: 30 }),
  role:                    userRoleEnum("role").notNull().default("user"),
  memberRole:              memberRoleEnum("memberRole").notNull().default("consumer"),
  membershipDiscountRate:  integer("membershipDiscountRate").notNull().default(0),
  proVerificationStatus:   proVerificationStatusEnum("proVerificationStatus").notNull().default("none"),
  lastSignedIn:            timestamp("lastSignedIn", { withTimezone: true }).notNull().defaultNow(),
  createdAt:               timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:               timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Profile = typeof profiles.$inferSelect;
export type InsertProfile = typeof profiles.$inferInsert;

export const savedAddresses = pgTable("saved_addresses", {
  id:                    serial("id").primaryKey(),
  userId:                uuid("userId").notNull(),
  label:                 varchar("label", { length: 100 }).notNull(),
  recipientName:         varchar("recipientName", { length: 100 }).notNull(),
  recipientPhone:        varchar("recipientPhone", { length: 30 }).notNull(),
  shippingZipCode:       varchar("shippingZipCode", { length: 10 }).notNull(),
  shippingAddress:       text("shippingAddress").notNull(),
  shippingAddressDetail: text("shippingAddressDetail"),
  isDefault:             boolean("isDefault").notNull().default(false),
  createdAt:             timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type SavedAddress = typeof savedAddresses.$inferSelect;
export type InsertSavedAddress = typeof savedAddresses.$inferInsert;

// ─────────────────────────────────────────────
// 2. business_verifications (사업자 인증)
// ─────────────────────────────────────────────
export const businessVerifications = pgTable("business_verifications", {
  id:             serial("id").primaryKey(),
  userId:         uuid("userId").notNull(),  // profiles.id (auth.users.id) 참조
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

export type BusinessVerification = typeof businessVerifications.$inferSelect;
export type InsertBusinessVerification = typeof businessVerifications.$inferInsert;

// ─────────────────────────────────────────────
// 3. products (상품)
// ─────────────────────────────────────────────
export const products = pgTable("products", {
  id:                     uuid("id").primaryKey().defaultRandom(),
  slug:                   varchar("slug", { length: 100 }).notNull().unique(),
  name:                   varchar("name", { length: 200 }).notNull(),
  description:            text("description"),
  priceConsumer:          numeric("priceConsumer", { precision: 12, scale: 0 }).notNull(),
  pricePro:               numeric("pricePro", { precision: 12, scale: 0 }).notNull(),
  priceMembership:        numeric("priceMembership", { precision: 12, scale: 0 }),
  isProOnly:              boolean("isProOnly").notNull().default(false),
  stock:                  integer("stock").notNull().default(999),
  imageUrl:               text("imageUrl"),
  isActive:               boolean("isActive").notNull().default(true),
  visible:                boolean("visible").notNull().default(true),
  productCode:            varchar("productCode", { length: 50 }),
  productStatus:          productStatusEnum("productStatus").default("new"),
  summaryDescription:     varchar("summaryDescription", { length: 255 }),
  shortDescription:       text("shortDescription"),
  priceSupply:            numeric("priceSupply", { precision: 12, scale: 0 }),
  priceConsumerOriginal:  numeric("priceConsumerOriginal", { precision: 12, scale: 0 }),
  taxType:                taxTypeEnum("taxType").default("taxable"),
  taxRate:                numeric("taxRate", { precision: 5, scale: 2 }).default("10.00"),
  shippingType:           shippingTypeEnum("shippingType").default("direct"),
  weight:                 numeric("weight", { precision: 8, scale: 2 }).default("1.00"),
  manufacturer:           varchar("manufacturer", { length: 100 }),
  brand:                  varchar("brand", { length: 100 }),
  origin:                 varchar("origin", { length: 100 }),
  seoTitle:               varchar("seoTitle", { length: 200 }),
  seoDescription:         text("seoDescription"),
  seoKeywords:            varchar("seoKeywords", { length: 500 }),
  seoImageAlt:            varchar("seoImageAlt", { length: 200 }),
  adminMemo:              text("adminMemo"),
  features:               text("features"),
  howToUse:               text("howToUse"),
  ingredients:            text("ingredients"),
  thumbnailUrl:           text("thumbnailUrl"),
  detailPageUrl:          varchar("detailPageUrl", { length: 500 }),
  sortOrder:              integer("sortOrder").default(0),
  isRecommended:          boolean("isRecommended").notNull().default(false),
  isNew:                  boolean("isNew").notNull().default(false),
  createdAt:              timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:              timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

// ─────────────────────────────────────────────
// 4. design_folders (디자인 보관함 폴더)
// ─────────────────────────────────────────────
export const designFolders = pgTable("design_folders", {
  id:        serial("id").primaryKey(),
  name:      varchar("name", { length: 200 }).notNull(),
  parentId:  integer("parentId"),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type DesignFolder = typeof designFolders.$inferSelect;

// ─────────────────────────────────────────────
// 5. design_files (파일업로더)
// ─────────────────────────────────────────────
export const designFiles = pgTable("design_files", {
  id:           serial("id").primaryKey(),
  fileName:     varchar("fileName", { length: 300 }).notNull(),
  fileKey:      text("fileKey").notNull(),
  fileUrl:      text("fileUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  mediumUrl:    text("mediumUrl"),
  mimeType:     varchar("mimeType", { length: 100 }),
  fileSize:     integer("fileSize"),
  folder:       varchar("folder", { length: 200 }).default("ROOT"),
  uploadedBy:   uuid("uploadedBy"),  // profiles.id 참조
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type DesignFile = typeof designFiles.$inferSelect;
export type InsertDesignFile = typeof designFiles.$inferInsert;

// ─────────────────────────────────────────────
// 6. orders (주문)
// ─────────────────────────────────────────────
export const orders = pgTable("orders", {
  id:                    serial("id").primaryKey(),
  orderId:               varchar("orderId", { length: 100 }).notNull().unique(),
  userId:                uuid("userId").notNull(),  // profiles.id 참조
  userRoleSnapshot:      userRoleSnapshotEnum("userRoleSnapshot").notNull(),
  proStatusSnapshot:     proStatusSnapshotEnum("proStatusSnapshot").notNull(),
  totalAmount:           numeric("totalAmount", { precision: 12, scale: 0 }).notNull(),
  discountAmount:        numeric("discountAmount", { precision: 12, scale: 0 }).notNull().default("0"),
  shippingAmount:        numeric("shippingAmount", { precision: 12, scale: 0 }).notNull().default("0"),
  finalAmount:           numeric("finalAmount", { precision: 12, scale: 0 }).notNull(),
  status:                orderStatusEnum("status").notNull().default("created"),
  shippingStatus:        shippingStatusEnum("shippingStatus").notNull().default("none"),
  courierCode:           varchar("courierCode", { length: 50 }),
  courierName:           varchar("courierName", { length: 100 }),
  trackingNumber:        varchar("trackingNumber", { length: 100 }),
  shippedAt:             timestamp("shippedAt", { withTimezone: true }),
  deliveredAt:           timestamp("deliveredAt", { withTimezone: true }),
  recipientName:         varchar("recipientName", { length: 100 }),
  recipientPhone:        varchar("recipientPhone", { length: 30 }),
  shippingAddress:       text("shippingAddress"),
  shippingAddressDetail: text("shippingAddressDetail"),
  shippingZipCode:       varchar("shippingZipCode", { length: 10 }),
  shippingMemo:          text("shippingMemo"),
  externalOrderId:       varchar("externalOrderId", { length: 200 }),
  thirdPartyStatus:      thirdPartyStatusEnum("thirdPartyStatus").notNull().default("none"),
  thirdPartySyncedAt:    timestamp("thirdPartySyncedAt", { withTimezone: true }),
  adminMemo:             text("adminMemo"),
  promotionLabel:        varchar("promotionLabel", { length: 200 }),
  couponIssueId:         integer("couponIssueId"),
  discountCodeId:        integer("discountCodeId"),
  couponIssueRefId:      uuid("coupon_issue_id"),
  discountCodeRefId:     uuid("discount_code_id"),
  paymentKey:            varchar("paymentKey", { length: 200 }),
  paymentMethod:         varchar("paymentMethod", { length: 50 }),
  paidAt:                timestamp("paidAt", { withTimezone: true }),
  orderName:             varchar("orderName", { length: 300 }),
  createdAt:             timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:             timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

// ─────────────────────────────────────────────
// 7. order_items (주문 상품)
// ─────────────────────────────────────────────
export const orderItems = pgTable("order_items", {
  id:          serial("id").primaryKey(),
  orderId:     integer("orderId").notNull().references(() => orders.id),
  productId:   uuid("productId").notNull(),
  productName: varchar("productName", { length: 200 }).notNull(),
  quantity:    integer("quantity").notNull(),
  unitPrice:   numeric("unitPrice", { precision: 12, scale: 0 }).notNull(),
  subtotal:    numeric("subtotal", { precision: 12, scale: 0 }).notNull(),
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

// ─────────────────────────────────────────────
// 8. order_cancellations (취소 관리)
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

export type OrderCancellation = typeof orderCancellations.$inferSelect;
export type InsertOrderCancellation = typeof orderCancellations.$inferInsert;

// ─────────────────────────────────────────────
// 9. order_exchanges (교환 관리)
// ─────────────────────────────────────────────
export const orderExchanges = pgTable("order_exchanges", {
  id:                   serial("id").primaryKey(),
  orderId:              integer("orderId").notNull().references(() => orders.id),
  orderItemId:          integer("orderItemId").references(() => orderItems.id),
  reason:               text("reason"),
  status:               exchangeStatusEnum("status").notNull().default("requested"),
  quantity:             integer("quantity"),
  returnTrackingNumber: varchar("returnTrackingNumber", { length: 100 }),
  returnCourierName:    varchar("returnCourierName", { length: 100 }),
  reshipTrackingNumber: varchar("reshipTrackingNumber", { length: 100 }),
  reshipCourierName:    varchar("reshipCourierName", { length: 100 }),
  adminNote:            text("adminNote"),
  processedAt:          timestamp("processedAt", { withTimezone: true }),
  createdAt:            timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderExchange = typeof orderExchanges.$inferSelect;
export type InsertOrderExchange = typeof orderExchanges.$inferInsert;

// ─────────────────────────────────────────────
// 10. order_returns (반품 관리)
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

export type OrderReturn = typeof orderReturns.$inferSelect;
export type InsertOrderReturn = typeof orderReturns.$inferInsert;

// ─────────────────────────────────────────────
// 11. order_refunds (환불 관리)
// ─────────────────────────────────────────────
export const orderRefunds = pgTable("order_refunds", {
  id:                  serial("id").primaryKey(),
  orderId:             integer("orderId").notNull().references(() => orders.id),
  cancellationId:      integer("cancellationId").references(() => orderCancellations.id),
  returnId:            integer("returnId").references(() => orderReturns.id),
  refundMethod:        refundMethodEnum("refundMethod").notNull().default("card"),
  refundAmount:        numeric("refundAmount", { precision: 12, scale: 0 }).notNull(),
  refundBank:          varchar("refundBank", { length: 50 }),
  refundAccount:       varchar("refundAccount", { length: 50 }),
  refundAccountHolder: varchar("refundAccountHolder", { length: 100 }),
  status:              refundStatusEnum("status").notNull().default("pending"),
  refundType:          refundTypeEnum("refundType").notNull().default("full"),
  adminNote:           text("adminNote"),
  processedBy:         uuid("processedBy"),  // profiles.id 참조
  processedAt:         timestamp("processedAt", { withTimezone: true }),
  createdAt:           timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:           timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type OrderRefund = typeof orderRefunds.$inferSelect;
export type InsertOrderRefund = typeof orderRefunds.$inferInsert;

// ─────────────────────────────────────────────
// 12. card_cancellations (카드 취소 조회)
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

export type CardCancellation = typeof cardCancellations.$inferSelect;
export type InsertCardCancellation = typeof cardCancellations.$inferInsert;

// ─────────────────────────────────────────────
// 13. third_party_logs (3PL 연동 로그)
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

export type ThirdPartyLog = typeof thirdPartyLogs.$inferSelect;
export type InsertThirdPartyLog = typeof thirdPartyLogs.$inferInsert;

// ─────────────────────────────────────────────
// 14. admin_audit_logs (관리자 감사 로그)
// ─────────────────────────────────────────────
export const adminAuditLogs = pgTable("admin_audit_logs", {
  id:          serial("id").primaryKey(),
  adminUserId: uuid("adminUserId").notNull(),  // profiles.id 참조
  actionType:  varchar("actionType", { length: 100 }).notNull(),
  targetType:  varchar("targetType", { length: 50 }).notNull(),
  targetId:    varchar("targetId", { length: 100 }).notNull(),  // uuid 또는 integer를 string으로 저장
  before:      text("before"),
  after:       text("after"),
  note:        text("note"),
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
export type InsertAdminAuditLog = typeof adminAuditLogs.$inferInsert;

// ─────────────────────────────────────────────
// 15. gallery_posts (갤러리 게시글)
// ─────────────────────────────────────────────
export const galleryPosts = pgTable("gallery_posts", {
  id:            serial("id").primaryKey(),
  title:         varchar("title", { length: 300 }).notNull(),
  content:       text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      uuid("authorId"),  // profiles.id 참조
  viewCount:     integer("viewCount").notNull().default(0),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type GalleryPost = typeof galleryPosts.$inferSelect;
export type InsertGalleryPost = typeof galleryPosts.$inferInsert;

// ─────────────────────────────────────────────
// 16. magazine_posts (매거진 게시글)
// ─────────────────────────────────────────────
export const magazinePosts = pgTable("magazine_posts", {
  id:            serial("id").primaryKey(),
  title:         varchar("title", { length: 300 }).notNull(),
  subtitle:      varchar("subtitle", { length: 500 }),
  content:       text("content"),
  coverImageUrl: text("coverImageUrl"),
  coverImageKey: text("coverImageKey"),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      uuid("authorId"),  // profiles.id 참조
  viewCount:     integer("viewCount").notNull().default(0),
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type MagazinePost = typeof magazinePosts.$inferSelect;
export type InsertMagazinePost = typeof magazinePosts.$inferInsert;

// ─────────────────────────────────────────────
// 17. post_images (게시글 이미지)
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

export type PostImage = typeof postImages.$inferSelect;
export type InsertPostImage = typeof postImages.$inferInsert;

// ─────────────────────────────────────────────
// 18. popups (팝업 관리)
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

export type Popup = typeof popups.$inferSelect;
export type InsertPopup = typeof popups.$inferInsert;

// ─────────────────────────────────────────────
// 19. page_views (접속 통계)
// ─────────────────────────────────────────────
export const pageViews = pgTable("page_views", {
  id:         serial("id").primaryKey(),
  path:       varchar("path", { length: 500 }).notNull(),
  deviceType: deviceTypeEnum("deviceType").notNull().default("pc"),
  sessionId:  varchar("sessionId", { length: 128 }),
  userId:     uuid("userId"),  // profiles.id 참조 (nullable)
  referrer:   text("referrer"),
  userAgent:  text("userAgent"),
  duration:   integer("duration"),
  createdAt:  timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type PageView = typeof pageViews.$inferSelect;
export type InsertPageView = typeof pageViews.$inferInsert;

// ─────────────────────────────────────────────
// 20. reviews (후기 관리)
// ─────────────────────────────────────────────
export const reviews = pgTable("reviews", {
  id:            serial("id").primaryKey(),
  category:      reviewCategoryEnum("category").notNull().default("etc"),
  categoryLabel: varchar("categoryLabel", { length: 100 }),
  productId:     uuid("productId"),
  imageUrl:      text("imageUrl").notNull(),
  imageKey:      varchar("imageKey", { length: 500 }),
  title:         varchar("title", { length: 200 }),
  description:   text("description"),
  sortOrder:     integer("sortOrder").notNull().default(0),
  isPublished:   boolean("isPublished").notNull().default(true),
  authorId:      uuid("authorId"),  // profiles.id 참조
  createdAt:     timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:     timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Review = typeof reviews.$inferSelect;
export type InsertReview = typeof reviews.$inferInsert;

// ─────────────────────────────────────────────
// 21. certified_instructors (인증강사 갤러리)
// ─────────────────────────────────────────────
export const certifiedInstructors = pgTable("certified_instructors", {
  id:          serial("id").primaryKey(),
  imageUrl:    text("imageUrl").notNull(),
  imageKey:    varchar("imageKey", { length: 500 }),
  name:        varchar("name", { length: 200 }),
  description: text("description"),
  sortOrder:   integer("sortOrder").notNull().default(0),
  isPublished: boolean("isPublished").notNull().default(true),
  authorId:    uuid("authorId"),  // profiles.id 참조
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type CertifiedInstructor = typeof certifiedInstructors.$inferSelect;
export type InsertCertifiedInstructor = typeof certifiedInstructors.$inferInsert;

// ─────────────────────────────────────────────
// 22. coupons (쿠폰 관리)
// ─────────────────────────────────────────────
export const coupons = pgTable("coupons", {
  id:                 serial("id").primaryKey(),
  name:               varchar("name", { length: 200 }).notNull(),
  description:        text("description"),
  benefitType:        varchar("benefitType", { length: 50 }).notNull().default("discount_rate"),
  benefitValue:       integer("benefitValue").notNull().default(0),
  issueType:          varchar("issueType", { length: 50 }).notNull().default("customer_download"),
  targetMember:       varchar("targetMember", { length: 20 }).notNull().default("all"),
  displayTiming:      varchar("displayTiming", { length: 20 }).notNull().default("immediate"),
  scheduledAt:        timestamp("scheduledAt", { withTimezone: true }),
  startDate:          timestamp("startDate", { withTimezone: true }),
  endDate:            timestamp("endDate", { withTimezone: true }),
  periodType:         varchar("periodType", { length: 30 }).notNull().default("fixed"),
  validDays:          integer("validDays"),
  usePc:              boolean("usePc").notNull().default(true),
  useMobile:          boolean("useMobile").notNull().default(true),
  applyScope:         varchar("applyScope", { length: 20 }).notNull().default("order"),
  productScope:       varchar("productScope", { length: 20 }).notNull().default("all"),
  minAmountType:      varchar("minAmountType", { length: 30 }).notNull().default("none"),
  minAmount:          integer("minAmount").notNull().default(0),
  calcBasis:          varchar("calcBasis", { length: 30 }).notNull().default("before_discount"),
  maxUsagePerOrder:   integer("maxUsagePerOrder").notNull().default(1),
  paymentMethodLimit: varchar("paymentMethodLimit", { length: 20 }).notNull().default("none"),
  imageType:          varchar("imageType", { length: 20 }).notNull().default("default"),
  imageUrl:           text("imageUrl"),
  notifyOnLogin:      boolean("notifyOnLogin").notNull().default(false),
  sendSms:            boolean("sendSms").notNull().default(false),
  sendEmail:          boolean("sendEmail").notNull().default(false),
  status:             varchar("status", { length: 20 }).notNull().default("active"),
  totalIssued:        integer("totalIssued").notNull().default(0),
  authorId:           uuid("authorId"),  // profiles.id 참조
  createdAt:          timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:          timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type Coupon = typeof coupons.$inferSelect;
export type InsertCoupon = typeof coupons.$inferInsert;

// ─────────────────────────────────────────────
// 23. coupon_issues (쿠폰 발급 내역)
// ─────────────────────────────────────────────
export const couponIssues = pgTable("coupon_issues", {
  id:           serial("id").primaryKey(),
  couponNumber: varchar("couponNumber", { length: 30 }).notNull().unique(),
  couponId:     integer("couponId").notNull().references(() => coupons.id),
  userId:       uuid("userId"),  // profiles.id 참조 (nullable)
  isUsed:       boolean("isUsed").notNull().default(false),
  usedAt:       timestamp("usedAt", { withTimezone: true }),
  orderId:      integer("orderId"),
  isDeleted:    boolean("isDeleted").notNull().default(false),
  createdAt:    timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
});

export type CouponIssue = typeof couponIssues.$inferSelect;
export type InsertCouponIssue = typeof couponIssues.$inferInsert;

// ─────────────────────────────────────────────
// 24. discount_codes (할인코드)
// ─────────────────────────────────────────────
export const discountCodes = pgTable("discount_codes", {
  id:                   serial("id").primaryKey(),
  name:                 varchar("name", { length: 200 }).notNull(),
  code:                 varchar("code", { length: 100 }).notNull().unique(),
  discountRate:         integer("discountRate").notNull().default(0),
  truncateUnit:         integer("truncateUnit").notNull().default(0),
  maxDiscountPerProduct: integer("maxDiscountPerProduct"),
  startDate:            timestamp("startDate", { withTimezone: true }),
  endDate:              timestamp("endDate", { withTimezone: true }),
  applyScope:           varchar("applyScope", { length: 20 }).notNull().default("all"),
  minOrderAmountType:   varchar("minOrderAmountType", { length: 20 }).notNull().default("none"),
  minOrderAmount:       integer("minOrderAmount").notNull().default(0),
  maxUsageType:         varchar("maxUsageType", { length: 20 }).notNull().default("none"),
  maxUsageCount:        integer("maxUsageCount"),
  targetType:           varchar("targetType", { length: 20 }).notNull().default("none"),
  samePersonLimitType:  varchar("samePersonLimitType", { length: 20 }).notNull().default("none"),
  samePersonLimitCount: integer("samePersonLimitCount"),
  usedCount:            integer("usedCount").notNull().default(0),
  authorId:             uuid("authorId"),  // profiles.id 참조
  createdAt:            timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:            timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type DiscountCode = typeof discountCodes.$inferSelect;
export type InsertDiscountCode = typeof discountCodes.$inferInsert;

// ─────────────────────────────────────────────
// 25. remind_alerts (리마인드 Me 알림)
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
  authorId:         uuid("authorId"),  // profiles.id 참조
  createdAt:        timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:        timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type RemindAlert = typeof remindAlerts.$inferSelect;
export type InsertRemindAlert = typeof remindAlerts.$inferInsert;

// ─────────────────────────────────────────────
// 26. excel_templates (엑셀 양식 관리)
// ─────────────────────────────────────────────
export const excelTemplates = pgTable("excel_templates", {
  id:          serial("id").primaryKey(),
  name:        varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  isDefault:   boolean("isDefault").notNull().default(false),
  columns:     text("columns").notNull(),
  sortConfig:  text("sortConfig"),
  authorId:    uuid("authorId"),  // profiles.id 참조
  createdAt:   timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt:   timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
});

export type ExcelTemplate = typeof excelTemplates.$inferSelect;
export type InsertExcelTemplate = typeof excelTemplates.$inferInsert;

// ─────────────────────────────────────────────
// 27. request_rate_limits (공용 rate limit 버킷)
// ─────────────────────────────────────────────
export const requestRateLimits = pgTable("request_rate_limits", {
  bucketKey: varchar("bucketKey", { length: 255 }).primaryKey(),
  count:     integer("count").notNull().default(0),
  expiresAt: timestamp("expiresAt", { withTimezone: true }).notNull(),
  createdAt: timestamp("createdAt", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updatedAt", { withTimezone: true }).notNull().defaultNow(),
}, (table) => ({
  expiresAtIdx: index("request_rate_limits_expires_at_idx").on(table.expiresAt),
}));

export type RequestRateLimit = typeof requestRateLimits.$inferSelect;
export type InsertRequestRateLimit = typeof requestRateLimits.$inferInsert;

// ─────────────────────────────────────────────
// Relations (Drizzle ORM 관계 정의)
// ─────────────────────────────────────────────

export const profilesRelations = relations(profiles, ({ many }) => ({
  orders: many(orders),
  savedAddresses: many(savedAddresses),
  businessVerifications: many(businessVerifications),
  couponIssues: many(couponIssues),
  designFiles: many(designFiles),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  user: one(profiles, { fields: [orders.userId], references: [profiles.id] }),
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

export const savedAddressesRelations = relations(savedAddresses, ({ one }) => ({
  user: one(profiles, { fields: [savedAddresses.userId], references: [profiles.id] }),
}));

export const couponsRelations = relations(coupons, ({ many }) => ({
  issues: many(couponIssues),
}));

export const couponIssuesRelations = relations(couponIssues, ({ one }) => ({
  coupon: one(coupons, { fields: [couponIssues.couponId], references: [coupons.id] }),
  user: one(profiles, { fields: [couponIssues.userId], references: [profiles.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  product: one(products, { fields: [reviews.productId], references: [products.id] }),
  author: one(profiles, { fields: [reviews.authorId], references: [profiles.id] }),
}));

export const designFilesRelations = relations(designFiles, ({ one }) => ({
  uploader: one(profiles, { fields: [designFiles.uploadedBy], references: [profiles.id] }),
}));
