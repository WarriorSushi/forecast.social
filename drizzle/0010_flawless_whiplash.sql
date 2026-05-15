CREATE TABLE "market_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_slug" text NOT NULL,
	"proposed_by" uuid NOT NULL,
	"resolution_source" text,
	"closes_at" timestamp with time zone NOT NULL,
	"resolves_at" timestamp with time zone NOT NULL,
	"rationale" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"reviewed_by" uuid,
	"reviewed_at" timestamp with time zone,
	"rejection_reason" text,
	"approved_market_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "market_proposals_closes_before_resolves" CHECK ("market_proposals"."closes_at" <= "market_proposals"."resolves_at")
);
--> statement-breakpoint
ALTER TABLE "market_proposals" ADD CONSTRAINT "market_proposals_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_proposals" ADD CONSTRAINT "market_proposals_proposed_by_users_id_fk" FOREIGN KEY ("proposed_by") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_proposals" ADD CONSTRAINT "market_proposals_reviewed_by_users_id_fk" FOREIGN KEY ("reviewed_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_proposals" ADD CONSTRAINT "market_proposals_approved_market_id_markets_id_fk" FOREIGN KEY ("approved_market_id") REFERENCES "public"."markets"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_proposals_status_created_idx" ON "market_proposals" USING btree ("status","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "market_proposals_proposer_created_idx" ON "market_proposals" USING btree ("proposed_by","created_at" DESC NULLS LAST);