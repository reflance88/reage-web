/**
 * Supabase 연동 DB 헬퍼
 * 문의, 후기, 갤러리, 매거진, 로그 등 Supabase 테이블과 직접 연동
 */
import { supabaseAdmin, supabasePublic } from "./_core/supabase";

// ============================================================
// 문의 (contact_inquiries)
// ============================================================

export type InquiryType =
  | "experience_booking"
  | "business_consultation"
  | "education_inquiry"
  | "general";

export interface InsertContactInquiry {
  inquiry_type: InquiryType;
  name: string;
  phone: string;
  email?: string;
  shop_name?: string;
  region?: string;
  preferred_date?: string;
  education_course?: string;
  current_status?: string;
  message?: string;
  metadata?: Record<string, unknown>;
}

export async function createContactInquiry(data: InsertContactInquiry) {
  const { data: result, error } = await supabaseAdmin
    .from("contact_inquiries")
    .insert({ ...data, status: "pending" })
    .select()
    .single();
  if (error) throw new Error(`문의 저장 실패: ${error.message}`);
  return result;
}

export async function getContactInquiries(options?: {
  status?: string;
  inquiry_type?: InquiryType;
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabaseAdmin
    .from("contact_inquiries")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.status) query = query.eq("status", options.status);
  if (options?.inquiry_type) query = query.eq("inquiry_type", options.inquiry_type);

  const { data, error, count } = await query;
  if (error) throw new Error(`문의 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function updateInquiryStatus(
  id: string,
  status: "pending" | "in_progress" | "resolved" | "closed",
  adminMemo?: string
) {
  const { data, error } = await supabaseAdmin
    .from("contact_inquiries")
    .update({ status, admin_memo: adminMemo, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`문의 상태 업데이트 실패: ${error.message}`);
  return data;
}

// ============================================================
// 후기 (reviews)
// ============================================================

export async function getPublishedReviews(options?: {
  category?: string;
  page?: number;
  limit?: number;
  featured?: boolean;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabasePublic
    .from("reviews")
    .select("*", { count: "exact" })
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }
  if (options?.featured) query = query.eq("is_featured", true);

  const { data, error, count } = await query;
  if (error) throw new Error(`후기 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function createReviewSupabase(data: {
  category: "experience" | "education" | "product" | "general";
  author_name: string;
  author_region?: string;
  rating?: number;
  title?: string;
  content: string;
  image_urls?: string[];
  is_featured?: boolean;
  is_published?: boolean;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("reviews")
    .insert({ ...data, is_published: data.is_published ?? false })
    .select()
    .single();
  if (error) throw new Error(`후기 저장 실패: ${error.message}`);
  return result;
}

export async function updateReviewSupabase(id: string, data: Record<string, unknown>) {
  const { data: result, error } = await supabaseAdmin
    .from("reviews")
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`후기 수정 실패: ${error.message}`);
  return result;
}

export async function deleteReviewSupabase(id: string) {
  const { error } = await supabaseAdmin.from("reviews").delete().eq("id", id);
  if (error) throw new Error(`후기 삭제 실패: ${error.message}`);
  return true;
}

// ============================================================
// 갤러리 (gallery_posts + gallery_images)
// ============================================================

export async function getPublishedGalleryPosts(options?: {
  category?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabasePublic
    .from("gallery_posts")
    .select(`*, gallery_images ( id, image_url, alt_text, sort_order )`, { count: "exact" })
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`갤러리 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function getGalleryPostByIdSupabase(id: string) {
  const { data, error } = await supabasePublic
    .from("gallery_posts")
    .select(`*, gallery_images ( id, image_url, alt_text, sort_order )`)
    .eq("id", id)
    .single();
  if (error) throw new Error(`갤러리 상세 조회 실패: ${error.message}`);
  return data;
}

export async function createGalleryPostSupabase(data: {
  title: string;
  category: string;
  description?: string;
  thumbnail_url?: string;
  is_published?: boolean;
  images?: { image_url: string; alt_text?: string; sort_order?: number }[];
}) {
  const { images, ...postData } = data;
  const { data: post, error: postError } = await supabaseAdmin
    .from("gallery_posts")
    .insert({ ...postData, is_published: postData.is_published ?? false })
    .select()
    .single();
  if (postError) throw new Error(`갤러리 포스트 저장 실패: ${postError.message}`);

  if (images && images.length > 0) {
    const imageRows = images.map((img, idx) => ({
      post_id: post.id,
      image_url: img.image_url,
      alt_text: img.alt_text ?? "",
      sort_order: img.sort_order ?? idx,
    }));
    const { error: imgError } = await supabaseAdmin.from("gallery_images").insert(imageRows);
    if (imgError) throw new Error(`갤러리 이미지 저장 실패: ${imgError.message}`);
  }
  return post;
}

export async function deleteGalleryPostSupabase(id: string) {
  const { error } = await supabaseAdmin.from("gallery_posts").delete().eq("id", id);
  if (error) throw new Error(`갤러리 삭제 실패: ${error.message}`);
  return true;
}

// ============================================================
// 매거진 (magazine_posts)
// ============================================================

export async function getPublishedMagazinePosts(options?: {
  category?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 12;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabasePublic
    .from("magazine_posts")
    .select(
      "id, title, slug, category, excerpt, thumbnail_url, author_name, published_at, view_count, created_at",
      { count: "exact" }
    )
    .eq("is_published", true)
    .order("published_at", { ascending: false })
    .range(from, to);

  if (options?.category && options.category !== "all") {
    query = query.eq("category", options.category);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`매거진 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function getMagazinePostBySlugSupabase(slug: string) {
  const { data, error } = await supabasePublic
    .from("magazine_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();
  if (error) throw new Error(`매거진 상세 조회 실패: ${error.message}`);

  // 조회수 증가 (비동기, 실패 무시)
  supabaseAdmin
    .from("magazine_posts")
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {});

  return data;
}

export async function createMagazinePostSupabase(data: {
  title: string;
  slug: string;
  category: string;
  content: string;
  excerpt?: string;
  thumbnail_url?: string;
  author_name?: string;
  seo_title?: string;
  seo_description?: string;
  is_published?: boolean;
  published_at?: string;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("magazine_posts")
    .insert({
      ...data,
      is_published: data.is_published ?? false,
      published_at: data.published_at ?? (data.is_published ? new Date().toISOString() : null),
    })
    .select()
    .single();
  if (error) throw new Error(`매거진 저장 실패: ${error.message}`);
  return result;
}

// ============================================================
// 로그 (page_views, download_logs, revenue_simulator_logs)
// ============================================================

export async function recordPageViewSupabase(data: {
  page_path: string;
  session_id?: string;
  referrer?: string;
}) {
  const { error } = await supabaseAdmin.from("page_views").insert(data);
  if (error) console.warn("[PageView] 기록 실패:", error.message);
}

export async function recordDownloadLog(data: {
  file_name: string;
  file_type?: string;
  email?: string;
  name?: string;
  phone?: string;
  session_id?: string;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("download_logs")
    .insert(data)
    .select()
    .single();
  if (error) throw new Error(`다운로드 로그 저장 실패: ${error.message}`);
  return result;
}

export async function recordRevenueSimulatorLog(data: {
  sessions_per_day: number;
  price_per_session: number;
  working_days: number;
  calculated_monthly: number;
  ip_hash?: string;
}) {
  const { error } = await supabaseAdmin.from("revenue_simulator_logs").insert(data);
  if (error) console.warn("[SimulatorLog] 기록 실패:", error.message);
}

// ============================================================
// 체험센터 (experience_centers)
// ============================================================

export async function getExperienceCenters(region?: string) {
  let query = supabasePublic
    .from("experience_centers")
    .select("*")
    .eq("is_active", true)
    .order("region", { ascending: true });
  if (region) query = query.eq("region", region);
  const { data, error } = await query;
  if (error) throw new Error(`체험센터 조회 실패: ${error.message}`);
  return data ?? [];
}

// ============================================================
// 공인강사 (certified_instructors)
// ============================================================

export async function getCertifiedInstructorsSupabase(options?: {
  region?: string;
  level?: string;
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabasePublic
    .from("certified_instructors")
    .select("*", { count: "exact" })
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (options?.region) query = query.eq("region", options.region);
  if (options?.level) query = query.eq("level", options.level);

  const { data, error, count } = await query;
  if (error) throw new Error(`공인강사 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

// ============================================================
// 팝업 (popups)
// ============================================================

export async function getActivePopupsSupabase(pagePath?: string) {
  const now = new Date().toISOString();
  const { data, error } = await supabasePublic
    .from("popups")
    .select("*")
    .eq("is_active", true)
    .lte("start_at", now)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`팝업 조회 실패: ${error.message}`);

  const result = (data ?? []).filter((popup: Record<string, unknown>) => {
    if (popup.end_at && new Date(popup.end_at as string) < new Date()) return false;
    if (!pagePath) return true;
    const targets = popup.target_pages as string[] | null;
    if (!targets || targets.length === 0) return true;
    return targets.includes(pagePath);
  });

  return result;
}
