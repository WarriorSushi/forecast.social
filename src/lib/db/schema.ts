import {
  boolean,
  check,
  index,
  integer,
  pgTable,
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
   Inferred row types — used across server actions and components.
===================================================================== */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
