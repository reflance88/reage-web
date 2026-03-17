/**
 * Supabase 연동 DB 헬퍼
 * 문의, 후기, 갤러리, 매거진, 로그 등 Supabase 테이블과 직접 연동
 */
import { supabaseAdmin, supabasePublic } from "./_core/supabase";

// ============================================================
// 문의 (contact_inquiries)
// ============================================================

export type InquiryType = "trial" | "introduction" | "education";
export type InquiryStatus = "received" | "contacted" | "closed";

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
  privacy_agreed?: boolean;
  metadata?: Record<string, unknown>;
}

export async function createContactInquiry(data: InsertContactInquiry) {
  const { data: result, error } = await supabaseAdmin
    .from("contact_inquiries")
    .insert({ ...data, status: "received" })
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
  status: InquiryStatus,
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

/**
 * 문의 통계 데이터 조회
 * - 요약 KPI (전체, 이번달, 미처리, 처리율)
 * - 월별 문의 건수 (최근 12개월)
 * - 유형별 비율
 * - 상태별 처리현황
 */
export async function getInquiryStats(months?: number) {
  // 기간 필터를 적용하여 데이터 조회
  let query = supabaseAdmin
    .from("contact_inquiries")
    .select("id, inquiry_type, status, created_at, region, phone, email")
    .order("created_at", { ascending: true });

  if (months && months > 0) {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    query = query.gte("created_at", cutoff.toISOString());
  }

  const { data, error } = await query;
  if (error) throw new Error(`통계 조회 실패: ${error.message}`);
  const rows = data ?? [];

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // KPI
  const total = rows.length;
  const thisMonth = rows.filter((r) => new Date(r.created_at) >= thisMonthStart).length;
  const unhandled = rows.filter((r) => r.status === "received").length;
  const handled = rows.filter((r) => r.status === "contacted" || r.status === "closed").length;
  const processingRate = total > 0 ? Math.round((handled / total) * 100) : 0;

  // 월별 문의 건수 (기간에 따라 동적 생성)
  const monthCount = months && months > 0 ? Math.min(months, 24) : 12;
  const monthlyMap: Record<string, { month: string; total: number; trial: number; introduction: number; education: number }> = {};
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthlyMap[key] = { month: key, total: 0, trial: 0, introduction: 0, education: 0 };
  }
  for (const r of rows) {
    const d = new Date(r.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (monthlyMap[key]) {
      monthlyMap[key].total++;
      if (r.inquiry_type === "trial") monthlyMap[key].trial++;
      else if (r.inquiry_type === "introduction") monthlyMap[key].introduction++;
      else if (r.inquiry_type === "education") monthlyMap[key].education++;
    }
  }
  const monthly = Object.values(monthlyMap);

  // 유형별 비율
  const trialCount = rows.filter((r) => r.inquiry_type === "trial").length;
  const introCount = rows.filter((r) => r.inquiry_type === "introduction").length;
  const eduCount = rows.filter((r) => r.inquiry_type === "education").length;
  const byType = [
    { name: "체험예약", value: trialCount, color: "#6B0F1A" },
    { name: "도입상담", value: introCount, color: "#C9A96E" },
    { name: "교육문의", value: eduCount, color: "#4B5563" },
  ];

  // 상태별 처리현황
  const receivedCount = rows.filter((r) => r.status === "received").length;
  const contactedCount = rows.filter((r) => r.status === "contacted").length;
  const closedCount = rows.filter((r) => r.status === "closed").length;
  const byStatus = [
    { name: "접수", value: receivedCount, color: "#F59E0B" },
    { name: "연락완료", value: contactedCount, color: "#3B82F6" },
    { name: "종료", value: closedCount, color: "#10B981" },
  ];

  // 퍼널 데이터: 실제 전환율 추적 (phone/email 기반 고객 매칭)
  // 체험예약 신청자 중 도입상담도 신청한 고객 수, 그 중 교육문의도 신청한 고객 수
  const trialCustomers = new Set<string>();
  const introCustomers = new Set<string>();
  const eduCustomers = new Set<string>();
  for (const r of rows) {
    const key = (r as any).phone ? `phone:${(r as any).phone}` : (r as any).email ? `email:${(r as any).email}` : null;
    if (!key) continue;
    if (r.inquiry_type === "trial") trialCustomers.add(key);
    else if (r.inquiry_type === "introduction") introCustomers.add(key);
    else if (r.inquiry_type === "education") eduCustomers.add(key);
  }
  // 체험 → 도입 전환: 체험 고객 중 도입상담도 신청한 수
  const trialToIntroCount = Array.from(trialCustomers).filter(k => introCustomers.has(k)).length;
  // 도입 → 교육 전환: 도입 고객 중 교육문의도 신청한 수
  const introToEduCount = Array.from(introCustomers).filter(k => eduCustomers.has(k)).length;
  // 체험 → 교육 직접 전환 (3단계 모두 거친 고객)
  const trialToEduCount = Array.from(trialCustomers).filter(k => eduCustomers.has(k)).length;

  const trialToIntroRate = trialCustomers.size > 0 ? Math.round((trialToIntroCount / trialCustomers.size) * 100) : 0;
  const introToEduRate = introCustomers.size > 0 ? Math.round((introToEduCount / introCustomers.size) * 100) : 0;

  const funnel = [
    { stage: "체험예약", value: trialCount, uniqueCustomers: trialCustomers.size, fill: "#6B0F1A" },
    { stage: "도입상담", value: introCount, uniqueCustomers: introCustomers.size, fill: "#C9A96E" },
    { stage: "교육문의", value: eduCount, uniqueCustomers: eduCustomers.size, fill: "#4B5563" },
  ];

  const conversionStats = {
    trialToIntroCount,
    introToEduCount,
    trialToEduCount,
    trialToIntroRate,
    introToEduRate,
    trialCustomers: trialCustomers.size,
    introCustomers: introCustomers.size,
    eduCustomers: eduCustomers.size,
  };

  // 지역별 문의 분포
  const regionMap: Record<string, number> = {};
  for (const r of rows) {
    const reg = (r.region as string | null | undefined)?.trim() || "미입력";
    regionMap[reg] = (regionMap[reg] ?? 0) + 1;
  }
  const byRegion = Object.entries(regionMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 15); // 상위 15개만

  return {
    kpi: { total, thisMonth, unhandled, processingRate },
    monthly,
    byType,
    byStatus,
    funnel,
    byRegion,
    conversionStats,
  };
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
    .select("id, title, content, coverImageUrl, coverImageKey, isPublished, viewCount, createdAt", { count: "exact" })
    .eq("isPublished", true)
    .order("createdAt", { ascending: false })
    .range(from, to);

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  const { data, error, count } = await query;
  if (error) throw new Error(`갤러리 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function _getPublishedGalleryPostsOLD(options?: {
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
      "id, title, subtitle, content, coverImageUrl, coverImageKey, isPublished, viewCount, createdAt",
      { count: "exact" }
    )
    .eq("isPublished", true)
    .order("createdAt", { ascending: false })
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

  // Note: view_count increment has a minor race condition under concurrent reads.
  // For accurate counts at scale, create a Supabase RPC function with: UPDATE magazine_posts SET view_count = view_count + 1 WHERE id = $1
  supabaseAdmin
    .from("magazine_posts")
    .update({ view_count: (data.view_count ?? 0) + 1 })
    .eq("id", data.id)
    .then(() => {}, (err: unknown) => console.warn("[Magazine] view_count increment failed:", err));

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

/// ============================================================
// 공인강사 (certified_instructors) - camelCase 컬럼 기준
// ============================================================
export async function getCertifiedInstructorsSupabase(options?: {
  page?: number;
  limit?: number;
  publishedOnly?: boolean;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 100;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  let query = supabasePublic
    .from("certified_instructors")
    .select("id, imageUrl, imageKey, name, description, sortOrder, isPublished, createdAt", { count: "exact" })
    .order("sortOrder", { ascending: true })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (options?.publishedOnly !== false) {
    query = query.eq("isPublished", true);
  }
  const { data, error, count } = await query;
  if (error) throw new Error(`인증강사 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function createCertifiedInstructorSupabase(data: {
  imageUrl: string;
  imageKey?: string;
  name?: string;
  description?: string;
  sortOrder?: number;
  isPublished?: boolean;
  authorId?: number;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("certified_instructors")
    .insert({
      imageUrl: data.imageUrl,
      imageKey: data.imageKey ?? null,
      name: data.name ?? null,
      description: data.description ?? null,
      sortOrder: data.sortOrder ?? 0,
      isPublished: data.isPublished ?? true,
      authorId: data.authorId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`인증강사 등록 실패: ${error.message}`);
  return result;
}

export async function updateCertifiedInstructorSupabase(
  id: number,
  data: {
    imageUrl?: string;
    imageKey?: string;
    name?: string;
    description?: string;
    sortOrder?: number;
    isPublished?: boolean;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.imageUrl !== undefined) updateData.imageUrl = data.imageUrl;
  if (data.imageKey !== undefined) updateData.imageKey = data.imageKey;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.sortOrder !== undefined) updateData.sortOrder = data.sortOrder;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
  updateData.updatedAt = new Date().toISOString();
  const { data: result, error } = await supabaseAdmin
    .from("certified_instructors")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`인증강사 수정 실패: ${error.message}`);
  return result;
}

export async function deleteCertifiedInstructorSupabase(id: number) {
  const { error } = await supabaseAdmin.from("certified_instructors").delete().eq("id", id);
  if (error) throw new Error(`인증강사 삭제 실패: ${error.message}`);
  return true;
}

export async function getAdminCertifiedInstructors(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 100;
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, error, count } = await supabaseAdmin
    .from("certified_instructors")
    .select("*", { count: "exact" })
    .order("sortOrder", { ascending: true })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`관리자 인증강사 조회 실패: ${error.message}`);
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

// ============================================================
// 관리자 갤러리 CRUD (Supabase gallery_posts) - camelCase 컬럼 기준
// ============================================================

export async function getAdminGalleryPosts(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from("gallery_posts")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`관리자 갤러리 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

export async function createAdminGalleryPost(data: {
  title: string;
  content?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  isPublished?: boolean;
  authorId?: number;
}) {
  const { data: result, error } = await supabaseAdmin
    .from("gallery_posts")
    .insert({
      title: data.title,
      content: data.content ?? "",
      coverImageUrl: data.coverImageUrl ?? null,
      coverImageKey: data.coverImageKey ?? null,
      isPublished: data.isPublished ?? true,
      authorId: data.authorId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`갤러리 글 저장 실패: ${error.message}`);
  return result;
}

export async function updateAdminGalleryPost(
  id: string,
  data: {
    title?: string;
    content?: string;
    coverImageUrl?: string;
    coverImageKey?: string;
    isPublished?: boolean;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
  if (data.coverImageKey !== undefined) updateData.coverImageKey = data.coverImageKey;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabaseAdmin
    .from("gallery_posts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`갤러리 글 수정 실패: ${error.message}`);
  return result;
}

export async function deleteAdminGalleryPost(id: string) {
  const { error } = await supabaseAdmin.from("gallery_posts").delete().eq("id", id);
  if (error) throw new Error(`갤러리 글 삭제 실패: ${error.message}`);
  return true;
}

// ============================================================
// 관리자 매거진 CRUD (Supabase magazine_posts) - camelCase 컬럼 기준
// ============================================================

export async function getAdminMagazinePosts(options?: {
  page?: number;
  limit?: number;
}) {
  const page = options?.page ?? 1;
  const limit = options?.limit ?? 20;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  const { data, error, count } = await supabaseAdmin
    .from("magazine_posts")
    .select("*", { count: "exact" })
    .order("createdAt", { ascending: false })
    .range(from, to);
  if (error) throw new Error(`관리자 매거진 조회 실패: ${error.message}`);
  return { items: data ?? [], total: count ?? 0 };
}

function generateSlug(title: string): string {
  const timestamp = Date.now();
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9가-힣\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 50);
  return `${base}-${timestamp}`;
}

export async function createAdminMagazinePost(data: {
  title: string;
  subtitle?: string;
  content?: string;
  coverImageUrl?: string;
  coverImageKey?: string;
  isPublished?: boolean;
  authorId?: number;
}) {
  const slug = generateSlug(data.title);
  const { data: result, error } = await supabaseAdmin
    .from("magazine_posts")
    .insert({
      slug,
      title: data.title,
      subtitle: data.subtitle ?? "",
      content: data.content ?? "",
      coverImageUrl: data.coverImageUrl ?? null,
      coverImageKey: data.coverImageKey ?? null,
      isPublished: data.isPublished ?? true,
      authorId: data.authorId ?? null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    .select()
    .single();
  if (error) throw new Error(`매거진 글 저장 실패: ${error.message}`);
  return result;
}

export async function updateAdminMagazinePost(
  id: string,
  data: {
    title?: string;
    subtitle?: string;
    content?: string;
    coverImageUrl?: string;
    coverImageKey?: string;
    isPublished?: boolean;
  }
) {
  const updateData: Record<string, unknown> = {};
  if (data.title !== undefined) updateData.title = data.title;
  if (data.subtitle !== undefined) updateData.subtitle = data.subtitle;
  if (data.content !== undefined) updateData.content = data.content;
  if (data.coverImageUrl !== undefined) updateData.coverImageUrl = data.coverImageUrl;
  if (data.coverImageKey !== undefined) updateData.coverImageKey = data.coverImageKey;
  if (data.isPublished !== undefined) updateData.isPublished = data.isPublished;
  updateData.updatedAt = new Date().toISOString();

  const { data: result, error } = await supabaseAdmin
    .from("magazine_posts")
    .update(updateData)
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`매거진 글 수정 실패: ${error.message}`);
  return result;
}

export async function deleteAdminMagazinePost(id: string) {
  const { error } = await supabaseAdmin.from("magazine_posts").delete().eq("id", id);
  if (error) throw new Error(`매거진 글 삭제 실패: ${error.message}`);
  return true;
}
