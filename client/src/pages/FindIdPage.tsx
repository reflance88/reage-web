import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function FindIdPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState<"username" | "email" | null>(null);

  const findMutation = trpc.auth.findLoginId.useMutation({
    onSuccess: data => {
      setResult(data.maskedLoginId);
      setLoginType(data.loginType);
      setLoading(false);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "일치하는 계정을 찾을 수 없습니다.");
      setLoading(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      toast.error("이름과 휴대폰 번호를 입력해주세요.");
      return;
    }
    setLoading(true);
    findMutation.mutate({ name, phone });
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F5F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <a
        href="/"
        style={{ marginBottom: "28px", textDecoration: "none" }}
      >
        <div
          style={{
            fontSize: "28px",
            fontWeight: 800,
            letterSpacing: ".12em",
            color: "#1A1412",
          }}
        >
          RE<span style={{ color: "#6B0F1A" }}>A</span>GE
        </div>
      </a>

      <div
        style={{
          background: "#fff",
          borderRadius: "20px",
          padding: "40px 40px 36px",
          width: "100%",
          maxWidth: "420px",
          boxShadow: "0 4px 40px rgba(26,20,18,.10)",
          border: "1px solid #E8E6E3",
        }}
      >
        <h1
          style={{
            fontSize: "22px",
            fontWeight: 700,
            marginBottom: "6px",
            color: "#1A1412",
          }}
        >
          로그인 아이디 찾기
        </h1>
        <p
          style={{ fontSize: "13.5px", color: "#6B6B6B", marginBottom: "28px" }}
        >
          가입 시 입력한 이름과 휴대폰 번호로 로그인 아이디를 확인할 수
          있습니다.
        </p>

        {result ? (
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                background: "#FFF8EC",
                border: "1px solid rgba(200,162,106,.4)",
                borderRadius: "12px",
                padding: "24px",
                marginBottom: "24px",
              }}
            >
              <p
                style={{
                  fontSize: "13px",
                  color: "#8B6914",
                  marginBottom: "8px",
                }}
              >
                {loginType === "email"
                  ? "가입된 로그인 이메일"
                  : "가입된 로그인 아이디"}
              </p>
              <p
                style={{ fontSize: "20px", fontWeight: 700, color: "#1A1412" }}
              >
                {result}
              </p>
              <p
                style={{
                  margin: "10px 0 0",
                  fontSize: "12px",
                  color: "#8B6914",
                  lineHeight: "1.6",
                }}
              >
                {loginType === "email"
                  ? "기존 이메일 기반 계정입니다. 로그인 화면에서 이메일로 로그인해주세요."
                  : "로그인 화면에서 아이디 또는 이메일로 로그인할 수 있습니다."}
              </p>
            </div>
            <Link
              href="/login"
              style={{
                display: "block",
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                background: "#6B0F1A",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                textDecoration: "none",
                textAlign: "center",
              }}
            >
              로그인하기
            </Link>
          </div>
        ) : (
          <form
            onSubmit={handleSubmit}
            style={{ display: "flex", flexDirection: "column", gap: "16px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1A1412",
                  marginBottom: "6px",
                }}
              >
                이름
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="홍길동"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #E8E6E3",
                  fontSize: "14px",
                  outline: "none",
                  background: "#FAFAF9",
                  boxSizing: "border-box" as const,
                }}
                onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "#1A1412",
                  marginBottom: "6px",
                }}
              >
                휴대폰 번호
              </label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-0000-0000"
                style={{
                  width: "100%",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  border: "1.5px solid #E8E6E3",
                  fontSize: "14px",
                  outline: "none",
                  background: "#FAFAF9",
                  boxSizing: "border-box" as const,
                }}
                onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "10px",
                border: "none",
                background: loading ? "#9B9B9B" : "#6B0F1A",
                color: "#fff",
                fontSize: "15px",
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "조회 중..." : "로그인 아이디 찾기"}
            </button>
          </form>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "16px",
            marginTop: "20px",
          }}
        >
          <Link
            href="/login"
            style={{
              fontSize: "12.5px",
              color: "#6B6B6B",
              textDecoration: "none",
            }}
          >
            로그인
          </Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link
            href="/find-password"
            style={{
              fontSize: "12.5px",
              color: "#6B6B6B",
              textDecoration: "none",
            }}
          >
            비밀번호 찾기
          </Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link
            href="/signup"
            style={{
              fontSize: "12.5px",
              color: "#6B6B6B",
              textDecoration: "none",
            }}
          >
            회원가입
          </Link>
        </div>
      </div>
    </div>
  );
}
