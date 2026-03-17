import { TRPCError } from "@trpc/server";
import { nanoid } from "nanoid";
import { z } from "zod";
import { signOutAuthSession } from "./_core/authSession";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  approveVerification,
  createAuditLog,
  cancelOrderWithHistory,
  finalizePaidOrder,
  createOrder,
  createVerification,
  createSavedAddress,
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
  getDetailedCouponIssuesForUser,
  getUserById,
  getUserOrders,
  getUserSavedAddresses,
  rejectVerification,
  searchOrders,
  searchVerifications,
  setUserProfessionalStatus,
  updateOrderStatus,
  updateProduct,
  createProduct,
  deleteProduct,
  updateUserProfile,
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
  // Reviews
  getReviews,
  getReviewById,
  createReview,
  updateReview,
  updateSavedAddress,
  deleteReview,
  deleteSavedAddress,
  // Certified Instructors
  getCertifiedInstructors,
  getCertifiedInstructorById,
  createCertifiedInstructor,
  updateCertifiedInstructor,
  deleteCertifiedInstructor,
  // Coupons
  getCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponIssues,
  issueCouponToUser,
  deleteCouponIssue,
  // Discount Codes
  getDiscountCodes,
  getDiscountCodeById,
  getDiscountCodeByCode,
  createDiscountCode,
  updateDiscountCode,
  deleteDiscountCode,
  // Remind Alerts
  getRemindAlerts,
  getRemindAlertById,
  createRemindAlert,
  updateRemindAlert,
  deleteRemindAlert,
  // Promotion Stats
  getPromotionStats,
  generateNextProductCode,
  getDesignFiles,
  createDesignFile,
  deleteDesignFile,
  getDesignFolders,
  createDesignFolder,
  deleteDesignFolder,
  getExcelTemplates,
  getExcelTemplate,
  createExcelTemplate,
  updateExcelTemplate,
  deleteExcelTemplate,
} from "./db";
import { buildCheckoutQuote, getRecommendedProducts } from "./checkout";
import { storagePut } from "./storage";
import {
  getAdminGalleryPosts,
  createAdminGalleryPost,
  updateAdminGalleryPost,
  deleteAdminGalleryPost,
  getAdminMagazinePosts,
  createAdminMagazinePost,
  updateAdminMagazinePost,
  deleteAdminMagazinePost,
  getCertifiedInstructorsSupabase,
  createCertifiedInstructorSupabase,
  updateCertifiedInstructorSupabase,
  deleteCertifiedInstructorSupabase,
  getAdminCertifiedInstructors,
} from "./supabase-db";
import {
  notifyBankTransferConfirmed,
  notifyOrderCancelled,
  notifyOrderComplete,
  notifyShippingStarted,
} from "./_core/commerceNotifications";
import { notifyBusinessVerificationSubmitted } from "./_core/systemNotifications";
import {
  SupabaseEdgeFunctionError,
  invokeSupabaseEdgeFunction,
  shouldFallbackFromEdgeFunction,
} from "./_core/supabaseEdgeFunctions";
import {
  sbContactRouter,
  sbReviewRouter,
  sbGalleryRouter,
  sbMagazineRouter,
  sbLogRouter,
  sbExperienceCenterRouter,
  sbInstructorRouter,
  sbPopupRouter,
} from "./routers/supabase";

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
  return response.json() as Promise<{ method?: string; totalAmount?: number }>;
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

function toTrpcCodeFromStatus(status: number): "BAD_REQUEST" | "UNAUTHORIZED" | "FORBIDDEN" | "NOT_FOUND" | "CONFLICT" | "INTERNAL_SERVER_ERROR" {
  if (status === 400) return "BAD_REQUEST";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  return "INTERNAL_SERVER_ERROR";
}

function throwEdgeFunctionError(error: unknown): never {
  if (error instanceof TRPCError) {
    throw error;
  }

  if (error instanceof SupabaseEdgeFunctionError) {
    throw new TRPCError({
      code: toTrpcCodeFromStatus(error.status),
      message: error.message,
    });
  }

  throw new TRPCError({
    code: "INTERNAL_SERVER_ERROR",
    message: error instanceof Error ? error.message : "Supabase Edge Function 호출에 실패했습니다.",
  });
}

