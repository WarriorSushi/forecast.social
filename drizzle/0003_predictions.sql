CREATE TABLE "predictions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"market_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"probability" real NOT NULL,
	"consensus_at_time" real,
	"brier" real,
	"was_correct" boolean,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"resolved_at" timestamp with time zone,
	CONSTRAINT "predictions_probability_range" CHECK ("predictions"."probability" >= 0 AND "predictions"."probability" <= 1)
);
--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_market_id_markets_id_fk" FOREIGN KEY ("market_id") REFERENCES "public"."markets"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "predictions" ADD CONSTRAINT "predictions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "predictions_market_user_created_idx" ON "predictions" USING btree ("market_id","user_id","created_at");--> statement-breakpoint
CREATE INDEX "predictions_user_created_idx" ON "predictions" USING btree ("user_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "predictions_market_created_idx" ON "predictions" USING btree ("market_id","created_at" DESC NULLS LAST);