import {
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
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
    onboarding_step: text("onboarding_step", {
      enum: ["profile", "forecast", "complete"],
    })
      .notNull()
      .default("profile"),
    invite_credits: integer("invite_credits").notNull().default(0),
    founding_member_number: integer("founding_member_number"),
    founding_member_since: timestamp("founding_member_since", {
      withTimezone: true,
    }),
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
    check(
      "users_invite_credits_range",
      sql`${table.invite_credits} >= 0 AND ${table.invite_credits} <= 5`,
    ),
    uniqueIndex("users_founding_member_number_idx")
      .on(table.founding_member_number)
      .where(sql`${table.founding_member_number} is not null`),
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

export const user_interests = pgTable(
  "user_interests",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category_slug: text("category_slug")
      .notNull()
      .references(() => categories.slug, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.category_slug] }),
    index("user_interests_category_idx").on(table.category_slug),
  ],
);

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
    discovery_state: text("discovery_state", {
      enum: ["featured", "standard", "hidden"],
    })
      .notNull()
      .default("standard"),
    onboarding_rank: integer("onboarding_rank"),
    resolution_method: text("resolution_method", {
      enum: ["manual", "http_json"],
    })
      .notNull()
      .default("manual"),
    resolution_config: jsonb("resolution_config"),
    resolution_status: text("resolution_status", {
      enum: ["pending", "review", "resolving", "resolved", "failed"],
    })
      .notNull()
      .default("pending"),
    resolution_evidence: jsonb("resolution_evidence"),
    resolution_checked_at: timestamp("resolution_checked_at", {
      withTimezone: true,
    }),
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
    index("markets_discovery_closes_idx").on(
      table.discovery_state,
      table.closes_at,
    ),
    index("markets_resolution_queue_idx").on(
      table.resolution_status,
      table.resolves_at,
    ),
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
    resolved_by: uuid("resolved_by").references(() => users.id),
    resolver: text("resolver", { enum: ["admin", "automation"] })
      .notNull()
      .default("admin"),
    evidence: jsonb("evidence"),
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
   predictions — the immutable record

   A row per submitted call. Users can re-predict on the same market;
   each submission creates a new row. "Latest" prediction per user is
   what counts for consensus and scoring. Brier and was_correct are
   filled in when the market resolves (Phase 4).
===================================================================== */
export const predictions = pgTable(
  "predictions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market_id: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    probability: real("probability").notNull(),
    consensus_at_time: real("consensus_at_time"),
    brier: real("brier"),
    was_correct: boolean("was_correct"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    resolved_at: timestamp("resolved_at", { withTimezone: true }),
  },
  (table) => [
    index("predictions_market_user_created_idx").on(
      table.market_id,
      table.user_id,
      table.created_at,
    ),
    index("predictions_user_created_idx").on(
      table.user_id,
      table.created_at.desc(),
    ),
    index("predictions_market_created_idx").on(
      table.market_id,
      table.created_at.desc(),
    ),
    check(
      "predictions_probability_range",
      sql`${table.probability} >= 0 AND ${table.probability} <= 1`,
    ),
  ],
);

/* =====================================================================
   user_category_scores — per-user, per-category breakdown

   A user may be 2100 on Tech and 850 on Sports. SCORING.md §7 — same
   formula as the global score, filtered to predictions in that
   category. Maintained by the resolveMarket flow.
===================================================================== */
export const user_category_scores = pgTable(
  "user_category_scores",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    category_slug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    score: integer("score").notNull().default(0),
    resolved_count: integer("resolved_count").notNull().default(0),
    correct_count: integer("correct_count").notNull().default(0),
    avg_brier: real("avg_brier"),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.category_slug] }),
    index("user_category_scores_category_score_idx").on(
      table.category_slug,
      table.score.desc(),
    ),
  ],
);

