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
  const hasInvite = Boolean(initialInviteCode);

  return (
    <CredentialsForm
      action={signUp}
      title={
        hasInvite
          ? "Your invitation is ready."
          : env.INVITE_CODES_REQUIRED
            ? "Enter your invitation."
          : "Start your record."
      }
      subtitle={
        hasInvite
          ? "Create your account, then put your first forecasts on the record."
          : env.INVITE_CODES_REQUIRED
            ? "Access currently opens through single-use member invitations."
          : "Create an account and put your first forecast on the record."
      }
      submitLabel="Create account"
      showInviteCode={env.INVITE_CODES_REQUIRED || Boolean(initialInviteCode)}
      initialInviteCode={initialInviteCode}
      footerPrefix="No invitation yet?"
      footerLabel="Request access"
      footerHref="/early-access"
    />
  );
}
