import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function FindPasswordPage() {
  const [location] = useLocation();
  const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const tokenFromUrl = params.get("token") || "";

  const [step, setStep] = useState<"request" | "reset">(tokenFromUrl ? "reset" : "request");
  const [email, setEmail] = useState("");
  const [token, setToken] = useState(tokenFromUrl);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const requestMutation = trpc.auth.requestPasswordReset.useMutation({
    onSuccess: (data) => {
      setSent(true);
      setLoading(false);
      if (data.emailSent) {
        toast.success("재설정 링크를 이메일로 발송했습니다.");
      } else if (data.devToken) {
        // 개발 환경: SMTP 미설정 시 토큰으로 바로 이동
        toast.info(`[개발용] SMTP 미설정 - 토큰으로 직접 이동합니다.`, { duration: 5000 });
        setToken(data.devToken);
        setTimeout(() => setStep("reset"), 1500);
      }
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "요청에 실패했습니다.");
      setLoading(false);
    },
  });

  const resetMutation = trpc.auth.resetPassword.useMutation({
    onSuccess: () => {
      toast.success("비밀번호가 변경되었습니다. 다시 로그인해주세요.");
      setTimeout(() => { window.location.href = "/login"; }, 1500);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "비밀번호 변경에 실패했습니다.");
      setLoading(false);
    },
  });

  const handleRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) { toast.error("이메일을 입력해주세요."); return; }
    setLoading(true);
    requestMutation.mutate({ email, origin: window.location.origin });
  };

  const handleReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 8) { toast.error("비밀번호는 8자 이상이어야 합니다."); return; }
    if (newPassword !== confirmPassword) { toast.error("비밀번호가 일치하지 않습니다."); return; }
    setLoading(true);
    resetMutation.mutate({ token, newPassword });
  };

  const inputStyle = {
    width: "100%", padding: "12px 14px", borderRadius: "8px",
    border: "1.5px solid #E8E6E3", fontSize: "14px", outline: "none",
    background: "#FAFAF9", boxSizing: "border-box" as const
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
        width: "100%", maxWidth: "420px",
        boxShadow: "0 4px 40px rgba(26,20,18,.10)", border: "1px solid #E8E6E3"
      }}>
        <h1 style={{ fontSize: "22px", fontWeight: 700, marginBottom: "6px", color: "#1A1412" }}>비밀번호 찾기</h1>

        {step === "request" ? (
          <>
            <p style={{ fontSize: "13.5px", color: "#6B6B6B", marginBottom: "28px" }}>
              가입한 이메일 주소로 비밀번호 재설정 링크를 보내드립니다.
            </p>
            {sent ? (
              <div style={{
                background: "#F0FDF4", border: "1px solid #86EFAC",
                borderRadius: "12px", padding: "24px", textAlign: "center"
              }}>
                <div style={{ fontSize: "32px", marginBottom: "12px" }}>📧</div>
                <p style={{ fontSize: "15px", color: "#166534", fontWeight: 700, margin: "0 0 8px" }}>이메일을 발송했습니다!</p>
                <p style={{ fontSize: "13px", color: "#4B7A5A", margin: "0 0 12px", lineHeight: "1.6" }}>
                  <strong>{email}</strong>으로 비밀번호 재설정 링크를 보내드렸습니다.
                  <br />이메일을 확인하여 1시간 이내에 링크를 클릭해주세요.
                </p>
                <p style={{ fontSize: "12px", color: "#6B9B7A", margin: 0 }}>
                  이메일이 도착하지 않으면 스팸 폴더를 확인해주세요.
                </p>
              </div>
            ) : (
              <form onSubmit={handleRequest} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>이메일</label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="가입한 이메일 주소"
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                    onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
                  />
                </div>
                <button
                  type="submit" disabled={loading}
                  style={{
                    width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                    background: loading ? "#9B9B9B" : "#6B0F1A", color: "#fff",
                    fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer"
                  }}
                >
                  {loading ? "처리 중..." : "재설정 링크 받기"}
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p style={{ fontSize: "13.5px", color: "#6B6B6B", marginBottom: "28px" }}>
              새로운 비밀번호를 입력해주세요.
            </p>
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>새 비밀번호 (8자 이상)</label>
                <input
                  type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                  onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
                />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#1A1412", marginBottom: "6px" }}>새 비밀번호 확인</label>
                <input
                  type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = "#6B0F1A")}
                  onBlur={e => (e.target.style.borderColor = "#E8E6E3")}
                />
              </div>
              <button
                type="submit" disabled={loading}
                style={{
                  width: "100%", padding: "14px", borderRadius: "10px", border: "none",
                  background: loading ? "#9B9B9B" : "#6B0F1A", color: "#fff",
                  fontSize: "15px", fontWeight: 700, cursor: loading ? "not-allowed" : "pointer"
                }}
              >
                {loading ? "처리 중..." : "비밀번호 변경"}
              </button>
            </form>
          </>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "16px", marginTop: "20px" }}>
          <Link href="/login" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}>로그인</Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link href="/find-id" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}>아이디 찾기</Link>
          <span style={{ color: "#E8E6E3" }}>|</span>
          <Link href="/signup" style={{ fontSize: "12.5px", color: "#6B6B6B", textDecoration: "none" }}>회원가입</Link>
        </div>
      </div>
    </div>
  );
}