export const appRouter = router({
  system: systemRouter,
  // ─── Supabase 연동 라우터 ──────────────────────────────────────────────────
  sbContact: sbContactRouter,
  sbReview: sbReviewRouter,
  sbGallery: sbGalleryRouter,
  sbMagazine: sbMagazineRouter,
  sbLog: sbLogRouter,
  sbExperienceCenter: sbExperienceCenterRouter,
  sbInstructor: sbInstructorRouter,
  sbPopup: sbPopupRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      await signOutAuthSession(ctx.req, ctx.res);
      return { success: true } as const;
    }),

    // ─── 이메일 회원가입 ───────────────────────────────────────────────────────
    emailSignup: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().min(1).max(50),
      }))
      .mutation(async ({ input }) => {
        // Supabase Auth 표준 가입 플로우 (일반 사용자)
        // 실제 가입 처리는 POST /api/auth/email/signup 엔드포인트에서 수행
        // tRPC는 클라이언트가 직접 REST 엔드포인트를 호출하도록 안내
        throw new TRPCError({
          code: "METHOD_NOT_SUPPORTED",
          message: "이메일 가입은 /api/auth/email/signup 엔드포인트를 사용하세요.",
        });
      }),

    // ─── 이메일 로그인 ────────────────────────────────────────────────────────
    emailLogin: publicProcedure
      .input(z.object({ email: z.string().email(), password: z.string() }))
      .mutation(async (_opts) => {
        // Supabase Auth 표준 로그인 플로우
        // 실제 로그인 처리는 POST /api/auth/email/signin 엔드포인트에서 수행
        throw new TRPCError({
          code: "METHOD_NOT_SUPPORTED",
          message: "이메일 로그인은 /api/auth/email/signin 엔드포인트를 사용하세요.",
        });
      }),

    // ─── 아이디(이메일) 찾기 ──────────────────────────────────────────────────
    findEmail: publicProcedure
      .input(z.object({ name: z.string(), phone: z.string() }))
      .mutation(async ({ input }) => {
        const { getDb } = await import("./db");
        const { profiles: profilesTable } = await import("../drizzle/schema-pg");
        const { and, eq } = await import("drizzle-orm");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const result = await db.select({ email: profilesTable.email })
          .from(profilesTable)
          .where(and(eq(profilesTable.name, input.name), eq(profilesTable.phone, input.phone)))
          .limit(1);
        if (!result.length || !result[0].email) throw new TRPCError({ code: "NOT_FOUND", message: "일치하는 계정을 찾을 수 없습니다." });
        const email = result[0].email;
        const masked = email.replace(/(?<=.{2}).(?=[^@]*@)/g, "*");
        return { maskedEmail: masked };
      }),

    // ─── 비밀번호 재설정 요청 ─────────────────────────────────────────────────
    requestPasswordReset: publicProcedure
      .input(z.object({ email: z.string().email(), origin: z.string().url().optional() }))
      .mutation(async ({ input }) => {
        // Supabase Auth 비밀번호 재설정 플로우
        const { createClient } = await import("@supabase/supabase-js");
        const supabaseUrl = process.env.SUPABASE_URL ?? "";
        const supabaseAnonKey = process.env.SUPABASE_ANON_KEY ?? "";
        const supabaseClient = createClient(supabaseUrl, supabaseAnonKey);
        const redirectTo = input.origin ? `${input.origin}/find-password?mode=reset` : undefined;
        const { error } = await supabaseClient.auth.resetPasswordForEmail(input.email, {
          redirectTo,
        });
        if (error) {
          console.error("[Auth] resetPasswordForEmail error:", error.message);
        }
        // 보안상 이메일 존재 여부 노출하지 않음
        return { success: true };
      }),

    // ─── 비밀번호 재설정 실행 ─────────────────────────────────────────────────
    // recovery access_token 또는 현재 인증 세션으로 비밀번호를 변경한다.
    resetPassword: publicProcedure
      .input(z.object({ token: z.string().optional(), newPassword: z.string().min(8) }))
      .mutation(async ({ ctx, input }) => {
        let userId = ctx.user?.id ?? null;

        // recovery 링크에서 받은 access token으로 사용자 식별
        if (!userId && input.token) {
          const { supabaseAdmin } = await import("./_core/supabase");
          const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(input.token);
          if (userError || !userData.user) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "유효하지 않거나 만료된 링크입니다." });
          }
          userId = userData.user.id;
        }

        if (!userId) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "비밀번호를 재설정할 수 있는 세션이 없습니다." });
        }

        const { supabaseAdmin } = await import("./_core/supabase");
        const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
          password: input.newPassword,
        });
        if (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
        }
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
    addresses: protectedProcedure.query(async ({ ctx }) => {
      return getUserSavedAddresses(ctx.user.id);
    }),
    saveAddress: protectedProcedure
      .input(z.object({
        id: z.number().optional(),
        label: z.string().min(1).max(100),
        recipientName: z.string().min(1).max(100),
        recipientPhone: z.string().min(1).max(30),
        shippingZipCode: z.string().min(1).max(10),
        shippingAddress: z.string().min(1),
        shippingAddressDetail: z.string().optional(),
        isDefault: z.boolean().default(false),
      }))
      .mutation(async ({ ctx, input }) => {
        if (input.id) {
          const row = await updateSavedAddress(input.id, ctx.user.id, {
            label: input.label,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            shippingZipCode: input.shippingZipCode,
            shippingAddress: input.shippingAddress,
            shippingAddressDetail: input.shippingAddressDetail ?? null,
            isDefault: input.isDefault,
          });
          return { success: true, address: row };
        }

        const row = await createSavedAddress({
          userId: ctx.user.id,
          label: input.label,
          recipientName: input.recipientName,
          recipientPhone: input.recipientPhone,
          shippingZipCode: input.shippingZipCode,
          shippingAddress: input.shippingAddress,
          shippingAddressDetail: input.shippingAddressDetail ?? null,
          isDefault: input.isDefault,
        });
        return { success: true, address: row };
      }),
    deleteAddress: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteSavedAddress(input.id, ctx.user.id);
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
        const images = await getPostImages("gallery", input.id);
        return { ...post, images };
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

  // ─── Public Reviews ────────────────────────────────────────────────────────
  review: router({
    list: publicProcedure
      .input(z.object({ category: z.string().optional(), productId: z.string().optional(), page: z.number().default(1), limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        return getReviews({
          category: input?.category,
          productId: input?.productId,
          publishedOnly: true,
          page: input?.page ?? 1,
          limit: input?.limit ?? 100,
        });
      }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const r = await getReviewById(input.id);
        if (!r) throw new TRPCError({ code: "NOT_FOUND" });
        return r;
      }),
  }),
  // ─── Public Certified Instructors ──────────────────────────────────────────────
  certifiedInstructor: router({
    list: publicProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(100) }).optional())
      .query(async ({ input }) => {
        // Supabase REST API 사용 (Drizzle ORM 직접 DB 연결 불가 환경)
        return getCertifiedInstructorsSupabase({ publishedOnly: true, page: input?.page ?? 1, limit: input?.limit ?? 100 });
      }),
    byId: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const item = await getCertifiedInstructorById(input.id);
        if (!item) throw new TRPCError({ code: "NOT_FOUND" });
        return item;
      }),
  }), // ─── Public Popups ────────────────────────────────────────────────────────────
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
        if (!product || !product.isActive || !product.visible) throw new TRPCError({ code: "NOT_FOUND" });
        return product;
      }),
    recommended: publicProcedure
      .input(z.object({ productId: z.string(), limit: z.number().min(1).max(8).default(4) }))
      .query(async ({ input }) => {
        return getRecommendedProducts(input.productId, input.limit);
      }),
  }),

  promotion: router({
    myCoupons: protectedProcedure.query(async ({ ctx }) => {
      return getDetailedCouponIssuesForUser(ctx.user.id);
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
        let userEmail = '';
        let userName = '';
        if (db) {
          const { profiles } = await import("../drizzle/schema-pg");
          const { eq } = await import("drizzle-orm");
          await db.update(profiles).set({ proVerificationStatus: "pending" }).where(eq(profiles.id, ctx.user.id));
          const userRow = await db.select({ email: profiles.email, name: profiles.name }).from(profiles).where(eq(profiles.id, ctx.user.id)).limit(1);
          userEmail = userRow[0]?.email ?? '';
          userName = userRow[0]?.name ?? '';
        }

        // 사업자 인증 신청 이메일 발송
        if (userEmail) {
          await notifyBusinessVerificationSubmitted({
            userEmail,
            userName,
            businessName: input.businessName,
            businessNumber: input.businessNumber,
            contactPhone: input.contactPhone ?? null,
            fileUrl,
          });
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
      .input(z.object({ userId: z.string(), role: z.enum(["user", "admin"]) }))
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
      .input(z.object({ id: z.number(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await approveVerification(input.id, input.userId);
        return { success: true };
      }),

    rejectVerification: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.string(), reason: z.string().min(1) }))
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
        // 입금확인 알림톡: created → paid 전환 시 발송
        const prevOrder = await getOrderByOrderId(input.orderId);
        if (!prevOrder) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });

        const allowedTransitions: Record<typeof prevOrder.status, Array<typeof prevOrder.status>> = {
          created: ["paid", "failed", "cancelled"],
          paid: ["cancelled"],
          failed: [],
          cancelled: [],
        };

        if (!allowedTransitions[prevOrder.status].includes(input.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "허용되지 않는 주문 상태 변경입니다." });
        }

        const updated = await updateOrderStatus(
          input.orderId,
          {
            status: input.status,
            paidAt: input.status === "paid" ? new Date() : undefined,
          },
          { from: prevOrder.status }
        );
        if (!updated) {
          throw new TRPCError({ code: "CONFLICT", message: "주문 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요." });
        }

        if (prevOrder && prevOrder.status === "created" && input.status === "paid") {
          const items = await getOrderItems(prevOrder.id);
          const productName = items.length > 0 ? items[0].productName : "레아쥬 제품";
          void notifyBankTransferConfirmed({
            phone: prevOrder.recipientPhone,
            name: prevOrder.recipientName ?? "고객",
            orderId: prevOrder.id,
            orderNumber: prevOrder.orderId,
            productName,
            totalAmount: Number(prevOrder.totalAmount ?? 0),
          });
        }
        return { success: true };
      }),

    // ─── Dashboard ─────────────────────────────────────────────────────────
    dashboard: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return getDashboardSummary();
    }),
    dashboardCharts: protectedProcedure
      .input(z.object({ days: z.number().min(7).max(730).default(30) }))
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
        id: z.string(),
        priceConsumer: z.string().optional(),
        pricePro: z.string().optional(),
        priceMembership: z.string().optional(),
        isProOnly: z.boolean().optional(),
        visible: z.boolean().optional(),
        isActive: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        isNew: z.boolean().optional(),
        stock: z.number().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        summaryDescription: z.string().optional(),
        shortDescription: z.string().optional(),
        priceSupply: z.string().optional(),
        priceConsumerOriginal: z.string().optional(),
        taxType: z.enum(['taxable', 'tax_free', 'exempt']).optional(),
        taxRate: z.string().optional(),
        shippingType: z.enum(['direct', 'warehouse', 'other']).optional(),
        weight: z.string().optional(),
        manufacturer: z.string().optional(),
        brand: z.string().optional(),
        origin: z.string().optional(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        seoKeywords: z.string().optional(),
        seoImageAlt: z.string().optional(),
        adminMemo: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        detailPageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
        productCode: z.string().optional(),
        productStatus: z.enum(['new', 'used', 'refurbished']).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        const before = await getProductById(id);
        await updateProduct(id, data as Parameters<typeof updateProduct>[1]);
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

    createProduct: protectedProcedure
      .input(z.object({
        slug: z.string(),
        name: z.string(),
        priceConsumer: z.string(),
        pricePro: z.string(),
        priceMembership: z.string().optional(),
        description: z.string().optional(),
        imageUrl: z.string().optional(),
        thumbnailUrl: z.string().optional(),
        isProOnly: z.boolean().optional(),
        isActive: z.boolean().optional(),
        visible: z.boolean().optional(),
        isRecommended: z.boolean().optional(),
        isNew: z.boolean().optional(),
        stock: z.number().optional(),
        productCode: z.string().optional(),
        productStatus: z.enum(['new', 'used', 'refurbished']).optional(),
        summaryDescription: z.string().optional(),
        shortDescription: z.string().optional(),
        priceSupply: z.string().optional(),
        priceConsumerOriginal: z.string().optional(),
        taxType: z.enum(['taxable', 'tax_free', 'exempt']).optional(),
        taxRate: z.string().optional(),
        shippingType: z.enum(['direct', 'warehouse', 'other']).optional(),
        weight: z.string().optional(),
        manufacturer: z.string().optional(),
        brand: z.string().optional(),
        origin: z.string().optional(),
        seoTitle: z.string().optional(),
        seoDescription: z.string().optional(),
        seoKeywords: z.string().optional(),
        seoImageAlt: z.string().optional(),
        adminMemo: z.string().optional(),
        detailPageUrl: z.string().optional(),
        sortOrder: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        // 상품코드 자동 생성 (입력 없을 때)
        let productCode = input.productCode;
        if (!productCode) {
          productCode = await generateNextProductCode();
        }
        const product = await createProduct({ ...input, productCode });
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: 'CREATE_PRODUCT',
          targetType: 'product',
          targetId: product.id,
          before: null,
          after: JSON.stringify(product),
        });
        return { success: true, product };
      }),

    deleteProduct: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const before = await getProductById(input.id);
        await deleteProduct(input.id);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: 'DELETE_PRODUCT',
          targetType: 'product',
          targetId: input.id,
          before: JSON.stringify(before),
          after: null,
        });
        return { success: true };
      }),

    uploadProductImage: protectedProcedure
      .input(z.object({
        filename: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { nanoid: nid } = await import('nanoid');
        const suffix = nid(8);
        const ext = input.filename.split('.').pop() ?? 'jpg';
        const key = `products/${suffix}.${ext}`;
        const buffer = Buffer.from(input.base64Data, 'base64');
        const { url } = await storagePut(key, buffer, input.contentType);
        return { url, key };
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
      .input(z.object({ id: z.number(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await approveVerification(input.id, input.userId);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "APPROVE_PRO",
          targetType: "pro_verification",
          targetId: String(input.id),
          after: JSON.stringify({ userId: input.userId, status: "approved" }),
        });
        return { success: true };
      }),

    rejectVerificationV2: protectedProcedure
      .input(z.object({ id: z.number(), userId: z.string(), reason: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await rejectVerification(input.id, input.userId, input.reason);
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "REJECT_PRO",
          targetType: "pro_verification",
          targetId: String(input.id),
          note: input.reason,
          after: JSON.stringify({ userId: input.userId, status: "rejected", reason: input.reason }),
        });
        return { success: true };
      }),

    // ─    // ─── Order Search ──────────────────────────────────────────────
    searchOrders: protectedProcedure
      .input(z.object({
        status: z.enum(["created", "paid", "failed", "cancelled"]).optional(),
        search: z.string().optional(),
        searchType: z.enum(["orderId", "name", "email", "productName"]).optional(),
        viewType: z.enum(["order", "item"]).default("order"),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
        sortCol: z.string().optional(),
        sortDir: z.enum(["asc", "desc"]).optional(),
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
      .input(z.object({ userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await updateUserRole(input.userId, "user"); // keep system role as user
        await setUserProfessionalStatus(input.userId);
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
        targetId: z.string().optional(),
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
        return getAdminGalleryPosts(input);
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
        return createAdminGalleryPost({ ...input, authorId: ctx.user.id as any });
      }),

    updateGalleryPost: protectedProcedure
      .input(z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        content: z.string().optional(),
        coverImageUrl: z.string().optional(),
        coverImageKey: z.string().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        return updateAdminGalleryPost(id, data);
      }),

    deleteGalleryPost: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return deleteAdminGalleryPost(input.id);
      }),

    // ─── Magazine ──────────────────────────────────────────────────────────────
    magazinePosts: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAdminMagazinePosts(input);
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
        return createAdminMagazinePost({ ...input, authorId: ctx.user.id as any });
      }),

    updateMagazinePost: protectedProcedure
      .input(z.object({
        id: z.string(),
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
        return updateAdminMagazinePost(id, data);
      }),

    deleteMagazinePost: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return deleteAdminMagazinePost(input.id);
      }),

    // ─── Reviews ────────────────────────────────────────────────────────────
    reviewList: protectedProcedure
      .input(z.object({ category: z.string().optional(), productId: z.string().optional(), page: z.number().default(1), limit: z.number().default(100) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getReviews({
          category: input?.category,
          productId: input?.productId,
          page: input?.page ?? 1,
          limit: input?.limit ?? 100,
        });
      }),

    createReview: protectedProcedure
      .input(z.object({
        category: z.enum(["before_after", "device", "education", "event", "etc"]).default("etc"),
        categoryLabel: z.string().optional(),
        productId: z.string().optional(),
        imageUrl: z.string(),
        imageKey: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        isPublished: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createReview({ ...input, authorId: ctx.user.id as any });
      }),

    updateReview: protectedProcedure
      .input(z.object({
        id: z.number(),
        isPublished: z.boolean().optional(),
        sortOrder: z.number().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        return updateReview(id, data);
      }),

    deleteReview: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return deleteReview(input.id);
      }),

    uploadReviewImage: protectedProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        fileMimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.fileName.split(".").pop() ?? "jpg";
        const key = `reviews/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.fileMimeType);
        return { url, key };
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
        // 운송장 번호가 새로 등록되는 경우 배송 출발 SMS 발송
        const prevOrder = await getOrderByOrderId(orderId);
        await updateOrderShipping(orderId, data);
        const isNewTracking = data.trackingNumber && prevOrder && !prevOrder.trackingNumber;
        if (isNewTracking && data.trackingNumber) {
          const order = await getOrderByOrderId(orderId);
          void notifyShippingStarted({
            phone: order?.recipientPhone,
            name: order?.recipientName ?? "고객",
            orderNumber: order?.orderId ?? orderId,
            productName: order?.orderName ?? "",
            courierName: data.courierName ?? order?.courierName ?? "택배사",
            trackingNumber: data.trackingNumber,
          });
        }
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
  }),

  order: router({
    quote: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1),
        couponIssueId: z.string().uuid().optional(),
        discountCode: z.string().optional(),
      }))
      .query(async ({ ctx, input }) => {
        return buildCheckoutQuote(ctx.user.id, input.items, {
          couponIssueId: input.couponIssueId,
          discountCode: input.discountCode,
        });
      }),
    create: protectedProcedure
      .input(z.object({
        items: z.array(z.object({ productId: z.string(), quantity: z.number().min(1) })).min(1, "주문 상품이 비어 있습니다."),
        couponIssueId: z.string().uuid().optional(),
        discountCode: z.string().optional(),
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
        const quote = await buildCheckoutQuote(ctx.user.id, input.items, {
          couponIssueId: input.couponIssueId,
          discountCode: input.discountCode,
        });

        const orderId = `REAGE-${nanoid(12)}`;
        const orderName = quote.items.length === 1
          ? quote.items[0].product.name
          : `${quote.items[0].product.name} 외 ${quote.items.length - 1}건`;

        const order = await createOrder(
          {
            orderId,
            userId: user.id,
            userRoleSnapshot: quote.tier,
            proStatusSnapshot: user.proVerificationStatus,
            totalAmount: String(quote.subtotal),
            discountAmount: String(quote.discountAmount),
            shippingAmount: String(quote.shippingAmount),
            finalAmount: String(quote.finalAmount),
            status: "created",
            orderName,
            promotionLabel: quote.promotionLabel,
            couponIssueRefId: quote.couponIssueId,
            discountCodeRefId: quote.discountCodeId,
            recipientName: input.recipientName,
            recipientPhone: input.recipientPhone,
            shippingZipCode: input.shippingZipCode,
            shippingAddress: input.shippingAddress,
            shippingAddressDetail: input.shippingAddressDetail,
            shippingMemo: input.shippingMemo,
          },
          quote.items.map((item) => ({
            orderId: 0,
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            unitPrice: String(item.unitPrice),
            subtotal: String(item.subtotal),
          }))
        );

        return {
          orderId: order.orderId,
          totalAmount: quote.subtotal,
          discountAmount: quote.discountAmount,
          shippingAmount: quote.shippingAmount,
          finalAmount: quote.finalAmount,
          orderName,
          promotionLabel: quote.promotionLabel,
        };
      }),

    verify: protectedProcedure
      .input(z.object({ paymentKey: z.string(), orderId: z.string(), amount: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (order.status === "paid") return { success: true };
        if (order.status !== "created") throw new TRPCError({ code: "BAD_REQUEST", message: "결제를 진행할 수 없는 주문 상태입니다." });
        if (Number(order.finalAmount) !== input.amount) throw new TRPCError({ code: "BAD_REQUEST", message: "결제 금액이 일치하지 않습니다." });

        try {
          await invokeSupabaseEdgeFunction("commerce-payment/confirm", {
            user: { id: ctx.user.id, role: ctx.user.role },
            body: {
              paymentKey: input.paymentKey,
              orderId: input.orderId,
              amount: input.amount,
            },
          });
        } catch (edgeError) {
          if (!shouldFallbackFromEdgeFunction(edgeError)) {
            throwEdgeFunctionError(edgeError);
          }
          console.warn("[Payment] commerce-payment edge function unavailable, falling back to local logic:", edgeError);

          const payment = await confirmTossPayment(input.paymentKey, input.orderId, input.amount);
          try {
            const finalized = await finalizePaidOrder(input.orderId, input.paymentKey, new Date(), payment.method ?? "카드");
            if (!finalized.updated) {
              const latestOrder = await getOrderByOrderId(input.orderId);
              if (latestOrder?.status === "paid") {
                return { success: true };
              }
              throw new TRPCError({ code: "CONFLICT", message: "주문 상태가 이미 변경되었습니다. 결제 내역을 확인해주세요." });
            }
          } catch (error) {
            if (error instanceof Error && error.message.startsWith("[Stock]")) {
              const cancelReason = "재고 부족으로 자동 취소";
              let tossCancelFailed = false;
              try {
                await cancelTossPayment(input.paymentKey, cancelReason);
              } catch (cancelError) {
                tossCancelFailed = true;
                console.error("[Payment] 재고 부족 자동 취소 실패:", cancelError);
                const failedOrder = await getOrderByOrderId(input.orderId);
                if (failedOrder && typeof failedOrder.id === "number") {
                  await createCardCancellation({
                    orderId: failedOrder.id,
                    paymentKey: input.paymentKey,
                    cancelAmount: String(failedOrder.finalAmount ?? failedOrder.totalAmount ?? 0),
                    cancelType: "full",
                    processedBy: "system",
                    adminNote: `Toss 자동 취소 실패 - 수동 처리 필요. 사유: ${cancelError instanceof Error ? cancelError.message : String(cancelError)}`,
                  });
                } else if (failedOrder) {
                  console.warn("[Payment] live order RPC path uses uuid order id, skipping legacy card_cancellations insert");
                }
              }

              await cancelOrderWithHistory({
                orderId: input.orderId,
                from: "created",
                requestedBy: "admin",
                reason: cancelReason,
                adminNote: tossCancelFailed ? `${error.message} (Toss 취소 실패 - 수동 환불 필요)` : error.message,
                processedBy: "system",
                paymentKey: input.paymentKey,
              });

              throw new TRPCError({
                code: "CONFLICT",
                message: tossCancelFailed
                  ? "결제 직후 재고 부족이 확인되었으나 카드 취소 처리에 실패했습니다. 관리자가 수동으로 취소를 처리할 예정입니다."
                  : "결제 직후 재고 부족이 확인되어 자동 취소되었습니다. 카드사 반영까지 시간이 걸릴 수 있습니다.",
              });
            }

            throw error;
          }
        }

        // 주문 완료 알림톡 발송 (비동기, 실패해도 결제 처리에 영향 없음)
        const updatedOrder = await getOrderByOrderId(input.orderId);
        if (updatedOrder) {
          const orderDate = new Date().toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
          void notifyOrderComplete({
            phone: updatedOrder.recipientPhone,
            name: updatedOrder.recipientName ?? ctx.user.name ?? "고객",
            orderId: updatedOrder.id,
            orderNumber: input.orderId,
            productName: updatedOrder.orderName ?? "",
            totalAmount: Number(updatedOrder.finalAmount ?? updatedOrder.totalAmount),
            recipientName: updatedOrder.recipientName ?? ctx.user.name ?? "고객",
            orderDate,
          });
        }

        return { success: true };
      }),

    fail: protectedProcedure
      .input(z.object({ orderId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND" });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        if (order.status === "created") {
          await updateOrderStatus(input.orderId, { status: "failed" }, { from: "created" });
        }
        return { success: true };
      }),

    cancel: protectedProcedure
      .input(z.object({ orderId: z.string(), cancelReason: z.string().default("관리자 취소") }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "관리자만 취소할 수 있습니다." });
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
        if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 주문입니다." });
        if (!["created", "paid"].includes(order.status)) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "현재 주문 상태에서는 취소할 수 없습니다." });
        }
        const cancellableStatus = order.status === "paid" ? "paid" : "created";
        try {
          await invokeSupabaseEdgeFunction("commerce-payment/cancel", {
            user: { id: ctx.user.id, role: ctx.user.role },
            body: {
              orderId: input.orderId,
              cancelReason: input.cancelReason,
              mode: "admin",
            },
          });
        } catch (edgeError) {
          if (!shouldFallbackFromEdgeFunction(edgeError)) {
            throwEdgeFunctionError(edgeError);
          }
          console.warn("[Payment] commerce-payment cancel edge function unavailable, falling back to local logic:", edgeError);

          if (cancellableStatus === "paid" && order.paymentKey) {
            await cancelTossPayment(order.paymentKey, input.cancelReason);
          }
          const cancelled = await cancelOrderWithHistory({
            orderId: input.orderId,
            from: cancellableStatus,
            requestedBy: "admin",
            reason: input.cancelReason,
            adminNote: input.cancelReason,
            processedBy: ctx.user.id,
            paymentKey: order.paymentKey,
            restoreInventory: cancellableStatus === "paid",
          });
          if (!cancelled.updated) {
            throw new TRPCError({ code: "CONFLICT", message: "주문 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요." });
          }
        }
        // 취소 알림톡 발송 (비동기)
        void notifyOrderCancelled({
          phone: order.recipientPhone,
          name: order.recipientName ?? "고객",
          orderId: order.id,
          orderNumber: input.orderId,
          productName: order.orderName ?? "",
        });
        return { success: true };
      }),

    cancelByUser: protectedProcedure
      .input(z.object({ orderId: z.string(), cancelReason: z.string().default("고객 취소 요청") }))
      .mutation(async ({ ctx, input }) => {
        const order = await getOrderByOrderId(input.orderId);
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "주문을 찾을 수 없습니다." });
        if (order.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "본인의 주문만 취소할 수 있습니다." });
        if (order.status === "cancelled") throw new TRPCError({ code: "BAD_REQUEST", message: "이미 취소된 주문입니다." });
        if (order.status !== "paid") throw new TRPCError({ code: "BAD_REQUEST", message: "결제 완료된 주문만 취소할 수 있습니다." });
        // 24시간 이내 취소 가능 여부 확인
        if (!order.paidAt) throw new TRPCError({ code: "BAD_REQUEST", message: "결제 시간 정보가 없습니다." });
        const paidAt = new Date(order.paidAt);
        const now = new Date();
        const diffHours = (now.getTime() - paidAt.getTime()) / (1000 * 60 * 60);
        if (diffHours > 24) throw new TRPCError({ code: "BAD_REQUEST", message: "결제 후 24시간이 지나 취소가 불가능합니다. 고객센터(1:1 문의)로 연락해주세요." });
        try {
          await invokeSupabaseEdgeFunction("commerce-payment/cancel", {
            user: { id: ctx.user.id, role: ctx.user.role },
            body: {
              orderId: input.orderId,
              cancelReason: input.cancelReason,
              mode: "buyer",
            },
          });
        } catch (edgeError) {
          if (!shouldFallbackFromEdgeFunction(edgeError)) {
            throwEdgeFunctionError(edgeError);
          }
          console.warn("[Payment] commerce-payment buyer cancel edge function unavailable, falling back to local logic:", edgeError);

          if (order.paymentKey) {
            await cancelTossPayment(order.paymentKey, input.cancelReason);
          }
          const cancelled = await cancelOrderWithHistory({
            orderId: input.orderId,
            from: "paid",
            requestedBy: "buyer",
            reason: input.cancelReason,
            paymentKey: order.paymentKey,
            restoreInventory: true,
          });
          if (!cancelled.updated) {
            throw new TRPCError({ code: "CONFLICT", message: "주문 상태가 이미 변경되었습니다. 새로고침 후 다시 시도해주세요." });
          }
        }
        // 취소 알림톡 발송 (비동기)
        void notifyOrderCancelled({
          phone: order.recipientPhone,
          name: order.recipientName ?? ctx.user.name ?? "고객",
          orderId: order.id,
          orderNumber: input.orderId,
          productName: order.orderName ?? "",
        });
        return { success: true };
      }),

    myOrders: protectedProcedure.query(async ({ ctx }) => {
      const orderList = await getUserOrders(ctx.user.id);
      return Promise.all(orderList.map(async (order) => ({ ...order, items: await getOrderItems(order.id) })));
    }),
  }),

  // ─── Admin Extension (Certified Instructors + Membership) ─────────────────
  adminExt: router({
    // ─── Certified Instructors (Admin) ──────────────────────────────────────────
    certifiedInstructorList: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(100) }).optional())
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return getAdminCertifiedInstructors({ page: input?.page ?? 1, limit: input?.limit ?? 100 });
      }),
    createCertifiedInstructor: protectedProcedure
      .input(z.object({
        imageUrl: z.string().min(1),
        imageKey: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().default(0),
        isPublished: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return createCertifiedInstructorSupabase({ ...input, authorId: ctx.user.id as any });
      }),
    updateCertifiedInstructor: protectedProcedure
      .input(z.object({
        id: z.number(),
        imageUrl: z.string().optional(),
        imageKey: z.string().optional(),
        name: z.string().optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateCertifiedInstructorSupabase(id, data);
        return { success: true };
      }),
    deleteCertifiedInstructor: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteCertifiedInstructorSupabase(input.id);
        return { success: true };
      }),
    uploadCertifiedInstructorImage: protectedProcedure
      .input(z.object({
        fileBase64: z.string(),
        fileName: z.string(),
        fileMimeType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const buffer = Buffer.from(input.fileBase64, "base64");
        const ext = input.fileName.split(".").pop() ?? "jpg";
        const key = `certified-instructors/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { url } = await storagePut(key, buffer, input.fileMimeType);
        return { url, key };
      }),

    // ─── Membership Grade Management ──────────────────────────────────────────────────────
    setMembership: protectedProcedure
      .input(z.object({
        userId: z.string(),
        membershipGrade: z.enum(["consumer", "professional", "membership"]),
        discountRate: z.number().min(0).max(100).default(0),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { getDb } = await import("./db");
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        const { profiles } = await import("../drizzle/schema-pg");
        const { eq } = await import("drizzle-orm");
        const targetUser = await getUserById(input.userId);
        if (!targetUser) throw new TRPCError({ code: "NOT_FOUND", message: "사용자를 찾을 수 없습니다." });
        await db.update(profiles).set({
          memberRole: input.membershipGrade,
          membershipDiscountRate: input.discountRate,
        }).where(eq(profiles.id, input.userId));
        await createAuditLog({
          adminUserId: ctx.user.id,
          actionType: "membership_update",
          targetType: "user",
          targetId: input.userId,
          note: JSON.stringify({ grade: input.membershipGrade, discountRate: input.discountRate }),
        });
        return { success: true };
      }),

    // ─── Promotion: Stats ─────────────────────────────────────────────────────
    getPromotionStats: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getPromotionStats();
      }),

    // ─── Promotion: Coupons ───────────────────────────────────────────────────
    getCoupons: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20), status: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getCoupons(input);
      }),

    getCouponById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getCouponById(input.id);
      }),

    createCoupon: protectedProcedure
      .input(z.object({
        name: z.string(),
        description: z.string().optional(),
        benefitType: z.string(),
        benefitValue: z.number(),
        issueType: z.string(),
        targetMember: z.string(),
        displayTiming: z.string(),
        scheduledAt: z.date().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        periodType: z.string(),
        validDays: z.number().optional(),
        usePc: z.boolean().default(true),
        useMobile: z.boolean().default(true),
        applyScope: z.string(),
        productScope: z.string(),
        minAmountType: z.string(),
        minAmount: z.number().default(0),
        calcBasis: z.string(),
        maxUsagePerOrder: z.number().default(1),
        paymentMethodLimit: z.string(),
        imageType: z.string(),
        imageUrl: z.string().optional(),
        notifyOnLogin: z.boolean().default(false),
        sendSms: z.boolean().default(false),
        sendEmail: z.boolean().default(false),
        status: z.string().default("active"),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await createCoupon({ ...input, authorId: ctx.user.id });
      }),

    updateCoupon: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        benefitType: z.string().optional(),
        benefitValue: z.number().optional(),
        issueType: z.string().optional(),
        targetMember: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        applyScope: z.string().optional(),
        minAmountType: z.string().optional(),
        minAmount: z.number().optional(),
        calcBasis: z.string().optional(),
        status: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateCoupon(id, data);
        return { success: true };
      }),

    deleteCoupon: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteCoupon(input.id);
        return { success: true };
      }),

    getCouponIssues: protectedProcedure
      .input(z.object({ couponId: z.number().optional(), userId: z.string().optional(), page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getCouponIssues(input);
      }),

    issueCouponToUser: protectedProcedure
      .input(z.object({ couponId: z.number(), userId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await issueCouponToUser(input.couponId, input.userId);
      }),

    deleteCouponIssue: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteCouponIssue(input.id);
        return { success: true };
      }),

    // ─── Promotion: Discount Codes ────────────────────────────────────────────
    getDiscountCodes: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getDiscountCodes(input);
      }),

    createDiscountCode: protectedProcedure
      .input(z.object({
        name: z.string(),
        code: z.string(),
        discountRate: z.number(),
        truncateUnit: z.number().default(0),
        maxDiscountPerProduct: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        applyScope: z.string().default("all"),
        minOrderAmountType: z.string().default("none"),
        minOrderAmount: z.number().default(0),
        maxUsageType: z.string().default("none"),
        maxUsageCount: z.number().optional(),
        targetType: z.string().default("none"),
        samePersonLimitType: z.string().default("none"),
        samePersonLimitCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await createDiscountCode({ ...input, authorId: ctx.user.id });
      }),

    updateDiscountCode: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        code: z.string().optional(),
        discountRate: z.number().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        maxUsageType: z.string().optional(),
        maxUsageCount: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateDiscountCode(id, data);
        return { success: true };
      }),

    deleteDiscountCode: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteDiscountCode(input.id);
        return { success: true };
      }),

    // ─── Promotion: Remind Alerts ─────────────────────────────────────────────
    getRemindAlerts: protectedProcedure
      .input(z.object({ page: z.number().default(1), limit: z.number().default(20) }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await getRemindAlerts(input);
      }),

    createRemindAlert: protectedProcedure
      .input(z.object({
        name: z.string(),
        alertType: z.string(),
        isActive: z.boolean().default(true),
        channel: z.string().default("email"),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        frequency: z.string().default("weekly"),
        sendDayOfWeek: z.number().default(5),
        sendHour: z.number().default(9),
        targetType: z.string().default("all"),
        targetDays: z.number().default(30),
        sendToOptOut: z.boolean().default(false),
        sendToSpecial: z.boolean().default(true),
        sendToBad: z.boolean().default(true),
        senderName: z.string().optional(),
        senderEmail: z.string().optional(),
        emailSubject: z.string().optional(),
        emailBody: z.string().optional(),
        benefitEnabled: z.boolean().default(false),
        benefitDays: z.number().default(30),
        benefitTrigger: z.string().default("order_complete"),
        benefitContent: z.string().default("coupon"),
        benefitCouponId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        return await createRemindAlert({ ...input, authorId: ctx.user.id });
      }),

    updateRemindAlert: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        isActive: z.boolean().optional(),
        alertType: z.string().optional(),
        channel: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        frequency: z.string().optional(),
        emailSubject: z.string().optional(),
        emailBody: z.string().optional(),
        benefitEnabled: z.boolean().optional(),
        benefitCouponId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        const { id, ...data } = input;
        await updateRemindAlert(id, data);
        return { success: true };
      }),

    deleteRemindAlert: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await deleteRemindAlert(input.id);
        return { success: true };
      }),

    // ─── Product Code Auto-generate ──────────────────────────────────────────
    nextProductCode: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const code = await generateNextProductCode();
        return { code };
      }),

    // ─── Design Files ────────────────────────────────────────────────────────
    getDesignFiles: protectedProcedure
      .input(z.object({ folder: z.string().optional() }))
      .query(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getDesignFiles(input.folder);
      }),

    uploadDesignFile: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        contentType: z.string(),
        base64Data: z.string(),
        folder: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { nanoid: nid } = await import('nanoid');
        const sharp = (await import('sharp')).default;
        const suffix = nid(8);
        const baseName = input.fileName.replace(/\.[^.]+$/, '');
        const buffer = Buffer.from(input.base64Data, 'base64');
        const isImage = input.contentType.startsWith('image/');

        // 원본 업로드
        const key = `design-files/${suffix}-${input.fileName}`;
        const { url } = await storagePut(key, buffer, input.contentType);

        // 이미지인 경우 썸네일(300px crop), 중간(800px 비율유지) 자동 생성 + DB 저장
        let thumbnailUrl: string | undefined;
        let mediumUrl: string | undefined;
        if (isImage) {
          try {
            // 썸네일: 300×300 crop (목록/피드용)
            const thumbBuffer = await sharp(buffer)
              .resize(300, 300, { fit: 'cover', withoutEnlargement: true })
              .jpeg({ quality: 82 })
              .toBuffer();
            const thumbKey = `design-files/${suffix}-${baseName}_thumb300.jpg`;
            const { url: tUrl } = await storagePut(thumbKey, thumbBuffer, 'image/jpeg');
            thumbnailUrl = tUrl;

            // 중간: 800px 비율 유지 (상품 상세페이지용)
            const medBuffer = await sharp(buffer)
              .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
              .jpeg({ quality: 88 })
              .toBuffer();
            const medKey = `design-files/${suffix}-${baseName}_medium800.jpg`;
            const { url: mUrl } = await storagePut(medKey, medBuffer, 'image/jpeg');
            mediumUrl = mUrl;
          } catch (e) {
            console.error('[uploadDesignFile] resize error:', e);
          }
        }

        const file = await createDesignFile({
          fileName: input.fileName,
          fileKey: key,
          fileUrl: url,
          thumbnailUrl: thumbnailUrl ?? null,
          mediumUrl: mediumUrl ?? null,
          mimeType: input.contentType,
          fileSize: input.fileSize ?? buffer.length,
          folder: input.folder ?? 'ROOT',
          uploadedBy: ctx.user.id,
        });
        return { url, key, file, thumbnailUrl, mediumUrl };
      }),

    deleteDesignFile: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const file = await deleteDesignFile(input.id);
        return { success: true, file };
      }),

    getDesignFolders: protectedProcedure
      .query(async ({ ctx }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        return getDesignFolders();
      }),

    createDesignFolder: protectedProcedure
      .input(z.object({ name: z.string().min(1), parentId: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await createDesignFolder(input.name, input.parentId);
        return { success: true };
      }),

    deleteDesignFolder: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await deleteDesignFolder(input.id);
        return { success: true };
      }),

    // ─── Excel Templates ──────────────────────────────────────────────────
    getExcelTemplates: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
      return getExcelTemplates();
    }),

    createExcelTemplate: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        columns: z.string(), // JSON
        sortConfig: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await createExcelTemplate({ ...input, authorId: ctx.user.id });
        return { success: true };
      }),

    updateExcelTemplate: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        description: z.string().optional(),
        isDefault: z.boolean().optional(),
        columns: z.string().optional(),
        sortConfig: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const { id, ...data } = input;
        await updateExcelTemplate(id, data);
        return { success: true };
      }),

    deleteExcelTemplate: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        await deleteExcelTemplate(input.id);
        return { success: true };
      }),

    exportOrders: protectedProcedure
      .input(z.object({
        templateId: z.number().optional(),
        status: z.enum(["created", "paid", "failed", "cancelled"]).optional(),
        search: z.string().optional(),
        searchType: z.enum(["orderId", "name", "email", "productName"]).optional(),
        viewType: z.enum(["order", "item"]).default("order"),
        dateFrom: z.date().optional(),
        dateTo: z.date().optional(),
        stripHtml: z.boolean().default(true),
        padZero: z.boolean().default(false),
        columns: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN' });
        const XLSX = await import('xlsx');

        // 주문 데이터 조회
        const result = await searchOrders({
          status: input.status,
          search: input.search,
          searchType: input.searchType,
          viewType: input.viewType,
          dateFrom: input.dateFrom,
          dateTo: input.dateTo,
          page: 1,
          limit: 10000,
        });

        // 컨럼 정의
        const DEFAULT_ORDER_COLS = [
          { key: 'orderId', label: '주문번호' },
          { key: 'createdAt', label: '주문일' },
          { key: 'recipientName', label: '주문자' },
          { key: 'userEmail', label: '이메일' },
          { key: 'orderName', label: '주문명' },
          { key: 'totalAmount', label: '총 상품 구매금액' },
          { key: 'paidAmount', label: '실결제금액' },
          { key: 'paymentMethod', label: '결제수단' },
          { key: 'status', label: '결제상태' },
          { key: 'shippingStatus', label: '배송상태' },
          { key: 'recipientPhone', label: '수령인 연락처' },
          { key: 'recipientAddress', label: '배송주소' },
        ];
        const DEFAULT_ITEM_COLS = [
          { key: 'orderId', label: '주문번호' },
          { key: 'createdAt', label: '주문일' },
          { key: 'recipientName', label: '주문자' },
          { key: 'productName', label: '상품명' },
          { key: 'optionName', label: '옵션' },
          { key: 'quantity', label: '수량' },
          { key: 'price', label: '단가' },
          { key: 'totalAmount', label: '총금액' },
          { key: 'paymentMethod', label: '결제수단' },
          { key: 'status', label: '결제상태' },
        ];

        let cols = input.columns;
        if (!cols || cols.length === 0) {
          if (input.templateId) {
            const tpl = await getExcelTemplate(input.templateId);
            if (tpl) cols = JSON.parse(tpl.columns);
          }
          if (!cols || cols.length === 0) {
            cols = input.viewType === 'item' ? DEFAULT_ITEM_COLS : DEFAULT_ORDER_COLS;
          }
        }

        const statusLabel = (s: string) => ({ created: '입금전', paid: '결제완료', failed: '실패', cancelled: '취소' }[s] ?? s);
        const shippingLabel = (s: string) => ({ pending_payment: '입금대기', ready: '배송준비', hold: '배송보류', shipping: '배송중', delivered: '배송완료', none: '미배송' }[s] ?? s);
        const payLabel = (s: string) => ({ card: '카드', bank_transfer: '무통장입금', virtualAccount: '무통장입금', tosspay: '토스페이', kakaopay: '카카오페이' }[s] ?? s);

        const rows = result.items.map((item: any) => {
          const o = item.o;
          const row: Record<string, unknown> = {};
          for (const col of cols!) {
            switch (col.key) {
              case 'orderId': row[col.label] = o.orderId; break;
              case 'createdAt': row[col.label] = o.createdAt ? new Date(o.createdAt).toLocaleString('ko-KR') : ''; break;
              case 'recipientName': row[col.label] = o.recipientName ?? ''; break;
              case 'userEmail': row[col.label] = item.userEmail ?? ''; break;
              case 'orderName': row[col.label] = o.orderName ?? ''; break;
              case 'totalAmount': row[col.label] = Number(o.totalAmount ?? 0); break;
              case 'paidAmount': row[col.label] = Number(o.totalAmount ?? 0); break;
              case 'paymentMethod': row[col.label] = payLabel(o.paymentMethod ?? ''); break;
              case 'status': row[col.label] = statusLabel(o.status ?? ''); break;
              case 'shippingStatus': row[col.label] = shippingLabel(o.shippingStatus ?? 'none'); break;
              case 'recipientPhone': row[col.label] = o.recipientPhone ?? ''; break;
              case 'recipientAddress': row[col.label] = `${o.recipientAddress ?? ''} ${o.recipientAddressDetail ?? ''}`.trim(); break;
              case 'productName': row[col.label] = item.item?.productName ?? ''; break;
              case 'optionName': row[col.label] = item.item?.optionName ?? ''; break;
              case 'quantity': row[col.label] = item.item?.quantity ?? 0; break;
              case 'price': row[col.label] = Number(item.item?.price ?? 0); break;
              default: row[col.label] = '';
            }
          }
          return row;
        });

        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, '주문목록');
        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const base64 = Buffer.from(buf).toString('base64');
        return { base64, filename: `주문목록_${new Date().toISOString().slice(0,10)}.xlsx` };
      }),
  }),
});

export type AppRouter = typeof appRouter;

// ─── Gallery Router ────────────────────────────────────────────────────────────
// (exported separately for type inference)
