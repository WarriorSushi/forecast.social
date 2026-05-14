# DATABASE.md — Postgres schema

Authored in Drizzle (TypeScript), executed via `drizzle-kit push` against Supabase Postgres. RLS policies authored as raw SQL migrations alongside.

## Conventions

- Primary keys: `uuid` generated via `gen_random_uuid()`.
- Timestamps: `created_at` and `updated_at` on every table, `timestamptz` (UTC).
- Soft-delete: not used in v1. Hard delete with cascade.
- Naming: `snake_case` columns, table names plural.
- All foreign keys have indexes.
- All `text` user input columns have a length check in the app layer; column type is `text` (no varchar).

## Tables

### `users`

The application-side user record. Linked 1:1 to `auth.users` from Supabase Auth via `id`.

```ts
export const users = pgTable("users", {
  id:              uuid("id").primaryKey(),               // matches auth.users.id
  username:        text("username").notNull().unique(),   // 3–20, [a-z0-9_]
  display_name:    text("display_name").notNull(),
  bio:             text("bio"),
  avatar_url:      text("avatar_url"),
  forecast_score:  integer("forecast_score").notNull().default(0),
  total_predictions: integer("total_predictions").notNull().default(0),
  correct_predictions: integer("correct_predictions").notNull().default(0),
  current_streak:  integer("current_streak").notNull().default(0),
  longest_streak:  integer("longest_streak").notNull().default(0),
  is_admin:        boolean("is_admin").notNull().default(false),
  created_at:      timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:      timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Indexes: `username` (unique), `forecast_score DESC` (leaderboard).

### `categories`

A small fixed lookup table. Seeded by migration.

```ts
export const categories = pgTable("categories", {
  slug:        text("slug").primaryKey(),     // 'tech-ai', 'crypto', 'sports', 'pop-culture'
  name:        text("name").notNull(),
  description: text("description"),
  sort_order:  integer("sort_order").notNull().default(0),
});
```

### `markets`

```ts
export const markets = pgTable("markets", {
  id:                 uuid("id").primaryKey().defaultRandom(),
  slug:               text("slug").notNull().unique(),       // url-safe
  title:              text("title").notNull(),
  description:        text("description").notNull(),
  category_slug:      text("category_slug").notNull().references(() => categories.slug),
  created_by:         uuid("created_by").notNull().references(() => users.id),
  resolution_source:  text("resolution_source"),             // URL or rule text
  closes_at:          timestamp("closes_at", { withTimezone: true }).notNull(), // no more predictions after
  resolves_at:        timestamp("resolves_at", { withTimezone: true }).notNull(),
  resolved_at:        timestamp("resolved_at", { withTimezone: true }),
  outcome:            text("outcome", { enum: ["yes", "no", "invalid"] }),
  prediction_count:   integer("prediction_count").notNull().default(0),
  consensus_probability: real("consensus_probability"),      // running mean, 0-1
  created_at:         timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at:         timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});
