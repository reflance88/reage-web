import { and, desc, eq, gte, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AdminAuditLog,
  BusinessVerification,
  InsertAdminAuditLog,
  InsertBusinessVerification,
  InsertOrder,
  InsertOrderItem,
  InsertOrderCancellation,
  InsertOrderExchange,
  InsertOrderReturn,
  InsertOrderRefund,
  InsertCardCancellation,
  InsertThirdPartyLog,
  InsertUser,
  InsertReview,
  Order,
  adminAuditLogs,
  businessVerifications,
  cardCancellations,
  orderCancellations,
  orderExchanges,
  orderItems,
  orderRefunds,
  orderReturns,
  orders,
  products,
  reviews,
  thirdPartyLogs,
  users,
  InsertCertifiedInstructor,
  certifiedInstructors,
  Coupon,
  InsertCoupon,
  CouponIssue,
  InsertCouponIssue,
  DiscountCode,
  InsertDiscountCode,
  RemindAlert,
  InsertRemindAlert,
  coupons,
  couponIssues,
  discountCodes,
  remindAlerts,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── Users ────────────────────────────────────────────────────────────────────
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }

    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserProfile(id: number, data: { name?: string; phone?: string }) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

// ─── Products ─────────────────────────────────────────────────────────────────
export async function getProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).where(eq(products.isActive, true));
}

export async function getProductBySlug(slug: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.slug, slug)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getProductById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(products).where(eq(products.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Business Verifications ───────────────────────────────────────────────────
export async function getLatestVerification(userId: number): Promise<BusinessVerification | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(businessVerifications)
    .where(eq(businessVerifications.userId, userId))
    .orderBy(desc(businessVerifications.createdAt))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createVerification(data: InsertBusinessVerification) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(businessVerifications).values(data);
  const result = await db
    .select()
    .from(businessVerifications)
    .where(eq(businessVerifications.userId, data.userId))
    .orderBy(desc(businessVerifications.createdAt))
    .limit(1);
  return result[0];
}

export async function updateVerification(id: number, data: Partial<BusinessVerification>) {
  const db = await getDb();
  if (!db) return;
  await db.update(businessVerifications).set(data).where(eq(businessVerifications.id, id));
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export async function createOrder(orderData: InsertOrder, items: InsertOrderItem[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orders).values(orderData);
  const orderResult = await db.select().from(orders).where(eq(orders.orderId, orderData.orderId)).limit(1);
  const order = orderResult[0];
  if (!order) throw new Error("Order not found after insert");
  const itemsWithOrderId = items.map((item) => ({ ...item, orderId: order.id }));
  await db.insert(orderItems).values(itemsWithOrderId);
  return order;
}

export async function getOrderByOrderId(orderId: string): Promise<Order | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateOrderStatus(
  orderId: string,
  data: { status: "created" | "paid" | "failed" | "cancelled"; paymentKey?: string; paidAt?: Date }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.orderId, orderId));
}

export async function getUserOrders(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(orders)
    .where(and(eq(orders.userId, userId), eq(orders.status, "paid")))
    .orderBy(desc(orders.createdAt));
}

export async function getOrderItems(orderDbId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(orderItems).where(eq(orderItems.orderId, orderDbId));
}

// ─── Email Auth Helpers ────────────────────────────────────────────────────────
export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createEmailUser(data: {
  email: string;
  name: string;
  passwordHash: string;
  openId: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(users).values({
    openId: data.openId,
    email: data.email,
    name: data.name,
    passwordHash: data.passwordHash,
    loginMethod: "email",
    emailVerified: false,
    lastSignedIn: new Date(),
  });
  const result = await db.select().from(users).where(eq(users.email, data.email)).limit(1);
  return result[0];
}

export async function updateUserResetToken(
  id: number,
  token: string | null,
  expiresAt: Date | null
) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ resetToken: token, resetTokenExpiresAt: expiresAt }).where(eq(users.id, id));
}

export async function getUserByResetToken(token: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.resetToken, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateUserPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ passwordHash, resetToken: null, resetTokenExpiresAt: null }).where(eq(users.id, id));
}

// ─── Admin Helpers ────────────────────────────────────────────────────────────
export async function getAllUsers(page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { users: [], total: 0 };
  const offset = (page - 1) * limit;
  const result = await db.select().from(users).orderBy(desc(users.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: users.id }).from(users);
  return { users: result, total: countResult.length };
}

export async function getAllVerifications(status?: "pending" | "approved" | "rejected") {
  const db = await getDb();
  if (!db) return [];
  if (status) {
    return db.select().from(businessVerifications).where(eq(businessVerifications.status, status)).orderBy(desc(businessVerifications.createdAt));
  }
  return db.select().from(businessVerifications).orderBy(desc(businessVerifications.createdAt));
}

export async function approveVerification(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(businessVerifications).set({ status: "approved", reviewedAt: new Date() }).where(eq(businessVerifications.id, id));
  await db.update(users).set({ proVerificationStatus: "approved", memberRole: "professional" }).where(eq(users.id, userId));
}

export async function rejectVerification(id: number, userId: number, reason: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(businessVerifications).set({ status: "rejected", rejectReason: reason, reviewedAt: new Date() }).where(eq(businessVerifications.id, id));
  await db.update(users).set({ proVerificationStatus: "rejected" }).where(eq(users.id, userId));
}

export async function getAllOrders(page = 1, limit = 20) {
  const db = await getDb();
  if (!db) return { orders: [], total: 0 };
  const offset = (page - 1) * limit;
  const result = await db.select().from(orders).orderBy(desc(orders.createdAt)).limit(limit).offset(offset);
  const countResult = await db.select({ count: orders.id }).from(orders);
  return { orders: result, total: countResult.length };
}

export async function updateUserRole(id: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, id));
}

// ─── Admin Audit Log ──────────────────────────────────────────────────────────

export async function createAuditLog(data: InsertAdminAuditLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(adminAuditLogs).values(data);
}

export async function getAuditLogs(targetType?: string, targetId?: number) {
  const db = await getDb();
  if (!db) return [];
  if (targetType && targetId) {
    return db.select().from(adminAuditLogs)
      .where(and(eq(adminAuditLogs.targetType, targetType), eq(adminAuditLogs.targetId, targetId)))
      .orderBy(desc(adminAuditLogs.createdAt))
      .limit(50);
  }
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
}

