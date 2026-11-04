CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid,
	"pluggy_account_id" text,
	"type" text NOT NULL,
	"name" text NOT NULL,
	"number_last_digits" text,
	"balance_cents" bigint,
	"credit_limit_cents" bigint,
	"available_limit_cents" bigint,
	"is_hidden" boolean DEFAULT false NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "accounts_type_check" CHECK ("accounts"."type" in ('checking', 'savings', 'credit_card', 'cash'))
);
--> statement-breakpoint
CREATE TABLE "balance_snapshots" (
	"account_id" uuid NOT NULL,
	"date" date NOT NULL,
	"balance_cents" bigint NOT NULL,
	CONSTRAINT "balance_snapshots_account_id_date_pk" PRIMARY KEY("account_id","date")
);
--> statement-breakpoint
CREATE TABLE "budgets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category_id" uuid NOT NULL,
	"month" date NOT NULL,
	"limit_cents" bigint NOT NULL,
	CONSTRAINT "budgets_category_id_month_key" UNIQUE("category_id","month"),
	CONSTRAINT "budgets_month_first_day_check" CHECK (extract(day from "budgets"."month") = 1)
);
--> statement-breakpoint
CREATE TABLE "categories" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text NOT NULL,
	"icon" text NOT NULL,
	"is_archived" boolean DEFAULT false NOT NULL,
	CONSTRAINT "categories_name_unique" UNIQUE("name"),
	CONSTRAINT "categories_kind_check" CHECK ("categories"."kind" in ('expense', 'income', 'transfer'))
);
--> statement-breakpoint
CREATE TABLE "category_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pattern" text NOT NULL,
	"match_type" text NOT NULL,
	"category_id" uuid NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"learned_from_transaction_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "category_rules_match_type_check" CHECK ("category_rules"."match_type" in ('contains', 'starts_with', 'equals'))
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"pluggy_item_id" text NOT NULL,
	"institution_name" text NOT NULL,
	"institution_logo_url" text,
	"status" text DEFAULT 'ok' NOT NULL,
	"status_detail" text,
	"last_synced_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "connections_pluggy_item_id_unique" UNIQUE("pluggy_item_id"),
	CONSTRAINT "connections_status_check" CHECK ("connections"."status" in ('ok', 'syncing', 'error', 'consent_expired'))
);
--> statement-breakpoint
CREATE TABLE "investment_snapshots" (
	"investment_id" uuid NOT NULL,
	"date" date NOT NULL,
	"balance_cents" bigint NOT NULL,
	CONSTRAINT "investment_snapshots_investment_id_date_pk" PRIMARY KEY("investment_id","date")
);
--> statement-breakpoint
CREATE TABLE "investments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"connection_id" uuid NOT NULL,
	"pluggy_investment_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"balance_cents" bigint NOT NULL,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "investments_pluggy_investment_id_unique" UNIQUE("pluggy_investment_id")
);
--> statement-breakpoint
CREATE TABLE "pluggy_category_mappings" (
	"pluggy_category" text PRIMARY KEY NOT NULL,
	"category_id" uuid NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trigger" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	"finished_at" timestamp with time zone,
	"stats" jsonb,
	"error_message" text,
	CONSTRAINT "sync_runs_trigger_check" CHECK ("sync_runs"."trigger" in ('schedule', 'manual')),
	CONSTRAINT "sync_runs_status_check" CHECK ("sync_runs"."status" in ('running', 'success', 'partial', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"pluggy_transaction_id" text,
	"source" text NOT NULL,
	"date" date NOT NULL,
	"description" text NOT NULL,
	"description_normalized" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"status" text NOT NULL,
	"pluggy_category" text,
	"category_id" uuid,
	"category_source" text DEFAULT 'none' NOT NULL,
	"installment_number" integer,
	"installment_total" integer,
	"possible_duplicate_of_id" uuid,
	"raw" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "transactions_source_check" CHECK ("transactions"."source" in ('open_finance', 'manual')),
	CONSTRAINT "transactions_status_check" CHECK ("transactions"."status" in ('pending', 'posted')),
	CONSTRAINT "transactions_category_source_check" CHECK ("transactions"."category_source" in ('user', 'rule', 'pluggy', 'none'))
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "balance_snapshots" ADD CONSTRAINT "balance_snapshots_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "category_rules" ADD CONSTRAINT "category_rules_learned_from_transaction_id_transactions_id_fk" FOREIGN KEY ("learned_from_transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investment_snapshots" ADD CONSTRAINT "investment_snapshots_investment_id_investments_id_fk" FOREIGN KEY ("investment_id") REFERENCES "public"."investments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "investments" ADD CONSTRAINT "investments_connection_id_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."connections"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pluggy_category_mappings" ADD CONSTRAINT "pluggy_category_mappings_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_possible_duplicate_of_id_transactions_id_fk" FOREIGN KEY ("possible_duplicate_of_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "accounts_pluggy_account_id_key" ON "accounts" USING btree ("pluggy_account_id") WHERE "accounts"."pluggy_account_id" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "transactions_pluggy_transaction_id_key" ON "transactions" USING btree ("pluggy_transaction_id") WHERE "transactions"."pluggy_transaction_id" is not null;--> statement-breakpoint
CREATE INDEX "transactions_account_id_date_idx" ON "transactions" USING btree ("account_id","date");--> statement-breakpoint
CREATE INDEX "transactions_category_id_date_idx" ON "transactions" USING btree ("category_id","date");--> statement-breakpoint
CREATE INDEX "transactions_date_idx" ON "transactions" USING btree ("date");--> statement-breakpoint
CREATE INDEX "transactions_source_idx" ON "transactions" USING btree ("source");