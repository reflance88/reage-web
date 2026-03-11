/**
 * Supabase 연동 tRPC 라우터
 * 문의, 후기, 갤러리, 매거진, 로그, 체험센터, 공인강사, 팝업
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { protectedProcedure, publicProcedure, router } from "../_core/trpc";
import { sendInquiryNotification } from "../email-inquiry";
import {
  createContactInquiry,
  getContactInquiries,
  updateInquiryStatus,
  getInquiryStats,
  getPublishedReviews,
  createReviewSupabase,
  updateReviewSupabase,
  deleteReviewSupabase,
  getPublishedGalleryPosts,
  getGalleryPostByIdSupabase,
  createGalleryPostSupabase,
  deleteGalleryPostSupabase,
  getPublishedMagazinePosts,
  getMagazinePostBySlugSupabase,
  createMagazinePostSupabase,
  recordPageViewSupabase,
  recordDownloadLog,
  recordRevenueSimulatorLog,
  getExperienceCenters,
  getCertifiedInstructorsSupabase,
  getActivePopupsSupabase,
} from "../supabase-db";

// ============================================================
// 문의 라우터
// ============================================================
export const sbContactRouter = router({
  // 공개: 문의 제출
  submit: publicProcedure
    .input(
      z.object({
        inquiry_type: z.enum(["trial", "introduction", "education"]),
        name: z.string().min(1).max(50),
        phone: z.string().min(9).max(20),
        email: z.string().email().optional(),
        shop_name: z.string().optional(),
        region: z.string().optional(),
        preferred_date: z.string().optional(),
        education_course: z.string().optional(),
        current_status: z.string().optional(),
        message: z.string().optional(),
        privacy_agreed: z.boolean().optional().default(false),
        metadata: z.record(z.string(), z.unknown()).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await createContactInquiry({
        ...input,
        email: input.email || undefined,
      });
      // 문의 접수 알림 이메일 발송 (비동기, 실패해도 문의 저장에는 영향 없음)
      sendInquiryNotification({
        ...result,
        id: result.id,
      }).catch((err) =>
        console.error("[InquiryMail] 알림 이메일 발송 실패:", err)
      );
      return { success: true, id: result.id };
    }),

  // 관리자: 문의 목록 조회
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["received", "contacted", "closed"]).optional(),
        inquiry_type: z.enum(["trial", "introduction", "education"]).optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return getContactInquiries(input);
    }),

  // 관리자: 문의 전체 목록 내보내기 (엑셀용 전체 데이터)
  exportAll: protectedProcedure
    .input(
      z.object({
        status: z.enum(["received", "contacted", "closed"]).optional(),
        inquiry_type: z.enum(["trial", "introduction", "education"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      // 엑셀 내보내기는 전체 데이터 필요 - 측에서 여러 페이지 반복하는 대신 한번에 전체 가져오기
      return getContactInquiries({ ...input, page: 1, limit: 10000 });
    }),

  // 관리자: 문의 상태 변경
  updateStatus: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        status: z.enum(["received", "contacted", "closed"]),
        admin_memo: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return updateInquiryStatus(input.id, input.status, input.admin_memo);
    }),

  // 관리자: 문의 통계
  stats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return getInquiryStats();
  }),
});

// ============================================================
// 후기 라우터
// ============================================================
export const sbReviewRouter = router({
  // 공개 후기 목록
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(12),
        featured: z.boolean().optional(),
      })
    )
    .query(async ({ input }) => {
      return getPublishedReviews(input);
    }),

  // 관리자: 후기 등록
  create: protectedProcedure
    .input(
      z.object({
        category: z.enum(["experience", "education", "product", "general"]),
        author_name: z.string().min(1),
        author_region: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
        title: z.string().optional(),
        content: z.string().min(1),
        image_urls: z.array(z.string()).optional(),
        is_featured: z.boolean().optional(),
        is_published: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createReviewSupabase(input);
    }),

  // 관리자: 후기 수정
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return updateReviewSupabase(input.id, input.data);
    }),

  // 관리자: 후기 삭제
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return deleteReviewSupabase(input.id);
    }),
});

// ============================================================
// 갤러리 라우터
// ============================================================
export const sbGalleryRouter = router({
  // 공개 갤러리 목록
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      return getPublishedGalleryPosts(input);
    }),

  // 공개 갤러리 상세
  getById: publicProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input }) => {
      return getGalleryPostByIdSupabase(input.id);
    }),

  // 관리자: 갤러리 등록
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        category: z.string(),
        description: z.string().optional(),
        thumbnail_url: z.string().optional(),
        is_published: z.boolean().optional(),
        images: z
          .array(
            z.object({
              image_url: z.string(),
              alt_text: z.string().optional(),
              sort_order: z.number().optional(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createGalleryPostSupabase(input);
    }),

  // 관리자: 갤러리 삭제
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return deleteGalleryPostSupabase(input.id);
    }),
});

// ============================================================
// 매거진 라우터
// ============================================================
export const sbMagazineRouter = router({
  // 공개 매거진 목록
  list: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(12),
      })
    )
    .query(async ({ input }) => {
      return getPublishedMagazinePosts(input);
    }),

  // 공개 매거진 상세 (slug)
  getBySlug: publicProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input }) => {
      return getMagazinePostBySlugSupabase(input.slug);
    }),

  // 관리자: 매거진 등록
  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        slug: z.string().min(1),
        category: z.string(),
        content: z.string().min(1),
        excerpt: z.string().optional(),
        thumbnail_url: z.string().optional(),
        author_name: z.string().optional(),
        seo_title: z.string().optional(),
        seo_description: z.string().optional(),
        is_published: z.boolean().optional(),
        published_at: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }
      return createMagazinePostSupabase(input);
    }),
});

// ============================================================
// 로그 라우터
// ============================================================
export const sbLogRouter = router({
  // 페이지뷰 기록
  recordPageView: publicProcedure
    .input(
      z.object({
        page_path: z.string(),
        session_id: z.string().optional(),
        referrer: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await recordPageViewSupabase(input);
      return { success: true };
    }),

  // 다운로드 로그 기록
  recordDownload: publicProcedure
    .input(
      z.object({
        file_name: z.string(),
        file_type: z.string().optional(),
        email: z.string().email().optional(),
        name: z.string().optional(),
        phone: z.string().optional(),
        session_id: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await recordDownloadLog(input);
      return { success: true, id: result.id };
    }),

  // 수익 시뮬레이터 로그 기록
  recordSimulator: publicProcedure
    .input(
      z.object({
        sessions_per_day: z.number(),
        price_per_session: z.number(),
        working_days: z.number(),
        calculated_monthly: z.number(),
        ip_hash: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      await recordRevenueSimulatorLog(input);
      return { success: true };
    }),
});

// ============================================================
// 체험센터 라우터
// ============================================================
export const sbExperienceCenterRouter = router({
  list: publicProcedure
    .input(z.object({ region: z.string().optional() }))
    .query(async ({ input }) => {
      return getExperienceCenters(input.region);
    }),
});

// ============================================================
// 공인강사 라우터
// ============================================================
export const sbInstructorRouter = router({
  list: publicProcedure
    .input(
      z.object({
        region: z.string().optional(),
        level: z.string().optional(),
        page: z.number().default(1),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      return getCertifiedInstructorsSupabase(input);
    }),
});

// ============================================================
// 팝업 라우터
// ============================================================
export const sbPopupRouter = router({
  getActive: publicProcedure
    .input(z.object({ page_path: z.string().optional() }))
    .query(async ({ input }) => {
      return getActivePopupsSupabase(input.page_path);
    }),
});