/* =====================================================================
   invite_codes — launch ramp / track who invited whom

   8-char alnum codes generated by admins. A code is single-use: when a
   new user signs up with `?code=...`, the server action stamps
   used_by + used_at on the row. RLS keeps the table opaque to
   non-admins beyond the public "is this code valid?" check.
===================================================================== */
export const invite_codes = pgTable(
  "invite_codes",
  {
    code: text("code").primaryKey(),
    created_by: uuid("created_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    used_by: uuid("used_by").references(() => users.id, {
      onDelete: "set null",
    }),
    used_at: timestamp("used_at", { withTimezone: true }),
    note: text("note"),
    source_prediction_id: uuid("source_prediction_id").references(
      () => predictions.id,
      { onDelete: "set null" },
    ),
    expires_at: timestamp("expires_at", { withTimezone: true }),
    activated_at: timestamp("activated_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("invite_codes_created_at_idx").on(table.created_at.desc()),
    index("invite_codes_used_by_idx").on(table.used_by),
    index("invite_codes_source_prediction_idx").on(
      table.source_prediction_id,
    ),
  ],
);

export const invite_grants = pgTable(
  "invite_grants",
  {
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    market_id: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    prediction_id: uuid("prediction_id")
      .notNull()
      .references(() => predictions.id, { onDelete: "cascade" }),
    granted_at: timestamp("granted_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.user_id, table.market_id] }),
    uniqueIndex("invite_grants_prediction_idx").on(table.prediction_id),
  ],
);

export const referrals = pgTable(
  "referrals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invite_code: text("invite_code")
      .notNull()
      .references(() => invite_codes.code, { onDelete: "cascade" }),
    inviter_id: uuid("inviter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    invitee_id: uuid("invitee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    source_prediction_id: uuid("source_prediction_id").references(
      () => predictions.id,
      { onDelete: "set null" },
    ),
    activated_at: timestamp("activated_at", { withTimezone: true }),
    retained_at: timestamp("retained_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("referrals_invite_code_idx").on(table.invite_code),
    uniqueIndex("referrals_invitee_idx").on(table.invitee_id),
    index("referrals_inviter_created_idx").on(
      table.inviter_id,
      table.created_at.desc(),
    ),
  ],
);

export const early_access_applications = pgTable(
  "early_access_applications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    handle: text("handle"),
    interests: text("interests").array().notNull().default(sql`'{}'::text[]`),
    prediction: text("prediction"),
    source: text("source"),
    invite_code: text("invite_code").references(() => invite_codes.code, {
      onDelete: "set null",
    }),
    status: text("status", {
      enum: ["pending", "invited", "joined", "declined"],
    })
      .notNull()
      .default("pending"),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    uniqueIndex("early_access_email_idx").on(sql`lower(${table.email})`),
    uniqueIndex("early_access_invite_code_idx").on(table.invite_code),
    index("early_access_status_created_idx").on(
      table.status,
      table.created_at.desc(),
    ),
  ],
);

export const growth_events = pgTable(
  "growth_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    event: text("event").notNull(),
    user_id: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    invite_code: text("invite_code"),
    metadata: jsonb("metadata").notNull().default(sql`'{}'::jsonb`),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("growth_events_event_created_idx").on(
      table.event,
      table.created_at.desc(),
    ),
    index("growth_events_user_created_idx").on(
      table.user_id,
      table.created_at.desc(),
    ),
  ],
);

