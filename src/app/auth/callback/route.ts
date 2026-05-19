import { type NextRequest, NextResponse } from "next/server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const errorDescription = url.searchParams.get("error_description");

  const origin = `${url.protocol}//${url.host}`;

  if (errorDescription) {
    const dest = new URL("/sign-in", origin);
    dest.searchParams.set("error", errorDescription);
    return NextResponse.redirect(dest);
  }

  if (!code) {
    return NextResponse.redirect(new URL("/sign-in", origin));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const dest = new URL("/sign-in", origin);
    dest.searchParams.set("error", "That confirmation link is invalid or expired.");
    return NextResponse.redirect(dest);
  }

  // (app) layout decides /onboarding vs /feed based on whether the user
  // has finished picking a username yet.
  return NextResponse.redirect(new URL("/onboarding", origin));
}
