import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

/**
 * Supabase PKCE OAuth 콜백 페이지
 * 흐름:
 * 1. Supabase가 ?code=... 를 붙여 이 페이지로 리다이렉트
 * 2. supabase.auth.exchangeCodeForSession(code) 호출
 *    - PKCE code_verifier는 Supabase client가 localStorage에서 자동으로 읽음
 * 3. 세션(access_token, refresh_token)을 서버 /api/auth/session 에 전달
 * 4. 서버가 sb-* httpOnly 쿠키를 설정하고 profiles upsert
 * 5. returnTo 페이지로 이동
 */
export default function AuthCallback() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const returnTo = params.get("returnTo") || "/index-main.html";
      const errorParam = params.get("error");
      const errorDescription = params.get("error_description");

      // OAuth 에러 처리 (사용자가 취소하거나 권한 거부)
      if (errorParam) {
        console.error("[AuthCallback] OAuth error:", errorParam, errorDescription);
        window.location.href = `/login?error=${encodeURIComponent(errorDescription || errorParam)}`;
        return;
      }

      if (!code) {
        setStatus("error");
        setErrorMsg("인증 코드가 없습니다. 다시 로그인해주세요.");
        return;
      }

      try {
        // PKCE: code_verifier는 supabase client가 localStorage에서 자동으로 읽어 처리
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (error || !data.session) {
          console.error("[AuthCallback] exchangeCodeForSession error:", error);
          setStatus("error");
          setErrorMsg("로그인 처리에 실패했습니다. 다시 시도해주세요.");
          return;
        }

        const { access_token, refresh_token } = data.session;

        // 서버에 세션 전달 → sb-* httpOnly 쿠키 설정 + profiles upsert
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ access_token, refresh_token }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({})) as { error?: string };
          console.error("[AuthCallback] /api/auth/session error:", body);
          setStatus("error");
          setErrorMsg("세션 저장에 실패했습니다. 다시 시도해주세요.");
          return;
        }

        // 성공: returnTo 페이지로 이동
        window.location.href = returnTo;
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        setStatus("error");
        setErrorMsg("예기치 않은 오류가 발생했습니다.");
      }
    };

    handleCallback();
  }, []);

  if (status === "error") {
    return (
      <div style={{
        minHeight: "100vh", background: "#F7F5F2", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", padding: "32px 20px",
        fontFamily: "'Noto Sans KR', sans-serif"
      }}>
        <div style={{
          background: "#fff", borderRadius: "20px", padding: "40px",
          maxWidth: "420px", width: "100%", textAlign: "center",
          boxShadow: "0 4px 40px rgba(26,20,18,.10)", border: "1px solid #E8E6E3"
        }}>
          <div style={{ fontSize: "40px", marginBottom: "16px" }}>⚠️</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "#1A1412", marginBottom: "12px" }}>
            로그인 실패
          </h2>
          <p style={{ fontSize: "14px", color: "#6B6B6B", marginBottom: "24px" }}>
            {errorMsg}
          </p>
          <a
            href="/login"
            style={{
              display: "inline-block", padding: "12px 32px", borderRadius: "10px",
              background: "#6B0F1A", color: "#fff", fontSize: "14px", fontWeight: 600,
              textDecoration: "none"
            }}
          >
            로그인 페이지로 돌아가기
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#F7F5F2", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      fontFamily: "'Noto Sans KR', sans-serif"
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          width: "48px", height: "48px", border: "4px solid #E8E6E3",
          borderTopColor: "#6B0F1A", borderRadius: "50%",
          animation: "spin 0.8s linear infinite", margin: "0 auto 20px"
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ fontSize: "15px", color: "#6B6B6B", fontWeight: 500 }}>
          로그인 처리 중...
        </p>
      </div>
    </div>
  );
}
