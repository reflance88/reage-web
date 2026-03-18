import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { useRef, useState, type ReactNode, type SyntheticEvent } from "react";
import { toast } from "sonner";

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

function DesignDashboardSection() {
  const files = trpc.adminExt.getDesignFiles.useQuery({});
  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const totalFiles = (files.data ?? []).length;
  const totalFolders = (folders.data ?? []).length;

  return (
    <div>
      <SectionHeader title="디자인 대시보드" />
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <SummaryCard label="전체 파일" value={totalFiles} />
        <SummaryCard label="폴더 수" value={totalFolders} />
      </div>
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "24px" }}>
        <div style={{ fontSize: "14px", fontWeight: 700, marginBottom: "16px" }}>최근 업로드 파일</div>
        {(files.data ?? []).slice(0, 10).map((file: any) => (
          <div key={file.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
            {file.mimeType?.startsWith("image/") ? (
              <img
                src={file.thumbnailUrl || file.fileUrl}
                alt={file.fileName}
                style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${C.border}` }}
                onError={(event: SyntheticEvent<HTMLImageElement>) => {
                  event.currentTarget.src = file.fileUrl;
                }}
              />
            ) : (
              <div style={{ width: "48px", height: "48px", background: "#F3F4F6", borderRadius: "6px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📄</div>
            )}
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: "13px", fontWeight: 600 }}>{file.fileName}</div>
              <div style={{ fontSize: "11px", color: C.muted }}>
                {file.mimeType} · {Math.round((file.fileSize ?? 0) / 1024)}KB
              </div>
            </div>
            <button onClick={() => navigator.clipboard.writeText(file.fileUrl).then(() => toast.success("URL 복사됨"))} style={{ padding: "4px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "11px", cursor: "pointer" }}>
              URL 복사
            </button>
          </div>
        ))}
        {totalFiles === 0 && <div style={{ textAlign: "center", color: C.muted, padding: "40px" }}>업로드된 파일이 없습니다.</div>}
      </div>
    </div>
  );
}

function DesignLibrarySection() {
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const files = trpc.adminExt.getDesignFiles.useQuery({ folder: currentFolder });
  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const deleteFile = trpc.adminExt.deleteDesignFile.useMutation({
    onSuccess: () => {
      toast.success("파일이 삭제되었습니다.");
      files.refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  return (
    <div>
      <SectionHeader title="디자인 보관함" />
      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ width: "200px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", flexShrink: 0 }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.muted, marginBottom: "8px" }}>폴더</div>
          <button onClick={() => setCurrentFolder(undefined)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === undefined ? C.primary : "transparent", color: currentFolder === undefined ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>
            📁 전체 파일
          </button>
          {(folders.data ?? []).map((folder: any) => (
            <button key={folder.id} onClick={() => setCurrentFolder(folder.name)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === folder.name ? C.primary : "transparent", color: currentFolder === folder.name ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>
              📂 {folder.name}
            </button>
          ))}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {(files.data ?? []).map((file: any) => (
              <div key={file.id} style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                {file.mimeType?.startsWith("image/") ? (
                  <img
                    src={file.thumbnailUrl || file.fileUrl}
                    alt={file.fileName}
                    style={{ width: "100%", height: "100px", objectFit: "cover" }}
                    onError={(event: SyntheticEvent<HTMLImageElement>) => {
                      event.currentTarget.src = file.fileUrl;
                    }}
                  />
                ) : (
                  <div style={{ height: "100px", background: "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px" }}>📄</div>
                )}
                <div style={{ padding: "8px" }}>
                  <div style={{ fontSize: "11px", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={file.fileName}>
                    {file.fileName}
                  </div>
                  <div style={{ fontSize: "10px", color: C.muted }}>{Math.round((file.fileSize ?? 0) / 1024)}KB</div>
                  <div style={{ display: "flex", gap: "4px", marginTop: "6px" }}>
                    <button onClick={() => navigator.clipboard.writeText(file.fileUrl).then(() => toast.success("URL 복사됨"))} style={{ flex: 1, padding: "3px 0", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "10px", cursor: "pointer" }}>
                      복사
                    </button>
                    <button onClick={() => { if (window.confirm("삭제하시겠습니까?")) deleteFile.mutate({ id: file.id }); }} style={{ padding: "3px 6px", border: "1px solid #FCA5A5", borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "10px", cursor: "pointer" }}>
                      삭제
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {(files.data ?? []).length === 0 && <div style={{ gridColumn: "1/-1", textAlign: "center", color: C.muted, padding: "40px" }}>파일이 없습니다.</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

function DesignAddSection() {
  return (
    <div>
      <SectionHeader title="디자인 추가" />
      <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "32px", maxWidth: "600px" }}>
        <div style={{ fontSize: "14px", color: C.muted, marginBottom: "24px" }}>
          파일업로더를 통해 이미지 및 디자인 파일을 업로드한 후, 상품 상세페이지나 홈페이지 배너에 URL을 복사하여 사용하세요.
        </div>
        <FileUploaderSection embedded />
      </div>
    </div>
  );
}

function FileUploaderSection({ embedded = false }: { embedded?: boolean }) {
  const utils = trpc.useUtils();
  const [currentFolder, setCurrentFolder] = useState<string | undefined>(undefined);
  const [newFolderName, setNewFolderName] = useState("");
  const [search, setSearch] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const folders = trpc.adminExt.getDesignFolders.useQuery();
  const files = trpc.adminExt.getDesignFiles.useQuery({ folder: currentFolder });
  const createFolder = trpc.adminExt.createDesignFolder.useMutation({
    onSuccess: () => {
      toast.success("폴더가 생성되었습니다.");
      folders.refetch();
      setNewFolderName("");
    },
    onError: (error: any) => toast.error(error.message),
  });
  const uploadFile = trpc.adminExt.uploadDesignFile.useMutation({
    onSuccess: () => {
      files.refetch();
      utils.adminExt.getDesignFiles.invalidate();
    },
    onError: (error: any) => toast.error(error.message),
  });
  const deleteFile = trpc.adminExt.deleteDesignFile.useMutation({
    onSuccess: () => {
      toast.success("삭제되었습니다.");
      files.refetch();
    },
    onError: (error: any) => toast.error(error.message),
  });

  const handleFiles = async (fileList: FileList) => {
    setUploading(true);
    try {
      for (const file of Array.from(fileList)) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name}: 10MB 초과`);
          continue;
        }
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve((event.target?.result as string).split(",")[1]);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        await uploadFile.mutateAsync({
          fileName: file.name,
          contentType: file.type,
          base64Data: base64,
          folder: currentFolder,
          fileSize: file.size,
        });
      }
      toast.success("업로드 완료");
    } finally {
      setUploading(false);
    }
  };

  const filteredFiles = (files.data ?? []).filter((file: any) => !search || file.fileName.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      {!embedded && <SectionHeader title="파일업로더" />}
      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ width: "200px", background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", padding: "12px", flexShrink: 0, alignSelf: "flex-start" }}>
          <div style={{ fontSize: "12px", fontWeight: 700, color: C.muted, marginBottom: "8px" }}>폴더</div>
          <button onClick={() => setCurrentFolder(undefined)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === undefined ? C.primary : "transparent", color: currentFolder === undefined ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>
            📁 ROOT
          </button>
          {(folders.data ?? []).map((folder: any) => (
            <button key={folder.id} onClick={() => setCurrentFolder(folder.name)} style={{ width: "100%", textAlign: "left", padding: "8px 10px", borderRadius: "6px", border: "none", background: currentFolder === folder.name ? C.primary : "transparent", color: currentFolder === folder.name ? C.white : C.text, fontSize: "13px", cursor: "pointer", marginBottom: "4px" }}>
              📂 {folder.name}
            </button>
          ))}
          <div style={{ marginTop: "12px", borderTop: `1px solid ${C.border}`, paddingTop: "12px" }}>
            <input
              value={newFolderName}
              onChange={(event) => setNewFolderName(event.target.value)}
              placeholder="새 폴더명"
              style={{ width: "100%", padding: "6px 8px", border: `1px solid ${C.border}`, borderRadius: "4px", fontSize: "12px", marginBottom: "6px", boxSizing: "border-box" }}
              onKeyDown={(event) => {
                if (event.key === "Enter" && newFolderName.trim()) {
                  createFolder.mutate({ name: newFolderName.trim() });
                }
              }}
            />
            <button onClick={() => { if (newFolderName.trim()) createFolder.mutate({ name: newFolderName.trim() }); }} style={{ width: "100%", padding: "6px", border: `1px solid ${C.primary}`, borderRadius: "4px", background: C.primary, color: C.white, fontSize: "12px", cursor: "pointer" }}>
              + 폴더 추가
            </button>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div
            onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setIsDragging(false);
              if (event.dataTransfer.files.length) handleFiles(event.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            style={{ border: `2px dashed ${isDragging ? C.primary : C.border}`, borderRadius: "8px", padding: "32px", textAlign: "center", cursor: "pointer", background: isDragging ? "#FFF7F7" : "#FAFAF9", marginBottom: "16px", transition: "all 0.2s" }}
          >
            {uploading ? (
              <div style={{ color: C.primary, fontWeight: 600 }}>업로드 중...</div>
            ) : (
              <>
                <div style={{ fontSize: "32px", marginBottom: "8px" }}>📂</div>
                <div style={{ fontWeight: 600, marginBottom: "4px" }}>Drag & Drop</div>
                <div style={{ fontSize: "13px", color: C.muted }}>여기에 이미지 파일/폴더를 끌어 놓으면 파일이 업로드됩니다.</div>
                <div style={{ fontSize: "11px", color: C.muted, marginTop: "4px" }}>(파일용량: 한 개당 10MB이하, 이미지/HTML/CSS/JS/웹폰트 파일 업로드 가능)</div>
                <button style={{ marginTop: "12px", padding: "8px 20px", border: `1px solid ${C.primary}`, borderRadius: "6px", background: C.white, color: C.primary, fontSize: "13px", cursor: "pointer", fontWeight: 600 }} onClick={(event) => { event.stopPropagation(); fileInputRef.current?.click(); }}>
                  Add Files
                </button>
              </>
            )}
          </div>
          <input ref={fileInputRef} type="file" multiple accept="image/*,.html,.css,.js,.woff,.woff2,.ttf" style={{ display: "none" }} onChange={(event) => { if (event.target.files?.length) handleFiles(event.target.files); event.target.value = ""; }} />

          <div style={{ marginBottom: "12px" }}>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="파일명을 입력하세요." style={{ padding: "8px 12px", border: `1px solid ${C.border}`, borderRadius: "6px", fontSize: "13px", width: "280px", outline: "none" }} />
          </div>

          <div style={{ background: C.white, border: `1px solid ${C.border}`, borderRadius: "8px", overflow: "hidden" }}>
            <div style={{ padding: "10px 16px", background: "#F9F8F7", borderBottom: `1px solid ${C.border}`, fontSize: "12px", fontWeight: 700, color: C.muted }}>
              📁 {currentFolder ?? "ROOT"} — 총 {filteredFiles.length}개
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
              <thead>
                <tr style={{ background: "#F9F8F7", borderBottom: `1px solid ${C.border}` }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", fontWeight: 600, color: C.muted }}>파일명</th>
                  <th style={{ padding: "8px 12px", textAlign: "right", width: "80px", fontWeight: 600, color: C.muted }}>크기</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "120px", fontWeight: 600, color: C.muted }}>등록일</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "80px", fontWeight: 600, color: C.muted }}>주소복사</th>
                  <th style={{ padding: "8px 12px", textAlign: "center", width: "60px", fontWeight: 600, color: C.muted }}>삭제</th>
                </tr>
              </thead>
              <tbody>
                {filteredFiles.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "40px", textAlign: "center", color: C.muted }}>
                      파일이 없습니다.
                    </td>
                  </tr>
                ) : (
                  filteredFiles.map((file: any) => (
                    <tr key={file.id} style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {file.mimeType?.startsWith("image/") ? (
                            <img
                              src={file.thumbnailUrl || file.fileUrl}
                              alt={file.fileName}
                              style={{ width: "48px", height: "48px", objectFit: "cover", borderRadius: "6px", border: `1px solid ${C.border}`, flexShrink: 0 }}
                              onError={(event: SyntheticEvent<HTMLImageElement>) => {
                                event.currentTarget.src = file.fileUrl;
                              }}
                            />
                          ) : (
                            <span style={{ fontSize: "20px" }}>📄</span>
                          )}
                          <span style={{ fontWeight: 500 }}>{file.fileName}</span>
                        </div>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right", color: C.muted }}>{Math.round((file.fileSize ?? 0) / 1024)}KB</td>
                      <td style={{ padding: "10px 12px", textAlign: "center", color: C.muted, fontSize: "12px" }}>{new Date(file.createdAt).toLocaleDateString("ko-KR")}</td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button onClick={() => navigator.clipboard.writeText(file.fileUrl).then(() => toast.success("URL이 복사되었습니다."))} style={{ padding: "3px 10px", border: `1px solid ${C.border}`, borderRadius: "4px", background: C.white, fontSize: "11px", cursor: "pointer" }}>
                          복사
                        </button>
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "center" }}>
                        <button onClick={() => { if (window.confirm("삭제하시겠습니까?")) deleteFile.mutate({ id: file.id }); }} style={{ padding: "3px 8px", border: "1px solid #FCA5A5", borderRadius: "4px", background: "#FEF2F2", color: "#DC2626", fontSize: "11px", cursor: "pointer" }}>
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

export function DesignSection({ subPage }: { subPage: string }) {
  if (subPage === "design-files") return <FileUploaderSection />;
  if (subPage === "design-library") return <DesignLibrarySection />;
  if (subPage === "design-add") return <DesignAddSection />;
  return <DesignDashboardSection />;
}
