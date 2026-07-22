CREATE TABLE "early_access_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"handle" text,
	"interests" text[] DEFAULT '{}'::text[] NOT NULL,
	"prediction" text,
	"source" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "growth_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event" text NOT NULL,
	"user_id" uuid,
	"invite_code" text,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invite_grants" (
	"user_id" uuid NOT NULL,
	"market_id" uuid NOT NULL,
	"prediction_id" uuid NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "invite_grants_user_id_market_id_pk" PRIMARY KEY("user_id","market_id")
);
--> statement-breakpoint
CREATE TABLE "referrals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"invite_code" text NOT NULL,
	"inviter_id" uuid NOT NULL,
	"invitee_id" uuid NOT NULL,
	"source_prediction_id" uuid,
	"activated_at" timestamp with time zone,
	"retained_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_interests" (
	"user_id" uuid NOT NULL,
	"category_slug" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_interests_user_id_category_slug_pk" PRIMARY KEY("user_id","category_slug")
);
--> statement-breakpoint
ALTER TABLE "market_resolutions" ALTER COLUMN "resolved_by" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN "source_prediction_id" uuid;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN "expires_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "invite_codes" ADD COLUMN "activated_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "market_resolutions" ADD COLUMN "resolver" text DEFAULT 'admin' NOT NULL;--> statement-breakpoint
ALTER TABLE "market_resolutions" ADD COLUMN "evidence" jsonb;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "discovery_state" text DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "onboarding_rank" integer;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_method" text DEFAULT 'manual' NOT NULL;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_config" jsonb;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_status" text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_evidence" jsonb;--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_checked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "onboarding_step" text DEFAULT 'profile' NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_credits" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "founding_member_number" integer;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "founding_member_since" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_grants" ADD CONSTRAINT "invite_grants_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_grants" ADD CONSTRAINT "invite_grants_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invite_grants" ADD CONSTRAINT "invite_grants_prediction_id_predictions_id_fk" FOREIGN KEY ("prediction_id") REFERENCES "public"."predictions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invite_code_invite_codes_code_fk" FOREIGN KEY ("invite_code") REFERENCES "public"."invite_codes"("code") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_invitee_id_users_id_fk" FOREIGN KEY ("invitee_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_source_prediction_id_predictions_id_fk" FOREIGN KEY ("source_prediction_id") REFERENCES "public"."predictions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_interests" ADD CONSTRAINT "user_interests_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "early_access_email_idx" ON "early_access_applications" USING btree (lower("email"));--> statement-breakpoint
CREATE INDEX "early_access_status_created_idx" ON "early_access_applications" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "growth_events_event_created_idx" ON "growth_events" USING btree ("event","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "growth_events_user_created_idx" ON "growth_events" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE UNIQUE INDEX "invite_grants_prediction_idx" ON "invite_grants" USING btree ("prediction_id");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_invite_code_idx" ON "referrals" USING btree ("invite_code");--> statement-breakpoint
CREATE UNIQUE INDEX "referrals_invitee_idx" ON "referrals" USING btree ("invitee_id");--> statement-breakpoint
CREATE INDEX "referrals_inviter_created_idx" ON "referrals" USING btree ("inviter_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "user_interests_category_idx" ON "user_interests" USING btree ("category_slug");--> statement-breakpoint
ALTER TABLE "invite_codes" ADD CONSTRAINT "invite_codes_source_prediction_id_predictions_id_fk" FOREIGN KEY ("source_prediction_id") REFERENCES "public"."predictions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "invite_codes_source_prediction_idx" ON "invite_codes" USING btree ("source_prediction_id");--> statement-breakpoint
CREATE INDEX "markets_discovery_closes_idx" ON "markets" USING btree ("discovery_state","closes_at");--> statement-breakpoint
CREATE INDEX "markets_resolution_queue_idx" ON "markets" USING btree ("resolution_status","resolves_at");--> statement-breakpoint
CREATE UNIQUE INDEX "users_founding_member_number_idx" ON "users" USING btree ("founding_member_number") WHERE "users"."founding_member_number" is not null;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_invite_credits_range" CHECK ("users"."invite_credits" >= 0 AND "users"."invite_credits" <= 5);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_onboarding_step_check" CHECK ("onboarding_step" in ('profile', 'forecast', 'complete'));
--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_discovery_state_check" CHECK ("discovery_state" in ('featured', 'standard', 'hidden'));
--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_resolution_method_check" CHECK ("resolution_method" in ('manual', 'http_json'));
--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_resolution_status_check" CHECK ("resolution_status" in ('pending', 'review', 'resolving', 'resolved', 'failed'));
--> statement-breakpoint
ALTER TABLE "market_resolutions" ADD CONSTRAINT "market_resolutions_resolver_check" CHECK ("resolver" in ('admin', 'automation'));
--> statement-breakpoint
ALTER TABLE "early_access_applications" ADD CONSTRAINT "early_access_status_check" CHECK ("status" in ('pending', 'invited', 'joined', 'declined'));
--> statement-breakpoint
ALTER TABLE "early_access_applications" ADD CONSTRAINT "early_access_email_length_check" CHECK (length("email") <= 320);
--> statement-breakpoint
ALTER TABLE "growth_events" ADD CONSTRAINT "growth_events_name_length_check" CHECK (length("event") between 1 and 80);
--> statement-breakpoint

ALTER TABLE "early_access_applications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "growth_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invite_grants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "user_interests" ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE "early_access_applications" FROM anon, authenticated;
REVOKE ALL ON TABLE "growth_events" FROM anon, authenticated;
REVOKE ALL ON TABLE "invite_grants" FROM anon, authenticated;
REVOKE ALL ON TABLE "referrals" FROM anon, authenticated;
REVOKE ALL ON TABLE "user_interests" FROM anon, authenticated;

CREATE POLICY "early access admin read" ON "early_access_applications"
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = (SELECT auth.uid()) AND users.is_admin = true
  ));

