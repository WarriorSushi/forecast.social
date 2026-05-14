import "server-only";

import { createClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

/**
 * Service-role Supabase client. Bypasses RLS — only safe in code that
 * runs server-side AND has already authorized the operation (e.g. an
 * admin action gated by is_admin, or an Inngest job).
 *
 * The "server-only" import makes any accidental client-side reference
 * fail at build time.
 */
export function createSupabaseAdminClient() {
  return createClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
