export type SignupCompletionSummary = {
  username: string;
  name: string;
  email: string;
  memberLabel: string;
  confirmationRequired: boolean;
  returnTo: string;
};

const SIGNUP_COMPLETION_STORAGE_KEY = "reage-signup-completion";

export function saveSignupCompletionSummary(summary: SignupCompletionSummary) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    SIGNUP_COMPLETION_STORAGE_KEY,
    JSON.stringify(summary)
  );
}

export function readSignupCompletionSummary(): SignupCompletionSummary | null {
  if (typeof window === "undefined") return null;

  const raw = window.sessionStorage.getItem(SIGNUP_COMPLETION_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SignupCompletionSummary;
  } catch {
    window.sessionStorage.removeItem(SIGNUP_COMPLETION_STORAGE_KEY);
    return null;
  }
}

export function clearSignupCompletionSummary() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(SIGNUP_COMPLETION_STORAGE_KEY);
}
