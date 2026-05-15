import Link from "next/link";
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
    <div className="flex flex-col gap-10">
      <CredentialsForm
        action={signUp}
        title="Stake your reputation."
        subtitle={
          env.INVITE_CODES_REQUIRED
            ? "Create an account with your invite code. No money, just receipts."
            : "Create an account to start making calls. No money, just receipts."
        }
        submitLabel="Create account"
        showInviteCode={env.INVITE_CODES_REQUIRED}
        initialInviteCode={initialInviteCode}
      />
      <p className="text-body-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/sign-in"
          className="text-foreground hover:underline underline-offset-4"
        >
          Sign in
        </Link>
        .
      </p>
    </div>
  );
}
