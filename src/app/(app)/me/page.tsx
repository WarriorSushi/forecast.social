import { redirect } from "next/navigation";

import { getCurrentProfile } from "@/lib/auth";

export default async function MeRedirectPage() {
  const profile = await getCurrentProfile();
  // Layout gate guarantees we're authenticated + onboarded, so profile is
  // definitely set here.
  if (!profile) redirect("/sign-in");
  redirect(`/u/${profile.username}`);
}
