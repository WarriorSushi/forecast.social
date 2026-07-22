import { redirect } from "next/navigation";

import { CredentialsForm } from "@/components/auth/credentials-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signIn } from "@/server/actions/auth";

export const metadata = { title: "Sign in" };

export default async function SignInPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  return (
    <CredentialsForm
      action={signIn}
      title="Welcome back."
      subtitle="Return to your calls, score, and the people you follow."
      submitLabel="Sign in"
      footerPrefix="Not inside yet?"
      footerLabel="Request an invitation"
      footerHref="/early-access"
    />
  );
}
