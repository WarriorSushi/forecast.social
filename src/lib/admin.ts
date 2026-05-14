import "server-only";
import { redirect } from "next/navigation";

import { getCurrentProfile, type CurrentProfile } from "@/lib/auth";

/**
 * Guards an admin-only route. Redirects sign-in if not authed, /feed if
 * authed but not admin. Returns the profile when allowed, so callers
 * don't need to fetch it again.
 */
export async function requireAdmin(): Promise<CurrentProfile> {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/sign-in");
  }
  if (!profile.is_admin) {
    redirect("/feed");
  }
  return profile;
}
