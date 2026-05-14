import Link from "next/link";
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
    <div className="flex flex-col gap-10">
      <CredentialsForm
        action={signIn}
        title="Welcome back."
        subtitle="Sign in to see your calls."
        submitLabel="Sign in"
      />
      <p className="text-body-sm text-muted-foreground">
        New here?{" "}
        <Link
          href="/sign-up"
          className="text-foreground hover:underline underline-offset-4"
        >
          Create an account
        </Link>
        .
      </p>
    </div>
  );
}
