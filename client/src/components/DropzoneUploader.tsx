/**
 * DropzoneUploader — 재사용 가능한 드래그앤드롭 이미지 업로더 컴포넌트
 * 단일 이미지 또는 다중 이미지 업로드 지원
 */
import React, { useCallback, useRef, useState } from "react";

interface DropzoneUploaderProps {
  /** 현재 미리보기 URL (외부 상태) */
  preview?: string | null;
  /** 파일 선택/드롭 시 호출 */
  onFileSelect: (file: File) => void;
  /** 미리보기 제거 시 호출 */
  onClear?: () => void;
  /** 허용 파일 타입 */
  accept?: string;
  /** 최대 파일 크기 (bytes, 기본 10MB) */
  maxSize?: number;
  /** 업로드 중 상태 */
  uploading?: boolean;
  /** 높이 */
  height?: number | string;
  /** 힌트 텍스트 */
  hint?: string;
  /** 다중 이미지 미리보기 목록 */
  previews?: string[];
  /** 다중 이미지 제거 */
  onRemovePreview?: (index: number) => void;
  /** 다중 파일 선택 허용 */
  multiple?: boolean;
  /** 다중 파일 선택 시 호출 */
  onFilesSelect?: (files: File[]) => void;
}

const C = {
  primary: "#7C3AED",
  border: "#E5E3DF",
  muted: "#9CA3AF",
  bg: "#FAFAF9",
  bgHover: "#F3F0FF",
  borderHover: "#7C3AED",
  error: "#EF4444",
};

export default function DropzoneUploader({
  preview,
  onFileSelect,
  onClear,
  accept = "image/*",
  maxSize = 10 * 1024 * 1024,
  uploading = false,
  height = 160,
  hint,
  previews,
  onRemovePreview,
  multiple = false,
  onFilesSelect,
}: DropzoneUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      setError(null);

      if (multiple && onFilesSelect) {
        const validFiles: File[] = [];
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          if (!file.type.startsWith("image/")) {
            setError("이미지 파일만 업로드 가능합니다.");
            return;
          }
          if (file.size > maxSize) {
            setError(`파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다.`);
            return;
          }
          validFiles.push(file);
        }
        onFilesSelect(validFiles);
        return;
      }

      const file = files[0];
      if (!file.type.startsWith("image/")) {
        setError("이미지 파일만 업로드 가능합니다.");
        return;
      }
      if (file.size > maxSize) {
        setError(`파일 크기는 ${Math.round(maxSize / 1024 / 1024)}MB 이하여야 합니다.`);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect, onFilesSelect, multiple, maxSize]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    validateAndSelect(e.dataTransfer.files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    validateAndSelect(e.target.files);
    // 같은 파일 재선택 허용
    e.target.value = "";
  };

  const borderColor = isDragging ? C.borderHover : error ? C.error : C.border;
  const bgColor = isDragging ? C.bgHover : C.bg;

  // 다중 이미지 미리보기 모드
  if (multiple && previews && previews.length > 0) {
    return (
      <div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
            gap: "8px",
            marginBottom: "8px",
          }}
        >
          {previews.map((src, idx) => (
            <div
              key={idx}
              style={{ position: "relative", borderRadius: "8px", overflow: "hidden", aspectRatio: "1", background: "#f0f0f0" }}
            >
              <img
                src={src}
                alt={`preview-${idx}`}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
              {onRemovePreview && (
                <button
                  onClick={() => onRemovePreview(idx)}
                  style={{
                    position: "absolute",
                    top: "4px",
                    right: "4px",
                    width: "20px",
                    height: "20px",
                    borderRadius: "50%",
                    background: "rgba(0,0,0,0.6)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "12px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              )}
            </div>
          ))}
          {/* 추가 업로드 버튼 */}
          <div
            onClick={() => !uploading && fileRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${borderColor}`,
              borderRadius: "8px",
              aspectRatio: "1",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              cursor: uploading ? "wait" : "pointer",
              background: bgColor,
              transition: "border-color 0.2s, background 0.2s",
              fontSize: "24px",
            }}
          >
            {uploading ? (
              <div style={{ fontSize: "12px", color: C.muted }}>업로드 중...</div>
            ) : (
              <>
                <div>+</div>
                <div style={{ fontSize: "10px", color: C.muted, marginTop: "2px" }}>추가</div>
              </>
            )}
          </div>
        </div>
        <input ref={fileRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: "none" }} />
        {error && <div style={{ fontSize: "12px", color: C.error, marginTop: "4px" }}>{error}</div>}
      </div>
    );
  }

  return (
    <div>
      <div
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${borderColor}`,
          borderRadius: "10px",
          height: typeof height === "number" ? `${height}px` : height,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: uploading ? "wait" : "pointer",
          background: bgColor,
          transition: "border-color 0.2s, background 0.2s",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {uploading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
            <div
              style={{
                width: "32px",
                height: "32px",
                border: `3px solid ${C.border}`,
                borderTopColor: C.primary,
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <div style={{ fontSize: "13px", color: C.muted }}>업로드 중...</div>
          </div>
        ) : preview ? (
          <>
            <img
              src={preview}
              alt="preview"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain",
                borderRadius: "8px",
              }}
            />
            {onClear && (
              <button
                onClick={(e) => { e.stopPropagation(); onClear(); }}
                style={{
                  position: "absolute",
                  top: "8px",
                  right: "8px",
                  width: "24px",
                  height: "24px",
                  borderRadius: "50%",
                  background: "rgba(0,0,0,0.55)",
                  color: "#fff",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "14px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ×
              </button>
            )}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                fontSize: "11px",
                textAlign: "center",
                padding: "4px",
              }}
            >
              클릭하거나 드래그하여 교체
            </div>
          </>
        ) : (
          <div style={{ textAlign: "center", padding: "16px" }}>
            <div style={{ fontSize: "32px", marginBottom: "10px", opacity: 0.6 }}>🖼️</div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "#374151", marginBottom: "4px" }}>
              {isDragging ? "여기에 놓으세요!" : "이미지를 드래그하거나 클릭하여 업로드"}
            </div>
            <div style={{ fontSize: "12px", color: C.muted }}>
              {hint || `JPG, PNG, WebP · 최대 ${Math.round(maxSize / 1024 / 1024)}MB`}
            </div>
          </div>
        )}
      </div>
      <input ref={fileRef} type="file" accept={accept} multiple={multiple} onChange={handleChange} style={{ display: "none" }} />
      {error && <div style={{ fontSize: "12px", color: C.error, marginTop: "4px" }}>{error}</div>}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