/* =====================================================================
   market_proposals — community-submitted markets pending admin review

   Anyone signed in can propose a market. Admins approve/reject from
   /admin/proposals. On approval, a trigger copies the row to markets
   crediting the proposer in created_by.
===================================================================== */
export const market_proposals = pgTable(
  "market_proposals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category_slug: text("category_slug")
      .notNull()
      .references(() => categories.slug),
    proposed_by: uuid("proposed_by")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resolution_source: text("resolution_source"),
    closes_at: timestamp("closes_at", { withTimezone: true }).notNull(),
    resolves_at: timestamp("resolves_at", { withTimezone: true }).notNull(),
    rationale: text("rationale").notNull(),
    status: text("status", {
      enum: ["pending", "approved", "rejected", "needs_revision"],
    })
      .notNull()
      .default("pending"),
    reviewed_by: uuid("reviewed_by").references(() => users.id),
    reviewed_at: timestamp("reviewed_at", { withTimezone: true }),
    rejection_reason: text("rejection_reason"),
    approved_market_id: uuid("approved_market_id").references(
      () => markets.id,
      { onDelete: "set null" },
    ),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("market_proposals_status_created_idx").on(
      table.status,
      table.created_at.desc(),
    ),
    index("market_proposals_proposer_created_idx").on(
      table.proposed_by,
      table.created_at.desc(),
    ),
    check(
      "market_proposals_closes_before_resolves",
      sql`${table.closes_at} <= ${table.resolves_at}`,
    ),
  ],
);

/* =====================================================================
   follows — directional social graph
===================================================================== */
export const follows = pgTable(
  "follows",
  {
    follower_id: uuid("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followee_id: uuid("followee_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.follower_id, table.followee_id] }),
    index("follows_followee_idx").on(table.followee_id),
    check(
      "follows_no_self",
      sql`${table.follower_id} <> ${table.followee_id}`,
    ),
  ],
);

/* =====================================================================
   comments — single-level threaded discussion per market
   Plain text body, optional parent_id for one-level replies.
===================================================================== */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    market_id: uuid("market_id")
      .notNull()
      .references(() => markets.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    parent_id: uuid("parent_id"),
    body: text("body").notNull(),
    upvote_count: integer("upvote_count").notNull().default(0),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    edited_at: timestamp("edited_at", { withTimezone: true }),
  },
  (table) => [
    index("comments_market_created_idx").on(
      table.market_id,
      table.created_at.desc(),
    ),
    index("comments_parent_idx").on(table.parent_id),
    check(
      "comments_body_length",
      sql`length(${table.body}) > 0 AND length(${table.body}) <= 4000`,
    ),
  ],
);

/* =====================================================================
   comment_upvotes — composite key, one upvote per user per comment
===================================================================== */
export const comment_upvotes = pgTable(
  "comment_upvotes",
  {
    comment_id: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.comment_id, table.user_id] })],
);

/* =====================================================================
   notifications — typed payload, per-user, read/unread state
===================================================================== */
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    kind: text("kind", {
      enum: [
        "follow",
        "market_resolved",
        "bold_call",
        "reply",
        "score_milestone",
        "proposal_resolved",
      ],
    }).notNull(),
    payload: jsonb("payload").notNull(),
    read_at: timestamp("read_at", { withTimezone: true }),
    created_at: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notifications_user_created_idx").on(
      table.user_id,
      table.created_at.desc(),
    ),
  ],
);

/* =====================================================================
   Inferred row types — used across server actions and components.
===================================================================== */
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type UserInterest = typeof user_interests.$inferSelect;
export type Market = typeof markets.$inferSelect;
export type NewMarket = typeof markets.$inferInsert;
export type MarketResolution = typeof market_resolutions.$inferSelect;
export type Prediction = typeof predictions.$inferSelect;
export type NewPrediction = typeof predictions.$inferInsert;
export type UserCategoryScore = typeof user_category_scores.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type NewComment = typeof comments.$inferInsert;
export type CommentUpvote = typeof comment_upvotes.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type NotificationKind = Notification["kind"];
export type MarketProposal = typeof market_proposals.$inferSelect;
export type NewMarketProposal = typeof market_proposals.$inferInsert;
export type ProposalStatus = MarketProposal["status"];
export type InviteCode = typeof invite_codes.$inferSelect;
export type NewInviteCode = typeof invite_codes.$inferInsert;
export type InviteGrant = typeof invite_grants.$inferSelect;
export type Referral = typeof referrals.$inferSelect;
export type EarlyAccessApplication =
  typeof early_access_applications.$inferSelect;
export type GrowthEvent = typeof growth_events.$inferSelect;
