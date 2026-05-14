import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  real,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/* =====================================================================
   users — application-side user record, 1:1 with auth.users.id

   Created via the on_auth_user_created trigger (see DATABASE.md
   "Triggers"). The trigger seeds a placeholder username; the onboarding
   flow updates it to the user's chosen handle.
===================================================================== */
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey(),
    username: text("username").notNull().unique(),
    display_name: text("display_name").notNull(),
    bio: text("bio"),
    avatar_url: text("avatar_url"),
    forecast_score: integer("forecast_score").notNull().default(0),
    total_predictions: integer("total_predictions").notNull().default(0),
    correct_predictions: integer("correct_predictions").notNull().default(0),
    current_streak: integer("current_streak").notNull().default(0),
    longest_streak: integer("longest_streak").notNull().default(0),
    is_admin: boolean("is_admin").notNull().default(false),
    onboarded_at: timestamp("onboarded_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("users_forecast_score_idx").on(table.forecast_score.desc()),
    // Username format gate, enforced at the DB level so server actions
    // can't accidentally insert garbage. Onboarding still validates with
    // zod for nicer error messages.
    check(
      "users_username_format",
      sql`${table.username} ~ '^[a-z0-9_]{3,20}$'`,
    ),
  ],
);

/* =====================================================================
   categories — small fixed lookup, seeded by migration.
===================================================================== */
export const categories = pgTable("categories", {
  slug: text("slug").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  sort_order: integer("sort_order").notNull().default(0),
});

/* =====================================================================
   markets — resolvable prediction questions

   The product's questions live here. Created by admins (gated via the
   is_admin flag on users), readable by everyone, mutable only by
   admins. Predictions reference markets via market_id (Phase 3).
===================================================================== */
export const markets = pgTable(
  "markets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category_slug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    created_by: uuid("created_by")
      .notNull()
      .references(() => users.id),
    resolution_source: text("resolution_source"),
    closes_at: timestamp("closes_at", { withTimezone: true }).notNull(),
    resolves_at: timestamp("resolves_at", { withTimezone: true }).notNull(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
    outcome: text("outcome", { enum: ["yes", "no", "invalid"] }),
    prediction_count: integer("prediction_count").notNull().default(0),
    consensus_probability: real("consensus_probability"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("markets_category_closes_idx").on(
      table.category_slug,
      table.closes_at,
    ),
    index("markets_resolves_at_idx").on(table.resolves_at),
    index("markets_created_at_idx").on(table.created_at.desc()),
    check(
      "markets_closes_before_resolves",
      sql`${table.closes_at} <= ${table.resolves_at}`,
    ),
  ],
);

/* =====================================================================
   market_resolutions — audit log of resolution events

   One row per resolution attempt. Markets can in theory be re-resolved
   if an admin made a mistake; the current outcome lives on markets.outcome
   and this table holds the trail.
===================================================================== */
export const market_resolutions = pgTable(
  "market_resolutions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market_id: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    outcome: text("outcome", { enum: ["yes", "no", "invalid"] }).notNull(),
    resolved_by: uuid("resolved_by")
      .notNull()
      .references(() => users.id),
    notes: text("notes"),
    resolved_at: timestamp("resolved_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("market_resolutions_market_idx").on(table.market_id),
  ],
);

/* =====================================================================
   Inferred row types — used across server actions and components.
===================================================================== */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type MarketResolution = typeof market_resolutions.$inferSelect;
