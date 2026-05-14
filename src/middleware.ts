import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Session refresh middleware. Runs on every non-static request and:
 *   1. Constructs a Supabase server client bound to the request/response.
 *   2. Calls supabase.auth.getUser() — under the hood this refreshes the
 *      access token if it's expired and writes new cookies onto the
 *      response.
 *
 * Route-level redirects (sign-in gate, onboarding gate) are NOT here —
 * those live in the layout/page so they can use the typed users row.
 */
export async function middleware(request: NextRequest) {
  const response = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () =>
          request.cookies.getAll().map((c) => ({
            name: c.name,
            value: c.value,
          })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  // Touch the session so cookies refresh. The user value is intentionally
  // unused here — auth gating is the page/layout's job, not the middleware's.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Match all routes except static assets, image optimizations, and favicon.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
