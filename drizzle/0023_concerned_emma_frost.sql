CREATE TABLE "registration_intents" (
	"token" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "registration_intents_email_normalized" CHECK ("registration_intents"."email" = lower(trim("registration_intents"."email")))
);
--> statement-breakpoint
ALTER TABLE "markets" ADD COLUMN "resolution_locked_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "notifications" ADD COLUMN "dedupe_key" text;--> statement-breakpoint
CREATE INDEX "registration_intents_expires_idx" ON "registration_intents" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "notifications_dedupe_key_idx" ON "notifications" USING btree ("dedupe_key");--> statement-breakpoint
UPDATE "users"
SET "founding_member_since" = null
WHERE "founding_member_number" is null
  AND "founding_member_since" is not null;--> statement-breakpoint
UPDATE public.user_category_scores
SET score = 0,
    updated_at = now()
WHERE resolved_count < 5
  AND score <> 0;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_founding_member_number_range" CHECK ("users"."founding_member_number" is null OR ("users"."founding_member_number" >= 1 AND "users"."founding_member_number" <= 250));--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_founding_member_since_consistency" CHECK ("users"."founding_member_since" is null OR "users"."founding_member_number" is not null);--> statement-breakpoint

-- Signup admission is enforced where identities are created, not only in the
-- application action. A valid ticket is single-use, short-lived, and bound to
-- the normalized email address.
ALTER TABLE public.registration_intents ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
REVOKE ALL ON TABLE public.registration_intents FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT, DELETE ON TABLE public.registration_intents TO supabase_auth_admin;--> statement-breakpoint
CREATE POLICY "Auth can inspect registration intents"
  ON public.registration_intents FOR SELECT TO supabase_auth_admin
  USING (true);--> statement-breakpoint
CREATE POLICY "Auth can consume registration intents"
  ON public.registration_intents FOR DELETE TO supabase_auth_admin
  USING (true);--> statement-breakpoint

CREATE OR REPLACE FUNCTION public.enforce_registration_intent()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  consumed_token text;
BEGIN
  DELETE FROM public.registration_intents
  WHERE token = coalesce(NEW.raw_user_meta_data ->> 'registration_intent', '')
    AND email = lower(trim(NEW.email))
    AND expires_at > now()
  RETURNING token INTO consumed_token;

  IF consumed_token IS NULL THEN
    RAISE EXCEPTION 'Signup must begin at forecast.social.';
  END IF;

  NEW.raw_user_meta_data = coalesce(NEW.raw_user_meta_data, '{}'::jsonb)
    - 'registration_intent';
  RETURN NEW;
END;
$$;--> statement-breakpoint
REVOKE ALL ON FUNCTION public.enforce_registration_intent() FROM PUBLIC, anon, authenticated;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.enforce_registration_intent() TO supabase_auth_admin;--> statement-breakpoint
DROP TRIGGER IF EXISTS enforce_registration_intent_before_insert ON auth.users;--> statement-breakpoint
CREATE TRIGGER enforce_registration_intent_before_insert
  BEFORE INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.enforce_registration_intent();--> statement-breakpoint

-- Resolver configuration and raw evidence are operational data. The app's
-- server connection can still read them; public Data API callers receive only
-- the columns that are part of the market contract.
REVOKE SELECT ON TABLE public.markets FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT (
  id, slug, title, description, category_slug, created_by,
  resolution_source, closes_at, resolves_at, resolved_at, outcome,
  prediction_count, consensus_probability, discovery_state, onboarding_rank,
  resolution_method, resolution_status, created_at, updated_at
) ON TABLE public.markets TO anon, authenticated;--> statement-breakpoint
REVOKE SELECT ON TABLE public.market_resolutions FROM anon, authenticated;--> statement-breakpoint
GRANT SELECT (
  id, market_id, outcome, resolved_by, resolver, notes, resolved_at
) ON TABLE public.market_resolutions TO anon, authenticated;--> statement-breakpoint

-- Serialize inserts per market before calculating the latest-call aggregate.
-- Without this lock, concurrent inserts can each publish a stale consensus.
CREATE OR REPLACE FUNCTION public.recompute_market_consensus()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  new_consensus real;
  new_count int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.market_id::text, 0));

  WITH latest_per_user AS (
    SELECT DISTINCT ON (user_id) probability
    FROM public.predictions
    WHERE market_id = NEW.market_id
    ORDER BY user_id, created_at DESC, id DESC
  )
  SELECT avg(probability)::real INTO new_consensus
  FROM latest_per_user;

  SELECT count(*) INTO new_count
  FROM public.predictions
  WHERE market_id = NEW.market_id;

  UPDATE public.markets
  SET consensus_probability = new_consensus,
      prediction_count = new_count,
      updated_at = now()
  WHERE id = NEW.market_id;

  UPDATE public.users
  SET total_predictions = total_predictions + 1,
      updated_at = now()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$;
