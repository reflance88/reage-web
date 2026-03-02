import { and, desc, eq, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  AdminAuditLog,
  BusinessVerification,
  InsertAdminAuditLog,
  InsertBusinessVerification,
  InsertOrder,
  InsertOrderItem,
  InsertUser,
  Order,
  adminAuditLogs,
  businessVerifications,
  orderItems,
  orders,
  products,
  users,
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
  isProOnly?: boolean;
  visible?: boolean;
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

  return {
    pendingVerifications: Number(pendingVerifs?.count ?? 0),
    totalUsers: Number(totalUsers?.count ?? 0),
    todayOrders: Number(todayOrders?.count ?? 0),
    totalPaidAmount: Number(totalPaid?.total ?? 0),
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
