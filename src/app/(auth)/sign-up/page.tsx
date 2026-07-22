import { redirect } from "next/navigation";

import { CredentialsForm } from "@/components/auth/credentials-form";
import { env } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { signUp } from "@/server/actions/auth";

export const metadata = { title: "Sign up" };

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  const sp = await searchParams;
  const initialInviteCode = (sp.code ?? "").toUpperCase().slice(0, 16);

  return (
    <CredentialsForm
      action={signUp}
      title="Start your record."
      subtitle={
        env.INVITE_CODES_REQUIRED
          ? "Create an account with your invite code. Loud opinions, public record."
          : "Create an account to start making calls. Loud opinions, public record."
      }
      submitLabel="Create account"
      showInviteCode={env.INVITE_CODES_REQUIRED}
      initialInviteCode={initialInviteCode}
    />
  );
}
