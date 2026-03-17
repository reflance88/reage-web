import { useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { signInWithSocialProvider, type SocialProvider } from "@/lib/supabase-browser";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("이메일과 비밀번호를 입력해주세요."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) {
        toast.error(data.error || "로그인에 실패했습니다.");
        setLoading(false);
        return;
      }
      toast.success("로그인되었습니다.");
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/index-main.html";
      window.location.href = returnTo;
    } catch {
      toast.error("네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const returnTo = new URLSearchParams(window.location.search).get("returnTo") || "/index-main.html";

  const handleSocialLogin = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    try {
      await signInWithSocialProvider(provider, returnTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "소셜 로그인을 시작하지 못했습니다.");
      setSocialLoading(null);
    }
  };

  const handleUnavailableSocialLogin = () => {
    toast.error("네이버 로그인은 Supabase 기본 provider를 지원하지 않아 별도 OAuth 구현이 필요합니다.");
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F7F5F2", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 20px",
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      {/* 로고 */}
      <a href="/index-main.html" style={{ marginBottom: "32px", textDecoration: "none" }}>
        <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: ".12em", color: "#1A1412" }}>
          RE<span style={{ color: "#6B0F1A" }}>A</span>GE
        </div>
      </a>

      <div style={{
        background: "#fff", borderRadius: "20px", padding: "40px 40px 36px",
        width: "100%", maxWidth: "420px",
        boxShadow: "0 4px 40px rgba(26,20,18,.10)", border: "1px solid #E8E6E3"
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px", color: "#1A1412" }}>로그인</h1>
        <p style={{ fontSize: "13.5px", color: "#6B6B6B", marginBottom: "28px" }}>
          계정이 없으신가요?{" "}
          <Link href="/signup" style={{ color: "#6B0F1A", fontWeight: 600 }}>회원가입</Link>
        </p>

        {/* 소셜 로그인 */}
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "24px" }}>
          <button
            onClick={() => handleSocialLogin("kakao")}
            disabled={Boolean(socialLoading)}
            style={{
              width: "100%", padding: "13px", borderRadius: "10px", border: "none",
              background: "#FEE500", color: "#191919", fontSize: "14px", fontWeight: 600,
              cursor: socialLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "opacity .2s"
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#191919">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.1 4 6.6l-.9 3.3 3.8-2.5c.97.2 1.98.3 3.1.3 5.523 0 10-3.477 10-7.7C22 6.477 17.523 3 12 3z"/>
            </svg>
            {socialLoading === "kakao" ? "카카오 로그인으로 이동 중..." : "카카오로 1초 로그인"}
          </button>

          <button
            onClick={handleUnavailableSocialLogin}
            disabled={Boolean(socialLoading)}
            style={{
              width: "100%", padding: "13px", borderRadius: "10px", border: "none",
              background: "#03C75A", color: "#fff", fontSize: "14px", fontWeight: 600,
              cursor: socialLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "opacity .2s"
            }}
            onMouseOver={e => (e.currentTarget.style.opacity = "0.88")}
            onMouseOut={e => (e.currentTarget.style.opacity = "1")}
          >
            <span style={{ fontSize: "16px", fontWeight: 900, fontFamily: "sans-serif" }}>N</span>
            네이버는 별도 연동 필요
          </button>

          <button
            onClick={() => handleSocialLogin("google")}
            disabled={Boolean(socialLoading)}
            style={{
              width: "100%", padding: "13px", borderRadius: "10px", border: "1.5px solid #E8E6E3",
              background: "#fff", color: "#1A1412", fontSize: "14px", fontWeight: 600,
              cursor: socialLoading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "10px",
              transition: "background .2s"
            }}
            onMouseOver={e => (e.currentTarget.style.background = "#F7F5F2")}
            onMouseOut={e => (e.currentTarget.style.background = "#fff")}
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {socialLoading === "google" ? "구글 로그인으로 이동 중..." : "구글로 1초 로그인"}
          </button>
        </div>

        {/* 구분선 */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "24px" }}>
          <div style={{ flex: 1, height: "1px", background: "#E8E6E3" }} />
          <span style={{ fontSize: "12px", color: "#9B9B9B" }}>또는 이메일로 로그인</span>
          <div style={{ flex: 1, height: "1px", background: "#E8E6E3" }} />
        </div>

        {/* 이메일 로그인 폼 */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>
              이메일
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="example@email.com"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "8px",
                border: "1.5px solid #E8E6E3", fontSize: "14px", outline: "none",
                background: "#FAFAF9", boxSizing: "border-box", transition: "border-color .2s"
              }}
              onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
              onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>
              비밀번호
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="비밀번호를 입력해주세요"
              style={{
                width: "100%", padding: "12px 14px", borderRadius: "8px",
                border: "1.5px solid #E8E6E3", fontSize: "14px", outline: "none",
                background: "#FAFAF9", boxSizing: "border-box", transition: "border-color .2s"
              }}
              onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
              onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              background: loading ? "#9B9B9B" : "#6B0F1A", color: "#fff",
              fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "background .2s", marginTop: "4px"
            }}
            onMouseOver={e => { if (!loading) e.currentTarget.style.background = "#8B1525"; }}
            onMouseOut={e => { if (!loading) e.currentTarget.style.background = "#6B0F1A"; }}
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>
        </form>

        {/* 하단 링크 */}
        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
          <Link href="/find-id" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}
            onMouseOver={e => (e.currentTarget.style.color = "#6B0F1A")}
            onMouseOut={e => (e.currentTarget.style.color = "#6B6B6B")}
          >
            아이디 찾기
          </Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link href="/find-password" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}
            onMouseOver={e => (e.currentTarget.style.color = "#6B0F1A")}
            onMouseOut={e => (e.currentTarget.style.color = "#6B6B6B")}
          >
            비밀번호 찾기
          </Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link href="/signup" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}
            onMouseOver={e => (e.currentTarget.style.color = "#6B0F1A")}
            onMouseOut={e => (e.currentTarget.style.color = "#6B6B6B")}
          >
            회원가입
          </Link>
        </div>
      </div>

      <p style={{ marginTop: "24px", fontSize: "12px", color: "#9B9B9B", textAlign: "center" }}>
        로그인 시 <a href="#" style={{ color: "#6B6B6B" }}>이용약관</a> 및{" "}
        <a href="#" style={{ color: "#6B6B6B" }}>개인정보처리방침</a>에 동의하게 됩니다.
      </p>
    </div>
  );
}
