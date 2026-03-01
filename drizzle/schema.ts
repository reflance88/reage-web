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
  status: mysqlEnum("status", ["created", "paid", "failed", "cancelled"])
    .default("created")
    .notNull(),
  paymentKey: varchar("paymentKey", { length: 200 }),
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