// ─── ProductDetailPage.tsx ────────────────────────────────────────────────────
// 카페24 스타일 상품 상세 편집 페이지 (탭 구조)
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const C = {
  bg: "#F7F5F2",
  white: "#FFFFFF",
  primary: "#6B0F1A",
  gold: "#C9A96E",
  border: "#E8E6E3",
  text: "#1A1412",
  muted: "#6B6B6B",
  blue: "#1D4ED8",
  green: "#166534",
};

type Tab = "basic" | "sale" | "image" | "content" | "shipping" | "seo" | "memo";

const TABS: { id: Tab; label: string }[] = [
  { id: "basic", label: "기본정보" },
  { id: "sale", label: "판매정보" },
  { id: "image", label: "이미지정보" },
  { id: "content", label: "상세페이지 콘텐츠" },
  { id: "shipping", label: "배송정보" },
  { id: "seo", label: "SEO설정" },
  { id: "memo", label: "메모" },
];

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, minHeight: "48px" }}>
      <div style={{
        width: "180px", minWidth: "180px", background: "#F9F8F7", padding: "12px 16px",
        fontSize: "13px", fontWeight: 600, color: C.text, display: "flex", alignItems: "center", gap: "4px",
        borderRight: `1px solid ${C.border}`,
      }}>
        {label}
        {required && <span style={{ color: "#E53E3E", fontSize: "11px" }}>필수</span>}
      </div>
      <div style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "center" }}>
        {children}
      </div>
    </div>
  );
}

function Input({ value, onChange, placeholder, maxLength, type = "text", style }: {
  value: string; onChange: (v: string) => void; placeholder?: string; maxLength?: number; type?: string; style?: React.CSSProperties;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      style={{
        width: "100%", padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: "4px",
        fontSize: "13px", color: C.text, outline: "none", ...style,
      }}
    />
  );
}

function Textarea({ value, onChange, placeholder, rows = 4 }: {
  value: string; onChange: (v: string) => void; placeholder?: string; rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      style={{
        width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "4px",
        fontSize: "13px", color: C.text, outline: "none", resize: "vertical",
      }}
    />
  );
}

