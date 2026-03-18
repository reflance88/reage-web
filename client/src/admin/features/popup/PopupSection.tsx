import { ADMIN_COLORS as C } from "@/admin/shared/theme";
import { trpc } from "@/lib/trpc";
import { useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { toast } from "sonner";

function fmtDateTime(d: Date | string | null | undefined) {
  if (!d) return "—";
  return new Date(d).toLocaleString("ko-KR");
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; label: string }> = {
    active: { bg: "#DCFCE7", color: "#166534", label: "사용함" },
    inactive: { bg: "#F3F4F6", color: "#374151", label: "사용안함" },
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

function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
      <h2 style={{ fontSize: "20px", fontWeight: 800, color: C.text, margin: 0 }}>{title}</h2>
      {action}
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

function PopupForm({ popup, onSave, onCancel }: { popup?: any; onSave: (data: any) => void; onCancel: () => void }) {
  const [title, setTitle] = useState(popup?.title ?? "");
  const [popupType, setPopupType] = useState(popup?.popupType ?? "both");
  const [isActive, setIsActive] = useState(popup?.isActive ?? true);
  const [linkUrl, setLinkUrl] = useState(popup?.linkUrl ?? "");
  const [linkTarget, setLinkTarget] = useState(popup?.linkTarget ?? "_blank");
  const [displayPosition, setDisplayPosition] = useState(popup?.displayPosition ?? "main");
  const [bottomText, setBottomText] = useState(popup?.bottomText ?? "today");
  const [startAt, setStartAt] = useState(popup?.startAt ? new Date(popup.startAt).toISOString().slice(0, 16) : "");
  const [endAt, setEndAt] = useState(popup?.endAt ? new Date(popup.endAt).toISOString().slice(0, 16) : "");
  const [imageUrl, setImageUrl] = useState(popup?.imageUrl ?? "");
  const [imageKey, setImageKey] = useState(popup?.imageKey ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState(popup?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const uploadImage = trpc.admin.uploadPostImage.useMutation();

  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (readerEvent) => setImagePreview(readerEvent.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setUploading(true);
    try {
      let nextImageUrl = imageUrl;
      let nextImageKey = imageKey;

      if (imageFile) {
        const base64 = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onload = (readerEvent) => resolve((readerEvent.target?.result as string).split(",")[1]);
          reader.readAsDataURL(imageFile);
        });
        const result = await uploadImage.mutateAsync({
          fileBase64: base64,
          fileName: imageFile.name,
          fileMimeType: imageFile.type,
          postType: "gallery",
        });
        nextImageUrl = result.url;
        nextImageKey = result.key;
      }

      onSave({
        title,
        popupType,
        isActive,
        linkUrl: linkUrl || null,
        linkTarget,
        displayPosition,
        bottomText,
        startAt: startAt ? new Date(startAt) : null,
        endAt: endAt ? new Date(endAt) : null,
        imageUrl: nextImageUrl || null,
        imageKey: nextImageKey || null,
      });
    } finally {
      setUploading(false);
    }
  };

  const rowStyle = { display: "grid", gridTemplateColumns: "140px 1fr", alignItems: "start", gap: "12px", paddingBottom: "16px", borderBottom: `1px solid ${C.border}` };
  const labelStyle = { fontSize: "13px", fontWeight: 700, color: C.text, paddingTop: "8px" };
  const inputStyle = { padding: "8px 12px", borderRadius: "8px", border: `1.5px solid ${C.border}`, fontSize: "13px", width: "100%", boxSizing: "border-box" as const };

  return (
    <div style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
      <div style={{ padding: "20px 24px", borderBottom: `1px solid ${C.border}`, fontWeight: 700, fontSize: "15px" }}>
        {popup ? "팝업 수정" : "팝업 등록"}
      </div>
      <div style={{ padding: "24px", display: "grid", gap: "16px" }}>
        <div style={rowStyle}>
          <span style={labelStyle}>팝업 종류</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            {[{ v: "pc", l: "PC" }, { v: "mobile", l: "모바일" }, { v: "both", l: "PC + 모바일" }].map((option) => (
              <label key={option.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                <input type="radio" name="popupType" value={option.v} checked={popupType === option.v} onChange={() => setPopupType(option.v)} />
                {option.l}
              </label>
            ))}
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>사용 여부</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
              <input type="radio" name="isActive" checked={isActive} onChange={() => setIsActive(true)} /> 사용함
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
              <input type="radio" name="isActive" checked={!isActive} onChange={() => setIsActive(false)} /> 사용 안함
            </label>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>하단 문구</span>
          <div style={{ display: "flex", gap: "16px", paddingTop: "8px" }}>
            {[{ v: "today", l: "오늘 하루 열지 않기" }, { v: "week", l: "일주일간 열지 않기" }, { v: "none", l: "없음" }].map((option) => (
              <label key={option.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "13px" }}>
                <input type="radio" name="bottomText" value={option.v} checked={bottomText === option.v} onChange={() => setBottomText(option.v)} />
                {option.l}
              </label>
            ))}
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>팝업 제목</span>
          <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="팝업 제목 (관리용)" style={inputStyle} />
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>이미지 등록</span>
          <div>
            {imagePreview && <img src={imagePreview} alt="popup" style={{ maxWidth: "300px", maxHeight: "200px", objectFit: "contain", borderRadius: "8px", border: `1px solid ${C.border}`, marginBottom: "10px", display: "block" }} />}
            <input ref={fileRef} type="file" accept="image/*" onChange={handleImageChange} style={{ display: "none" }} />
            <Btn size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              직접 등록하기
            </Btn>
            <div style={{ fontSize: "11px", color: C.muted, marginTop: "6px" }}>권장 이미지: 300px~1920px / 10MB 이하 / jpg, jpeg, png</div>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>클릭 링크 URL</span>
          <div>
            <input value={linkUrl} onChange={(event) => setLinkUrl(event.target.value)} placeholder="https://example.com" style={inputStyle} />
            <div style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
              {[{ v: "_blank", l: "새 탭에서 열기" }, { v: "_self", l: "현재 탭에서 열기" }].map((option) => (
                <label key={option.v} style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px" }}>
                  <input type="radio" name="linkTarget" value={option.v} checked={linkTarget === option.v} onChange={() => setLinkTarget(option.v)} />
                  {option.l}
                </label>
              ))}
            </div>
          </div>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>노출 위치</span>
          <select value={displayPosition} onChange={(event) => setDisplayPosition(event.target.value)} style={inputStyle}>
            <option value="main">메인화면</option>
            <option value="all">전체 페이지</option>
          </select>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>노출 기간</span>
          <div style={{ display: "grid", gap: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px" }}>
              <input type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} style={{ ...inputStyle, width: "auto" }} />
              <span>~</span>
              <input type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} style={{ ...inputStyle, width: "auto" }} />
            </div>
            <div style={{ fontSize: "11px", color: C.muted }}>비워두면 기간 제한 없이 노출됩니다.</div>
          </div>
        </div>
      </div>
      <div style={{ padding: "16px 24px", borderTop: `1px solid ${C.border}`, display: "flex", gap: "10px", justifyContent: "center" }}>
        <Btn onClick={handleSave} disabled={!title || uploading}>{uploading ? "저장 중..." : "저장"}</Btn>
        <Btn variant="outline" onClick={onCancel}>취소</Btn>
      </div>
    </div>
  );
}

export function PopupSection({ subPage, onNavigate }: { subPage: string; onNavigate: (id: string) => void }) {
  const [editPopup, setEditPopup] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const popups = trpc.admin.popups.useQuery();
  const createPopup = trpc.admin.createPopup.useMutation({
    onSuccess: () => {
      toast.success("팝업이 등록되었습니다.");
      popups.refetch();
      onNavigate("popup-list");
    },
  });
  const updatePopup = trpc.admin.updatePopup.useMutation({
    onSuccess: () => {
      toast.success("팝업이 수정되었습니다.");
      popups.refetch();
      setEditPopup(null);
      onNavigate("popup-list");
    },
  });
  const deletePopup = trpc.admin.deletePopup.useMutation({
    onSuccess: () => {
      toast.success("팝업이 삭제되었습니다.");
      popups.refetch();
      setDeleteConfirm(null);
    },
  });

  if (subPage === "popup-register") {
    return (
      <div>
        <SectionHeader title="팝업 등록" />
        <PopupForm onSave={(data) => createPopup.mutate(data)} onCancel={() => onNavigate("popup-list")} />
      </div>
    );
  }

  if (editPopup) {
    return (
      <div>
        <SectionHeader title="팝업 수정" />
        <PopupForm popup={editPopup} onSave={(data) => updatePopup.mutate({ id: editPopup.id, ...data })} onCancel={() => setEditPopup(null)} />
      </div>
    );
  }

  const popupTypeLabel = (value: string) => (value === "pc" ? "PC" : value === "mobile" ? "모바일" : "PC + 모바일");
  const bottomTextLabel = (value: string) => (value === "today" ? "오늘 하루 열지 않기" : value === "week" ? "일주일간 열지 않기" : "없음");

  return (
    <div>
      <SectionHeader title="팝업 목록" action={<Btn onClick={() => onNavigate("popup-register")}>+ 팝업 등록</Btn>} />
      <div style={{ display: "grid", gap: "16px" }}>
        {(popups.data ?? []).length === 0 && (
          <div style={{ background: C.white, borderRadius: "12px", padding: "40px", textAlign: "center", color: C.muted, border: `1px solid ${C.border}` }}>
            등록된 팝업이 없습니다.
          </div>
        )}
        {(popups.data ?? []).map((popup: any, index: number) => (
          <div key={popup.id} style={{ background: C.white, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "20px", display: "grid", gridTemplateColumns: "40px 160px 1fr auto", gap: "16px", alignItems: "start" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "16px", fontWeight: 700, color: C.muted }}>{index + 1}</div>
              <div style={{ fontSize: "10px", color: C.muted, marginTop: "4px" }}>
                유형
                <br />
                이미지
              </div>
              <div style={{ fontSize: "11px", fontWeight: 700, marginTop: "4px" }}>클릭수 {popup.clickCount}</div>
            </div>
            <div>
              {popup.imageUrl ? (
                <img src={popup.imageUrl} alt={popup.title} style={{ width: "150px", height: "100px", objectFit: "cover", borderRadius: "8px", border: `1px solid ${C.border}` }} />
              ) : (
                <div style={{ width: "150px", height: "100px", background: C.border, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px", color: C.muted }}>이미지 없음</div>
              )}
            </div>
            <div style={{ display: "grid", gap: "6px", fontSize: "13px" }}>
              <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                <StatusBadge status={popup.isActive ? "active" : "inactive"} />
              </div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>팝업 종류</span>{popupTypeLabel(popup.popupType)}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>제목</span>{popup.title}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>하단 버튼</span>{bottomTextLabel(popup.bottomText)}</div>
              <div><span style={{ color: C.muted, marginRight: "8px" }}>노출 위치</span>{popup.displayPosition === "main" ? "메인화면" : "전체 페이지"}</div>
              <div>
                <span style={{ color: C.muted, marginRight: "8px" }}>노출 기간</span>
                {popup.startAt || popup.endAt ? `${popup.startAt ? fmtDateTime(popup.startAt) : "~"} ~ ${popup.endAt ? fmtDateTime(popup.endAt) : "~"}` : "기간 제한 없음"}
              </div>
              {popup.linkUrl && (
                <div>
                  <span style={{ color: C.muted, marginRight: "8px" }}>링크</span>
                  <a href={popup.linkUrl} target="_blank" rel="noopener noreferrer" style={{ color: C.primary }}>
                    {popup.linkUrl}
                  </a>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <Btn size="sm" variant="outline" onClick={() => setEditPopup(popup)}>팝업수정</Btn>
              <Btn size="sm" variant="danger" onClick={() => setDeleteConfirm(popup.id)}>팝업삭제</Btn>
            </div>
          </div>
        ))}
      </div>
      <ConfirmModal
        open={deleteConfirm !== null}
        title="팝업 삭제"
        message="이 팝업을 삭제하시겠습니까?"
        onConfirm={() => { if (deleteConfirm !== null) deletePopup.mutate({ id: deleteConfirm }); }}
        onCancel={() => setDeleteConfirm(null)}
        loading={deletePopup.isPending}
        danger
      />
    </div>
  );
}
