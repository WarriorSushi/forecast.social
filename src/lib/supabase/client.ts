"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

/**
 * Browser Supabase client. Use in client components for realtime
 * subscriptions only — mutations belong in server actions, per
 * ARCHITECTURE.md "All mutations go through server actions."
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
