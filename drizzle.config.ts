import { config as loadEnv } from "dotenv";
import { defineConfig } from "drizzle-kit";

// drizzle-kit runs outside Next.js. Load .env.local first (the Next.js
// dev convention), then .env as a fallback, before reading DATABASE_URL.
loadEnv({ path: ".env.local" });
loadEnv();

// drizzle-kit runs outside Next.js, so it does its own dotenv load and
// reads DATABASE_URL directly from process.env (not lib/env.ts which is
// configured for runtime).
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL is required. Add it to .env.local — see .env.example.",
  );
}

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: databaseUrl },
  strict: true,
  verbose: true,
});
