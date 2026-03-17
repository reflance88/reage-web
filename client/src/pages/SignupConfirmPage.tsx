import { Link } from "wouter";

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    email: params.get("email") ?? "",
    returnTo: params.get("returnTo") ?? "/mypage",
  };
}

export default function SignupConfirmPage() {
  const { email, returnTo } = getParams();
  const loginHref = `/login?returnTo=${encodeURIComponent(returnTo)}`;

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
          maxWidth: "480px",
          background: "#fff",
          borderRadius: "24px",
          padding: "40px",
          border: "1px solid #E8E6E3",
          boxShadow: "0 4px 40px rgba(26,20,18,.10)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "18px",
            background: "#6B0F1A",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "28px",
            fontWeight: 700,
            marginBottom: "20px",
          }}
        >
          @
        </div>

        <h1 style={{ fontSize: "24px", fontWeight: 700, color: "#1A1412", marginBottom: "10px" }}>
          이메일 인증이 필요합니다
        </h1>
        <p style={{ fontSize: "14px", lineHeight: 1.7, color: "#5E5A57", marginBottom: "12px" }}>
          회원가입은 완료되었습니다. 발송된 인증 메일의 링크를 눌러야 로그인이 완료됩니다.
        </p>
        {email ? (
          <p style={{ fontSize: "14px", color: "#1A1412", marginBottom: "24px", fontWeight: 600 }}>
            발송 주소: {email}
          </p>
        ) : null}

        <div
          style={{
            background: "#FAFAF9",
            borderRadius: "16px",
            border: "1px solid #ECE8E2",
            padding: "16px 18px",
            marginBottom: "24px",
            color: "#4E4A47",
            fontSize: "13px",
            lineHeight: 1.7,
          }}
        >
          <div>1. 받은편지함 또는 스팸함에서 인증 메일을 확인하세요.</div>
          <div>2. 메일의 인증 링크를 누르면 자동으로 로그인됩니다.</div>
          <div>3. 인증을 마친 뒤에도 같은 화면이면 로그인 페이지에서 다시 로그인하세요.</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <a
            href="/index-main.html"
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "#6B0F1A",
              color: "#fff",
              textDecoration: "none",
              textAlign: "center",
              fontSize: "15px",
              fontWeight: 700,
            }}
          >
            메인으로 이동
          </a>
          <Link
            href={loginHref}
            style={{
              width: "100%",
              padding: "14px",
              borderRadius: "12px",
              background: "#fff",
              border: "1px solid #E8E6E3",
              color: "#1A1412",
              textDecoration: "none",
              textAlign: "center",
              fontSize: "15px",
              fontWeight: 700,
              boxSizing: "border-box",
            }}
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
