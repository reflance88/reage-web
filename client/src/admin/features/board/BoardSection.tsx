import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { Suspense, lazy, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";

const LazyDropzoneUploader = lazy(() => import("@/components/DropzoneUploader"));
const LazyRichTextEditor = lazy(() => import("@/components/RichTextEditor"));

function fmtDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: "#DCFCE7", color: "#166534", label: "사용함" },
    inactive: { bg: "#F3F4F6", color: "#374151", label: "사용안함" },
    published: { bg: "#DCFCE7", color: "#166534", label: "게시됨" },
    draft: { bg: "#FEF3C7", color: "#B45309", label: "임시저장" },
  };
  const resolved = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: "999px", background: resolved.bg, color: resolved.color, fontSize: "11px", fontWeight: 700 }}>
      {resolved.label}
    </span>
  );
}

function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  loading,
  danger,
}: {
  open: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
  danger?: boolean;
}) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000 }}>
      <div style={{ background: "#fff", borderRadius: "16px", padding: "32px", width: "100%", maxWidth: "400px", boxShadow: "0 8px 40px rgba(0,0,0,.2)" }}>
        <h3 style={{ fontSize: "17px", fontWeight: 700, marginBottom: "12px", color: C.text }}>{title}</h3>
        <p style={{ fontSize: "14px", color: C.muted, marginBottom: "24px", lineHeight: 1.6 }}>{message}</p>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={onCancel} style={{ flex: 1, padding: "12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, background: "#fff", color: C.text, fontSize: "14px", fontWeight: 600, cursor: "pointer" }}>
            취소
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            style={{ flex: 1, padding: "12px", borderRadius: "8px", border: "none", background: danger ? "#991B1B" : C.primary, color: "#fff", fontSize: "14px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "처리 중..." : "확인"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: C.white, borderRadius: "12px", padding: "20px 24px", border: `1px solid ${C.border}`, flex: 1, minWidth: "160px" }}>
      <div style={{ fontSize: "12px", color: C.muted, fontWeight: 600, marginBottom: "8px" }}>{label}</div>
      <div style={{ fontSize: "26px", fontWeight: 800, color: color ?? C.text }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
      {action}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: ReactNode[][] }) {
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
        <thead>
          <tr style={{ background: "#F9F8F7" }}>
            {headers.map((header, index) => (
              <th key={index} style={{ padding: "10px 14px", textAlign: "left", fontWeight: 700, color: C.muted, borderBottom: `1px solid ${C.border}`, whiteSpace: "nowrap" }}>
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={headers.length} style={{ padding: "40px", textAlign: "center", color: C.muted }}>
                데이터가 없습니다.
              </td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={rowIndex} style={{ borderBottom: `1px solid ${C.border}` }}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex} style={{ padding: "10px 14px", color: C.text }}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function Btn({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "danger" | "success" | "outline";
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const bg = variant === "primary" ? C.primary : variant === "danger" ? "#991B1B" : variant === "success" ? "#166534" : variant === "secondary" ? C.gold : "#fff";
  const color = variant === "outline" ? C.text : "#fff";
  const border = variant === "outline" ? `1.5px solid ${C.border}` : "none";
  const pad = size === "sm" ? "5px 12px" : "8px 18px";
  return (
    <button onClick={onClick} disabled={disabled} style={{ padding: pad, borderRadius: "8px", border, background: bg, color, fontSize: size === "sm" ? "12px" : "13px", fontWeight: 700, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1 }}>
      {children}
    </button>
  );
}

function AsyncFieldFallback({ height = 160, label = "불러오는 중..." }: { height?: number; label?: string }) {
  return (
    <div
      style={{
        minHeight: `${height}px`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "12px",
        border: `1px dashed ${C.border}`,
        background: "#FAFAF9",
        color: C.muted,
        fontSize: "13px",
      }}
    >
      {label}
    </div>
  );
}

function PostEditor({
  type,
  post,
  onSave,
  onCancel,
}: {
  type: "gallery" | "magazine";
  post?: any;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(post?.title ?? "");
  const [subtitle, setSubtitle] = useState(post?.subtitle ?? "");
  const [content, setContent] = useState(post?.content ?? "");
  const [isPublished, setIsPublished] = useState(post?.isPublished ?? true);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState(post?.coverImageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const uploadImage = trpc.admin.uploadPostImage.useMutation();

  const handleEditorImageUpload = async (file: File): Promise<string> => {
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = (event) => resolve((event.target?.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });
    const result = await uploadImage.mutateAsync({
      fileBase64: base64,
      fileName: file.name,
      fileMimeType: file.type,
      postType: type,
    });
    return result.url;
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let coverImageUrl = post?.coverImageUrl ?? "";
      let coverImageKey = post?.coverImageKey ?? "";
      if (coverFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string).split(",")[1]);
          reader.readAsDataURL(coverFile);
        });
        const result = await uploadImage.mutateAsync({
          fileBase64: base64,
          fileName: coverFile.name,
          fileMimeType: coverFile.type,
          postType: type,
        });
        coverImageUrl = result.url;
        coverImageKey = result.key;
      }
      onSave({ title, subtitle, content, isPublished, coverImageUrl, coverImageKey });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ background: C.white, borderRadius: "12px", padding: "28px", border: `1px solid ${C.border}` }}>
      <div style={{ display: "grid", gap: "16px" }}>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>제목 *</label>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="제목을 입력하세요" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", boxSizing: "border-box" }} />
        </div>
        {type === "magazine" && (
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>부제목</label>
            <input value={subtitle} onChange={(event) => setSubtitle(event.target.value)} placeholder="부제목을 입력하세요" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "14px", boxSizing: "border-box" }} />
          </div>
        )}
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>커버 이미지</label>
          <Suspense fallback={<AsyncFieldFallback height={160} label="업로더를 불러오는 중..." />}>
            <LazyDropzoneUploader
              preview={coverPreview || null}
              onFileSelect={(file) => {
                setCoverFile(file);
                const reader = new FileReader();
                reader.onload = (event) => setCoverPreview(event.target?.result as string);
                reader.readAsDataURL(file);
              }}
              onClear={() => {
                setCoverFile(null);
                setCoverPreview("");
              }}
              uploading={uploading && !!coverFile}
              height={160}
            />
          </Suspense>
        </div>
        <div>
          <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>내용</label>
          <Suspense fallback={<AsyncFieldFallback height={400} label="에디터를 불러오는 중..." />}>
            <LazyRichTextEditor value={content} onChange={setContent} onImageUpload={handleEditorImageUpload} placeholder="내용을 입력하세요..." minHeight={400} />
          </Suspense>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <input type="checkbox" id="isPublished" checked={isPublished} onChange={(event) => setIsPublished(event.target.checked)} />
          <label htmlFor="isPublished" style={{ fontSize: "13px", fontWeight: 600 }}>게시 (체크 해제 시 임시저장)</label>
        </div>
        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <Btn variant="outline" onClick={onCancel}>취소</Btn>
          <Btn onClick={handleSave} disabled={!title || uploading}>{uploading ? "저장 중..." : "저장"}</Btn>
        </div>
      </div>
    </div>
  );
}

const REVIEW_CATEGORIES = [
  { value: "before_after", label: "비포 & 애프터" },
  { value: "device", label: "디바이스 후기" },
  { value: "education", label: "교육 후기" },
  { value: "event", label: "이벤트 후기" },
  { value: "etc", label: "기타" },
];

function InstructorSection() {
  const [uploading, setUploading] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<null | number>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingPreview, setPendingPreview] = useState<string | null>(null);

  const list = trpc.adminExt.certifiedInstructorList.useQuery({ page: 1, limit: 200 });
  const uploadImage = trpc.adminExt.uploadCertifiedInstructorImage.useMutation();
  const createItem = trpc.adminExt.createCertifiedInstructor.useMutation({
    onSuccess: () => {
      toast.success("인증강사 사진이 등록되었습니다.");
      list.refetch();
      setNameInput("");
      setDescInput("");
      setPendingFile(null);
      setPendingPreview(null);
    },
    onError: (error: any) => toast.error(error.message),
  });
  const deleteItem = trpc.adminExt.deleteCertifiedInstructor.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      list.refetch();
      setDeleteConfirm(null);
    },
  });
  const togglePublish = trpc.adminExt.updateCertifiedInstructor.useMutation({
    onSuccess: () => {
      list.refetch();
    },
  });

  const handleUpload = async () => {
    if (!pendingFile) {
      toast.error("이미지를 먼저 선택해주세요.");
      return;
    }
    setUploading(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = (event) => resolve((event.target?.result as string).split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(pendingFile);
      });
      const { url, key } = await uploadImage.mutateAsync({ fileBase64: base64, fileName: pendingFile.name, fileMimeType: pendingFile.type });
      await createItem.mutateAsync({ imageUrl: url, imageKey: key, name: nameInput || undefined, description: descInput || undefined, isPublished: true });
    } catch {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
    }
  };

  const items = list.data?.items ?? [];

  return (
    <div>
      <SectionHeader title="인증강사 관리" />
      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "24px", marginBottom: "32px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: 700, marginBottom: "16px", color: C.text }}>새 인증강사 사진 등록</h3>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginBottom: "12px" }}>
          <input type="text" placeholder="이름 (선택)" value={nameInput} onChange={(event) => setNameInput(event.target.value)} style={{ flex: 1, minWidth: "160px", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }} />
          <input type="text" placeholder="설명 (선택)" value={descInput} onChange={(event) => setDescInput(event.target.value)} style={{ flex: 2, minWidth: "200px", padding: "10px 14px", border: `1px solid ${C.border}`, borderRadius: "8px", fontSize: "13px" }} />
        </div>
        <Suspense fallback={<AsyncFieldFallback height={140} label="업로더를 불러오는 중..." />}>
          <LazyDropzoneUploader
            preview={pendingPreview}
            onFileSelect={(file) => {
              setPendingFile(file);
              const reader = new FileReader();
              reader.onload = (event) => setPendingPreview(event.target?.result as string);
              reader.readAsDataURL(file);
            }}
            onClear={() => {
              setPendingFile(null);
              setPendingPreview(null);
            }}
            uploading={uploading}
            height={140}
            hint="JPG, PNG, WEBP · 최대 10MB"
          />
        </Suspense>
        {pendingFile && (
          <div style={{ marginTop: "12px" }}>
            <button onClick={handleUpload} disabled={uploading} style={{ padding: "10px 28px", background: C.primary, color: "#fff", border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: uploading ? "wait" : "pointer", opacity: uploading ? 0.7 : 1 }}>
              {uploading ? "등록 중..." : "인증강사 등록"}
            </button>
          </div>
        )}
      </div>

      {list.isLoading ? (
        <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", color: C.muted }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>👤</div>
          <p>등록된 인증강사가 없습니다.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
          {items.map((item: any) => (
            <div key={item.id} style={{ border: `1px solid ${C.border}`, borderRadius: "12px", overflow: "hidden", background: C.white }}>
              <div style={{ aspectRatio: "1/1", background: "#f5f5f5", position: "relative" }}>
                {item.imageUrl ? (
                  <img src={item.imageUrl} alt={item.name ?? ""} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "40px" }}>👤</div>
                )}
                {!item.isPublished && <div style={{ position: "absolute", top: "8px", left: "8px", background: "rgba(0,0,0,.6)", color: "#fff", fontSize: "10px", padding: "2px 8px", borderRadius: "4px" }}>비공개</div>}
              </div>
              <div style={{ padding: "12px" }}>
                <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "4px", color: C.text }}>{item.name || "이름 없음"}</div>
                {item.description && <div style={{ fontSize: "11px", color: C.muted, marginBottom: "8px" }}>{item.description}</div>}
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => togglePublish.mutate({ id: item.id, isPublished: !item.isPublished })} style={{ flex: 1, padding: "6px", border: `1px solid ${C.border}`, borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "11px", color: C.muted }}>
                    {item.isPublished ? "비공개" : "공개"}
                  </button>
                  <button onClick={() => setDeleteConfirm(item.id)} style={{ flex: 1, padding: "6px", border: `1px solid #fca5a5`, borderRadius: "6px", background: "transparent", cursor: "pointer", fontSize: "11px", color: "#dc2626" }}>
                    삭제
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={deleteConfirm !== null}
        title="사진 삭제"
        message="이 인증강사 사진을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm !== null) deleteItem.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteItem.isPending}
        danger
      />
    </div>
  );
}

