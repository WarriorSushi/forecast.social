CREATE TABLE "market_resolutions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"outcome" text NOT NULL,
	"resolved_by" uuid NOT NULL,
	"notes" text,
	"resolved_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "markets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"description" text NOT NULL,
	"category_slug" text NOT NULL,
	"created_by" uuid NOT NULL,
	"resolution_source" text,
	"closes_at" timestamp with time zone NOT NULL,
	"resolves_at" timestamp with time zone NOT NULL,
	"resolved_at" timestamp with time zone,
	"outcome" text,
	"prediction_count" integer DEFAULT 0 NOT NULL,
	"consensus_probability" real,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "markets_slug_unique" UNIQUE("slug"),
	CONSTRAINT "markets_closes_before_resolves" CHECK ("markets"."closes_at" <= "markets"."resolves_at")
);
--> statement-breakpoint
ALTER TABLE "market_resolutions" ADD CONSTRAINT "market_resolutions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "market_resolutions" ADD CONSTRAINT "market_resolutions_resolved_by_users_id_fk" FOREIGN KEY ("resolved_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "markets" ADD CONSTRAINT "markets_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "market_resolutions_market_idx" ON "market_resolutions" USING btree ("market_id");--> statement-breakpoint
CREATE INDEX "markets_category_closes_idx" ON "markets" USING btree ("category_slug","closes_at");--> statement-breakpoint
CREATE INDEX "markets_resolves_at_idx" ON "markets" USING btree ("resolves_at");--> statement-breakpoint
CREATE INDEX "markets_created_at_idx" ON "markets" USING btree ("created_at" DESC NULLS LAST);