function Select({ value, onChange, options }: {
  value: string; onChange: (v: string) => void; options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      style={{
        padding: "7px 10px", border: `1px solid ${C.border}`, borderRadius: "4px",
        fontSize: "13px", color: C.text, background: C.white, outline: "none",
      }}
    >
      {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}

export default function ProductDetailPage({ productId, onBack }: { productId: number; onBack: () => void }) {
  const [activeTab, setActiveTab] = useState<Tab>("basic");
  const { data: product, refetch } = trpc.admin.allProducts.useQuery(undefined, {
    select: (data) => data.find((p: any) => p.id === productId),
  });
  const updateProduct = trpc.admin.updateProduct.useMutation({
    onSuccess: () => { toast.success("상품이 수정되었습니다."); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState<Record<string, any>>({});
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [imagePickerTarget, setImagePickerTarget] = useState<"imageUrl" | "thumbnailUrl">("imageUrl");
  const [imageSearchText, setImageSearchText] = useState("");
  const set = (key: string, value: any) => setForm(f => ({ ...f, [key]: value }));
  const get = (key: string, fallback: any = "") => form[key] !== undefined ? form[key] : (product as any)?.[key] ?? fallback;

  // 디자인 보관함 이미지 목록
  const { data: designFilesData } = trpc.adminExt.getDesignFiles.useQuery(
    { folder: "" },
    { enabled: showImagePicker }
  );
  const designImages = (designFilesData ?? []).filter((f: any) =>
    f.mimeType?.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f.fileName)
  );

  if (!product) return (
    <div style={{ padding: "40px", textAlign: "center", color: C.muted }}>상품을 불러오는 중...</div>
  );

  const p = product as any;

  // 이미지 선택 팝업 열기
  const openImagePicker = (target: "imageUrl" | "thumbnailUrl") => {
    setImagePickerTarget(target);
    setImageSearchText("");
    setShowImagePicker(true);
  };

  const selectImage = (url: string) => {
    set(imagePickerTarget, url);
    setShowImagePicker(false);
    toast.success("이미지가 선택되었습니다.");
  };

  const handleSave = () => {
    if (Object.keys(form).length === 0) { toast("변경된 내용이 없습니다."); return; }
    updateProduct.mutate({ id: productId, ...form });
    setForm({});
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh" }}>
      {/* 헤더 */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, padding: "12px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button onClick={onBack} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: "13px", display: "flex", alignItems: "center", gap: "4px" }}>
            ← 목록으로
          </button>
          <div style={{ width: "1px", height: "16px", background: C.border }} />
          <div style={{ fontSize: "13px", color: C.text }}>
            <span style={{ fontWeight: 600 }}>[{p.isNew ? "신상품" : "기본상품"}]</span>{" "}
            {p.name}
            {p.productCode && <span style={{ color: C.muted }}> (상품코드: {p.productCode})</span>}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", fontSize: "12px", color: C.muted }}>
          <span>상품등록일: {p.createdAt ? new Date(p.createdAt).toLocaleDateString("ko-KR") : "—"}</span>
          <span>·</span>
          <span>최종 상품수정일: {p.updatedAt ? new Date(p.updatedAt).toLocaleDateString("ko-KR") : "—"}</span>
        </div>
      </div>

      {/* 탭 */}
      <div style={{ background: C.white, borderBottom: `1px solid ${C.border}`, display: "flex", paddingLeft: "24px" }}>
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: "12px 20px", border: "none", background: "none", cursor: "pointer",
              fontSize: "13px", fontWeight: activeTab === tab.id ? 700 : 400,
              color: activeTab === tab.id ? C.primary : C.muted,
              borderBottom: activeTab === tab.id ? `2px solid ${C.primary}` : "2px solid transparent",
              marginBottom: "-1px",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 탭 내용 */}
      <div style={{ padding: "24px", maxWidth: "1100px" }}>
        <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>

          {/* 기본정보 탭 */}
          {activeTab === "basic" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>기본 정보</div>
              <Field label="상품명" required>
                <Input value={get("name")} onChange={v => set("name", v)} placeholder="상품명 입력" maxLength={250} />
                <span style={{ marginLeft: "8px", fontSize: "12px", color: C.muted }}>[{get("name").length}/250]</span>
              </Field>
              <Field label="상품코드">
                <span style={{ fontSize: "13px", color: C.text, fontWeight: 600 }}>{p.productCode || "자동생성"}</span>
              </Field>
              <Field label="상품상태">
                <Select
                  value={get("productStatus", "new")}
                  onChange={v => set("productStatus", v)}
                  options={[
                    { value: "new", label: "신상품" },
                    { value: "used", label: "중고" },
                    { value: "refurbished", label: "리퍼" },
                  ]}
                />
              </Field>
              <Field label="상품 요약설명">
                <Input value={get("summaryDescription")} onChange={v => set("summaryDescription", v)} placeholder="요약설명 입력" maxLength={255} />
                <span style={{ marginLeft: "8px", fontSize: "12px", color: C.muted }}>[{get("summaryDescription").length}/255]</span>
              </Field>
              <Field label="상품 간략설명">
                <Textarea value={get("shortDescription")} onChange={v => set("shortDescription", v)} placeholder="간략설명 입력" rows={3} />
              </Field>
              <Field label="상품 상세설명">
                <Textarea value={get("description")} onChange={v => set("description", v)} placeholder="상세설명 입력" rows={6} />
              </Field>
            </div>
          )}

          {/* 판매정보 탭 */}
          {activeTab === "sale" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>판매 정보</div>
              <Field label="판매가 (일반)" required>
                <Input value={get("priceConsumer")} onChange={v => set("priceConsumer", v)} type="number" style={{ width: "160px" }} />
                <span style={{ marginLeft: "8px", fontSize: "13px", color: C.muted }}>KRW</span>
              </Field>
              <Field label="판매가 (전문가)">
                <Input value={get("pricePro")} onChange={v => set("pricePro", v)} type="number" style={{ width: "160px" }} />
                <span style={{ marginLeft: "8px", fontSize: "13px", color: C.muted }}>KRW</span>
              </Field>
              <Field label="판매가 (멤버십)">
                <Input value={get("priceMembership")} onChange={v => set("priceMembership", v)} type="number" style={{ width: "160px" }} />
                <span style={{ marginLeft: "8px", fontSize: "13px", color: C.muted }}>KRW</span>
              </Field>
              <Field label="과세구분">
                <Select
                  value={get("taxType", "taxable")}
                  onChange={v => set("taxType", v)}
                  options={[
                    { value: "taxable", label: "과세상품" },
                    { value: "tax_free", label: "영세상품" },
                    { value: "exempt", label: "면세상품" },
                  ]}
                />
                {get("taxType", "taxable") === "taxable" && (
                  <span style={{ marginLeft: "12px", fontSize: "13px", color: C.muted }}>
                    과세율: <Input value={get("taxRate", "10.00")} onChange={v => set("taxRate", v)} type="number" style={{ width: "60px", display: "inline-block" }} /> %
                  </span>
                )}
              </Field>
              <Field label="재고">
                <Input value={String(get("stock", 999))} onChange={v => set("stock", Number(v))} type="number" style={{ width: "100px" }} />
                <span style={{ marginLeft: "8px", fontSize: "13px", color: C.muted }}>개</span>
              </Field>
              <Field label="전문가 전용">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={get("isProOnly", false)} onChange={e => set("isProOnly", e.target.checked)} />
                  전문가 회원만 구매 가능
                </label>
              </Field>
              <Field label="노출 여부">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={get("visible", true)} onChange={e => set("visible", e.target.checked)} />
                  쇼핑몰에 노출
                </label>
              </Field>
              <Field label="추천상품">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={get("isRecommended", false)} onChange={e => set("isRecommended", e.target.checked)} />
                  추천상품으로 등록
                </label>
              </Field>
              <Field label="신상품">
                <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                  <input type="checkbox" checked={get("isNew", false)} onChange={e => set("isNew", e.target.checked)} />
                  신상품으로 표시
                </label>
              </Field>
            </div>
          )}

          {/* 이미지정보 탭 */}
          {activeTab === "image" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>이미지 정보</div>
              <Field label="대표 이미지 URL">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Input value={get("imageUrl")} onChange={v => set("imageUrl", v)} placeholder="이미지 URL 입력 (https://...)" />
                    <button
                      onClick={() => openImagePicker("imageUrl")}
                      style={{ padding: "7px 12px", background: C.primary, color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >📁 보관함</button>
                  </div>
                  {get("imageUrl") && (
                    <div style={{ marginTop: "8px" }}>
                      <img src={get("imageUrl")} alt="미리보기" style={{ width: "100px", height: "100px", objectFit: "cover", border: `1px solid ${C.border}`, borderRadius: "4px" }} onError={e => (e.currentTarget.style.display = "none")} />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="썸네일 이미지 URL">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <Input value={get("thumbnailUrl")} onChange={v => set("thumbnailUrl", v)} placeholder="썸네일 URL 입력 (https://...)" />
                    <button
                      onClick={() => openImagePicker("thumbnailUrl")}
                      style={{ padding: "7px 12px", background: C.primary, color: "#fff", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
                    >📁 보관함</button>
                  </div>
                  {get("thumbnailUrl") && (
                    <div style={{ marginTop: "8px" }}>
                      <img src={get("thumbnailUrl")} alt="썸네일 미리보기" style={{ width: "80px", height: "80px", objectFit: "cover", border: `1px solid ${C.border}`, borderRadius: "4px" }} onError={e => (e.currentTarget.style.display = "none")} />
                    </div>
                  )}
                </div>
              </Field>
              <Field label="상세페이지 URL">
                <div style={{ flex: 1 }}>
                  <Input value={get("detailPageUrl")} onChange={v => set("detailPageUrl", v)} placeholder="상세페이지 URL 입력" />
                  {get("detailPageUrl") && (
                    <div style={{ marginTop: "6px", display: "flex", gap: "8px" }}>
                      <a href={get("detailPageUrl")} target="_blank" rel="noopener noreferrer" style={{ fontSize: "12px", color: C.blue }}>
                        페이지 열기 ↗
                      </a>
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {/* 상세페이지 콘텐츠 탭 */}
          {activeTab === "content" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>상세페이지 콘텐츠 (홈페이지 연동)</div>
              <Field label="상품 특징 (JSON)">
                <div style={{ flex: 1 }}>
                  <Textarea
                    value={get("features")}
                    onChange={v => set("features", v)}
                    placeholder={'[{"icon":"⚡","title":"특징 제목","desc":"특징 설명"}]'}
                    rows={6}
                  />
                  <p style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>
                    JSON 형식: [{'{'}"icon": "⚡", "title": "제목", "desc": "설명"{'}'}{'}'}] — 홈페이지 상품 상세페이지의 특징 아이콘 목록에 반영됩니다.
                  </p>
                </div>
              </Field>
              <Field label="사용법">
                <div style={{ flex: 1 }}>
                  <Textarea
                    value={get("howToUse")}
                    onChange={v => set("howToUse", v)}
                    placeholder="사용법을 입력하세요. (홈페이지 상세페이지 '사용법' 탭에 표시됩니다)"
                    rows={6}
                  />
                </div>
              </Field>
              <Field label="성분">
                <div style={{ flex: 1 }}>
                  <Textarea
                    value={get("ingredients")}
                    onChange={v => set("ingredients", v)}
                    placeholder="성분 정보를 입력하세요. (홈페이지 상세페이지 '성분' 탭에 표시됩니다)"
                    rows={6}
                  />
                </div>
              </Field>
              <Field label="동적 상세페이지 링크">
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <span style={{ fontSize: "13px", color: C.blue, fontWeight: 600 }}>/product/{p.slug}</span>
                    <a
                      href={`/product/${p.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ fontSize: "12px", color: C.blue, textDecoration: "underline" }}
                    >홈페이지에서 보기 ↗</a>
                  </div>
                  <p style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>이 URL로 홈페이지 상품 상세페이지에 자동 연결됩니다.</p>
                </div>
              </Field>
            </div>
          )}

          {/* 배송정보 탭 */}
          {activeTab === "shipping" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>배송 정보</div>
              <Field label="배송 유형">
                <Select
                  value={get("shippingType", "direct")}
                  onChange={v => set("shippingType", v)}
                  options={[
                    { value: "direct", label: "직접배송" },
                    { value: "warehouse", label: "창고/위탁" },
                    { value: "other", label: "기타" },
                  ]}
                />
              </Field>
              <Field label="상품 전체중량">
                <Input value={get("weight", "1.00")} onChange={v => set("weight", v)} type="number" style={{ width: "100px" }} />
                <span style={{ marginLeft: "8px", fontSize: "13px", color: C.muted }}>kg</span>
              </Field>
              <Field label="원산지">
                <Input value={get("origin")} onChange={v => set("origin", v)} placeholder="예: 국내" style={{ width: "200px" }} />
              </Field>
              <Field label="브랜드">
                <Input value={get("brand")} onChange={v => set("brand", v)} placeholder="브랜드명 입력" style={{ width: "200px" }} />
              </Field>
              <Field label="제조사">
                <Input value={get("manufacturer")} onChange={v => set("manufacturer", v)} placeholder="제조사명 입력" style={{ width: "200px" }} />
              </Field>
            </div>
          )}

          {/* SEO설정 탭 */}
          {activeTab === "seo" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>검색엔진 최적화(SEO)</div>
              <Field label="브라우저 타이틀">
                <Input value={get("seoTitle")} onChange={v => set("seoTitle", v)} placeholder="SEO 타이틀 입력" maxLength={200} />
              </Field>
              <Field label="메타태그 Description">
                <Textarea value={get("seoDescription")} onChange={v => set("seoDescription", v)} placeholder="메타 설명 입력" rows={3} />
              </Field>
              <Field label="메타태그 Keywords">
                <Textarea value={get("seoKeywords")} onChange={v => set("seoKeywords", v)} placeholder="키워드를 쉼표(,)로 구분하여 입력" rows={2} />
              </Field>
              <Field label="이미지 Alt 텍스트">
                <Input value={get("seoImageAlt")} onChange={v => set("seoImageAlt", v)} placeholder="이미지 대체 텍스트 입력" maxLength={200} />
              </Field>
            </div>
          )}

          {/* 메모 탭 */}
          {activeTab === "memo" && (
            <div>
              <div style={{ padding: "14px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "14px" }}>관리자 메모</div>
              <Field label="상품 메모">
                <Textarea value={get("adminMemo")} onChange={v => set("adminMemo", v)} placeholder="관리자 메모 입력 (외부에 노출되지 않습니다)" rows={5} />
              </Field>
            </div>
          )}
        </div>

        {/* 저장 버튼 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "24px" }}>
          <button
            onClick={handleSave}
            disabled={updateProduct.isPending}
            style={{
              padding: "10px 40px", background: C.primary, color: C.white, border: "none",
              borderRadius: "6px", fontSize: "14px", fontWeight: 700, cursor: "pointer",
              opacity: updateProduct.isPending ? 0.7 : 1,
            }}
          >
            {updateProduct.isPending ? "저장 중..." : "상품수정"}
          </button>
          <button
            onClick={onBack}
            style={{
              padding: "10px 40px", background: C.white, color: C.text, border: `1px solid ${C.border}`,
              borderRadius: "6px", fontSize: "14px", cursor: "pointer",
            }}
          >
            미리보기
          </button>
        </div>
      </div>

      {/* 디자인 보관함 이미지 선택 팝업 */}
      <Dialog open={showImagePicker} onOpenChange={setShowImagePicker}>
        <DialogContent style={{ maxWidth: "700px", maxHeight: "80vh", overflow: "auto" }}>
          <DialogHeader>
            <DialogTitle>📁 디자인 보관함에서 이미지 선택</DialogTitle>
          </DialogHeader>
          <div style={{ marginBottom: "12px" }}>
            <input
              type="text"
              value={imageSearchText}
              onChange={e => setImageSearchText(e.target.value)}
              placeholder="파일명 검색..."
              style={{ width: "100%", padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px" }}
            />
          </div>
          {designImages.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", color: C.muted, fontSize: "14px" }}>
              디자인 보관함에 이미지가 없습니다.<br />
              <span style={{ fontSize: "12px" }}>어드민 페이지 → 디자인 → 파일업로더에서 이미지를 먼저 업로드하세요.</span>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "10px" }}>
              {designImages
                .filter((f: any) => !imageSearchText || f.fileName.toLowerCase().includes(imageSearchText.toLowerCase()))
                .map((f: any) => (
                  <div
                    key={f.id}
                    onClick={() => selectImage(f.fileUrl)}
                    style={{
                      cursor: "pointer", border: `2px solid ${C.border}`, borderRadius: "8px",
                      overflow: "hidden", transition: "border-color 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.borderColor = C.primary)}
                    onMouseLeave={e => (e.currentTarget.style.borderColor = C.border)}
                  >
                    <img
                      src={f.fileUrl}
                      alt={f.fileName}
                      style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }}
                      onError={e => { (e.currentTarget as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23eee' width='100' height='100'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' fill='%23999' font-size='12'%3E이미지%3C/text%3E%3C/svg%3E"; }}
                    />
                    <div style={{ padding: "4px 6px", fontSize: "10px", color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.fileName}
                    </div>
                  </div>
                ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
