import type { DaumPostcodeResult } from "@/lib/daum-postcode";
import { readJsonResponse } from "@/lib/http";
import { saveSignupCompletionSummary } from "@/lib/signup-flow";
import { trpc } from "@/lib/trpc";
import {
  useEffect,
  useState,
  type ChangeEvent,
  type FormEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";
import { Link, useLocation } from "wouter";

type AgreementState = {
  terms: boolean;
  marketing: boolean;
  sms: boolean;
  email: boolean;
};

type SignupForm = {
  memberType: "consumer";
  username: string;
  password: string;
  passwordConfirm: string;
  name: string;
  postalCode: string;
  address: string;
  addressDetail: string;
  landlineArea: string;
  landlineMiddle: string;
  landlineLast: string;
  mobileArea: string;
  mobileMiddle: string;
  mobileLast: string;
  email: string;
};

const LANDLINE_OPTIONS = [
  "02",
  "031",
  "032",
  "033",
  "041",
  "042",
  "043",
  "044",
  "051",
  "052",
  "053",
  "054",
  "055",
  "061",
  "062",
  "063",
  "064",
  "070",
];
const MOBILE_OPTIONS = ["010", "011", "016", "017", "018", "019"];

const emptyForm: SignupForm = {
  memberType: "consumer",
  username: "",
  password: "",
  passwordConfirm: "",
  name: "",
  postalCode: "",
  address: "",
  addressDetail: "",
  landlineArea: "02",
  landlineMiddle: "",
  landlineLast: "",
  mobileArea: "010",
  mobileMiddle: "",
  mobileLast: "",
  email: "",
};

const baseInputStyle = {
  width: "100%",
  height: "48px",
  borderRadius: "0px",
  border: "1px solid #DDD7D0",
  background: "#FFFFFF",
  padding: "0 14px",
  fontSize: "14px",
  color: "#1A1412",
  boxSizing: "border-box" as const,
  outline: "none",
};

function onlyDigits(value: string, maxLength: number) {
  return value.replace(/\D/g, "").slice(0, maxLength);
}

function composePhone(area: string, middle: string, last: string) {
  if (!middle && !last) return "";
  return `${area}-${middle}-${last}`;
}

function splitPhone(
  value: string | null | undefined,
  fallbackArea: string
): { area: string; middle: string; last: string } {
  const digits = value?.replace(/\D/g, "") ?? "";
  if (!digits) {
    return { area: fallbackArea, middle: "", last: "" };
  }

  if (digits.startsWith("02")) {
    const rest = digits.slice(2);
    return {
      area: "02",
      middle: rest.length > 4 ? rest.slice(0, -4) : "",
      last: rest.length >= 4 ? rest.slice(-4) : rest,
    };
  }

  const area = digits.slice(0, 3) || fallbackArea;
  const rest = digits.slice(area.length);
  return {
    area,
    middle: rest.length > 4 ? rest.slice(0, -4) : "",
    last: rest.length >= 4 ? rest.slice(-4) : rest,
  };
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isValidUsername(value: string) {
  return /^[a-z0-9]{4,16}$/.test(value);
}

function isValidPassword(value: string) {
  if (value.length < 10 || value.length > 16) return false;
  let categories = 0;
  if (/[A-Za-z]/.test(value)) categories += 1;
  if (/\d/.test(value)) categories += 1;
  if (/[^A-Za-z0-9]/.test(value)) categories += 1;
  return categories >= 2;
}

function isValidMobile(area: string, middle: string, last: string) {
  return (
    /^01\d$/.test(area) &&
    middle.length >= 3 &&
    middle.length <= 4 &&
    last.length === 4
  );
}

function isValidLandline(area: string, middle: string, last: string) {
  if (!middle && !last) return true;
  return (
    /^0\d+$/.test(area) &&
    middle.length >= 3 &&
    middle.length <= 4 &&
    last.length === 4
  );
}

function StepTracker({ current }: { current: 1 | 2 | 3 }) {
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
        const step = (index + 1) as 1 | 2 | 3;
        const active = step === current;
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
              {step}. {label}
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

function FieldRow({
  label,
  required = false,
  children,
  hint,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(116px, 188px) minmax(0, 1fr)",
        borderBottom: "1px solid #ECE7E1",
      }}
    >
      <div
        style={{
          background: "#F4F2EF",
          padding: "22px 16px",
          fontSize: "15px",
          fontWeight: 600,
          color: "#201915",
        }}
      >
        <span
          style={{
            color: required ? "#C84C3A" : "#201915",
            marginRight: "8px",
          }}
        >
          {required ? "•" : ""}
        </span>
        {label}
      </div>
      <div style={{ padding: "18px 20px", background: "#FFFFFF" }}>
        {children}
        {hint ? (
          <div
            style={{
              marginTop: "8px",
              fontSize: "12px",
              color: "#887A70",
              lineHeight: 1.5,
            }}
          >
            {hint}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SelectInput({
  value,
  onChange,
  options,
  width = 112,
}: {
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: string[];
  width?: number;
}) {
  return (
    <select
      value={value}
      onChange={onChange}
      style={{ ...baseInputStyle, width }}
    >
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

export default function SignupPage() {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const searchParams = new URLSearchParams(window.location.search);
  const isCompletionMode = searchParams.get("mode") === "complete";
  const returnTo = searchParams.get("returnTo") || "/mypage";
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);
  const [daumLoaded, setDaumLoaded] = useState(false);
  const [expandedAgreement, setExpandedAgreement] = useState<
    "terms" | "marketing" | null
  >("terms");
  const [agreements, setAgreements] = useState<AgreementState>({
    terms: false,
    marketing: false,
    sms: false,
    email: false,
  });
  const [form, setForm] = useState<SignupForm>(emptyForm);
  const meQuery = trpc.auth.me.useQuery(undefined, {
    enabled: isCompletionMode,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!isCompletionMode || meQuery.isLoading) return;
    if (!meQuery.data) {
      navigate(
        `/login?returnTo=${encodeURIComponent(window.location.pathname + window.location.search)}`
      );
      return;
    }
    const currentUser = meQuery.data;

    if (!currentUser.requiresProfileCompletion) {
      navigate(returnTo);
      return;
    }

    const mobileParts = splitPhone(currentUser.phone, "010");
    const landlineParts = splitPhone(currentUser.landlinePhone, "02");
    setForm(current => ({
      ...current,
      username: current.username || currentUser.username || "",
      name: current.name || currentUser.name || "",
      email: current.email || currentUser.email || "",
      mobileArea:
        current.mobileMiddle || current.mobileLast
          ? current.mobileArea
          : mobileParts.area,
      mobileMiddle:
        current.mobileMiddle || current.mobileLast
          ? current.mobileMiddle
          : mobileParts.middle,
      mobileLast:
        current.mobileLast || current.mobileMiddle
          ? current.mobileLast
          : mobileParts.last,
      landlineArea:
        current.landlineMiddle || current.landlineLast
          ? current.landlineArea
          : landlineParts.area,
      landlineMiddle:
        current.landlineMiddle || current.landlineLast
          ? current.landlineMiddle
          : landlineParts.middle,
      landlineLast:
        current.landlineLast || current.landlineMiddle
          ? current.landlineLast
          : landlineParts.last,
    }));
  }, [
    isCompletionMode,
    meQuery.data,
    meQuery.isLoading,
    navigate,
    returnTo,
  ]);

  useEffect(() => {
    if (typeof window.daum !== "undefined" && window.daum.Postcode) {
      setDaumLoaded(true);
      return;
    }

    const script = document.createElement("script");
    script.src =
      "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.onload = () => setDaumLoaded(true);
    document.head.appendChild(script);
    return () => {
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  const setFormField = <Key extends keyof SignupForm>(
    key: Key,
    value: SignupForm[Key]
  ) => {
    setForm(current => ({ ...current, [key]: value }));
  };

  const toggleAllAgreements = (checked: boolean) => {
    setAgreements({
      terms: checked,
      marketing: checked,
      sms: checked,
      email: checked,
    });
  };

  const handleMarketingToggle = (checked: boolean) => {
    setAgreements(current => ({
      ...current,
      marketing: checked,
      sms: checked,
      email: checked,
    }));
  };

  const handleChannelToggle = (key: "sms" | "email", checked: boolean) => {
    setAgreements(current => {
      const next = { ...current, [key]: checked };
      return { ...next, marketing: next.sms || next.email };
    });
  };

  const openAddressSearch = () => {
    if (!daumLoaded || typeof window.daum === "undefined") {
      toast.error("주소 검색 모듈을 불러오는 중입니다.");
      return;
    }

    new window.daum.Postcode({
      oncomplete: data => {
        setForm(current => ({
          ...current,
          postalCode: data.zonecode,
          address: data.roadAddress || data.jibunAddress,
        }));
      },
    }).open();
  };

  const goNextStep = () => {
    if (!agreements.terms) {
      toast.error("이용약관 동의는 필수입니다.");
      return;
    }
    setStep(2);
  };

  const validateForm = () => {
    if (!isValidUsername(form.username)) {
      return "아이디는 영문 소문자와 숫자 조합 4~16자로 입력해주세요.";
    }
    if (!isCompletionMode && !isValidPassword(form.password)) {
      return "비밀번호는 10~16자이며 영문, 숫자, 특수문자 중 2가지 이상을 포함해야 합니다.";
    }
    if (!isCompletionMode && form.password !== form.passwordConfirm) {
      return "비밀번호가 일치하지 않습니다.";
    }
    if (!form.name.trim()) {
      return "이름을 입력해주세요.";
    }
    if (
      (form.postalCode && !form.address) ||
      (!form.postalCode && form.address)
    ) {
      return "주소는 우편번호와 기본주소를 함께 입력해주세요.";
    }
    if (
      !isValidLandline(
        form.landlineArea,
        form.landlineMiddle,
        form.landlineLast
      )
    ) {
      return "일반전화 번호 형식을 확인해주세요.";
    }
    if (!isValidMobile(form.mobileArea, form.mobileMiddle, form.mobileLast)) {
      return "휴대전화 번호를 정확히 입력해주세요.";
    }
    if (!isValidEmail(form.email)) {
      return "이메일 형식을 확인해주세요.";
    }
    return null;
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      toast.error(validationError);
      return;
    }

    const mobilePhone = composePhone(
      form.mobileArea,
      form.mobileMiddle,
      form.mobileLast
    );
    const landlinePhone =
      form.landlineMiddle || form.landlineLast
        ? composePhone(
            form.landlineArea,
            form.landlineMiddle,
            form.landlineLast
          )
        : "";

    setLoading(true);
    try {
      const endpoint = isCompletionMode
        ? "/api/auth/profile/complete"
        : "/api/auth/email/signup";
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          username: form.username.trim().toLowerCase(),
          password: isCompletionMode ? undefined : form.password,
          name: form.name.trim(),
          postalCode: form.postalCode.trim(),
          address: form.address.trim(),
          addressDetail: form.addressDetail.trim(),
          landlinePhone,
          mobilePhone,
          email: form.email.trim().toLowerCase(),
          termsAgreed: agreements.terms,
          marketingSmsConsent: agreements.sms,
          marketingEmailConsent: agreements.email,
          origin: window.location.origin,
          returnTo,
        }),
      });

      const payload = await readJsonResponse<{
        error?: string;
        confirmationRequired?: boolean;
        returnTo?: string;
        username?: string;
        name?: string;
        email?: string;
      }>(response);

      if (!response.ok) {
        toast.error(payload.error || "회원가입에 실패했습니다.");
        setLoading(false);
        return;
      }

      if (isCompletionMode) {
        await utils.auth.me.invalidate();
      }

      saveSignupCompletionSummary({
        username: payload.username ?? form.username.trim().toLowerCase(),
        name: payload.name ?? form.name.trim(),
        email: payload.email ?? form.email.trim().toLowerCase(),
        memberLabel: "일반회원",
        confirmationRequired: isCompletionMode
          ? false
          : Boolean(payload.confirmationRequired),
        returnTo: payload.returnTo || returnTo,
      });

      toast.success(
        isCompletionMode
          ? "추가 정보 입력이 완료되었습니다."
          : payload.confirmationRequired
          ? "회원가입이 완료되었습니다. 이메일 인증을 진행해주세요."
          : "회원가입이 완료되었습니다."
      );
      navigate(
        `/signup/confirm?returnTo=${encodeURIComponent(payload.returnTo || returnTo)}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "네트워크 오류가 발생했습니다."
      );
    } finally {
      setLoading(false);
    }
  };

  const allAgreed =
    agreements.terms &&
    agreements.marketing &&
    agreements.sms &&
    agreements.email;

  if (isCompletionMode && meQuery.isLoading) {
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
          color: "#5E564F",
          fontSize: "15px",
        }}
      >
        가입 정보를 확인하는 중입니다.
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F7F5F2",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        fontFamily: "'Noto Sans KR', sans-serif",
      }}
    >
      <a
        href="/index-main.html"
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
          {isCompletionMode ? "추가 정보 입력" : "회원 가입"}
        </h1>
        <p
          style={{
            textAlign: "center",
            fontSize: "14px",
            color: "#7E736B",
            margin: "0 0 30px",
          }}
        >
          {isCompletionMode
            ? "소셜 가입을 완료하려면 주문과 배송에 필요한 정보를 입력해주세요."
            : "회원 정보를 등록하고 리에이지의 주문, 상담, 멤버십 기능을 이용하세요."}
        </p>

        <StepTracker current={step} />

        {step === 1 ? (
          <div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: 700,
                color: "#17120F",
                paddingBottom: "14px",
                borderBottom: "3px solid #1B1612",
                marginBottom: "24px",
              }}
            >
              전체 동의
            </div>

            <div
              style={{
                borderBottom: "1px solid #ECE7E1",
                paddingBottom: "24px",
                marginBottom: "22px",
              }}
            >
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "14px",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={allAgreed}
                  onChange={event => toggleAllAgreements(event.target.checked)}
                  style={{
                    marginTop: "3px",
                    width: "18px",
                    height: "18px",
                    accentColor: "#17120F",
                  }}
                />
                <div>
                  <div
                    style={{
                      fontSize: "28px",
                      fontWeight: 700,
                      color: "#17120F",
                      lineHeight: 1.35,
                    }}
                  >
                    모든 약관을 확인하고 전체 동의합니다.
                  </div>
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "14px",
                      color: "#85786F",
                    }}
                  >
                    전체 동의는 필수 및 선택 정보에 대한 동의를 모두 포함합니다.
                  </div>
                </div>
              </label>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "14px" }}
            >
              <div
                style={{
                  borderBottom: "1px solid #ECE7E1",
                  paddingBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#16110D",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreements.terms}
                      onChange={event =>
                        setAgreements(current => ({
                          ...current,
                          terms: event.target.checked,
                        }))
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#17120F",
                      }}
                    />
                    이용약관 동의 (필수)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAgreement(current =>
                        current === "terms" ? null : "terms"
                      )
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "22px",
                      color: "#665B53",
                      cursor: "pointer",
                    }}
                  >
                    {expandedAgreement === "terms" ? "−" : "⌄"}
                  </button>
                </div>
                {expandedAgreement === "terms" ? (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "16px 18px",
                      background: "#FBF9F6",
                      color: "#756960",
                      fontSize: "13px",
                      lineHeight: 1.7,
                    }}
                  >
                    리에이지의 서비스 이용, 계정 생성, 주문 및 상담 진행을 위한
                    기본 약관입니다. 회원가입을 진행하려면 필수 약관에 동의해야
                    합니다.
                  </div>
                ) : null}
              </div>

              <div
                style={{
                  borderBottom: "1px solid #ECE7E1",
                  paddingBottom: "14px",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "16px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      cursor: "pointer",
                      fontSize: "18px",
                      fontWeight: 700,
                      color: "#16110D",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreements.marketing}
                      onChange={event =>
                        handleMarketingToggle(event.target.checked)
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#17120F",
                      }}
                    />
                    쇼핑정보 수신 동의 (선택)
                  </label>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedAgreement(current =>
                        current === "marketing" ? null : "marketing"
                      )
                    }
                    style={{
                      border: "none",
                      background: "transparent",
                      fontSize: "22px",
                      color: "#665B53",
                      cursor: "pointer",
                    }}
                  >
                    {expandedAgreement === "marketing" ? "−" : "⌄"}
                  </button>
                </div>
                {expandedAgreement === "marketing" ? (
                  <div
                    style={{
                      marginTop: "14px",
                      padding: "16px 18px",
                      background: "#FBF9F6",
                      color: "#756960",
                      fontSize: "13px",
                      lineHeight: 1.7,
                    }}
                  >
                    신규 제품, 이벤트, 프로모션, 멤버십 혜택 소식을 SMS 또는
                    이메일로 받아볼 수 있습니다. 원하는 채널만 선택할 수
                    있습니다.
                  </div>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    gap: "28px",
                    flexWrap: "wrap",
                    marginTop: "18px",
                    paddingLeft: "34px",
                  }}
                >
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      fontSize: "16px",
                      color: "#25201C",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreements.sms}
                      onChange={event =>
                        handleChannelToggle("sms", event.target.checked)
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#17120F",
                      }}
                    />
                    SMS 수신 동의 (선택)
                  </label>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      cursor: "pointer",
                      fontSize: "16px",
                      color: "#25201C",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={agreements.email}
                      onChange={event =>
                        handleChannelToggle("email", event.target.checked)
                      }
                      style={{
                        width: "18px",
                        height: "18px",
                        accentColor: "#17120F",
                      }}
                    />
                    이메일 수신 동의 (선택)
                  </label>
                </div>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
                marginTop: "34px",
              }}
            >
              <a
                href="/index-main.html"
                style={{
                  height: "56px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid #CAC2B8",
                  textDecoration: "none",
                  color: "#1A1412",
                  fontSize: "18px",
                  fontWeight: 500,
                }}
              >
                {isCompletionMode ? "나중에" : "취소"}
              </a>
              <button
                type="button"
                onClick={goNextStep}
                style={{
                  height: "56px",
                  border: "none",
                  background: "#454240",
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                다음
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: "#17120F",
                marginBottom: "12px",
              }}
            >
              회원인증
            </div>
            <div
              style={{
                borderTop: "1px solid #D9D1C9",
                borderBottom: "1px solid #ECE7E1",
                marginBottom: "32px",
              }}
            >
              <FieldRow label="회원구분" required>
                <label
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "10px",
                    fontSize: "16px",
                    fontWeight: 600,
                    color: "#1B1612",
                  }}
                >
                  <input
                    type="radio"
                    checked
                    readOnly
                    style={{
                      width: "18px",
                      height: "18px",
                      accentColor: "#17120F",
                    }}
                  />
                  개인회원
                </label>
              </FieldRow>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                marginBottom: "12px",
                flexWrap: "wrap",
              }}
            >
              <div
                style={{ fontSize: "22px", fontWeight: 700, color: "#17120F" }}
              >
                기본정보
              </div>
              <div style={{ fontSize: "13px", color: "#8B7065" }}>
                <span style={{ color: "#C84C3A", marginRight: "6px" }}>•</span>
                필수입력사항
              </div>
            </div>

            <div
              style={{ borderTop: "1px solid #D9D1C9", marginBottom: "30px" }}
            >
              <FieldRow label="아이디" required hint="영문 소문자/숫자, 4~16자">
                <input
                  type="text"
                  value={form.username}
                  onChange={event =>
                    setFormField(
                      "username",
                      event.target.value
                        .toLowerCase()
                        .replace(/[^a-z0-9]/g, "")
                        .slice(0, 16)
                    )
                  }
                  placeholder="reageuser"
                  style={baseInputStyle}
                />
              </FieldRow>

              {isCompletionMode ? null : (
                <>
                  <FieldRow
                    label="비밀번호"
                    required
                    hint="영문, 숫자, 특수문자 중 2가지 이상 조합, 10자~16자"
                  >
                    <input
                      type="password"
                      value={form.password}
                      onChange={event =>
                        setFormField("password", event.target.value)
                      }
                      placeholder="비밀번호를 입력해주세요"
                      style={baseInputStyle}
                    />
                  </FieldRow>

                  <FieldRow label="비밀번호 확인" required>
                    <input
                      type="password"
                      value={form.passwordConfirm}
                      onChange={event =>
                        setFormField("passwordConfirm", event.target.value)
                      }
                      placeholder="비밀번호를 다시 입력해주세요"
                      style={baseInputStyle}
                    />
                  </FieldRow>
                </>
              )}

              <FieldRow label="이름" required>
                <input
                  type="text"
                  value={form.name}
                  onChange={event => setFormField("name", event.target.value)}
                  placeholder="홍길동"
                  style={baseInputStyle}
                />
              </FieldRow>

              <FieldRow label="주소">
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >
                  <div
                    style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
                  >
                    <input
                      type="text"
                      value={form.postalCode}
                      onChange={event =>
                        setFormField(
                          "postalCode",
                          onlyDigits(event.target.value, 5)
                        )
                      }
                      placeholder="우편번호"
                      style={{
                        ...baseInputStyle,
                        width: "160px",
                        background: "#FBF8F4",
                      }}
                    />
                    <button
                      type="button"
                      onClick={openAddressSearch}
                      style={{
                        height: "48px",
                        minWidth: "118px",
                        border: "1px solid #BEB6AD",
                        background: "#FFFFFF",
                        fontSize: "15px",
                        fontWeight: 600,
                        color: "#15110E",
                        cursor: "pointer",
                      }}
                    >
                      {daumLoaded ? "주소검색" : "로딩 중"}
                    </button>
                  </div>
                  <input
                    type="text"
                    value={form.address}
                    onChange={event =>
                      setFormField("address", event.target.value)
                    }
                    placeholder="기본주소"
                    style={{ ...baseInputStyle, background: "#FBF8F4" }}
                  />
                  <input
                    type="text"
                    value={form.addressDetail}
                    onChange={event =>
                      setFormField("addressDetail", event.target.value)
                    }
                    placeholder="나머지 주소(선택 입력 가능)"
                    style={{ ...baseInputStyle, background: "#FBF8F4" }}
                  />
                </div>
              </FieldRow>

              <FieldRow label="일반전화">
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <SelectInput
                    value={form.landlineArea}
                    onChange={event =>
                      setFormField("landlineArea", event.target.value)
                    }
                    options={LANDLINE_OPTIONS}
                  />
                  <span style={{ color: "#9C9087" }}>-</span>
                  <input
                    type="tel"
                    value={form.landlineMiddle}
                    onChange={event =>
                      setFormField(
                        "landlineMiddle",
                        onlyDigits(event.target.value, 4)
                      )
                    }
                    style={{ ...baseInputStyle, width: "112px" }}
                  />
                  <span style={{ color: "#9C9087" }}>-</span>
                  <input
                    type="tel"
                    value={form.landlineLast}
                    onChange={event =>
                      setFormField(
                        "landlineLast",
                        onlyDigits(event.target.value, 4)
                      )
                    }
                    style={{ ...baseInputStyle, width: "112px" }}
                  />
                </div>
              </FieldRow>

              <FieldRow label="휴대전화" required>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <SelectInput
                    value={form.mobileArea}
                    onChange={event =>
                      setFormField("mobileArea", event.target.value)
                    }
                    options={MOBILE_OPTIONS}
                  />
                  <span style={{ color: "#9C9087" }}>-</span>
                  <input
                    type="tel"
                    value={form.mobileMiddle}
                    onChange={event =>
                      setFormField(
                        "mobileMiddle",
                        onlyDigits(event.target.value, 4)
                      )
                    }
                    style={{ ...baseInputStyle, width: "112px" }}
                  />
                  <span style={{ color: "#9C9087" }}>-</span>
                  <input
                    type="tel"
                    value={form.mobileLast}
                    onChange={event =>
                      setFormField(
                        "mobileLast",
                        onlyDigits(event.target.value, 4)
                      )
                    }
                    style={{ ...baseInputStyle, width: "112px" }}
                  />
                </div>
              </FieldRow>

              <FieldRow label="이메일" required>
                <input
                  type="email"
                  value={form.email}
                  onChange={event => setFormField("email", event.target.value)}
                  placeholder="example@email.com"
                  style={baseInputStyle}
                />
              </FieldRow>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                gap: "12px",
              }}
            >
              <button
                type="button"
                onClick={() => setStep(1)}
                style={{
                  height: "56px",
                  border: "1px solid #CAC2B8",
                  background: "#FFFFFF",
                  color: "#1A1412",
                  fontSize: "18px",
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                이전
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  height: "56px",
                  border: "none",
                  background: loading ? "#A8A19A" : "#454240",
                  color: "#FFFFFF",
                  fontSize: "18px",
                  fontWeight: 700,
                  cursor: loading ? "not-allowed" : "pointer",
                }}
              >
                {loading
                  ? "저장 중..."
                  : isCompletionMode
                    ? "추가 정보 저장"
                    : "회원가입 완료"}
              </button>
            </div>
          </form>
        )}

        {isCompletionMode ? null : (
          <div
            style={{
              marginTop: "26px",
              textAlign: "center",
              fontSize: "13px",
              color: "#7A6E66",
            }}
          >
            이미 계정이 있으신가요?{" "}
            <Link
              href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
              style={{
                color: "#6B0F1A",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              로그인
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
