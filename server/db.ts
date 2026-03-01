import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  BusinessVerification,
  InsertBusinessVerification,
  InsertOrder,
  InsertOrderItem,
  InsertUser,
  Order,
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
