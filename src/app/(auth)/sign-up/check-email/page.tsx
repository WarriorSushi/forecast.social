import { Mail } from "lucide-react";
import { redirect } from "next/navigation";

import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { resendConfirmation } from "@/server/actions/auth";

export const metadata = { title: "Check your email" };

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/feed");

  const sp = await searchParams;
  const email = (sp.email ?? "").trim().toLowerCase();
  if (!email) redirect("/sign-up");

  return (
    <div className="flex flex-col gap-8">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-card border border-border">
        <Mail className="size-6 text-foreground" aria-hidden />
      </div>

      <header className="flex flex-col gap-3">
        <h1 className="font-display text-display-sm text-foreground leading-[1.05]">
          Check your inbox.
        </h1>
        <p className="text-body text-muted-foreground">
          We sent a confirmation link to{" "}
          <span className="text-foreground font-medium">{email}</span>. Click
          it to finish creating your account.
        </p>
      </header>

      <div className="flex flex-col gap-3 text-body-sm text-muted-foreground">
        <p>
          The link opens this site signed in. If you don't see the email
          within a minute, check your spam folder.
        </p>
        <ResendConfirmation email={email} action={resendConfirmation} />
      </div>
    </div>
  );
}
