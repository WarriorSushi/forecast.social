import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { OnboardingForm } from "@/components/auth/onboarding-form";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata = { title: "Pick a username" };

export default async function OnboardingPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/sign-in");

  const [profile] = await db
    .select({
      username: users.username,
      display_name: users.display_name,
      onboarded_at: users.onboarded_at,
    })
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (profile?.onboarded_at) redirect("/feed");

  // Pre-fill the form sensibly. The trigger seeds a "user_<hex>" placeholder
  // — show that as a starting hint but don't pre-fill it, since the point
  // is for the user to choose.
  const placeholderUsername = profile?.username?.startsWith("user_")
    ? ""
    : profile?.username;
  const placeholderDisplay =
    profile?.display_name === "Forecaster" ? "" : profile?.display_name;

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <p className="text-overline text-muted-foreground">step 1 of 1</p>
        <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
          Pick a handle.
        </h1>
        <p className="text-body text-muted-foreground">
          This is how the world will know you when you&apos;re right. Pick
          something you&apos;ll still want next year.
        </p>
      </header>
      <OnboardingForm
        defaultUsername={placeholderUsername}
        defaultDisplayName={placeholderDisplay}
      />
    </div>
  );
}
