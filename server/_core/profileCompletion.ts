import type { Profile } from "../../drizzle/schema-pg";
import { sanitizeReturnPath } from "./authSession";

type MinimalProfile = Pick<Profile, "username" | "name" | "phone" | "email">;

export function isProfileCompletionRequired(profile: MinimalProfile | null | undefined) {
  if (!profile) return false;

  return !(
    profile.username?.trim() &&
    profile.name?.trim() &&
    profile.phone?.trim() &&
    profile.email?.trim()
  );
}

export function buildProfileCompletionPath(returnTo?: string | null) {
  const safeReturnTo = sanitizeReturnPath(returnTo);
  return `/signup?mode=complete&returnTo=${encodeURIComponent(safeReturnTo)}`;
}
