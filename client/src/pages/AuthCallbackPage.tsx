import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http";
import { clearSocialAuthSession, finalizeSocialAuthSession } from "@/lib/supabase-browser";

type CallbackPayload =
  | { kind: "oauth"; code: string; returnTo: string }
  | { kind: "session"; accessToken: string; refreshToken: string; returnTo: string }
  | { kind: "otp"; tokenHash: string; type: string; returnTo: string }
  | { kind: "error"; message: string; returnTo: string };

function sanitizeReturnTo(path: string | null) {
  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return "/mypage";
  }

  return path;
}

function parseCallbackPayload(): CallbackPayload {
  const url = new URL(window.location.href);
  const searchParams = url.searchParams;
  const hashParams = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const returnTo = sanitizeReturnTo(searchParams.get("next"));
  const authCode = searchParams.get("code");
  const accessToken = hashParams.get("access_token");
  const refreshToken = hashParams.get("refresh_token");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") ?? hashParams.get("type");
  const errorMessage = hashParams.get("error_description") ?? searchParams.get("error_description") ?? searchParams.get("error");

  if (authCode) {
    return { kind: "oauth", code: authCode, returnTo };
  }

  if (accessToken && refreshToken) {
    return { kind: "session", accessToken, refreshToken, returnTo };
  }

  if (tokenHash && type) {
    return { kind: "otp", tokenHash, type, returnTo };
  }

  return {
    kind: "error",
    message:
      errorMessage ??
      `인증 코드가 없습니다. Supabase Redirect URL에 ${window.location.origin}/auth/callback 이 정확히 등록되어 있는지 확인한 뒤 다시 로그인해주세요.`,
    returnTo,
  };
}

function stripSensitiveUrlParts() {
  const url = new URL(window.location.href);
  url.hash = "";
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("token_hash");
  url.searchParams.delete("type");
  window.history.replaceState({}, document.title, url.toString());
}

export default function AuthCallbackPage() {
  const [status, setStatus] = useState<"loading" | "error">("loading");
  const [message, setMessage] = useState("인증을 확인하고 있습니다.");

  useEffect(() => {
    const payload = parseCallbackPayload();

    if (payload.kind === "error") {
      console.warn("[AuthCallback] Missing Supabase auth payload", {
        url: window.location.href,
      });
      stripSensitiveUrlParts();
      setStatus("error");
      setMessage(payload.message);
      return;
    }

    void (async () => {
      try {
        if (payload.kind === "oauth") {
          const nextPath = await finalizeSocialAuthSession(payload.code, payload.returnTo);
          await clearSocialAuthSession();
          stripSensitiveUrlParts();
          window.location.replace(nextPath);
          return;
        }

        const endpoint = payload.kind === "otp" ? "/api/auth/email/confirm" : "/api/auth/email/session";
        const body =
          payload.kind === "otp"
            ? {
                tokenHash: payload.tokenHash,
                type: payload.type,
                returnTo: payload.returnTo,
              }
            : {
                accessToken: payload.accessToken,
                refreshToken: payload.refreshToken,
                returnTo: payload.returnTo,
              };
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(body),
        });
        const data = await readJsonResponse<{ error?: string; returnTo?: string }>(res);

        if (!res.ok) {
          throw new Error(data.error || "이메일 인증을 완료하지 못했습니다.");
        }

        stripSensitiveUrlParts();
        window.location.replace(data.returnTo || payload.returnTo);
      } catch (error) {
        await clearSocialAuthSession();
        stripSensitiveUrlParts();
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "이메일 인증을 완료하지 못했습니다.");
      }
    })();
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F5F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#fff",
          borderRadius: "24px",
          padding: "36px",
          border: "1px solid #E8E6E3",
          boxShadow: "0 4px 40px rgba(26,20,18,.10)",
          textAlign: "center",
        }}
      >
        {status === "loading" ? (
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "999px",
              border: "3px solid #E8E6E3",
              borderTopColor: "#6B0F1A",
              margin: "0 auto 18px",
              animation: "spin 1s linear infinite",
            }}
          />
        ) : (
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "18px",
              background: "#F8EAEA",
              color: "#8F1D1D",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "26px",
              fontWeight: 700,
              margin: "0 auto 18px",
            }}
          >
            !
          </div>
        )}

        <h1 style={{ fontSize: "22px", fontWeight: 700, color: "#1A1412", marginBottom: "10px" }}>
          {status === "loading" ? "인증을 완료하는 중입니다" : "인증을 완료하지 못했습니다"}
        </h1>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#5E5A57", marginBottom: status === "error" ? "22px" : 0 }}>
          {message}
        </p>

        {status === "error" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <a
              href="/signup"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "#6B0F1A",
                color: "#fff",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 700,
                boxSizing: "border-box",
              }}
            >
              회원가입으로 이동
            </a>
            <a
              href="/login"
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "12px",
                background: "#fff",
                border: "1px solid #E8E6E3",
                color: "#1A1412",
                textDecoration: "none",
                fontSize: "15px",
                fontWeight: 700,
                boxSizing: "border-box",
              }}
            >
              로그인으로 이동
            </a>
          </div>
        ) : null}

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    </div>
  );
}