```

Indexes: `slug` (unique), `category_slug, closes_at`, `resolves_at` (for scheduled resolution), `created_at DESC`.

### `predictions`

The core record. **Immutable** once inserted.

```ts
export const predictions = pgTable("predictions", {
  id:               uuid("id").primaryKey().defaultRandom(),
  market_id:        uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  user_id:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  probability:      real("probability").notNull(),     // 0.00–1.00
  consensus_at_time: real("consensus_at_time"),        // snapshot at submission
  brier:            real("brier"),                     // set when market resolves
  was_correct:      boolean("was_correct"),            // set when market resolves
  created_at:       timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  resolved_at:      timestamp("resolved_at", { withTimezone: true }),
}, (table) => ({
  marketUserCreatedIdx: index("predictions_market_user_created_idx")
    .on(table.market_id, table.user_id, table.created_at),
  userCreatedIdx: index("predictions_user_created_idx").on(table.user_id, table.created_at),
  marketCreatedIdx: index("predictions_market_created_idx").on(table.market_id, table.created_at),
  // probability constraint
  probabilityCheck: check("predictions_probability_check",
    sql`${table.probability} >= 0 AND ${table.probability} <= 1`),
}));
```

A user may have many predictions per market (the timeline of their belief). When scoring, the **most recent** prediction before market close is used.

### `market_resolutions`

Audit log; one row per resolution (markets can in theory be re-resolved if admin made a mistake).

```ts
export const market_resolutions = pgTable("market_resolutions", {
  id:           uuid("id").primaryKey().defaultRandom(),
  market_id:    uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  outcome:      text("outcome", { enum: ["yes", "no", "invalid"] }).notNull(),
  resolved_by:  uuid("resolved_by").notNull().references(() => users.id),
  notes:        text("notes"),
  resolved_at:  timestamp("resolved_at", { withTimezone: true }).defaultNow().notNull(),
});
```

### `user_category_scores`

Per-user, per-category breakdown.

```ts
export const user_category_scores = pgTable("user_category_scores", {
  user_id:          uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category_slug:    text("category_slug").notNull().references(() => categories.slug),
  score:            integer("score").notNull().default(0),
  resolved_count:   integer("resolved_count").notNull().default(0),
  correct_count:    integer("correct_count").notNull().default(0),
  avg_brier:        real("avg_brier"),
  updated_at:       timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.category_slug] }),
}));
```

### `follows`

```ts
export const follows = pgTable("follows", {
  follower_id:  uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  followee_id:  uuid("followee_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.follower_id, table.followee_id] }),
  followeeIdx: index("follows_followee_idx").on(table.followee_id),
  noSelfFollow: check("follows_no_self", sql`${table.follower_id} <> ${table.followee_id}`),
}));
```

### `comments`

Threaded discussion on markets. Single-level reply for v1 (no infinite nesting).

```ts
export const comments = pgTable("comments", {
  id:             uuid("id").primaryKey().defaultRandom(),
  market_id:      uuid("market_id").notNull().references(() => markets.id, { onDelete: "cascade" }),
  user_id:        uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  parent_id:      uuid("parent_id").references(() => comments.id, { onDelete: "cascade" }),
  body:           text("body").notNull(),
  upvote_count:   integer("upvote_count").notNull().default(0),
  created_at:     timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  edited_at:      timestamp("edited_at", { withTimezone: true }),
});
```

### `comment_upvotes`

```ts
export const comment_upvotes = pgTable("comment_upvotes", {
  comment_id:  uuid("comment_id").notNull().references(() => comments.id, { onDelete: "cascade" }),
  user_id:     uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  created_at:  timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ pk: primaryKey({ columns: [t.comment_id, t.user_id] }) }));
```

### `notifications`

```ts
export const notifications = pgTable("notifications", {
  id:           uuid("id").primaryKey().defaultRandom(),
  user_id:      uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  kind:         text("kind", { enum: ["follow", "market_resolved", "bold_call", "reply", "score_milestone"] }).notNull(),
  payload:      jsonb("payload").notNull(),
  read_at:      timestamp("read_at", { withTimezone: true }),
  created_at:   timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
}, (t) => ({ userCreatedIdx: index("notifications_user_created_idx").on(t.user_id, t.created_at) }));
```

## Row Level Security

Enable on every table with user-owned data. Authored as raw SQL migration after Drizzle push.

```sql
-- USERS
alter table users enable row level security;

create policy "users readable" on users
  for select using (true);

create policy "users update self" on users
  for update using (auth.uid() = id);

-- MARKETS
alter table markets enable row level security;

create policy "markets readable" on markets
  for select using (true);

create policy "markets insert admin" on markets
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

