CREATE TABLE "goal_contributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"date" date NOT NULL,
	"amount_cents" bigint NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_contributions_amount_not_zero_check" CHECK ("goal_contributions"."amount_cents" <> 0),
	CONSTRAINT "goal_contributions_kind_check" CHECK ("goal_contributions"."kind" in ('initial', 'deposit', 'withdrawal')),
	CONSTRAINT "goal_contributions_kind_sign_check" CHECK (("goal_contributions"."kind" = 'withdrawal' and "goal_contributions"."amount_cents" < 0) or ("goal_contributions"."kind" <> 'withdrawal' and "goal_contributions"."amount_cents" > 0))
);
--> statement-breakpoint
CREATE TABLE "goals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"icon" text NOT NULL,
	"target_cents" bigint NOT NULL,
	"saved_cents" bigint DEFAULT 0 NOT NULL,
	"target_date" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goals_target_positive_check" CHECK ("goals"."target_cents" > 0),
	CONSTRAINT "goals_saved_not_negative_check" CHECK ("goals"."saved_cents" >= 0)
);
--> statement-breakpoint
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_contributions_goal_id_date_idx" ON "goal_contributions" USING btree ("goal_id","date");