CREATE POLICY "invite grants read own" ON "invite_grants"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "referrals read participant" ON "referrals"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = inviter_id OR (SELECT auth.uid()) = invitee_id);

CREATE POLICY "user interests read own" ON "user_interests"
  FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = user_id);

-- Existing members have already completed the old one-step onboarding.
UPDATE public.users
SET onboarding_step = 'complete'
WHERE onboarded_at IS NOT NULL;

-- Preserve the old test records but remove impossible early resolutions from discovery.
UPDATE public.markets
SET discovery_state = 'hidden', resolution_status = 'resolved'
WHERE resolved_at IS NOT NULL AND resolved_at < closes_at;

UPDATE public.markets
SET resolution_status = 'resolved'
WHERE resolved_at IS NOT NULL;

UPDATE public.markets
SET resolution_status = 'review'
WHERE resolved_at IS NULL AND resolves_at <= now();

-- Curate a tight launch shelf. Everything else remains searchable but does not
-- crowd the home feed.
UPDATE public.markets
SET discovery_state = 'featured'
WHERE resolved_at IS NULL
  AND closes_at > now()
  AND title IN (
    'Will Grand Theft Auto VI launch on consoles before December 1, 2026?',
    'Will Apple officially announce a foldable iPhone before November 1, 2026?',
    'Will Bitcoin close above $100,000 on any day before September 1, 2026?',
    'Will Beyoncé release ''Act III'' before September 1, 2026?',
    'Will ''Avengers: Doomsday'' gross $1B+ worldwide before January 1, 2027?',
    'Will Kendrick Lamar release a new studio album before January 1, 2027?',
    'Will OpenAI ship GPT-6 to the public before January 1, 2027?',
    'Will the Los Angeles Dodgers win the 2026 MLB World Series?',
    'Will a spot Solana ETF begin trading on a US exchange before December 1, 2026?',
    'Will Apple ship the redesigned Siri to consumers before October 1, 2026?',
    'Will ''The Bear'' win Outstanding Comedy Series at the 2026 Emmys?',
    'Will Tesla announce a paying commercial customer for Optimus before January 1, 2027?'
  );

UPDATE public.markets
SET onboarding_rank = CASE title
  WHEN 'Will Bitcoin close above $100,000 on any day before September 1, 2026?' THEN 1
  WHEN 'Will Grand Theft Auto VI launch on consoles before December 1, 2026?' THEN 2
  WHEN 'Will Beyoncé release ''Act III'' before September 1, 2026?' THEN 3
  WHEN 'Will Apple officially announce a foldable iPhone before November 1, 2026?' THEN 4
  WHEN 'Will ''Avengers: Doomsday'' gross $1B+ worldwide before January 1, 2027?' THEN 5
  WHEN 'Will OpenAI ship GPT-6 to the public before January 1, 2027?' THEN 6
  ELSE onboarding_rank
END
WHERE title IN (
  'Will Bitcoin close above $100,000 on any day before September 1, 2026?',
  'Will Grand Theft Auto VI launch on consoles before December 1, 2026?',
  'Will Beyoncé release ''Act III'' before September 1, 2026?',
  'Will Apple officially announce a foldable iPhone before November 1, 2026?',
  'Will ''Avengers: Doomsday'' gross $1B+ worldwide before January 1, 2027?',
  'Will OpenAI ship GPT-6 to the public before January 1, 2027?'
);

-- Backfill at most five invite grants from each member's first call on a
-- distinct market. Re-predicting the same market never farms invitations.
WITH first_calls AS (
  SELECT DISTINCT ON (p.user_id, p.market_id)
    p.user_id, p.market_id, p.id AS prediction_id, p.created_at
  FROM public.predictions p
  JOIN public.markets m ON m.id = p.market_id
  WHERE p.created_at < m.closes_at
    AND (m.resolved_at IS NULL OR p.created_at < m.resolved_at)
  ORDER BY p.user_id, p.market_id, p.created_at
), ranked AS (
  SELECT *, row_number() OVER (PARTITION BY user_id ORDER BY created_at) AS rn
  FROM first_calls
)
INSERT INTO public.invite_grants (user_id, market_id, prediction_id, granted_at)
SELECT user_id, market_id, prediction_id, created_at
FROM ranked
WHERE rn <= 5
ON CONFLICT DO NOTHING;

UPDATE public.users u
SET invite_credits = LEAST(5, (
  SELECT count(*)::integer FROM public.invite_grants g WHERE g.user_id = u.id
));
