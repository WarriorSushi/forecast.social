import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

/**
 * Session refresh proxy. Runs on every non-static request and:
 *   1. Constructs a Supabase server client bound to the request/response.
 *   2. Calls supabase.auth.getUser() — under the hood this refreshes the
 *      access token if it's expired and writes new cookies onto the
 *      response.
 *
 * Renamed from middleware to proxy per Next.js 16. Route-level
 * redirects (sign-in gate, onboarding gate) are NOT here — those live
 * in the layout/page so they can use the typed users row.
 */
export async function proxy(request: NextRequest) {
  const response = NextResponse.next({ request });

  // Anonymous traffic has no session to refresh. Skipping the remote Auth
  // call keeps landing pages, public profiles, share links, and health checks
  // fast while authenticated requests still get normal token rotation.
  const hasAuthCookie = request.cookies
    .getAll()
    .some(({ name }) => name.startsWith("sb-") && name.includes("-auth-token"));
  if (!hasAuthCookie) return response;

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
  // unused here — auth gating is the page/layout's job, not the proxy's.
  await supabase.auth.getUser();

  return response;
}

export const config = {
  // Match all routes except static assets, image optimizations, and favicon.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
