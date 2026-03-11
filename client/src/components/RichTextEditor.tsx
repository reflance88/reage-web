import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TextAlign from "@tiptap/extension-text-align";
import FontFamily from "@tiptap/extension-font-family";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import Underline from "@tiptap/extension-underline";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { useRef, useCallback } from "react";

// ─── 폰트 크기 Extension ──────────────────────────────────────────────────────
import { Extension as TiptapExtension } from "@tiptap/react";

// @ts-ignore
const FontSize = TiptapExtension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: (element: HTMLElement) => element.style.fontSize?.replace("px", "") || null,
            renderHTML: (attributes: Record<string, any>) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}px` };
            },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setFontSize:
        (fontSize: string) =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontSize }).run();
        },
      unsetFontSize:
        () =>
        ({ chain }: any) => {
          return chain().setMark("textStyle", { fontSize: null }).removeEmptyTextStyle().run();
        },
    } as any;
  },
});

// ─── 툴바 버튼 ────────────────────────────────────────────────────────────────
function ToolBtn({
  onClick,
  active,
  title,
  children,
  disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title?: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: "4px 8px",
        borderRadius: "4px",
        border: "none",
        background: active ? "#6B0F1A" : "transparent",
        color: active ? "#fff" : "#333",
        cursor: disabled ? "not-allowed" : "pointer",
        fontSize: "13px",
        fontWeight: 600,
        lineHeight: 1.4,
        minWidth: "28px",
        opacity: disabled ? 0.4 : 1,
        transition: "background .15s",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return (
    <div
      style={{
        width: "1px",
        height: "20px",
        background: "#ddd",
        margin: "0 4px",
        flexShrink: 0,
      }}
    />
  );
}

const FONT_FAMILIES = [
  { label: "기본", value: "" },
  { label: "나눔고딕", value: "'Nanum Gothic', sans-serif" },
  { label: "나눔명조", value: "'Nanum Myeongjo', serif" },
  { label: "맑은고딕", value: "'Malgun Gothic', sans-serif" },
  { label: "굴림", value: "Gulim, sans-serif" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
];

const FONT_SIZES = ["10", "11", "12", "13", "14", "16", "18", "20", "24", "28", "32", "36", "48"];

const TEXT_COLORS = [
  "#000000", "#333333", "#666666", "#999999", "#CCCCCC", "#FFFFFF",
  "#FF0000", "#FF6600", "#FFCC00", "#00CC00", "#0066FF", "#6600CC",
  "#FF99CC", "#FFCC99", "#FFFF99", "#99FF99", "#99CCFF", "#CC99FF",
  "#6B0F1A", "#C9A96E",
];

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────
interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  onImageUpload?: (file: File) => Promise<string>; // returns URL
  placeholder?: string;
  minHeight?: number;
}

export default function RichTextEditor({
  value,
  onChange,
  onImageUpload,
  placeholder = "내용을 입력하세요...",
  minHeight = 400,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TextStyle,
      FontFamily,
      FontSize,
      Color,
      Underline,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const handleImageInsert = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !editor) return;
      e.target.value = "";

      if (onImageUpload) {
        try {
          const url = await onImageUpload(file);
          editor.chain().focus().setImage({ src: url }).run();
        } catch {
          alert("이미지 업로드에 실패했습니다.");
        }
      } else {
        // base64 fallback
        const reader = new FileReader();
        reader.onload = (ev) => {
          const src = ev.target?.result as string;
          editor.chain().focus().setImage({ src }).run();
        };
        reader.readAsDataURL(file);
      }
    },
    [editor, onImageUpload]
  );

  const setLink = useCallback(() => {
    if (!editor) return;
    const prev = editor.getAttributes("link").href;
    const url = window.prompt("링크 URL을 입력하세요:", prev || "https://");
    if (url === null) return;
    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  const currentFontSize =
    (editor.getAttributes("textStyle") as any).fontSize || "14";
  const currentFontFamily = (editor.getAttributes("textStyle") as any).fontFamily || "";

  return (
    <div
      style={{
        border: "1.5px solid #ddd",
        borderRadius: "8px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* ─── 툴바 ─── */}
      <div
        style={{
          background: "#f8f8f8",
          borderBottom: "1px solid #e0e0e0",
          padding: "6px 10px",
          display: "flex",
          flexWrap: "wrap",
          gap: "2px",
          alignItems: "center",
        }}
      >
        {/* 폰트 패밀리 */}
        <select
          value={currentFontFamily}
          onChange={(e) => {
            if (e.target.value) {
              editor.chain().focus().setFontFamily(e.target.value).run();
            } else {
              editor.chain().focus().unsetFontFamily().run();
            }
          }}
          style={{
            padding: "3px 6px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "12px",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        {/* 폰트 크기 */}
        <select
          value={currentFontSize}
          onChange={(e) => {
            (editor.chain().focus() as any).setFontSize(e.target.value).run();
          }}
          style={{
            padding: "3px 6px",
            borderRadius: "4px",
            border: "1px solid #ccc",
            fontSize: "12px",
            background: "#fff",
            cursor: "pointer",
            width: "64px",
          }}
        >
          {FONT_SIZES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <Divider />

        {/* 굵기 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive("bold")}
          title="굵게 (Ctrl+B)"
        >
          <b>B</b>
        </ToolBtn>
        {/* 기울기 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive("italic")}
          title="기울기 (Ctrl+I)"
        >
          <i>I</i>
        </ToolBtn>
        {/* 밑줄 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          active={editor.isActive("underline")}
          title="밑줄 (Ctrl+U)"
        >
          <u>U</u>
        </ToolBtn>
        {/* 취소선 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive("strike")}
          title="취소선"
        >
          <s>S</s>
        </ToolBtn>

        <Divider />

        {/* 글자색 */}
        <div style={{ position: "relative", display: "inline-block" }}>
          <label
            title="글자색"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              cursor: "pointer",
              padding: "2px 4px",
              borderRadius: "4px",
              fontSize: "12px",
              fontWeight: 700,
              lineHeight: 1.2,
            }}
          >
            <span style={{ color: (editor.getAttributes("textStyle") as any).color || "#000" }}>A</span>
            <input
              type="color"
              style={{ width: 0, height: 0, opacity: 0, position: "absolute" }}
              onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
            />
          </label>
        </div>

        {/* 형광펜 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHighlight({ color: "#FFFF00" }).run()}
          active={editor.isActive("highlight")}
          title="형광펜"
        >
          <span style={{ background: "#FFFF00", padding: "0 2px" }}>H</span>
        </ToolBtn>

        <Divider />

        {/* 정렬 */}
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
          active={editor.isActive({ textAlign: "left" })}
          title="왼쪽 정렬"
        >
          ≡
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
          active={editor.isActive({ textAlign: "center" })}
          title="가운데 정렬"
        >
          ☰
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
          active={editor.isActive({ textAlign: "right" })}
          title="오른쪽 정렬"
        >
          ≡
        </ToolBtn>

        <Divider />

        {/* 제목 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          active={editor.isActive("heading", { level: 1 })}
          title="제목1"
        >
          H1
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          active={editor.isActive("heading", { level: 2 })}
          title="제목2"
        >
          H2
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          active={editor.isActive("heading", { level: 3 })}
          title="제목3"
        >
          H3
        </ToolBtn>

        <Divider />

        {/* 목록 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive("bulletList")}
          title="글머리 기호"
        >
          •≡
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive("orderedList")}
          title="번호 목록"
        >
          1≡
        </ToolBtn>

        {/* 인용구 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive("blockquote")}
          title="인용구"
        >
          "
        </ToolBtn>

        {/* 코드 */}
        <ToolBtn
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive("code")}
          title="인라인 코드"
        >
          {"<>"}
        </ToolBtn>

        <Divider />

        {/* 링크 */}
        <ToolBtn onClick={setLink} active={editor.isActive("link")} title="링크 삽입">
          🔗
        </ToolBtn>

        {/* 이미지 삽입 */}
        <ToolBtn onClick={() => imageInputRef.current?.click()} title="이미지 삽입">
          🖼
        </ToolBtn>
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={handleImageInsert}
        />

        {/* 구분선 */}
        <ToolBtn
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="구분선"
        >
          ─
        </ToolBtn>

        <Divider />

        {/* 실행 취소 / 다시 실행 */}
        <ToolBtn
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          title="실행 취소 (Ctrl+Z)"
        >
          ↩
        </ToolBtn>
        <ToolBtn
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          title="다시 실행 (Ctrl+Y)"
        >
          ↪
        </ToolBtn>
      </div>

      {/* ─── 색상 팔레트 (글자색 빠른 선택) ─── */}
      <div
        style={{
          background: "#f8f8f8",
          borderBottom: "1px solid #e0e0e0",
          padding: "4px 10px",
          display: "flex",
          gap: "4px",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontSize: "11px", color: "#888", marginRight: "4px" }}>색상:</span>
        {TEXT_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            title={color}
            onClick={() => editor.chain().focus().setColor(color).run()}
            style={{
              width: "16px",
              height: "16px",
              borderRadius: "3px",
              border:
                (editor.getAttributes("textStyle") as any).color === color
                  ? "2px solid #6B0F1A"
                  : "1px solid #ccc",
              background: color,
              cursor: "pointer",
              padding: 0,
              flexShrink: 0,
            }}
          />
        ))}
        <button
          type="button"
          onClick={() => editor.chain().focus().unsetColor().run()}
          style={{
            fontSize: "11px",
            padding: "1px 6px",
            borderRadius: "3px",
            border: "1px solid #ccc",
            background: "#fff",
            cursor: "pointer",
            color: "#666",
          }}
        >
          초기화
        </button>
      </div>

      {/* ─── 에디터 영역 ─── */}
      <EditorContent
        editor={editor}
        style={{ minHeight: `${minHeight}px`, padding: "16px", cursor: "text" }}
        onClick={() => editor.commands.focus()}
      />

      {/* ─── 에디터 스타일 ─── */}
      <style>{`
        .tiptap {
          outline: none;
          min-height: ${minHeight}px;
          font-size: 14px;
          line-height: 1.8;
          color: #222;
        }
        .tiptap p { margin: 0 0 8px; }
        .tiptap h1 { font-size: 28px; font-weight: 700; margin: 16px 0 8px; }
        .tiptap h2 { font-size: 22px; font-weight: 700; margin: 14px 0 6px; }
        .tiptap h3 { font-size: 18px; font-weight: 700; margin: 12px 0 4px; }
        .tiptap ul { padding-left: 20px; margin: 8px 0; list-style: disc; }
        .tiptap ol { padding-left: 20px; margin: 8px 0; list-style: decimal; }
        .tiptap li { margin: 4px 0; }
        .tiptap blockquote {
          border-left: 4px solid #6B0F1A;
          padding-left: 16px;
          margin: 12px 0;
          color: #555;
          font-style: italic;
        }
        .tiptap code {
          background: #f4f4f4;
          border-radius: 3px;
          padding: 1px 5px;
          font-family: 'Courier New', monospace;
          font-size: 12px;
        }
        .tiptap pre {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          margin: 12px 0;
        }
        .tiptap img {
          max-width: 100%;
          height: auto;
          border-radius: 6px;
          margin: 8px 0;
          cursor: pointer;
        }
        .tiptap img.ProseMirror-selectednode {
          outline: 3px solid #6B0F1A;
        }
        .tiptap hr {
          border: none;
          border-top: 2px solid #e0e0e0;
          margin: 16px 0;
        }
        .tiptap a { color: #0066cc; text-decoration: underline; }
        .tiptap p.is-editor-empty:first-child::before {
          content: attr(data-placeholder);
          float: left;
          color: #aaa;
          pointer-events: none;
          height: 0;
        }
        .tiptap mark { border-radius: 2px; padding: 0 2px; }
      `}</style>
    </div>
  );
}
