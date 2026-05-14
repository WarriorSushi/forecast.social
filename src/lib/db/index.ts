import "server-only";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/lib/env";
import * as schema from "@/lib/db/schema";

// Single postgres client per server process, reused across requests.
// `prepare: false` keeps things compatible with the Supabase pooler if
// we ever swap DATABASE_URL for the pooled connection string.
const client = postgres(env.DATABASE_URL, { prepare: false });

export const db = drizzle(client, { schema });
export type Db = typeof db;
