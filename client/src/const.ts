export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

const getCurrentReturnPath = () => {
  if (typeof window === "undefined") return "/";
  const { pathname, search, hash } = window.location;
  return `${pathname}${search}${hash}` || "/";
};

const buildLocalLoginUrl = (returnTo: string) => {
  if (typeof window === "undefined") return "/login";
  const url = new URL("/login", window.location.origin);
  const normalizedReturnTo = returnTo.trim() || "/";

  if (normalizedReturnTo !== "/login") {
    url.searchParams.set("returnTo", normalizedReturnTo);
  }

  return url.toString();
};

// Generic login links should always land on the local login page.
export const getLoginUrl = (returnTo: string = getCurrentReturnPath()) => {
  return buildLocalLoginUrl(returnTo);
};
