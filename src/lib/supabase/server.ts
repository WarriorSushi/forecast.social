import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

/**
 * Server-side Supabase client backed by Next.js cookies(). Use in Server
 * Components, server actions, and route handlers. Reads the auth session
 * from cookies and writes refreshed tokens back through the cookie store.
 *
 * In a Server Component, cookies() is read-only — the setAll call will
 * throw, but @supabase/ssr swallows it (middleware is responsible for
 * persisting refreshed cookies on each request). Server actions and
 * route handlers can write cookies normally.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Called from a Server Component — read-only context. Safe to
            // ignore; the middleware will refresh tokens on the next request.
          }
        },
      },
    },
  );
}
