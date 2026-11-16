CREATE TABLE "goal_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"goal_id" uuid NOT NULL,
	"account_id" uuid,
	"investment_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "goal_links_single_item_check" CHECK (("goal_links"."account_id" is not null and "goal_links"."investment_id" is null) or ("goal_links"."account_id" is null and "goal_links"."investment_id" is not null))
);
--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_goal_id_goals_id_fk" FOREIGN KEY ("goal_id") REFERENCES "public"."goals"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goal_links" ADD CONSTRAINT "goal_links_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "goal_links_goal_id_idx" ON "goal_links" USING btree ("goal_id");--> statement-breakpoint
CREATE UNIQUE INDEX "goal_links_goal_id_account_id_key" ON "goal_links" USING btree ("goal_id","account_id") WHERE "goal_links"."account_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "goal_links_goal_id_investment_id_key" ON "goal_links" USING btree ("goal_id","investment_id") WHERE "goal_links"."investment_id" is not null;