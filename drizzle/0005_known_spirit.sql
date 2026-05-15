CREATE TABLE "user_category_scores" (
	"user_id" uuid NOT NULL,
	"category_slug" text NOT NULL,
	"score" integer DEFAULT 0 NOT NULL,
	"resolved_count" integer DEFAULT 0 NOT NULL,
	"correct_count" integer DEFAULT 0 NOT NULL,
	"avg_brier" real,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "user_category_scores_user_id_category_slug_pk" PRIMARY KEY("user_id","category_slug")
);
--> statement-breakpoint
ALTER TABLE "user_category_scores" ADD CONSTRAINT "user_category_scores_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_category_scores" ADD CONSTRAINT "user_category_scores_category_slug_categories_slug_fk" FOREIGN KEY ("category_slug") REFERENCES "public"."categories"("slug") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_category_scores_category_score_idx" ON "user_category_scores" USING btree ("category_slug","score" DESC NULLS LAST);