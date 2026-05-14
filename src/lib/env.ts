import { z } from "zod";

/**
 * Strict environment validation. Throws at module load if anything required
 * is missing — TECH_STACK.md "Env vars". The schema is split so client
 * bundles can validate the NEXT_PUBLIC_* subset without service-role keys
 * being referenced in client code.
 */

const serverSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z
    .string()
    .url()
    .default("http://localhost:3000"),
});

type ServerEnv = z.infer<typeof serverSchema>;
type ClientEnv = z.infer<typeof clientSchema>;

function parseServer(): ServerEnv {
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")} — ${i.message}`)
      .join("\n  ");
    throw new Error(
      `Invalid server environment. Check .env.local against .env.example.\n  ${issues}`,
    );
  }
  return parsed.data;
}

function parseClient(): ClientEnv {
  // process.env values prefixed NEXT_PUBLIC_ are inlined by the Next.js build,
  // so they're statically available in client bundles.
  const candidate = {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
  };
  const parsed = clientSchema.safeParse(candidate);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `${i.path.join(".")} — ${i.message}`)
      .join("\n  ");
    throw new Error(
      `Invalid client environment.\n  ${issues}`,
    );
  }
  return parsed.data;
}

const isServer = typeof window === "undefined";

export const env = (isServer ? parseServer() : parseClient()) as ServerEnv;
