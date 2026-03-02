import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveVerification,
  createAuditLog,
  createEmailUser,
  createOrder,
  createVerification,
  getAllOrders,
  getAllProducts,
  getAllUsers,
  getAllVerifications,
  getAuditLogs,
  getDashboardSummary,
  getDailyOrderStats,
  getDailySignupStats,
  getVerificationStatusStats,
  getLatestVerification,
  getOrderDetailFull,
  updateOrderAdminMemo,
  updateOrderShippingInfo,
  getOrderByOrderId,
  getOrderItems,
  getProductById,
  getProductBySlug,
  getProducts,
  getUserByEmail,
  getUserByResetToken,
  getUserById,
  getUserOrders,
  rejectVerification,
  searchOrders,
  searchVerifications,
  updateOrderStatus,
  updateProduct,
  updateUserPassword,
  updateUserProfile,
  updateUserResetToken,
  updateUserRole,
  updateVerification,
  // Gallery
  getGalleryPosts,
  getGalleryPostById,
  createGalleryPost,
  updateGalleryPost,
  deleteGalleryPost,
  // Magazine
  getMagazinePosts,
  getMagazinePostById,
  createMagazinePost,
  updateMagazinePost,
  deleteMagazinePost,
  // Post Images
  getPostImages,
  createPostImage,
  deletePostImage,
  deletePostImagesByPost,
  // Popups
  getPopups,
  getPopupById,
  createPopup,
  updatePopup,
  deletePopup,
  incrementPopupClickCount,
  // Stats
  recordPageView,
  getPageViewStats,
  getSalesStats,
  getProductSalesStats,
  getCustomerStats,
  // Shipping
  updateOrderShipping,
  getOrdersByShippingStatus,
  // Cancellations
  getCancellations,
  createCancellation,
  updateCancellation,
  // Exchanges
  getExchanges,
  createExchange,
  updateExchange,
  // Returns
  getReturns,
  createReturn,
  updateReturn,
  // Refunds
  getRefunds,
  createRefund,
  updateRefund,
  // Card Cancellations
  getCardCancellations,
  createCardCancellation,
  // Dashboard
  getOrderDashboardSummary,
} from "./db";
import { storagePut } from "./storage";

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY ?? "";
const TOSS_CONFIRM_URL = "https://api.tosspayments.com/v1/payments/confirm";
const TOSS_CANCEL_URL = (paymentKey: string) => `https://api.tosspayments.com/v1/payments/${paymentKey}/cancel`;

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

