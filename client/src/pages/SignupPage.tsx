import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { readJsonResponse } from "@/lib/http";
import { signInWithSocialProvider, type SocialProvider } from "@/lib/supabase-browser";

export default function SignupPage() {
  const [, navigate] = useLocation();
  const [form, setForm] = useState({ name: "", email: "", password: "", passwordConfirm: "" });
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<SocialProvider | null>(null);
  const [agreed, setAgreed] = useState(false);
  const returnTo = new URLSearchParams(window.location.search).get("returnTo") || "/mypage";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("모든 항목을 입력해주세요."); return; }
    if (form.password.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다."); return; }
    if (form.password !== form.passwordConfirm) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    if (!agreed) { toast.error("이용약관에 동의해주세요."); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
          origin: window.location.origin,
          returnTo,
        }),
      });
      const data = await readJsonResponse<{ error?: string; confirmationRequired?: boolean; returnTo?: string }>(res);
      if (!res.ok) {
        toast.error(data.error || "회원가입에 실패했습니다.");
        setLoading(false);
        return;
      }
      if (data.confirmationRequired) {
        toast.success("회원가입이 완료되었습니다. 이메일을 확인하여 가입을 완료해주세요.");
        navigate(`/signup/confirm?email=${encodeURIComponent(form.email)}&returnTo=${encodeURIComponent(data.returnTo || returnTo)}`);
        return;
      } else {
        toast.success("회원가입이 완료되었습니다. 환영합니다!");
      }
      window.location.href = data.returnTo || returnTo;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "네트워크 오류가 발생했습니다.");
      setLoading(false);
    }
  };

  const handleSocial = async (provider: SocialProvider) => {
    setSocialLoading(provider);
    try {
      await signInWithSocialProvider(provider, returnTo);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "소셜 회원가입을 시작하지 못했습니다.");
      setSocialLoading(null);
    }
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1.5px solid #E8E6E3", fontSize: "14px", outline: "none",
    background: "#FAFAF9", boxSizing: "border-box" as const, transition: "border-color .2s"
  };

  return (
    <div style={{
      minHeight: "100vh", background: "#F7F5F2", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "32px 20px",
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      <a href="/index-main.html" style={{ marginBottom: "28px", textDecoration: "none" }}>
        <div style={{ fontSize: "28px", fontWeight: 800, letterSpacing: ".12em", color: "#1A1412" }}>
          RE<span style={{ color: "#6B0F1A" }}>A</span>GE
        </div>
      </a>

      <div style={{
        background: "#fff", borderRadius: "20px", padding: "40px 40px 36px",
        width: "100%", maxWidth: "440px",
        boxShadow: "0 4px 40px rgba(26,20,18,.10)", border: "1px solid #E8E6E3"
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px", color: "#1A1412" }}>회원가입</h1>
        <p style={{ fontSize: "13.5px", color: "#6B6B6B", marginBottom: "24px" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" style={{ color: "#6B0F1A", fontWeight: 600 }}>로그인</Link>
        </p>

        {/* 소셜 가입 */}
        <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
          <button onClick={() => handleSocial("kakao")} disabled={Boolean(socialLoading)} title="카카오로 가입" style={{
            flex: 1, padding: "12px", borderRadius: "10px", border: "none",
            background: "#FEE500", cursor: socialLoading ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, color: "#191919"
          }}>{socialLoading === "kakao" ? "이동 중..." : "카카오"}</button>
          <button onClick={() => handleSocial("google")} disabled={Boolean(socialLoading)} title="구글로 가입" style={{
            flex: 1, padding: "12px", borderRadius: "10px", border: "1.5px solid #E8E6E3",
            background: "#fff", cursor: socialLoading ? "not-allowed" : "pointer", fontSize: "12px", fontWeight: 600, color: "#1A1412"
          }}>{socialLoading === "google" ? "이동 중..." : "구글"}</button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
          <div style={{ flex: 1, height: "1px", background: "#E8E6E3" }} />
          <span style={{ fontSize: "12px", color: "#9B9B9B" }}>이메일로 가입</span>
          <div style={{ flex: 1, height: "1px", background: "#E8E6E3" }} />
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {[
            { label: "이름", key: "name", type: "text", placeholder: "홍길동" },
            { label: "이메일", key: "email", type: "email", placeholder: "example@email.com" },
            { label: "비밀번호 (8자 이상)", key: "password", type: "password", placeholder: "••••••••" },
            { label: "비밀번호 확인", key: "passwordConfirm", type: "password", placeholder: "••••••••" },
          ].map(({ label, key, type, placeholder }) => (
            <div key={key}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>
                {label}
              </label>
              <input
                type={type}
                value={form[key as keyof typeof form]}
                onChange={e => setForm(prev => ({ ...prev, [key]: e.target.value }))}
                placeholder={placeholder}
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
              />
            </div>
          ))}

          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "#6B6B6B" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ width: "16px", height: "16px", accentColor: "#6B0F1A" }}
            />
            <span>
              <a href="#" style={{ color: "#6B0F1A" }}>이용약관</a> 및{" "}
              <a href="#" style={{ color: "#6B0F1A" }}>개인정보처리방침</a>에 동의합니다.
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "14px", borderRadius: "10px", border: "none",
              background: loading ? "#9B9B9B" : "#6B0F1A", color: "#fff",
              fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "background .2s", marginTop: "4px"
            }}
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>
      </div>
    </div>
  );
}