create policy "markets update admin" on markets
  for update using (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- PREDICTIONS — the immutable record
alter table predictions enable row level security;

create policy "predictions readable" on predictions
  for select using (true);

create policy "predictions insert self" on predictions
  for insert with check (
    auth.uid() = user_id
    and exists (
      select 1 from markets m
      where m.id = market_id
      and m.resolved_at is null
      and m.closes_at > now()
    )
  );

-- No UPDATE policy: predictions are immutable.
-- No DELETE policy: predictions are immutable.

-- FOLLOWS
alter table follows enable row level security;

create policy "follows readable" on follows for select using (true);

create policy "follows insert self" on follows
  for insert with check (auth.uid() = follower_id);

create policy "follows delete self" on follows
  for delete using (auth.uid() = follower_id);

-- COMMENTS
alter table comments enable row level security;

create policy "comments readable" on comments for select using (true);

create policy "comments insert self" on comments
  for insert with check (auth.uid() = user_id);

create policy "comments update self" on comments
  for update using (auth.uid() = user_id);

create policy "comments delete self or admin" on comments
  for delete using (
    auth.uid() = user_id
    or exists (select 1 from users where id = auth.uid() and is_admin = true)
  );

-- COMMENT UPVOTES
alter table comment_upvotes enable row level security;

create policy "upvotes readable" on comment_upvotes for select using (true);

create policy "upvotes insert self" on comment_upvotes
  for insert with check (auth.uid() = user_id);

create policy "upvotes delete self" on comment_upvotes
  for delete using (auth.uid() = user_id);

-- NOTIFICATIONS
alter table notifications enable row level security;

create policy "notifications read self" on notifications
  for select using (auth.uid() = user_id);

create policy "notifications update self" on notifications
  for update using (auth.uid() = user_id);

-- CATEGORIES — read-only for all, writes only via service role
alter table categories enable row level security;
create policy "categories readable" on categories for select using (true);

-- USER CATEGORY SCORES
alter table user_category_scores enable row level security;
create policy "user_category_scores readable" on user_category_scores for select using (true);
-- writes only via service role (Inngest jobs)

-- MARKET RESOLUTIONS
alter table market_resolutions enable row level security;
create policy "market_resolutions readable" on market_resolutions for select using (true);
create policy "market_resolutions insert admin" on market_resolutions
  for insert with check (
    exists (select 1 from users where id = auth.uid() and is_admin = true)
  );
```

## Triggers

```sql
-- Auto-create users row when a Supabase auth user signs up.
create or replace function public.handle_new_auth_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.users (id, username, display_name)
  values (
    new.id,
    -- temp username, must be set on onboarding
    'user_' || substr(new.id::text, 1, 8),
    coalesce(new.raw_user_meta_data->>'name', 'Forecaster')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- updated_at touch trigger
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at before update on users
  for each row execute function public.touch_updated_at();

create trigger markets_updated_at before update on markets
  for each row execute function public.touch_updated_at();

-- Increment market.prediction_count and recompute consensus on insert.
create or replace function public.on_prediction_inserted()
returns trigger language plpgsql as $$
begin
  update markets
    set prediction_count = prediction_count + 1,
        consensus_probability = (
          select avg(p.probability)
          from (
            select distinct on (user_id) probability
            from predictions
            where market_id = new.market_id
            order by user_id, created_at desc
          ) p
        )
    where id = new.market_id;
  return new;
end;
$$;

create trigger predictions_after_insert
  after insert on predictions
  for each row execute function public.on_prediction_inserted();
```

## Seed data

Migration `0002_seed_categories.sql` inserts:

```sql
insert into categories (slug, name, description, sort_order) values
  ('tech-ai',     'Tech & AI',     'Model launches, product ships, IPOs.', 1),
  ('crypto',      'Crypto',        'Prices, protocol launches, regulation.', 2),
  ('sports',      'Sports',        'Game outcomes, season MVPs, championships.', 3),
  ('pop-culture', 'Pop Culture',   'Box office, awards, charts.', 4);
```

## Migration workflow

1. Edit `lib/db/schema.ts`.
2. `pnpm drizzle-kit generate` → produces a SQL migration in `drizzle/`.
3. Review the generated SQL.
4. For RLS / triggers, append a hand-written companion migration.
5. `pnpm drizzle-kit push` against the dev DB.
6. Test.
7. Commit migration files. They are source of truth.

Never `drizzle-kit push` against production. Production migrations run via CI on merge to `main`.