async function cancelTossPayment(paymentKey: string, cancelReason: string) {
  const credentials = Buffer.from(`${TOSS_SECRET_KEY}:`).toString("base64");
  const response = await fetch(TOSS_CANCEL_URL(paymentKey), {
    method: "POST",
    headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/json" },
    body: JSON.stringify({ cancelReason }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({})) as { message?: string };
    throw new TRPCError({ code: "BAD_REQUEST", message: err.message ?? "토스페이먼츠 결제 취소 실패" });
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

  // ─── Public Gallery ──────────────────────────────────────────────────────────
  gallery: router({
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        return getGalleryPosts({ page: input?.page ?? 1, limit: input?.limit ?? 20, publishedOnly: true });
      }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await getGalleryPostById(input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        return post;
      }),
  }),

  // ─── Public Magazine ──────────────────────────────────────────────────────────
  magazine: router({
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }).optional())
      .query(async ({ input }) => {
        return getMagazinePosts({ page: input?.page ?? 1, limit: input?.limit ?? 20, publishedOnly: true });
      }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const post = await getMagazinePostById(input.id);
        if (!post) throw new TRPCError({ code: "NOT_FOUND" });
        return post;
      }),
  }),

  // ─── Public Popups ────────────────────────────────────────────────────────────
  popup: router({
    active: publicProcedure.query(async () => {
      return getPopups({ activeOnly: true });
    }),
    click: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await incrementPopupClickCount(input.id);
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

  // ─── Admin ─────────────────────────────────────────────────────────────────
  admin: router({
    // adminProcedure: role === 'admin' 체크
    users: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllUsers(input.page, input.limit);
      }),

    updateUserRole: protectedProcedure
      .input(z.object({ userId: z.number(), role: z.enum(["user", "admin"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserRole(input.userId, input.role);
        return { success: true };
      }),

    verifications: protectedProcedure
      .input(z.object({ status: z.enum(["pending", "approved", "rejected"]).optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllVerifications(input.status);
      }),

    approveVerification: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await approveVerification(input.id, input.userId);
        return { success: true };
      }),

    rejectVerification: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.number(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await rejectVerification(input.id, input.userId, input.reason);
        return { success: true };
      }),

    orders: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAllOrders(input.page, input.limit);
      }),

    orderItems: protectedProcedure
      .input(z.object({ orderDbId: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getOrderItems(input.orderDbId);
      }),

    updateOrderStatus: protectedProcedure
      .input(z.object({ orderId: z.string(), status: z.enum(["created", "paid", "failed", "cancelled"]) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateOrderStatus(input.orderId, { status: input.status });
        return { success: true };
      }),

    // ─── Dashboard ─────────────────────────────────────────────────────────
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getDashboardSummary();
    }),
    dashboardCharts: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(90).default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const [orderStats, signupStats, verificationStats] = await Promise.all([
          getDailyOrderStats(input.days),
          getDailySignupStats(input.days),
          getVerificationStatusStats(),
        ]);
        return { orderStats, signupStats, verificationStats };
      }),

    // ─── Products ──────────────────────────────────────────────────────────
    allProducts: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getAllProducts();
    }),

    updateProduct: protectedProcedure
      .input(z.object({
        id: z.number(),
        priceConsumer: z.string().optional(),
        pricePro: z.string().optional(),
        isProOnly: z.boolean().optional(),
        visible: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        const before = await getProductById(id);
        await updateProduct(id, data);
        const after = await getProductById(id);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "UPDATE_PRODUCT",
          targetType: "product",
          targetId: id,
          before: JSON.stringify(before),
          after: JSON.stringify(after),
        });
        return { success: true };
      }),

    // ─── Verification Search ───────────────────────────────────────────────
    searchVerifications: protectedProcedure
      .input(z.object({
        status: z.enum(["pending", "approved", "rejected"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return searchVerifications(input);
      }),

    approveVerificationV2: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await approveVerification(input.id, input.userId);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "APPROVE_PRO",
          targetType: "pro_verification",
          targetId: input.id,
          after: JSON.stringify({ userId: input.userId, status: "approved" }),
        });
        return { success: true };
      }),

    rejectVerificationV2: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.number(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await rejectVerification(input.id, input.userId, input.reason);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "REJECT_PRO",
          targetType: "pro_verification",
          targetId: input.id,
          note: input.reason,
          after: JSON.stringify({ userId: input.userId, status: "rejected", reason: input.reason }),
        });
        return { success: true };
      }),

    // ─── Order Search ──────────────────────────────────────────────────────
    searchOrders: protectedProcedure
      .input(z.object({
        status: z.enum(["created", "paid", "failed", "cancelled"]).optional(),
        search: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return searchOrders(input);
      }),

    orderDetail: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const detail = await getOrderDetailFull(input.orderId);
        if (!detail) throw new TRPCError({ code: "NOT_FOUND" });
        return detail;
      }),

    updateOrderAdminMemo: protectedProcedure
      .input(z.object({ orderId: z.string(), adminMemo: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateOrderAdminMemo(input.orderId, input.adminMemo);
        return { success: true };
      }),

    updateOrderShippingInfo: protectedProcedure
      .input(z.object({
        orderId: z.string(),
        recipientName: z.string().optional(),
        recipientPhone: z.string().optional(),
        shippingAddress: z.string().optional(),
        shippingZipCode: z.string().optional(),
        shippingMemo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { orderId, ...data } = input;
        await updateOrderShippingInfo(orderId, data);
        return { success: true };
      }),

    // ─── Set user professional manually ───────────────────────────────────
    setUserProfessional: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserRole(input.userId, "user"); // keep system role as user
        // Update memberRole and proVerificationStatus directly
        const db = await import("./db");
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "MANUAL_SET_PROFESSIONAL",
          targetType: "user",
          targetId: input.userId,
          after: JSON.stringify({ memberRole: "professional", proVerificationStatus: "approved" }),
        });
        return { success: true };
      }),

    // ─── Audit Logs ────────────────────────────────────────────────────────────
    auditLogs: protectedProcedure
      .input(z.object({
        targetType: z.string().optional(),
        targetId: z.number().optional(),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAuditLogs(input.targetType, input.targetId);
      }),

    // ─── Gallery ───────────────────────────────────────────────────────────────
    galleryPosts: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getGalleryPosts(input);
      }),

    createGalleryPost: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        isPublished: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createGalleryPost({ ...input, authorId: ctx.user.id });
      }),

    updateGalleryPost: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        return updateGalleryPost(id, data);
      }),

    deleteGalleryPost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deletePostImagesByPost("gallery" as const, input.id);
        return deleteGalleryPost(input.id);
      }),

    // ─── Magazine ──────────────────────────────────────────────────────────────
    magazinePosts: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getMagazinePosts(input);
      }),

    createMagazinePost: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        subtitle: z.string().optional(),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        isPublished: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createMagazinePost({ ...input, authorId: ctx.user.id });
      }),

    updateMagazinePost: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        subtitle: z.string().optional(),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        return updateMagazinePost(id, data);
      }),

    deleteMagazinePost: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deletePostImagesByPost("magazine" as const, input.id);
        return deleteMagazinePost(input.id);
      }),

    // ─── Image Upload ──────────────────────────────────────────────────────────
    uploadPostImage: protectedProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        fileMimeType: z.string(),
        postType: z.enum(["gallery", "magazine"]),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.fileName.split(".").pop() ?? "jpg";
        const key = `${input.postType}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.fileMimeType);
        await createPostImage({ postId: 0, postType: input.postType, imageUrl: url, imageKey: key, sortOrder: 0 });
        return { url, key };
      }),

    // ─── Popups ────────────────────────────────────────────────────────────────
    popups: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getPopups();
      }),

    createPopup: protectedProcedure
      .input(z.object({
        title: z.string().min(1),
        popupType: z.enum(["pc", "mobile", "both"]).default("both"),
        isActive: z.boolean().default(true),
        imageUrl: z.string().nullable().optional(),
        imageKey: z.string().nullable().optional(),
        linkUrl: z.string().nullable().optional(),
        linkTarget: z.enum(["_blank", "_self"]).default("_blank"),
        displayPosition: z.string().default("main"),
        bottomText: z.enum(["today", "week", "none"]).default("today"),
        startAt: z.date().nullable().optional(),
        endAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createPopup(input);
      }),

    updatePopup: protectedProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        popupType: z.enum(["pc", "mobile", "both"]).optional(),
        isActive: z.boolean().optional(),
        imageUrl: z.string().nullable().optional(),
        imageKey: z.string().nullable().optional(),
        linkUrl: z.string().nullable().optional(),
        linkTarget: z.enum(["_blank", "_self"]).optional(),
        displayPosition: z.string().optional(),
        bottomText: z.enum(["today", "week", "none"]).optional(),
        startAt: z.date().nullable().optional(),
        endAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        return updatePopup(id, data);
      }),

    deletePopup: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return deletePopup(input.id);
      }),

    // ─── Shipping Management ──────────────────────────────────────────────────
    ordersByShippingStatus: protectedProcedure
      .input(z.object({
        shippingStatus: z.enum(["pending_payment", "ready", "hold", "shipping", "delivered"]),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getOrdersByShippingStatus(input.shippingStatus, { page: input.page, limit: input.limit });
      }),

    updateShipping: protectedProcedure
      .input(z.object({
        orderId: z.string(),
        shippingStatus: z.enum(["pending_payment", "ready", "hold", "shipping", "delivered", "none"]).optional(),
        courierCode: z.string().nullable().optional(),
        courierName: z.string().nullable().optional(),
        trackingNumber: z.string().nullable().optional(),
        shippedAt: z.date().nullable().optional(),
        deliveredAt: z.date().nullable().optional(),
        recipientName: z.string().nullable().optional(),
        recipientPhone: z.string().nullable().optional(),
        shippingAddress: z.string().nullable().optional(),
        shippingZipCode: z.string().nullable().optional(),
        shippingMemo: z.string().nullable().optional(),
        adminMemo: z.string().nullable().optional(),
        paymentMethod: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { orderId, ...data } = input;
        await updateOrderShipping(orderId, data);
        return { success: true };
      }),

    orderDashboardSummary: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getOrderDashboardSummary();
      }),

    // ─── Cancellations ────────────────────────────────────────────────────────
    cancellations: protectedProcedure
      .input(z.object({
        status: z.string().optional(),
        cancelType: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getCancellations(input);
      }),

    createCancellation: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        cancelType: z.enum(["pre_payment", "post_payment"]).default("post_payment"),
        reason: z.string().optional(),
        reasonDetail: z.string().optional(),
        cancelAmount: z.string().optional(),
        adminMemo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createCancellation({ ...input, status: "requested" });
      }),

    updateCancellation: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["requested", "processing", "completed", "rejected"]).optional(),
        adminMemo: z.string().optional(),
        completedAt: z.date().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateCancellation(id, data);
        return { success: true };
      }),

    // ─── Exchanges ────────────────────────────────────────────────────────────
    exchanges: protectedProcedure
      .input(z.object({ status: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getExchanges(input);
      }),

    createExchange: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        reason: z.string().optional(),
        reasonDetail: z.string().optional(),
        adminMemo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createExchange({ ...input, status: "requested" });
      }),

    updateExchange: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["requested", "processing", "ready", "completed", "rejected"]).optional(),
        courierName: z.string().nullable().optional(),
        trackingNumber: z.string().nullable().optional(),
        adminMemo: z.string().nullable().optional(),
        completedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateExchange(id, data);
        return { success: true };
      }),

    // ─── Returns ──────────────────────────────────────────────────────────────
    returns: protectedProcedure
      .input(z.object({ status: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getReturns(input);
      }),

    createReturn: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        reason: z.string().optional(),
        reasonDetail: z.string().optional(),
        adminMemo: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createReturn({ ...input, status: "requested" });
      }),

    updateReturn: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["requested", "processing", "completed", "rejected", "hold"]).optional(),
        courierName: z.string().nullable().optional(),
        trackingNumber: z.string().nullable().optional(),
        adminMemo: z.string().nullable().optional(),
        completedAt: z.date().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateReturn(id, data);
        return { success: true };
      }),

    // ─── Refunds ──────────────────────────────────────────────────────────────
    refunds: protectedProcedure
      .input(z.object({ status: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getRefunds(input);
      }),

    createRefund: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        refundMethod: z.enum(["card", "bank", "point", "deposit", "mixed"]).default("card"),
        refundType: z.enum(["full", "partial"]).default("full"),
        refundAmount: z.string(),
        refundAccount: z.string().nullable().optional(),
        refundBank: z.string().nullable().optional(),
        adminNote: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createRefund({ ...input, status: "pending" });
      }),

    updateRefund: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["pending", "completed", "hold"]).optional(),
        completedAt: z.date().nullable().optional(),
        adminMemo: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateRefund(id, data);
        return { success: true };
      }),

    // ─── Card Cancellations ───────────────────────────────────────────────────
    cardCancellations: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getCardCancellations(input);
      }),

    createCardCancellation: protectedProcedure
      .input(z.object({
        orderId: z.number(),
        tid: z.string().optional(),
        cancelAmount: z.string(),
        cancelType: z.enum(["full", "partial"]).default("full"),
        cancelledBy: z.string().optional(),
        adminMemo: z.string().nullable().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createCardCancellation({ ...input, cancelledAt: new Date() });
      }),

    // ─── Stats ─────────────────────────────────────────────────────────────────
    salesStats: protectedProcedure
      .input(z.object({
        period: z.enum(["day", "week", "month"]).default("day"),
        days: z.number().default(30),
      }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getSalesStats(input.period, input.days);
      }),

    productSalesStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getProductSalesStats();
      }),

    customerStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getCustomerStats();
      }),

    pageViewStats: protectedProcedure
      .input(z.object({ days: z.number().default(30) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getPageViewStats(input.days);
      }),
  }),order: router({
    create: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.number(), quantity: z.number().min(1) })),
        recipientName: z.string().min(1, "수령인 이름을 입력해주세요."),
        recipientPhone: z.string().min(1, "연락처를 입력해주세요."),
        shippingZipCode: z.string().min(1, "우편번호를 입력해주세요."),
        shippingAddress: z.string().min(1, "주소를 입력해주세요."),
        shippingAddressDetail: z.string().optional(),
        shippingMemo: z.string().optional(),
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
          {
            orderId, userId: user.id, userRoleSnapshot: isPro ? "professional" : "consumer",
            proStatusSnapshot: user.proVerificationStatus, totalAmount: String(totalAmount),
            status: "created", orderName,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            shippingZipCode: input.shippingZipCode,
            shippingAddress: input.shippingAddress,
            shippingAddressDetail: input.shippingAddressDetail,
            shippingMemo: input.shippingMemo,
          },
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

    cancel: protectedProcedure
      .input(z.object({ orderId: z.string(), cancelReason: z.string().default("관리자 취소") }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 취소할 수 있습니다." });
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
        if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 주문입니다." });
        // 결제완료 상태이면 토스 취소 API 호출
        if (order.status === "paid" && order.paymentKey) {
          await cancelTossPayment(order.paymentKey, input.cancelReason);
        }
        await updateOrderStatus(input.orderId, { status: "cancelled" });
        return { success: true };
      }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const orderList = await getUserOrders(ctx.user.id);
      return Promise.all(orderList.map(async (order) => ({ ...order, items: await getOrderItems(order.id) })));
    }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Gallery Router ────────────────────────────────────────────────────────────
// (exported separately for type inference)