function ReviewSection() {
  const [selectedCategory, setSelectedCategory] = useState("before_after");
  const [deleteConfirm, setDeleteConfirm] = useState<null | number>(null);
  const [uploading, setUploading] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState("");
  const [titleInput, setTitleInput] = useState("");
  const [descInput, setDescInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const reviews = trpc.admin.reviewList.useQuery({ category: selectedCategory, page: 1, limit: 100 });
  const productsQuery = trpc.admin.allProducts.useQuery();
  const uploadImage = trpc.admin.uploadReviewImage.useMutation();
  const createReview = trpc.admin.createReview.useMutation({
    onSuccess: () => {
      toast.success("후기 사진이 등록되었습니다.");
      reviews.refetch();
      setTitleInput("");
      setDescInput("");
      setSelectedProductId("");
    },
  });
  const deleteReview = trpc.admin.deleteReview.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      reviews.refetch();
      setDeleteConfirm(null);
    },
  });

  const handleUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (readerEvent) => resolve((readerEvent.target?.result as string).split(",")[1]);
        reader.readAsDataURL(file);
      });
      const { url, key } = await uploadImage.mutateAsync({
        fileBase64: base64,
        fileName: file.name,
        fileMimeType: file.type,
      });
      const categoryLabel = REVIEW_CATEGORIES.find((category) => category.value === selectedCategory)?.label ?? selectedCategory;
      await createReview.mutateAsync({
        category: selectedCategory as any,
        categoryLabel,
        imageUrl: url,
        imageKey: key,
        productId: selectedProductId || undefined,
        title: titleInput || undefined,
        description: descInput || undefined,
        isPublished: true,
      });
    } catch {
      toast.error("업로드 실패. 다시 시도해주세요.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const currentCategoryLabel = REVIEW_CATEGORIES.find((category) => category.value === selectedCategory)?.label ?? selectedCategory;

  return (
    <div>
      <SectionHeader title="후기 관리" />
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "24px" }}>
        {REVIEW_CATEGORIES.map((category) => (
          <button
            key={category.value}
            onClick={() => setSelectedCategory(category.value)}
            style={{
              padding: "8px 18px",
              borderRadius: "20px",
              border: `1.5px solid ${selectedCategory === category.value ? C.primary : C.border}`,
              background: selectedCategory === category.value ? C.primary : C.white,
              color: selectedCategory === category.value ? "#fff" : C.text,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {category.label}
          </button>
        ))}
      </div>

      <div style={{ background: C.white, borderRadius: "12px", padding: "24px", border: `1px solid ${C.border}`, marginBottom: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>{currentCategoryLabel} 사진 업로드</div>
        <div style={{ display: "grid", gap: "12px" }}>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>제목 (선택)</label>
            <input value={titleInput} onChange={(event) => setTitleInput(event.target.value)} placeholder="후기 제목을 입력하세요" style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>설명 (선택)</label>
            <textarea value={descInput} onChange={(event) => setDescInput(event.target.value)} placeholder="간단한 설명을 입력하세요" rows={2} style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", resize: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
          </div>
          <div>
            <label style={{ fontSize: "12px", fontWeight: 700, color: C.muted, display: "block", marginBottom: "6px" }}>연결 상품 (선택)</label>
            <select value={selectedProductId} onChange={(event) => setSelectedProductId(event.target.value)} style={{ width: "100%", padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", boxSizing: "border-box", background: "#fff" }}>
              <option value="">상품 연결 안 함</option>
              {(productsQuery.data ?? []).map((product: any) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleUpload} style={{ display: "none" }} />
            <Btn onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? "업로드 중..." : "+ 사진 업로드"}</Btn>
            <span style={{ fontSize: "12px", color: C.muted }}>JPG, PNG, WebP / 10MB 이하</span>
          </div>
        </div>
      </div>

      <div style={{ background: C.white, borderRadius: "12px", padding: "24px", border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>
          {currentCategoryLabel} 사진 목록 ({reviews.data?.total ?? 0}장)
        </div>
        {reviews.isLoading ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>로딩 중...</div>
        ) : (reviews.data?.items ?? []).length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: C.muted }}>등록된 사진이 없습니다.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "16px" }}>
            {(reviews.data?.items ?? []).map((review: any) => (
              <div key={review.id} style={{ position: "relative", borderRadius: "10px", overflow: "hidden", border: `1px solid ${C.border}` }}>
                <img src={review.imageUrl} alt={review.title ?? ""} style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                {review.title && <div style={{ padding: "8px 10px", fontSize: "12px", fontWeight: 600, color: C.text, background: C.white }}>{review.title}</div>}
                {review.productId && (
                  <div style={{ padding: "0 10px 8px", fontSize: "11px", color: C.primary, background: C.white }}>
                    {(productsQuery.data ?? []).find((product: any) => product.id === review.productId)?.name ?? "연결 상품"}
                  </div>
                )}
                <div style={{ padding: "4px 10px 10px", display: "flex", justifyContent: "space-between", alignItems: "center", background: C.white }}>
                  <span style={{ fontSize: "11px", color: C.muted }}>{fmtDate(review.createdAt)}</span>
                  <button onClick={() => setDeleteConfirm(review.id)} style={{ fontSize: "11px", color: "#991B1B", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}>
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteConfirm}
        title="사진 삭제"
        message="이 사진을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm) deleteReview.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteReview.isPending}
        danger
      />
    </div>
  );
}

export function BoardSection({ subPage }: { subPage: string }) {
  const [view, setView] = useState<"list" | "create" | "edit">("list");
  const [editPost, setEditPost] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<null | { id: string; type: "gallery" | "magazine" }>(null);

  const galleryPosts = trpc.admin.galleryPosts.useQuery({ page: 1, limit: 50 });
  const magazinePosts = trpc.admin.magazinePosts.useQuery({ page: 1, limit: 50 });

  const createGallery = trpc.admin.createGalleryPost.useMutation({
    onSuccess: () => {
      toast.success("갤러리 글이 등록되었습니다.");
      galleryPosts.refetch();
      setView("list");
    },
  });
  const updateGallery = trpc.admin.updateGalleryPost.useMutation({
    onSuccess: () => {
      toast.success("갤러리 글이 수정되었습니다.");
      galleryPosts.refetch();
      setView("list");
    },
  });
  const deleteGallery = trpc.admin.deleteGalleryPost.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      galleryPosts.refetch();
      setDeleteConfirm(null);
    },
  });

  const createMagazine = trpc.admin.createMagazinePost.useMutation({
    onSuccess: () => {
      toast.success("매거진 글이 등록되었습니다.");
      magazinePosts.refetch();
      setView("list");
    },
  });
  const updateMagazine = trpc.admin.updateMagazinePost.useMutation({
    onSuccess: () => {
      toast.success("매거진 글이 수정되었습니다.");
      magazinePosts.refetch();
      setView("list");
    },
  });
  const deleteMagazine = trpc.admin.deleteMagazinePost.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      magazinePosts.refetch();
      setDeleteConfirm(null);
    },
  });

  const isGallery = subPage === "board-gallery";
  const type = isGallery ? "gallery" : "magazine";
  const posts = isGallery ? galleryPosts.data?.items : magazinePosts.data?.items;
  const title = subPage === "board-dashboard" ? "게시판 대시보드" : isGallery ? "갤러리 관리" : "매거진 관리";

  if (subPage === "board-review") return <ReviewSection />;
  if (subPage === "board-instructor") return <InstructorSection />;

  if (subPage === "board-dashboard") {
    return (
      <div>
        <SectionHeader title="게시판 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="갤러리 게시물" value={galleryPosts.data?.total ?? "—"} />
          <SummaryCard label="매거진 게시물" value={magazinePosts.data?.total ?? "—"} />
        </div>
      </div>
    );
  }

  if (view === "create") {
    return (
      <div>
        <SectionHeader title={`${isGallery ? "갤러리" : "매거진"} 글 작성`} />
        <PostEditor
          type={type}
          onSave={(data) => {
            if (isGallery) createGallery.mutate(data);
            else createMagazine.mutate(data);
          }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  if (view === "edit" && editPost) {
    return (
      <div>
        <SectionHeader title={`${isGallery ? "갤러리" : "매거진"} 글 수정`} />
        <PostEditor
          type={type}
          post={editPost}
          onSave={(data) => {
            if (isGallery) updateGallery.mutate({ id: editPost.id, ...data });
            else updateMagazine.mutate({ id: editPost.id, ...data });
          }}
          onCancel={() => setView("list")}
        />
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={title} action={<Btn onClick={() => setView("create")}>+ 새 글 작성</Btn>} />
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <Table
          headers={["커버", "제목", ...(type === "magazine" ? ["부제목"] : []), "상태", "조회수", "작성일", "관리"]}
          rows={(posts ?? []).map((post: any) => [
            post.coverImageUrl ? (
              <img src={post.coverImageUrl} alt="" style={{ width: "60px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
            ) : (
              <div style={{ width: "60px", height: "40px", background: C.border, borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "10px", color: C.muted }}>없음</div>
            ),
            <span style={{ fontWeight: 600 }}>{post.title}</span>,
            ...(type === "magazine" ? [post.subtitle ?? "—"] : []),
            <StatusBadge status={post.isPublished ? "published" : "draft"} />,
            post.viewCount,
            fmtDate(post.createdAt),
            <div style={{ display: "flex", gap: "6px" }}>
              <Btn size="sm" variant="outline" onClick={() => { setEditPost(post); setView("edit"); }}>수정</Btn>
              <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm({ id: String(post.id), type })}>삭제</Btn>
            </div>,
          ])}
        />
      </div>
      <ConfirmModal
        open={!!deleteConfirm}
        title="게시물 삭제"
        message="이 게시물을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다."
        onConfirm={() => {
          if (!deleteConfirm) return;
          if (deleteConfirm.type === "gallery") deleteGallery.mutate({ id: deleteConfirm.id });
          else deleteMagazine.mutate({ id: deleteConfirm.id });
        }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deleteGallery.isPending || deleteMagazine.isPending}
        danger
      />
    </div>
  );
}
