import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import DropzoneUploader from "@/components/DropzoneUploader";
import ProductDetailPage from "@/pages/ProductDetailPage";
import { trpc } from "@/lib/trpc";
import { useState, type ReactNode } from "react";
import { toast } from "sonner";

function krw(v: string | number | null | undefined) {
  if (v === null || v === undefined) return "—";
  return Number(v).toLocaleString("ko-KR") + "원";
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: "#DCFCE7", color: "#166534", label: "사용함" },
    inactive: { bg: "#F3F4F6", color: "#374151", label: "사용안함" },
  };
  const resolved = map[status] ?? { bg: "#F3F4F6", color: "#374151", label: status };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 10px",
        borderRadius: "999px",
        background: resolved.bg,
        color: resolved.color,
        fontSize: "11px",
        fontWeight: 700,
      }}
    >
      {resolved.label}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
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
              <th
                key={index}
                style={{
                  padding: "10px 14px",
                  textAlign: "left",
                  fontWeight: 700,
                  color: C.muted,
                  borderBottom: `1px solid ${C.border}`,
                  whiteSpace: "nowrap",
                }}
              >
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

export function ProductSection({ subPage }: { subPage: string }) {
  const productsQuery = trpc.admin.allProducts.useQuery();
  const utils = trpc.useUtils();
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [searchText, setSearchText] = useState("");
  const [filterVisible, setFilterVisible] = useState<"all" | "visible" | "hidden">("all");
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    name: "",
    slug: "",
    priceConsumer: "",
    pricePro: "",
    productCode: "",
    description: "",
    stock: "999",
    visible: true,
    isNew: false,
  });
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const pageSize = 20;

  const bulkVisibleMutation = trpc.admin.updateProduct.useMutation({
    onSuccess: () => {
      utils.admin.allProducts.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const createProductMutation = trpc.admin.createProduct.useMutation({
    onSuccess: () => {
      toast.success("상품이 등록되었습니다.");
      utils.admin.allProducts.invalidate();
      setCreateForm({
        name: "",
        slug: "",
        priceConsumer: "",
        pricePro: "",
        productCode: "",
        description: "",
        stock: "999",
        visible: true,
        isNew: false,
      });
      setCreateImageFile(null);
      setCreateImagePreview(null);
    },
    onError: (error) => toast.error(error.message),
  });
  const uploadImageMutation = trpc.admin.uploadProductImage.useMutation();
  const deleteProductMutation = trpc.admin.deleteProduct.useMutation({
    onSuccess: () => {
      toast.success("상품이 삭제되었습니다.");
      utils.admin.allProducts.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  const handleBulkVisible = async (visible: boolean) => {
    if (selectedIds.length === 0) {
      toast.error("상품을 선택해주세요.");
      return;
    }
    await Promise.all(selectedIds.map((id) => bulkVisibleMutation.mutateAsync({ id, visible })));
    toast.success(`${selectedIds.length}개 상품을 ${visible ? "노출" : "미노출"}로 변경했습니다.`);
    setSelectedIds([]);
    utils.admin.allProducts.invalidate();
  };

  const handleCreateSubmit = async () => {
    if (!createForm.name || !createForm.slug || !createForm.priceConsumer) {
      toast.error("상품명, 슬러그, 소비자가는 필수입니다.");
      return;
    }

    setIsCreating(true);
    try {
      let imageUrl: string | undefined;
      if (createImageFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => {
            const result = event.target?.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(createImageFile);
        });

        const uploaded = await uploadImageMutation.mutateAsync({
          filename: createImageFile.name,
          contentType: createImageFile.type,
          base64Data: base64,
        });
        imageUrl = uploaded.url;
      }

      await createProductMutation.mutateAsync({
        name: createForm.name,
        slug: createForm.slug,
        priceConsumer: createForm.priceConsumer,
        pricePro: createForm.pricePro || createForm.priceConsumer,
        productCode: createForm.productCode || undefined,
        description: createForm.description || undefined,
        stock: parseInt(createForm.stock, 10) || 999,
        visible: createForm.visible,
        isNew: createForm.isNew,
        imageUrl,
        thumbnailUrl: imageUrl,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyUrl = (url: string, id: number) => {
    navigator.clipboard.writeText(url).then(() => {
      setCopiedId(id);
      toast.success("URL이 복사되었습니다.");
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const allProducts = productsQuery.data ?? [];
  const filtered = allProducts.filter((product: any) => {
    const matchSearch =
      !searchText ||
      product.name?.toLowerCase().includes(searchText.toLowerCase()) ||
      product.productCode?.toLowerCase().includes(searchText.toLowerCase());
    const matchVisible =
      filterVisible === "all" ||
      (filterVisible === "visible" && product.visible) ||
      (filterVisible === "hidden" && !product.visible);
    return matchSearch && matchVisible;
  });
  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  if (selectedProductId !== null && (subPage === "product-list" || subPage === "product-manage")) {
    return <ProductDetailPage productId={selectedProductId} onBack={() => setSelectedProductId(null)} />;
  }

  if (subPage === "product-dashboard") {
    return (
      <div>
        <SectionHeader title="상품 대시보드" />
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          <SummaryCard label="전체 상품" value={allProducts.length} />
          <SummaryCard label="노출 중" value={allProducts.filter((product: any) => product.visible).length} color={C.green} />
          <SummaryCard label="전문가 전용" value={allProducts.filter((product: any) => product.isProOnly).length} color={C.primary} />
          <SummaryCard label="재고 없음" value={allProducts.filter((product: any) => product.stock === 0).length} color={C.orange} />
        </div>
      </div>
    );
  }

  if (subPage === "product-register") {
    return (
      <div>
        <SectionHeader title="상품 등록" />
        <div style={{ background: C.white, borderRadius: "12px", padding: "32px", border: `1px solid ${C.border}`, maxWidth: "640px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>
                상품명 <span style={{ color: "red" }}>*</span>
              </label>
              <input value={createForm.name} onChange={(event) => setCreateForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="예: REAGE S1 크림" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>
                슬러그 (URL 식별자) <span style={{ color: "red" }}>*</span>
              </label>
              <input value={createForm.slug} onChange={(event) => setCreateForm((prev) => ({ ...prev, slug: event.target.value }))} placeholder="예: reage-s1-cream" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>
                소비자가 <span style={{ color: "red" }}>*</span>
              </label>
              <input value={createForm.priceConsumer} onChange={(event) => setCreateForm((prev) => ({ ...prev, priceConsumer: event.target.value }))} placeholder="예: 150000" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>전문가 가격</label>
              <input value={createForm.pricePro} onChange={(event) => setCreateForm((prev) => ({ ...prev, pricePro: event.target.value }))} placeholder="예: 120000 (비워두면 소비자가와 동일)" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>상품코드</label>
              <input value={createForm.productCode} onChange={(event) => setCreateForm((prev) => ({ ...prev, productCode: event.target.value }))} placeholder="예: P-001" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
            <div>
              <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>재고</label>
              <input value={createForm.stock} onChange={(event) => setCreateForm((prev) => ({ ...prev, stock: event.target.value }))} placeholder="999" type="number" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>상품 설명</label>
            <textarea value={createForm.description} onChange={(event) => setCreateForm((prev) => ({ ...prev, description: event.target.value }))} rows={3} placeholder="상품 간략 설명" style={{ width: "100%", padding: "8px 10px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", outline: "none", resize: "vertical", boxSizing: "border-box" }} />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={{ fontSize: "12px", fontWeight: 600, color: C.muted, display: "block", marginBottom: "4px" }}>대표 이미지</label>
            <DropzoneUploader
              preview={createImagePreview}
              onFileSelect={(file) => {
                setCreateImageFile(file);
                const reader = new FileReader();
                reader.onload = (event) => setCreateImagePreview(event.target?.result as string);
                reader.readAsDataURL(file);
              }}
              onClear={() => {
                setCreateImageFile(null);
                setCreateImagePreview(null);
              }}
              uploading={uploadImageMutation.isPending}
              height={160}
            />
          </div>

          <div style={{ display: "flex", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={createForm.visible} onChange={(event) => setCreateForm((prev) => ({ ...prev, visible: event.target.checked }))} />
              노출
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", cursor: "pointer" }}>
              <input type="checkbox" checked={createForm.isNew} onChange={(event) => setCreateForm((prev) => ({ ...prev, isNew: event.target.checked }))} />
              신상품 표시
            </label>
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button onClick={handleCreateSubmit} disabled={isCreating} style={{ padding: "10px 28px", background: C.primary, color: C.white, border: "none", borderRadius: "8px", fontSize: "14px", fontWeight: 700, cursor: isCreating ? "wait" : "pointer", opacity: isCreating ? 0.7 : 1 }}>
              {isCreating ? "등록 중..." : "상품 등록"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (subPage === "product-stock") {
    return (
      <div>
        <SectionHeader title="재고 관리" />
        <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <Table
            headers={["상품명", "상품코드", "현재 재고", "상태"]}
            rows={allProducts.map((product: any) => [
              <button onClick={() => setSelectedProductId(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontWeight: 600, textAlign: "left" }}>
                {product.name}
              </button>,
              <span style={{ fontSize: "12px", color: C.muted, fontFamily: "monospace" }}>{product.productCode || "—"}</span>,
              <span style={{ fontWeight: 700 }}>{product.stock}</span>,
              <StatusBadge status={product.stock > 0 ? "active" : "inactive"} />,
            ])}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <SectionHeader title={subPage === "product-list" ? "상품 목록" : subPage === "product-manage" ? "상품 관리" : "분류 관리"} />

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "16px", marginBottom: "16px", display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
        <input type="text" placeholder="상품명 또는 상품코드 검색" value={searchText} onChange={(event) => { setSearchText(event.target.value); setPage(1); }} style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", width: "280px", outline: "none" }} />
        <div style={{ display: "flex", gap: "6px" }}>
          {(["all", "visible", "hidden"] as const).map((value) => (
            <button
              key={value}
              onClick={() => {
                setFilterVisible(value);
                setPage(1);
              }}
              style={{ padding: "6px 14px", borderRadius: "6px", border: `1px solid ${filterVisible === value ? C.primary : C.border}`, background: filterVisible === value ? C.primary : C.white, color: filterVisible === value ? C.white : C.text, fontSize: "12px", cursor: "pointer", fontWeight: filterVisible === value ? 700 : 400 }}
            >
              {value === "all" ? "전체" : value === "visible" ? "노출" : "미노출"}
            </button>
          ))}
        </div>
        {selectedIds.length > 0 && (
          <div style={{ display: "flex", gap: "6px", marginLeft: "8px" }}>
            <span style={{ fontSize: "12px", color: C.muted, alignSelf: "center" }}>{selectedIds.length}개 선택</span>
            <button onClick={() => handleBulkVisible(true)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid ${C.green}`, background: "#F0FDF4", color: C.green, fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
              노출
            </button>
            <button onClick={() => handleBulkVisible(false)} style={{ padding: "6px 12px", borderRadius: "6px", border: `1px solid #F59E0B`, background: "#FFFBEB", color: "#92400E", fontSize: "12px", cursor: "pointer", fontWeight: 600 }}>
              미노출
            </button>
          </div>
        )}
        <span style={{ marginLeft: "auto", fontSize: "13px", color: C.muted }}>총 {filtered.length}개</span>
      </div>

      <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
          <thead>
            <tr style={{ background: "#F9F8F7", borderBottom: `1px solid ${C.border}` }}>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "36px" }}>
                <input type="checkbox" checked={paged.length > 0 && paged.every((product: any) => selectedIds.includes(product.id))} onChange={(event) => setSelectedIds(event.target.checked ? paged.map((product: any) => product.id) : [])} />
              </th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "40px", fontWeight: 600, color: C.muted }}>No</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "80px", fontWeight: 600, color: C.muted }}>상품구분</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "100px", fontWeight: 600, color: C.muted }}>상품코드</th>
              <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: C.muted }}>상품명</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: "100px", fontWeight: 600, color: C.muted }}>판매가</th>
              <th style={{ padding: "10px 12px", textAlign: "right", width: "100px", fontWeight: 600, color: C.muted }}>할인가</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>재고</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>노출</th>
              <th style={{ padding: "10px 12px", textAlign: "left", width: "220px", fontWeight: 600, color: C.muted }}>상세페이지 URL</th>
              <th style={{ padding: "10px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {productsQuery.isLoading ? (
              <tr>
                <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: C.muted }}>
                  불러오는 중...
                </td>
              </tr>
            ) : paged.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ padding: "40px", textAlign: "center", color: C.muted }}>
                  상품이 없습니다.
                </td>
              </tr>
            ) : (
              paged.map((product: any, index: number) => (
                <tr key={product.id} style={{ borderBottom: `1px solid ${C.border}`, background: selectedIds.includes(product.id) ? "#FFF7ED" : index % 2 === 0 ? C.white : "#FAFAF9" }}>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <input type="checkbox" checked={selectedIds.includes(product.id)} onChange={() => handleToggleSelect(product.id)} />
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center", color: C.muted }}>{(page - 1) * pageSize + index + 1}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{ fontSize: "11px", padding: "2px 6px", borderRadius: "4px", background: product.isNew ? "#EFF6FF" : "#F3F4F6", color: product.isNew ? C.blue : C.muted }}>
                      {product.isNew ? "신상품" : "기본상품"}
                    </span>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <button onClick={() => setSelectedProductId(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.blue, fontSize: "12px", fontFamily: "monospace", textDecoration: "underline", padding: 0 }}>
                      {product.productCode || "—"}
                    </button>
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      {(product.imageUrl || product.thumbnailUrl) && <img src={product.thumbnailUrl || product.imageUrl} alt={product.name} style={{ width: "36px", height: "36px", objectFit: "cover", borderRadius: "4px", border: `1px solid ${C.border}`, flexShrink: 0 }} onError={(event) => { event.currentTarget.style.display = "none"; }} />}
                      <button onClick={() => setSelectedProductId(product.id)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text, fontWeight: 600, textAlign: "left", padding: 0, fontSize: "13px" }}>
                        {product.name}
                      </button>
                    </div>
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 600 }}>{krw(product.priceConsumer)}</td>
                  <td style={{ padding: "10px 12px", textAlign: "right", color: product.pricePro ? C.primary : C.muted }}>{product.pricePro ? krw(product.pricePro) : "—"}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>{product.stock}</td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <StatusBadge status={product.visible ? "active" : "inactive"} />
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {product.detailPageUrl ? (
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span style={{ fontSize: "11px", color: C.muted, maxWidth: "140px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", display: "block" }} title={product.detailPageUrl}>
                          {product.detailPageUrl}
                        </span>
                        <button onClick={() => copyUrl(product.detailPageUrl, product.id)} style={{ padding: "2px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", background: copiedId === product.id ? C.green : C.white, color: copiedId === product.id ? C.white : C.text, fontSize: "11px", cursor: "pointer", flexShrink: 0, fontWeight: 600 }}>
                          {copiedId === product.id ? "✓" : "복사"}
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "11px", color: C.muted }}>—</span>
                    )}
                  </td>
                  <td style={{ padding: "10px 12px", textAlign: "center" }}>
                    <button
                      onClick={() => {
                        if (window.confirm(`"상품명: ${product.name}"을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`)) {
                          deleteProductMutation.mutate({ id: product.id });
                        }
                      }}
                      style={{ padding: "3px 8px", border: `1px solid #FCA5A5`, borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "11px", cursor: "pointer", fontWeight: 600 }}
                    >
                      삭제
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "16px" }}>
          <button onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.white, cursor: page === 1 ? "default" : "pointer", color: page === 1 ? C.muted : C.text }}>
            이전
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((current) => (
            <button key={current} onClick={() => setPage(current)} style={{ padding: "6px 12px", border: `1px solid ${page === current ? C.primary : C.border}`, borderRadius: "6px", background: page === current ? C.primary : C.white, color: page === current ? C.white : C.text, cursor: "pointer", fontWeight: page === current ? 700 : 400 }}>
              {current}
            </button>
          ))}
          <button onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages} style={{ padding: "6px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", background: C.white, cursor: page === totalPages ? "default" : "pointer", color: page === totalPages ? C.muted : C.text }}>
            다음
          </button>
        </div>
      )}
    </div>
  );
}
