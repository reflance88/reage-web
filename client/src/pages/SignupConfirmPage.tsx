import {
  clearSignupCompletionSummary,
  readSignupCompletionSummary,
} from "@/lib/signup-flow";
import { useState } from "react";
import { Link } from "wouter";

function StepTracker() {
  const steps = ["약관동의", "정보입력", "가입완료"];

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        gap: "14px",
        marginBottom: "34px",
        flexWrap: "wrap",
      }}
    >
      {steps.map((label, index) => {
        const active = index === 2;
        return (
          <div
            key={label}
            style={{ display: "flex", alignItems: "center", gap: "14px" }}
          >
            <div
              style={{
                fontSize: "15px",
                fontWeight: active ? 700 : 500,
                color: active ? "#15110E" : "#B2AAA2",
              }}
            >
              {index + 1}. {label}
            </div>
            {index < steps.length - 1 ? (
              <div style={{ fontSize: "18px", color: "#D0C8BF" }}>›</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function getParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    returnTo: params.get("returnTo") ?? "/mypage",
    email: params.get("email") ?? "",
  };
}

export default function SignupConfirmPage() {
  const initialSummary = readSignupCompletionSummary();
  const [summary] = useState(() => initialSummary);
  const { returnTo, email: fallbackEmail } = getParams();
  const resolvedReturnTo = summary?.returnTo || returnTo;
  const resolvedEmail = summary?.email || fallbackEmail;
  const confirmationRequired = Boolean(summary?.confirmationRequired);
  const loginHref = `/login?returnTo=${encodeURIComponent(resolvedReturnTo)}`;
  const primaryHref = confirmationRequired
    ? "/"
    : resolvedReturnTo;

  const handlePrimaryClick = () => {
    clearSignupCompletionSummary();
  };

  const handleSecondaryClick = () => {
    clearSignupCompletionSummary();
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F5F2",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "860px",
          background: "#FFFFFF",
          border: "1px solid #E6E0D9",
          boxShadow: "0 18px 60px rgba(25, 18, 15, 0.08)",
          padding: "clamp(24px, 4vw, 44px)",
        }}
      >
        <h1
          style={{
            fontSize: "40px",
            fontWeight: 700,
            color: "#16110D",
            textAlign: "center",
            margin: "0 0 10px",
          }}
        >
          회원 가입 완료
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#7E736B",
            margin: "0 0 30px",
          }}
        >
          가입 정보를 확인하고 다음 단계로 이동하세요.
        </p>

        <StepTracker />

        <div
          style={{
            border: "1px solid #E5DED5",
            padding: "clamp(24px, 4vw, 40px)",
            background: "#FFFEFC",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "86px",
                height: "86px",
                borderRadius: "50%",
                background: "#9CA5B7",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#FFFFFF",
                fontSize: "38px",
                fontWeight: 700,
                marginBottom: "22px",
              }}
            >
              ✓
            </div>
            <h2
              style={{
                fontSize: "38px",
                fontWeight: 700,
                color: "#17120F",
                margin: "0 0 12px",
              }}
            >
              회원가입이 완료되었습니다.
            </h2>
            <p
              style={{
                margin: 0,
                fontSize: "16px",
                color: "#756A62",
                lineHeight: 1.7,
              }}
            >
              {summary?.name ? `${summary.name}님` : "고객님"},{" "}
              {summary?.memberLabel ?? "일반회원"} 등록이 완료되었습니다.
              <br />
              {confirmationRequired
                ? "인증 메일 확인 후 로그인까지 마무리해 주세요."
                : "이제 바로 서비스를 이용할 수 있습니다."}
            </p>
          </div>

          {confirmationRequired ? (
            <div
              style={{
                marginTop: "24px",
                border: "1px solid #EEE4D8",
                background: "#FBF8F4",
                padding: "18px 20px",
                fontSize: "14px",
                color: "#6F625A",
                lineHeight: 1.7,
              }}
            >
              <div>1. 받은편지함 또는 스팸함에서 인증 메일을 확인하세요.</div>
              <div>
                2. 메일의 인증 링크를 누르면 로그인 세션이 활성화됩니다.
              </div>
              <div>
                3. 인증이 끝나지 않았다면 로그인 전에 먼저 메일 인증을 완료해
                주세요.
              </div>
            </div>
          ) : null}

          <div
            style={{
              marginTop: "34px",
              borderTop: "1px solid #ECE4DA",
              borderBottom: "1px solid #ECE4DA",
              padding: "26px 0",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr",
                rowGap: "18px",
                columnGap: "22px",
              }}
            >
              <div style={{ fontSize: "18px", color: "#3D332E" }}>아이디</div>
              <div
                style={{ fontSize: "20px", fontWeight: 700, color: "#17120F" }}
              >
                {summary?.username || "-"}
              </div>

              <div style={{ fontSize: "18px", color: "#3D332E" }}>이름</div>
              <div
                style={{ fontSize: "20px", fontWeight: 700, color: "#17120F" }}
              >
                {summary?.name || "-"}
              </div>

              <div style={{ fontSize: "18px", color: "#3D332E" }}>이메일</div>
              <div
                style={{ fontSize: "20px", fontWeight: 700, color: "#17120F" }}
              >
                {resolvedEmail || "-"}
              </div>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: "12px",
            marginTop: "26px",
          }}
        >
          <a
            href={primaryHref}
            onClick={handlePrimaryClick}
            style={{
              height: "56px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              background: "#454240",
              color: "#FFFFFF",
              textDecoration: "none",
              fontSize: "18px",
              fontWeight: 700,
            }}
          >
            {confirmationRequired
              ? "메인으로 이동"
              : resolvedReturnTo === "/mypage"
                ? "마이페이지로 이동"
                : "계속하기"}
          </a>
          <Link
            href={loginHref}
            onClick={handleSecondaryClick}
            style={{
              height: "56px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #CAC2B8",
              background: "#FFFFFF",
              color: "#1A1412",
              textDecoration: "none",
              fontSize: "18px",
              fontWeight: 600,
            }}
          >
            로그인으로 이동
          </Link>
        </div>
      </div>
    </div>
  );
}