// ─── Product Admin ─────────────────────────────────────────────────────────────
export async function updateProduct(id: number, data: {
  priceConsumer?: string;
  pricePro?: string;
  priceMembership?: string | null;
  isProOnly?: boolean;
  visible?: boolean;
  isActive?: boolean;
  isRecommended?: boolean;
  isNew?: boolean;
  stock?: number;
  name?: string;
  description?: string;
  summaryDescription?: string;
  shortDescription?: string;
  priceSupply?: string;
  priceConsumerOriginal?: string;
  taxType?: 'taxable' | 'tax_free' | 'exempt';
  taxRate?: string;
  shippingType?: 'direct' | 'warehouse' | 'other';
  weight?: string;
  manufacturer?: string;
  brand?: string;
  origin?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  seoImageAlt?: string;
  adminMemo?: string;
  thumbnailUrl?: string;
  detailPageUrl?: string;
  sortOrder?: number;
  productCode?: string;
  productStatus?: 'new' | 'used' | 'refurbished';
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(products).set({ ...data, updatedAt: new Date() }).where(eq(products.id, id));
}

export async function getAllProducts() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(products).orderBy(products.id);
}

export async function createProduct(data: {
  slug: string;
  name: string;
  priceConsumer: string;
  pricePro: string;
  priceMembership?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  thumbnailUrl?: string | null;
  isProOnly?: boolean;
  isActive?: boolean;
  visible?: boolean;
  isRecommended?: boolean;
  isNew?: boolean;
  stock?: number;
  productCode?: string | null;
  productStatus?: 'new' | 'used' | 'refurbished';
  summaryDescription?: string | null;
  shortDescription?: string | null;
  priceSupply?: string | null;
  priceConsumerOriginal?: string | null;
  taxType?: 'taxable' | 'tax_free' | 'exempt';
  taxRate?: string | null;
  shippingType?: 'direct' | 'warehouse' | 'other';
  weight?: string | null;
  manufacturer?: string | null;
  brand?: string | null;
  origin?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  seoKeywords?: string | null;
  seoImageAlt?: string | null;
  adminMemo?: string | null;
  detailPageUrl?: string | null;
  sortOrder?: number;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.insert(products).values({
    slug: data.slug,
    name: data.name,
    priceConsumer: data.priceConsumer,
    pricePro: data.pricePro,
    priceMembership: data.priceMembership ?? null,
    description: data.description ?? null,
    imageUrl: data.imageUrl ?? null,
    thumbnailUrl: data.thumbnailUrl ?? null,
    isProOnly: data.isProOnly ?? false,
    isActive: data.isActive ?? true,
    visible: data.visible ?? true,
    isRecommended: data.isRecommended ?? false,
    isNew: data.isNew ?? false,
    stock: data.stock ?? 999,
    productCode: data.productCode ?? null,
    productStatus: data.productStatus ?? 'new',
    summaryDescription: data.summaryDescription ?? null,
    shortDescription: data.shortDescription ?? null,
    priceSupply: data.priceSupply ?? null,
    priceConsumerOriginal: data.priceConsumerOriginal ?? null,
    taxType: data.taxType ?? 'taxable',
    taxRate: data.taxRate ?? '10.00',
    shippingType: data.shippingType ?? 'direct',
    weight: data.weight ?? '1.00',
    manufacturer: data.manufacturer ?? null,
    brand: data.brand ?? null,
    origin: data.origin ?? null,
    seoTitle: data.seoTitle ?? null,
    seoDescription: data.seoDescription ?? null,
    seoKeywords: data.seoKeywords ?? null,
    seoImageAlt: data.seoImageAlt ?? null,
    adminMemo: data.adminMemo ?? null,
    detailPageUrl: data.detailPageUrl ?? null,
    sortOrder: data.sortOrder ?? 0,
  });
  const result = await db.select().from(products).where(eq(products.slug, data.slug)).limit(1);
  return result[0];
}

export async function deleteProduct(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  await db.delete(products).where(eq(products.id, id));
}

// ─── Verification Search ───────────────────────────────────────────────────────
export async function searchVerifications(opts: {
  status?: "pending" | "approved" | "rejected";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;

  // Build base query - join with users for name/email search
  let query = db
    .select({
      v: businessVerifications,
      userName: users.name,
      userEmail: users.email,
    })
    .from(businessVerifications)
    .leftJoin(users, eq(businessVerifications.userId, users.id));

  const conditions = [];
  if (opts.status) conditions.push(eq(businessVerifications.status, opts.status));
  if (opts.search) {
    const like = `%${opts.search}%`;
    conditions.push(
      or(
        sql`${businessVerifications.businessNumber} LIKE ${like}`,
        sql`${businessVerifications.businessName} LIKE ${like}`,
        sql`${users.name} LIKE ${like}`,
        sql`${users.email} LIKE ${like}`
      )!
    );
  }

  const rows = await (conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(businessVerifications.createdAt)).limit(limit).offset(offset)
    : query.orderBy(desc(businessVerifications.createdAt)).limit(limit).offset(offset));

  return { items: rows, total: rows.length };
}

// ─── Order Search ──────────────────────────────────────────────────────────────
export async function searchOrders(opts: {
  status?: "created" | "paid" | "failed" | "cancelled";
  search?: string;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;

  let query = db
    .select({
      o: orders,
      userEmail: users.email,
      userName: users.name,
    })
    .from(orders)
    .leftJoin(users, eq(orders.userId, users.id));

  const conditions = [];
  if (opts.status) conditions.push(eq(orders.status, opts.status));
  if (opts.search) {
    const like = `%${opts.search}%`;
    conditions.push(
      or(
        sql`${orders.orderId} LIKE ${like}`,
        sql`${users.email} LIKE ${like}`
      )!
    );
  }

  const rows = await (conditions.length > 0
    ? query.where(and(...conditions)).orderBy(desc(orders.createdAt)).limit(limit).offset(offset)
    : query.orderBy(desc(orders.createdAt)).limit(limit).offset(offset));

  return { items: rows, total: rows.length };
}

// ─── Dashboard Summary ─────────────────────────────────────────────────────────
export async function getDashboardSummary() {
  const db = await getDb();
  if (!db) return { pendingVerifications: 0, totalUsers: 0, todayOrders: 0, totalPaidAmount: 0 };

  const [pendingVerifs] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(businessVerifications)
    .where(eq(businessVerifications.status, "pending"));

  const [totalUsers] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(users);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [todayOrders] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(orders)
    .where(and(eq(orders.status, "paid"), sql`${orders.paidAt} >= ${today}`));

  const [totalPaid] = await db
    .select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` })
    .from(orders)
    .where(eq(orders.status, "paid"));

  // 배송 상태별 주문 수
  const [pendingOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.status, "created"));
  const [readyToShip] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.shippingStatus, "ready"));
  const [shippingOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.shippingStatus, "shipping"));
  const [deliveredOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(eq(orders.shippingStatus, "delivered"));
  const [totalOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders);
  const [todayRevenue] = await db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(orders).where(and(eq(orders.status, "paid"), sql`${orders.paidAt} >= ${today}`));

  // CS 신청 건수 (requested 상태)
  const [cancelRequested] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderCancellations).where(eq(orderCancellations.status, "requested"));
  const [exchangeRequested] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderExchanges).where(eq(orderExchanges.status, "requested"));
  const [returnRequested] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderReturns).where(eq(orderReturns.status, "requested"));
  const [refundPending] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderRefunds).where(eq(orderRefunds.status, "pending"));

  // 오늘 처리 완료 건수
  const [cancelCompleted] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderCancellations).where(and(eq(orderCancellations.status, "completed"), sql`${orderCancellations.processedAt} >= ${today}`));
  const [exchangeCompleted] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderExchanges).where(and(eq(orderExchanges.status, "completed"), sql`${orderExchanges.processedAt} >= ${today}`));
  const [returnCompleted] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderReturns).where(and(eq(orderReturns.status, "completed"), sql`${orderReturns.processedAt} >= ${today}`));
  const [refundCompleted] = await db.select({ count: sql<number>`COUNT(*)` }).from(orderRefunds).where(and(eq(orderRefunds.status, "completed"), sql`${orderRefunds.processedAt} >= ${today}`));

  // 이번 달 데이터
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [monthOrders] = await db.select({ count: sql<number>`COUNT(*)` }).from(orders).where(and(eq(orders.status, "paid"), sql`${orders.paidAt} >= ${monthStart}`));
  const [monthRevenue] = await db.select({ total: sql<number>`COALESCE(SUM(total_amount), 0)` }).from(orders).where(and(eq(orders.status, "paid"), sql`${orders.paidAt} >= ${monthStart}`));
  // 실결제금액 = 총 주문금액 - 환불금액 (취소 완료된 금액 제외)
  const [todayRefundAmount] = await db.select({ total: sql<number>`COALESCE(SUM(refund_amount), 0)` }).from(orderRefunds).where(and(eq(orderRefunds.status, "completed"), sql`${orderRefunds.processedAt} >= ${today}`));
  const [monthRefundAmount] = await db.select({ total: sql<number>`COALESCE(SUM(refund_amount), 0)` }).from(orderRefunds).where(and(eq(orderRefunds.status, "completed"), sql`${orderRefunds.processedAt} >= ${monthStart}`));
  const [totalRefundAmount] = await db.select({ total: sql<number>`COALESCE(SUM(refund_amount), 0)` }).from(orderRefunds).where(eq(orderRefunds.status, "completed"));

  return {
    pendingVerifications: Number(pendingVerifs?.count ?? 0),
    totalUsers: Number(totalUsers?.count ?? 0),
    todayOrders: Number(todayOrders?.count ?? 0),
    totalPaidAmount: Number(totalPaid?.total ?? 0),
    pendingOrders: Number(pendingOrders?.count ?? 0),
    readyToShip: Number(readyToShip?.count ?? 0),
    shippingOrders: Number(shippingOrders?.count ?? 0),
    deliveredOrders: Number(deliveredOrders?.count ?? 0),
    totalOrders: Number(totalOrders?.count ?? 0),
    todayRevenue: Number(todayRevenue?.total ?? 0),
    cancelRequested: Number(cancelRequested?.count ?? 0),
    exchangeRequested: Number(exchangeRequested?.count ?? 0),
    returnRequested: Number(returnRequested?.count ?? 0),
    refundPending: Number(refundPending?.count ?? 0),
    cancelCompleted: Number(cancelCompleted?.count ?? 0),
    exchangeCompleted: Number(exchangeCompleted?.count ?? 0),
    returnCompleted: Number(returnCompleted?.count ?? 0),
    refundCompleted: Number(refundCompleted?.count ?? 0),
    // 이번 달
    monthOrders: Number(monthOrders?.count ?? 0),
    monthRevenue: Number(monthRevenue?.total ?? 0),
    // 환불 금액
    todayRefundAmount: Number(todayRefundAmount?.total ?? 0),
    monthRefundAmount: Number(monthRefundAmount?.total ?? 0),
    totalRefundAmount: Number(totalRefundAmount?.total ?? 0),
    // 실결제금액 = 주문금액 - 환불금액
    todayNetRevenue: Number(todayRevenue?.total ?? 0) - Number(todayRefundAmount?.total ?? 0),
    monthNetRevenue: Number(monthRevenue?.total ?? 0) - Number(monthRefundAmount?.total ?? 0),
  };
}

// ─── Dashboard Chart Data ───────────────────────────────────────────────────────

/** 최근 N일간 일별 주문 수 + 매출 집계 */
export async function getDailyOrderStats(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.execute(sql`
    SELECT
      DATE(paid_at) AS day,
      COUNT(*) AS order_count,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM orders
    WHERE status = 'paid'
      AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(paid_at)
    ORDER BY day ASC
  `);

  return (rows[0] as unknown as any[]).map((r: any) => ({
    day: String(r.day),
    orderCount: Number(r.order_count),
    revenue: Number(r.revenue),
  }));
}

/** 최근 N일간 일별 신규 가입자 수 집계 */
export async function getDailySignupStats(days = 30) {
  const db = await getDb();
  if (!db) return [];

  const rows = await db.execute(sql`
    SELECT
      DATE(created_at) AS day,
      COUNT(*) AS signup_count
    FROM users
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(created_at)
    ORDER BY day ASC
  `);

  return (rows[0] as unknown as any[]).map((r: any) => ({
    day: String(r.day),
    signupCount: Number(r.signup_count),
  }));
}

/** 인증 상태별 현황 */
export async function getVerificationStatusStats() {
  const db = await getDb();
  if (!db) return { pending: 0, approved: 0, rejected: 0 };

  const rows = await db.execute(sql`
    SELECT status, COUNT(*) AS cnt
    FROM business_verifications
    GROUP BY status
  `);

  const result = { pending: 0, approved: 0, rejected: 0 };
  for (const r of (rows[0] as unknown as any[])) {
    const s = r.status as keyof typeof result;
    if (s in result) result[s] = Number(r.cnt);
  }
  return result;
}

// ─── Gallery Posts ─────────────────────────────────────────────────────────────
import {
  GalleryPost,
  InsertGalleryPost,
  MagazinePost,
  InsertMagazinePost,
  InsertPostImage,
  Popup,
  InsertPopup,
  InsertPageView,
  galleryPosts,
  magazinePosts,
  postImages,
  popups,
  pageViews,
} from "../drizzle/schema";

export async function getGalleryPosts(opts: { page?: number; limit?: number; publishedOnly?: boolean } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;
  const conditions = opts.publishedOnly ? [eq(galleryPosts.isPublished, true)] : [];
  const rows = conditions.length > 0
    ? await db.select().from(galleryPosts).where(and(...conditions)).orderBy(desc(galleryPosts.createdAt)).limit(limit).offset(offset)
    : await db.select().from(galleryPosts).orderBy(desc(galleryPosts.createdAt)).limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(galleryPosts);
  return { items: rows, total: Number(countRow?.count ?? 0) };
}

export async function getGalleryPostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(galleryPosts).where(eq(galleryPosts.id, id)).limit(1);
  return result[0];
}

export async function createGalleryPost(data: InsertGalleryPost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(galleryPosts).values(data);
  const result = await db.select().from(galleryPosts).orderBy(desc(galleryPosts.createdAt)).limit(1);
  return result[0];
}

export async function updateGalleryPost(id: number, data: Partial<GalleryPost>) {
  const db = await getDb();
  if (!db) return;
  await db.update(galleryPosts).set({ ...data, updatedAt: new Date() }).where(eq(galleryPosts.id, id));
}

export async function deleteGalleryPost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(galleryPosts).where(eq(galleryPosts.id, id));
}

// ─── Magazine Posts ────────────────────────────────────────────────────────────

export async function getMagazinePosts(opts: { page?: number; limit?: number; publishedOnly?: boolean } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = opts.page ?? 1;
  const limit = opts.limit ?? 20;
  const offset = (page - 1) * limit;
  const conditions = opts.publishedOnly ? [eq(magazinePosts.isPublished, true)] : [];
  const rows = conditions.length > 0
    ? await db.select().from(magazinePosts).where(and(...conditions)).orderBy(desc(magazinePosts.createdAt)).limit(limit).offset(offset)
    : await db.select().from(magazinePosts).orderBy(desc(magazinePosts.createdAt)).limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(magazinePosts);
  return { items: rows, total: Number(countRow?.count ?? 0) };
}

export async function getMagazinePostById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(magazinePosts).where(eq(magazinePosts.id, id)).limit(1);
  return result[0];
}

export async function createMagazinePost(data: InsertMagazinePost) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(magazinePosts).values(data);
  const result = await db.select().from(magazinePosts).orderBy(desc(magazinePosts.createdAt)).limit(1);
  return result[0];
}

export async function updateMagazinePost(id: number, data: Partial<MagazinePost>) {
  const db = await getDb();
  if (!db) return;
  await db.update(magazinePosts).set({ ...data, updatedAt: new Date() }).where(eq(magazinePosts.id, id));
}

export async function deleteMagazinePost(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(magazinePosts).where(eq(magazinePosts.id, id));
}

// ─── Post Images ───────────────────────────────────────────────────────────────

export async function getPostImages(postType: "gallery" | "magazine", postId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(postImages)
    .where(and(eq(postImages.postType, postType), eq(postImages.postId, postId)))
    .orderBy(postImages.sortOrder);
}

export async function createPostImage(data: InsertPostImage) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(postImages).values(data);
}

export async function deletePostImage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postImages).where(eq(postImages.id, id));
}

export async function deletePostImagesByPost(postType: "gallery" | "magazine", postId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(postImages).where(and(eq(postImages.postType, postType), eq(postImages.postId, postId)));
}

// ─── Popups ────────────────────────────────────────────────────────────────────

export async function getPopups(opts: { activeOnly?: boolean } = {}) {
  const db = await getDb();
  if (!db) return [];
  if (opts.activeOnly) {
    const now = new Date();
    return db.select().from(popups)
      .where(
        and(
          eq(popups.isActive, true),
          or(
            sql`${popups.startAt} IS NULL`,
            sql`${popups.startAt} <= ${now}`
          )!,
          or(
            sql`${popups.endAt} IS NULL`,
            sql`${popups.endAt} >= ${now}`
          )!
        )
      )
      .orderBy(popups.sortOrder, desc(popups.createdAt));
  }
  return db.select().from(popups).orderBy(desc(popups.createdAt));
}

export async function getPopupById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(popups).where(eq(popups.id, id)).limit(1);
  return result[0];
}

export async function createPopup(data: InsertPopup) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(popups).values(data);
  const result = await db.select().from(popups).orderBy(desc(popups.createdAt)).limit(1);
  return result[0];
}

export async function updatePopup(id: number, data: Partial<Popup>) {
  const db = await getDb();
  if (!db) return;
  await db.update(popups).set({ ...data, updatedAt: new Date() }).where(eq(popups.id, id));
}

export async function deletePopup(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(popups).where(eq(popups.id, id));
}

export async function incrementPopupClickCount(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(popups).set({ clickCount: sql`click_count + 1` as any }).where(eq(popups.id, id));
}

// ─── Page Views ────────────────────────────────────────────────────────────────

export async function recordPageView(data: InsertPageView) {
  const db = await getDb();
  if (!db) return;
  await db.insert(pageViews).values(data);
}

export async function getPageViewStats(days = 30) {
  const db = await getDb();
  if (!db) return { total: 0, byDay: [], byDevice: [], topPages: [], byHour: [], byDayOfWeek: [] };

  const [totalRow] = await db.select({ count: sql<number>`COUNT(*)` })
    .from(pageViews)
    .where(sql`${pageViews.createdAt} >= DATE_SUB(NOW(), INTERVAL ${days} DAY)`);

  const byDayRows = await db.execute(sql`
    SELECT DATE(created_at) AS day, COUNT(*) AS cnt, device_type
    FROM page_views
    WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY DATE(created_at), device_type
    ORDER BY day ASC
  `);

  const byDeviceRows = await db.execute(sql`
    SELECT device_type, COUNT(*) AS cnt
    FROM page_views
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY device_type
  `);

  const topPagesRows = await db.execute(sql`
    SELECT path, COUNT(*) AS cnt
    FROM page_views
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY path
    ORDER BY cnt DESC
    LIMIT 10
  `);

  const byHourRows = await db.execute(sql`
    SELECT HOUR(created_at) AS hour, COUNT(*) AS cnt
    FROM page_views
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY HOUR(created_at)
    ORDER BY hour ASC
  `);

  const byDayOfWeekRows = await db.execute(sql`
    SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS cnt
    FROM page_views
    WHERE created_at >= DATE_SUB(NOW(), INTERVAL ${days} DAY)
    GROUP BY DAYOFWEEK(created_at)
    ORDER BY dow ASC
  `);

  return {
    total: Number(totalRow?.count ?? 0),
    byDay: (byDayRows[0] as unknown as any[]).map((r: any) => ({ day: String(r.day), count: Number(r.cnt), device: r.device_type })),
    byDevice: (byDeviceRows[0] as unknown as any[]).map((r: any) => ({ device: r.device_type, count: Number(r.cnt) })),
    topPages: (topPagesRows[0] as unknown as any[]).map((r: any) => ({ path: r.path, count: Number(r.cnt) })),
    byHour: (byHourRows[0] as unknown as any[]).map((r: any) => ({ hour: Number(r.hour), count: Number(r.cnt) })),
    byDayOfWeek: (byDayOfWeekRows[0] as unknown as any[]).map((r: any) => ({ dow: Number(r.dow), count: Number(r.cnt) })),
  };
}

// ─── Sales Stats ───────────────────────────────────────────────────────────────

export async function getSalesStats(period: "day" | "week" | "month" = "day", days = 30) {
  const db = await getDb();
  if (!db) return [];

  let groupBy = "DATE(paid_at)";
  if (period === "week") groupBy = "YEARWEEK(paid_at, 1)";
  if (period === "month") groupBy = "DATE_FORMAT(paid_at, '%Y-%m')";

  const rows = await db.execute(sql`
    SELECT
      ${sql.raw(groupBy)} AS period_key,
      COUNT(*) AS order_count,
      COALESCE(SUM(total_amount), 0) AS revenue
    FROM orders
    WHERE status = 'paid'
      AND paid_at >= DATE_SUB(CURDATE(), INTERVAL ${days} DAY)
    GROUP BY ${sql.raw(groupBy)}
    ORDER BY period_key ASC
  `);

  return (rows[0] as unknown as any[]).map((r: any) => ({
    periodKey: String(r.period_key),
    orderCount: Number(r.order_count),
    revenue: Number(r.revenue),
  }));
}

export async function getProductSalesStats() {
  const db = await getDb();
  if (!db) return { topSelling: [], cartAnalysis: [] };

  const topSellingRows = await db.execute(sql`
    SELECT oi.product_id, oi.product_name, SUM(oi.quantity) AS total_qty, SUM(oi.subtotal) AS total_revenue
    FROM order_items oi
    JOIN orders o ON oi.order_id = o.id
    WHERE o.status = 'paid'
    GROUP BY oi.product_id, oi.product_name
    ORDER BY total_qty DESC
    LIMIT 10
  `);

  return {
    topSelling: (topSellingRows[0] as unknown as any[]).map((r: any) => ({
      productId: Number(r.product_id),
      productName: String(r.product_name),
      totalQty: Number(r.total_qty),
      totalRevenue: Number(r.total_revenue),
    })),
    cartAnalysis: [],
  };
}

export async function getCustomerStats() {
  const db = await getDb();
  if (!db) return { byMemberRole: [], byDayOfWeek: [], byHour: [] };

  const byMemberRoleRows = await db.execute(sql`
    SELECT member_role, COUNT(*) AS cnt
    FROM users
    GROUP BY member_role
  `);

  const byDowRows = await db.execute(sql`
    SELECT DAYOFWEEK(created_at) AS dow, COUNT(*) AS cnt
    FROM orders
    WHERE status = 'paid'
    GROUP BY DAYOFWEEK(created_at)
    ORDER BY dow ASC
  `);

  const byHourRows = await db.execute(sql`
    SELECT HOUR(created_at) AS hour, COUNT(*) AS cnt
    FROM orders
    WHERE status = 'paid'
    GROUP BY HOUR(created_at)
    ORDER BY hour ASC
  `);

  return {
    byMemberRole: (byMemberRoleRows[0] as unknown as any[]).map((r: any) => ({ role: r.member_role, count: Number(r.cnt) })),
    byDayOfWeek: (byDowRows[0] as unknown as any[]).map((r: any) => ({ dow: Number(r.dow), count: Number(r.cnt) })),
    byHour: (byHourRows[0] as unknown as any[]).map((r: any) => ({ hour: Number(r.hour), count: Number(r.cnt) })),
  };
}

// ─── Shipping Status & 3PL Helpers ───────────────────────────────────────────
export async function updateOrderShipping(
  orderId: string,
  data: {
    shippingStatus?: "pending_payment" | "ready" | "hold" | "shipping" | "delivered" | "none";
    courierCode?: string | null;
    courierName?: string | null;
    trackingNumber?: string | null;
    shippedAt?: Date | null;
    deliveredAt?: Date | null;
    recipientName?: string | null;
    recipientPhone?: string | null;
    shippingAddress?: string | null;
    shippingZipCode?: string | null;
    shippingMemo?: string | null;
    externalOrderId?: string | null;
    thirdPartyStatus?: "none" | "synced" | "error";
    thirdPartySyncedAt?: Date | null;
    adminMemo?: string | null;
    paymentMethod?: string | null;
  }
) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data as any).where(eq(orders.orderId, orderId));
}

export async function getOrdersByShippingStatus(
  shippingStatus: "pending_payment" | "ready" | "hold" | "shipping" | "delivered",
  opts: { page?: number; limit?: number; search?: string; dateFrom?: Date; dateTo?: Date } = {}
) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orders)
    .where(eq(orders.shippingStatus, shippingStatus))
    .orderBy(desc(orders.createdAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

// ─── Order Cancellations ─────────────────────────────────────────────────────

export async function getCancellations(opts: {
  status?: string;
  cancelType?: string;
  search?: string;
  page?: number;
  limit?: number;
  dateFrom?: Date;
  dateTo?: Date;
} = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orderCancellations)
    .leftJoin(orders, eq(orderCancellations.orderId, orders.id))
    .orderBy(desc(orderCancellations.createdAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

export async function createCancellation(data: InsertOrderCancellation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderCancellations).values(data);
  const result = await db.select().from(orderCancellations)
    .where(eq(orderCancellations.orderId, data.orderId))
    .orderBy(desc(orderCancellations.createdAt)).limit(1);
  return result[0];
}

export async function updateCancellation(id: number, data: Partial<InsertOrderCancellation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orderCancellations).set(data as any).where(eq(orderCancellations.id, id));
}

// ─── Order Exchanges ──────────────────────────────────────────────────────────
export async function getExchanges(opts: { status?: string; page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orderExchanges)
    .leftJoin(orders, eq(orderExchanges.orderId, orders.id))
    .orderBy(desc(orderExchanges.createdAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

export async function createExchange(data: InsertOrderExchange) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderExchanges).values(data);
  const result = await db.select().from(orderExchanges)
    .where(eq(orderExchanges.orderId, data.orderId))
    .orderBy(desc(orderExchanges.createdAt)).limit(1);
  return result[0];
}

export async function updateExchange(id: number, data: Partial<InsertOrderExchange>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orderExchanges).set(data as any).where(eq(orderExchanges.id, id));
}

// ─── Order Returns ────────────────────────────────────────────────────────────
export async function getReturns(opts: { status?: string; page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orderReturns)
    .leftJoin(orders, eq(orderReturns.orderId, orders.id))
    .orderBy(desc(orderReturns.createdAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

export async function createReturn(data: InsertOrderReturn) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderReturns).values(data);
  const result = await db.select().from(orderReturns)
    .where(eq(orderReturns.orderId, data.orderId))
    .orderBy(desc(orderReturns.createdAt)).limit(1);
  return result[0];
}

export async function updateReturn(id: number, data: Partial<InsertOrderReturn>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orderReturns).set(data as any).where(eq(orderReturns.id, id));
}

// ─── Order Refunds ────────────────────────────────────────────────────────────
export async function getRefunds(opts: { status?: string; page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(orderRefunds)
    .leftJoin(orders, eq(orderRefunds.orderId, orders.id))
    .orderBy(desc(orderRefunds.createdAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

export async function createRefund(data: InsertOrderRefund) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(orderRefunds).values(data);
  const result = await db.select().from(orderRefunds)
    .where(eq(orderRefunds.orderId, data.orderId))
    .orderBy(desc(orderRefunds.createdAt)).limit(1);
  return result[0];
}

export async function updateRefund(id: number, data: Partial<InsertOrderRefund>) {
  const db = await getDb();
  if (!db) return;
  await db.update(orderRefunds).set(data as any).where(eq(orderRefunds.id, id));
}

// ─── Card Cancellations ───────────────────────────────────────────────────────
export async function getCardCancellations(opts: { page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { rows: [], total: 0 };
  const { page = 1, limit = 20 } = opts;
  const offset = (page - 1) * limit;
  const rows = await db
    .select()
    .from(cardCancellations)
    .leftJoin(orders, eq(cardCancellations.orderId, orders.id))
    .orderBy(desc(cardCancellations.cancelledAt))
    .limit(limit)
    .offset(offset);
  return { rows, total: rows.length };
}

export async function createCardCancellation(data: InsertCardCancellation) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(cardCancellations).values(data);
  const result = await db.select().from(cardCancellations)
    .where(eq(cardCancellations.orderId, data.orderId))
    .orderBy(desc(cardCancellations.cancelledAt)).limit(1);
  return result[0];
}

// ─── 3PL Webhook Logs ─────────────────────────────────────────────────────────
export async function createThirdPartyLog(data: InsertThirdPartyLog) {
  const db = await getDb();
  if (!db) return;
  await db.insert(thirdPartyLogs).values(data);
}

export async function getThirdPartyLogs(orderId?: number, opts: { page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return [];
  const { limit = 50 } = opts;
  const q = db.select().from(thirdPartyLogs).orderBy(desc(thirdPartyLogs.createdAt)).limit(limit);
  if (orderId) {
    return db.select().from(thirdPartyLogs)
      .where(eq(thirdPartyLogs.orderId, orderId))
      .orderBy(desc(thirdPartyLogs.createdAt)).limit(limit);
  }
  return q;
}

// ─── Order Dashboard Summary (확장) ──────────────────────────────────────────
export async function getOrderDashboardSummary() {
  const db = await getDb();
  if (!db) return null;

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [todayOrders, monthOrders, pendingPayment, ready, hold, shipping, delivered,
    cancelRequested, exchangeRequested, returnRequested, refundPending] = await Promise.all([
    db.select().from(orders).where(and(eq(orders.status, "paid"), gte(orders.paidAt, todayStart))),
    db.select().from(orders).where(and(eq(orders.status, "paid"), gte(orders.paidAt, monthStart))),
    db.select().from(orders).where(eq(orders.shippingStatus, "pending_payment")),
    db.select().from(orders).where(eq(orders.shippingStatus, "ready")),
    db.select().from(orders).where(eq(orders.shippingStatus, "hold")),
    db.select().from(orders).where(eq(orders.shippingStatus, "shipping")),
    db.select().from(orders).where(eq(orders.shippingStatus, "delivered")),
    db.select().from(orderCancellations).where(eq(orderCancellations.status, "requested")),
    db.select().from(orderExchanges).where(eq(orderExchanges.status, "requested")),
    db.select().from(orderReturns).where(eq(orderReturns.status, "requested")),
    db.select().from(orderRefunds).where(eq(orderRefunds.status, "pending")),
  ]);

  const todaySales = todayOrders.reduce((s, o) => s + Number(o.totalAmount), 0);
  const monthSales = monthOrders.reduce((s, o) => s + Number(o.totalAmount), 0);

  return {
    today: { orders: todayOrders.length, sales: todaySales },
    month: { orders: monthOrders.length, sales: monthSales },
    shipping: {
      pendingPayment: pendingPayment.length,
      ready: ready.length,
      hold: hold.length,
      shipping: shipping.length,
      delivered: delivered.length,
    },
    cs: {
      cancelRequested: cancelRequested.length,
      exchangeRequested: exchangeRequested.length,
      returnRequested: returnRequested.length,
      refundPending: refundPending.length,
    },
  };
}

// ─── Order Detail (Full) ──────────────────────────────────────────────────────
export async function getOrderDetailFull(orderId: string) {
  const db = await getDb();
  if (!db) return null;

  // 주문 기본 정보
  const orderResult = await db.select().from(orders).where(eq(orders.orderId, orderId)).limit(1);
  if (!orderResult.length) return null;
  const order = orderResult[0];

  // 주문자 정보
  const userResult = await db.select().from(users).where(eq(users.id, order.userId)).limit(1);
  const user = userResult.length ? userResult[0] : null;

  // 주문 상품 목록
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));

  // 취소 내역
  const cancellations = await db.select().from(orderCancellations).where(eq(orderCancellations.orderId, order.id));

  // 교환 내역
  const exchanges = await db.select().from(orderExchanges).where(eq(orderExchanges.orderId, order.id));

  // 반품 내역
  const returns = await db.select().from(orderReturns).where(eq(orderReturns.orderId, order.id));

  // 환불 내역
  const refunds = await db.select().from(orderRefunds).where(eq(orderRefunds.orderId, order.id));

  return {
    order,
    user,
    items,
    cancellations,
    exchanges,
    returns,
    refunds,
  };
}

// ─── Update Order Admin Memo ──────────────────────────────────────────────────
export async function updateOrderAdminMemo(orderId: string, adminMemo: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set({ adminMemo }).where(eq(orders.orderId, orderId));
}

// ─── Update Order Shipping Info ───────────────────────────────────────────────
export async function updateOrderShippingInfo(orderId: string, data: {
  recipientName?: string;
  recipientPhone?: string;
  shippingAddress?: string;
  shippingZipCode?: string;
  shippingMemo?: string;
}) {
  const db = await getDb();
  if (!db) return;
  await db.update(orders).set(data).where(eq(orders.orderId, orderId));
}

// ─── Reviews (후기 관리) ──────────────────────────────────────────────────────
export async function getReviews(opts?: {
  category?: string;
  publishedOnly?: boolean;
  page?: number;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const page = opts?.page ?? 1;
  const limit = opts?.limit ?? 100;
  const offset = (page - 1) * limit;

  const conditions = [];
  if (opts?.category) conditions.push(eq(reviews.category, opts.category as any));
  if (opts?.publishedOnly) conditions.push(eq(reviews.isPublished, true));

  const items = await db
    .select()
    .from(reviews)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(reviews.sortOrder, desc(reviews.createdAt))
    .limit(limit)
    .offset(offset);

  const [countRow] = await db
    .select({ count: sql<number>`count(*)` })
    .from(reviews)
    .where(conditions.length > 0 ? and(...conditions) : undefined);

  return { items, total: Number(countRow?.count ?? 0) };
}

export async function getReviewById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const [row] = await db.select().from(reviews).where(eq(reviews.id, id));
  return row ?? null;
}

export async function createReview(data: InsertReview) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(reviews).values(data);
  const [row] = await db
    .select()
    .from(reviews)
    .orderBy(desc(reviews.createdAt))
    .limit(1);
  return row;
}

export async function updateReview(id: number, data: Partial<InsertReview>) {
  const db = await getDb();
  if (!db) return;
  await db.update(reviews).set(data).where(eq(reviews.id, id));
}

export async function deleteReview(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(reviews).where(eq(reviews.id, id));
}


// ─── Certified Instructors (인증강사 갤러리) ──────────────────────────────────

export async function getCertifiedInstructors(opts: { publishedOnly?: boolean; page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts.limit ?? 100;
  const offset = ((opts.page ?? 1) - 1) * limit;
  const conditions = opts.publishedOnly ? [eq(certifiedInstructors.isPublished, true)] : [];
  const items = conditions.length
    ? await db.select().from(certifiedInstructors).where(and(...conditions)).orderBy(certifiedInstructors.sortOrder, desc(certifiedInstructors.createdAt)).limit(limit).offset(offset)
    : await db.select().from(certifiedInstructors).orderBy(certifiedInstructors.sortOrder, desc(certifiedInstructors.createdAt)).limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(certifiedInstructors);
  return { items, total: Number(countRow?.count ?? 0) };
}

export async function getCertifiedInstructorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(certifiedInstructors).where(eq(certifiedInstructors.id, id)).limit(1);
  return result[0];
}

export async function createCertifiedInstructor(data: InsertCertifiedInstructor) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(certifiedInstructors).values(data);
  const [row] = await db.select().from(certifiedInstructors).orderBy(desc(certifiedInstructors.createdAt)).limit(1);
  return row;
}

export async function updateCertifiedInstructor(id: number, data: Partial<InsertCertifiedInstructor>) {
  const db = await getDb();
  if (!db) return;
  await db.update(certifiedInstructors).set({ ...data, updatedAt: new Date() }).where(eq(certifiedInstructors.id, id));
}

export async function deleteCertifiedInstructor(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(certifiedInstructors).where(eq(certifiedInstructors.id, id));
}

// ─── Coupons (쿠폰 관리) ─────────────────────────────────────────────────────

export async function getCoupons(opts: { page?: number; limit?: number; status?: string } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts.limit ?? 20;
  const offset = ((opts.page ?? 1) - 1) * limit;
  const conditions = opts.status ? [eq(coupons.status, opts.status)] : [];
  const items = conditions.length
    ? await db.select().from(coupons).where(and(...conditions)).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset)
    : await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(limit).offset(offset);
  const [countRow] = conditions.length
    ? await db.select({ count: sql<number>`COUNT(*)` }).from(coupons).where(and(...conditions))
    : await db.select({ count: sql<number>`COUNT(*)` }).from(coupons);
  return { items, total: Number(countRow?.count ?? 0) };
}

export async function getCouponById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(coupons).where(eq(coupons.id, id)).limit(1);
  return result[0];
}

export async function createCoupon(data: InsertCoupon) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(coupons).values(data);
  const [row] = await db.select().from(coupons).orderBy(desc(coupons.createdAt)).limit(1);
  return row;
}

export async function updateCoupon(id: number, data: Partial<InsertCoupon>) {
  const db = await getDb();
  if (!db) return;
  await db.update(coupons).set({ ...data, updatedAt: new Date() }).where(eq(coupons.id, id));
}

export async function deleteCoupon(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(coupons).where(eq(coupons.id, id));
}

// ─── Coupon Issues (쿠폰 발급 내역) ─────────────────────────────────────────

export async function getCouponIssues(opts: { couponId?: number; userId?: number; page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts.limit ?? 20;
  const offset = ((opts.page ?? 1) - 1) * limit;
  const conditions: ReturnType<typeof eq>[] = [];
  if (opts.couponId) conditions.push(eq(couponIssues.couponId, opts.couponId));
  if (opts.userId) conditions.push(eq(couponIssues.userId, opts.userId));
  const items = conditions.length
    ? await db.select().from(couponIssues).where(and(...conditions)).orderBy(desc(couponIssues.createdAt)).limit(limit).offset(offset)
    : await db.select().from(couponIssues).orderBy(desc(couponIssues.createdAt)).limit(limit).offset(offset);
  const [countRow] = conditions.length
    ? await db.select({ count: sql<number>`COUNT(*)` }).from(couponIssues).where(and(...conditions))
    : await db.select({ count: sql<number>`COUNT(*)` }).from(couponIssues);
  return { items, total: Number(countRow?.count ?? 0) };
}

export async function issueCouponToUser(couponId: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  // 16자리 쿠폰 번호 생성
  const couponNumber = Date.now().toString().slice(-10) + Math.floor(Math.random() * 1000000).toString().padStart(6, '0');
  await db.insert(couponIssues).values({ couponId, userId, couponNumber });
  // totalIssued 증가
  await db.update(coupons).set({ totalIssued: sql`totalIssued + 1` }).where(eq(coupons.id, couponId));
  const [row] = await db.select().from(couponIssues).orderBy(desc(couponIssues.createdAt)).limit(1);
  return row;
}

export async function deleteCouponIssue(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(couponIssues).set({ isDeleted: true }).where(eq(couponIssues.id, id));
}

// ─── Discount Codes (할인코드) ───────────────────────────────────────────────

export async function getDiscountCodes(opts: { page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts.limit ?? 20;
  const offset = ((opts.page ?? 1) - 1) * limit;
  const items = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt)).limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(discountCodes);
  return { items, total: Number(countRow?.count ?? 0) };
}

export async function getDiscountCodeById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discountCodes).where(eq(discountCodes.id, id)).limit(1);
  return result[0];
}

export async function getDiscountCodeByCode(code: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(discountCodes).where(eq(discountCodes.code, code)).limit(1);
  return result[0];
}

export async function createDiscountCode(data: InsertDiscountCode) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(discountCodes).values(data);
  const [row] = await db.select().from(discountCodes).orderBy(desc(discountCodes.createdAt)).limit(1);
  return row;
}

export async function updateDiscountCode(id: number, data: Partial<InsertDiscountCode>) {
  const db = await getDb();
  if (!db) return;
  await db.update(discountCodes).set({ ...data, updatedAt: new Date() }).where(eq(discountCodes.id, id));
}

export async function deleteDiscountCode(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(discountCodes).where(eq(discountCodes.id, id));
}

// ─── Remind Alerts (리마인드 Me) ─────────────────────────────────────────────

export async function getRemindAlerts(opts: { page?: number; limit?: number } = {}) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const limit = opts.limit ?? 20;
  const offset = ((opts.page ?? 1) - 1) * limit;
  const items = await db.select().from(remindAlerts).orderBy(desc(remindAlerts.createdAt)).limit(limit).offset(offset);
  const [countRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(remindAlerts);
  return { items, total: Number(countRow?.count ?? 0) };
}

export async function getRemindAlertById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(remindAlerts).where(eq(remindAlerts.id, id)).limit(1);
  return result[0];
}

export async function createRemindAlert(data: InsertRemindAlert) {
  const db = await getDb();
  if (!db) return undefined;
  await db.insert(remindAlerts).values(data);
  const [row] = await db.select().from(remindAlerts).orderBy(desc(remindAlerts.createdAt)).limit(1);
  return row;
}

export async function updateRemindAlert(id: number, data: Partial<InsertRemindAlert>) {
  const db = await getDb();
  if (!db) return;
  await db.update(remindAlerts).set({ ...data, updatedAt: new Date() }).where(eq(remindAlerts.id, id));
}

export async function deleteRemindAlert(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(remindAlerts).where(eq(remindAlerts.id, id));
}

// 프로모션 대시보드 통계
export async function getPromotionStats() {
  const db = await getDb();
  if (!db) return { activeCoupons: 0, totalCouponIssued: 0, activeDiscountCodes: 0, activeRemindAlerts: 0 };
  const [activeCouponsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(coupons).where(eq(coupons.status, 'active'));
  const [totalIssuedRow] = await db.select({ total: sql<number>`SUM(totalIssued)` }).from(coupons);
  const [activeDiscountCodesRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(discountCodes);
  const [activeRemindAlertsRow] = await db.select({ count: sql<number>`COUNT(*)` }).from(remindAlerts).where(eq(remindAlerts.isActive, true));
  return {
    activeCoupons: Number(activeCouponsRow?.count ?? 0),
    totalCouponIssued: Number(totalIssuedRow?.total ?? 0),
    activeDiscountCodes: Number(activeDiscountCodesRow?.count ?? 0),
    activeRemindAlerts: Number(activeRemindAlertsRow?.count ?? 0),
  };
}

// ─── Product Code Auto-generation ────────────────────────────────────────────
/**
 * R00000AA 형식의 다음 상품코드 자동 생성
 * AA → AB → ... → AZ → BA → ... → ZZ
 */
export async function generateNextProductCode(): Promise<string> {
  const db = await getDb();
  if (!db) return 'R00000AA';
  // R00000XX 형식의 코드만 조회
  const result = await db
    .select({ productCode: products.productCode })
    .from(products)
    .where(sql`${products.productCode} REGEXP '^R00000[A-Z]{2}$'`)
    .orderBy(sql`${products.productCode} DESC`)
    .limit(1);

  const lastCode = result[0]?.productCode;
  if (!lastCode) return 'R00000AA';

  const suffix = lastCode.slice(-2); // e.g. "AB"
  const c1 = suffix.charCodeAt(0); // 첫 번째 알파벳
  const c2 = suffix.charCodeAt(1); // 두 번째 알파벳

  let next1 = c1;
  let next2 = c2 + 1;
  if (next2 > 90) { // 'Z'
    next2 = 65; // 'A'
    next1 += 1;
  }
  if (next1 > 90) return 'R00000AA'; // 오버플로우 시 리셋

  return `R00000${String.fromCharCode(next1)}${String.fromCharCode(next2)}`;
}

// ─── Design Files CRUD ────────────────────────────────────────────────────────
export async function getDesignFiles(folder?: string) {
  const db = await getDb();
  if (!db) return [];
  const { designFiles } = await import('../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  if (folder) {
    return db.select().from(designFiles).where(eq(designFiles.folder, folder)).orderBy(designFiles.createdAt);
  }
  return db.select().from(designFiles).orderBy(designFiles.createdAt);
}

export async function createDesignFile(data: {
  fileName: string;
  fileKey: string;
  fileUrl: string;
  thumbnailUrl?: string | null;
  mediumUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
  folder?: string | null;
  uploadedBy?: number | null;
}) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const { designFiles } = await import('../drizzle/schema');
  await db.insert(designFiles).values({
    fileName: data.fileName,
    fileKey: data.fileKey,
    fileUrl: data.fileUrl,
    thumbnailUrl: data.thumbnailUrl ?? null,
    mediumUrl: data.mediumUrl ?? null,
    mimeType: data.mimeType ?? null,
    fileSize: data.fileSize ?? null,
    folder: data.folder ?? 'ROOT',
    uploadedBy: data.uploadedBy ?? null,
  });
  const { eq } = await import('drizzle-orm');
  const result = await db.select().from(designFiles).where(eq(designFiles.fileKey, data.fileKey)).limit(1);
  return result[0];
}

export async function deleteDesignFile(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const { designFiles } = await import('../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  const result = await db.select().from(designFiles).where(eq(designFiles.id, id)).limit(1);
  await db.delete(designFiles).where(eq(designFiles.id, id));
  return result[0];
}

export async function getDesignFolders() {
  const db = await getDb();
  if (!db) return [];
  const { designFolders } = await import('../drizzle/schema');
  return db.select().from(designFolders).orderBy(designFolders.name);
}

export async function createDesignFolder(name: string, parentId?: number | null) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const { designFolders } = await import('../drizzle/schema');
  await db.insert(designFolders).values({ name, parentId: parentId ?? null });
}

export async function deleteDesignFolder(id: number) {
  const db = await getDb();
  if (!db) throw new Error('DB not available');
  const { designFolders } = await import('../drizzle/schema');
  const { eq } = await import('drizzle-orm');
  await db.delete(designFolders).where(eq(designFolders.id, id));
}
