import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createEmailUser,
  createOrder,
  createVerification,
  getLatestVerification,
  getOrderByOrderId,
  getOrderItems,
  getProductById,
  getProductBySlug,
  getProducts,
  getUserByEmail,
  getUserByResetToken,
  getUserById,
  getUserOrders,
  updateOrderStatus,
  updateUserPassword,
  updateUserProfile,
  updateUserResetToken,
  updateVerification,
} from "./db";
import { storagePut } from "./storage";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";
const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";

async function confirmTossPayment(paymentKey: string, orderId: string, amount: number) {
  const credentials = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  const response = await fetch(TOSS_CONFIRM_URL, {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ paymentKey, orderId, amount }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message ?? "토스페이먼츠 결제 승인 실패" });
  }
  return response.json();
}

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    // ─── 이메일 회원가입 ───────────────────────────────────────────────────────
    emailSignup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(50),
      }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import("bcryptjs");
        const existing = await getUserByEmail(input.email);
        if (existing) throw new TRPCError({ code: "CONFLICT", message: "이미 사용 중인 이메일입니다." });
        const passwordHash = await bcrypt.hash(input.password, 12);
        const openId = `email:${nanoid(16)}`;
        const user = await createEmailUser({ email: input.email, name: input.name, passwordHash, openId });
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        // 세션 쿠키 발급
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "secret");
        const token = await new SignJWT({ id: user.id, openId: user.openId, role: user.role })
          .setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),

    // ─── 이메일 로그인 ────────────────────────────────────────────────────────
    emailLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const bcrypt = await import("bcryptjs");
        const user = await getUserByEmail(input.email);
        if (!user || !user.passwordHash) throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) throw new TRPCError({ code: "UNAUTHORIZED", message: "이메일 또는 비밀번호가 올바르지 않습니다." });
        const { SignJWT } = await import("jose");
        const secret = new TextEncoder().encode(process.env.JWT_SECRET ?? "secret");
        const token = await new SignJWT({ id: user.id, openId: user.openId, role: user.role })
          .setProtectedHeader({ alg: "HS256" }).setExpirationTime("30d").sign(secret);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: 30 * 24 * 60 * 60 * 1000 });
        return { success: true };
      }),

    // ─── 아이디(이메일) 찾기 ──────────────────────────────────────────────────
    findEmail: publicProcedure
      .input(z.object({ name: z.string(), phone: z.string() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { users: usersTable } = await import("../drizzle/schema");
        const { and, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.select({ email: usersTable.email })
          .from(usersTable)
          .where(and(eq(usersTable.name, input.name), eq(usersTable.phone, input.phone)))
          .limit(1);
        if (!result.length || !result[0].email) throw new TRPCError({ code: "NOT_FOUND", message: "일치하는 계정을 찾을 수 없습니다." });
        const email = result[0].email;
        const masked = email.replace(/(?<=.{2}).(?=[^@]*@)/, "*");
        return { maskedEmail: masked };
      }),

    // ─── 비밀번호 재설정 요청 ─────────────────────────────────────────────────
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email() }))
      .mutation(async ({ input }) => {
        const user = await getUserByEmail(input.email);
        // 보안상 존재 여부 노출 안 함
        if (!user) return { success: true };
        const token = nanoid(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1시간
        await updateUserResetToken(user.id, token, expiresAt);
        // TODO: 실제 이메일 발송 (현재는 토큰을 응답에 포함 - 개발용)
        return { success: true, devToken: process.env.NODE_ENV === "development" ? token : undefined };
      }),

    // ─── 비밀번호 재설정 실행 ─────────────────────────────────────────────────
    resetPassword: publicProcedure
      .input(z.object({ token: z.string(), newPassword: z.string().min(8) }))
      .mutation(async ({ input }) => {
        const bcrypt = await import("bcryptjs");
        const user = await getUserByResetToken(input.token);
        if (!user || !user.resetTokenExpiresAt || user.resetTokenExpiresAt < new Date()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않거나 만료된 링크입니다." });
        }
        const passwordHash = await bcrypt.hash(input.newPassword, 12);
        await updateUserPassword(user.id, passwordHash);
        return { success: true };
      }),
  }),

  user: router({
    me: protectedProcedure.query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });
      return user;
    }),
    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().min(1).max(50).optional(), phone: z.string().max(30).optional() }))
      .mutation(async ({ ctx, input }) => {
        await updateUserProfile(ctx.user.id, input);
        return { success: true };
      }),
  }),

  product: router({
    list: publicProcedure.query(async () => getProducts()),
    bySlug: publicProcedure
      .input(z.object({ slug: z.string() }))
      .query(async ({ input }) => {
        const product = await getProductBySlug(input.slug);
        if (!product) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),
  }),

  verification: router({
    get: protectedProcedure.query(async ({ ctx }) => getLatestVerification(ctx.user.id)),
    submit: protectedProcedure
      .input(z.object({
        businessNumber: z.string().min(1),
        businessName: z.string().min(1),
        contactPhone: z.string().optional(),
        fileBase64: z.string(),
        fileName: z.string(),
        fileMimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const existing = await getLatestVerification(ctx.user.id);
        if (existing?.status === "approved") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "이미 승인된 인증이 있습니다." });
        }

        const fileBuffer = Buffer.from(input.fileBase64, "base64");
        const suffix = nanoid(8);
        const fileKey = `business-verifications/${ctx.user.id}-${suffix}-${input.fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, fileBuffer, input.fileMimeType);

        const verData = {
          businessNumber: input.businessNumber,
          businessName: input.businessName,
          contactPhone: input.contactPhone ?? null,
          fileUrl,
          fileKey,
          fileName: input.fileName,
          status: "pending" as const,
          rejectReason: null as string | null,
        };

        if (existing && (existing.status === "pending" || existing.status === "rejected")) {
          await updateVerification(existing.id, verData);
        } else {
          await createVerification({ userId: ctx.user.id, ...verData });
        }

        const { getDb } = await import("./db");
        const db = await getDb();
        if (db) {
          const { users } = await import("../drizzle/schema");
          const { eq } = await import("drizzle-orm");
          await db.update(users).set({ proVerificationStatus: "pending" }).where(eq(users.id, ctx.user.id));
        }

        return { success: true, status: "pending" };
      }),
  }),

  order: router({
    create: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) })),
      }))
      .mutation(async ({ ctx, input }) => {
        const user = await getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND" });

        const isPro = user.memberRole === "professional" && user.proVerificationStatus === "approved";

        const resolvedItems = await Promise.all(
          input.items.map(async (item) => {
            const product = await getProductById(item.productId);
            if (!product?.isActive) throw new TRPCError({ code: "NOT_FOUND", message: "제품을 찾을 수 없습니다." });
            if (product.isProOnly && !isPro) throw new TRPCError({ code: "FORBIDDEN", message: "전문가 인증 완료 후 구매할 수 있는 상품입니다." });
            const unitPrice = isPro ? Number(product.pricePro) : Number(product.priceConsumer);
            return { productId: product.id, productName: product.name, quantity: item.quantity, unitPrice, subtotal: unitPrice * item.quantity };
          })
        );

        const totalAmount = resolvedItems.reduce((sum, i) => sum + i.subtotal, 0);
        const orderId = `REAGE-${nanoid(12)}`;
        const orderName = resolvedItems.length === 1 ? resolvedItems[0].productName : `${resolvedItems[0].productName} 외 ${resolvedItems.length - 1}건`;

        const order = await createOrder(
          { orderId, userId: user.id, userRoleSnapshot: isPro ? "professional" : "consumer", proStatusSnapshot: user.proVerificationStatus, totalAmount: String(totalAmount), status: "created", orderName },
          resolvedItems.map((i) => ({ ...i, orderId: 0, unitPrice: String(i.unitPrice), subtotal: String(i.subtotal) }))
        );

        return { orderId: order.orderId, totalAmount, orderName };
      }),

    verify: protectedProcedure
      .input(z.object({ paymentKey: z.string(), orderId: z.string(), amount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (order.status === "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 결제 완료된 주문입니다." });
        if (Number(order.totalAmount) !== input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "결제 금액이 일치하지 않습니다." });

        await confirmTossPayment(input.paymentKey, input.orderId, input.amount);
        await updateOrderStatus(input.orderId, { status: "paid", paymentKey: input.paymentKey, paidAt: new Date() });
        return { success: true };
      }),

    fail: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (order.status !== "paid") await updateOrderStatus(input.orderId, { status: "failed" });
        return { success: true };
      }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const orderList = await getUserOrders(ctx.user.id);
      return Promise.all(orderList.map(async (order) => ({ ...order, items: await getOrderItems(order.id) })));
    }),
  }),
});

export type AppRouter = typeof appRouter;
