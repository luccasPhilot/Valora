CREATE TABLE "planned_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"description" text NOT NULL,
	"amount_cents" bigint NOT NULL,
	"category_id" uuid NOT NULL,
	"day_of_month" integer NOT NULL,
	"recurrence" text NOT NULL,
	"start_month" date NOT NULL,
	"end_month" date,
	"is_active" boolean DEFAULT true NOT NULL,
	CONSTRAINT "planned_entries_amount_not_zero_check" CHECK ("planned_entries"."amount_cents" <> 0),
	CONSTRAINT "planned_entries_day_of_month_check" CHECK ("planned_entries"."day_of_month" between 1 and 31),
	CONSTRAINT "planned_entries_recurrence_check" CHECK ("planned_entries"."recurrence" in ('none', 'monthly', 'yearly')),
	CONSTRAINT "planned_entries_start_month_first_day_check" CHECK (extract(day from "planned_entries"."start_month") = 1),
	CONSTRAINT "planned_entries_end_month_check" CHECK ("planned_entries"."end_month" is null or (extract(day from "planned_entries"."end_month") = 1 and "planned_entries"."end_month" >= "planned_entries"."start_month"))
);
--> statement-breakpoint
CREATE TABLE "planned_entry_occurrences" (
	"planned_entry_id" uuid NOT NULL,
	"month" date NOT NULL,
	"status" text NOT NULL,
	"transaction_id" uuid,
	"decided_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "planned_entry_occurrences_planned_entry_id_month_pk" PRIMARY KEY("planned_entry_id","month"),
	CONSTRAINT "planned_entry_occurrences_status_check" CHECK ("planned_entry_occurrences"."status" in ('realized', 'skipped')),
	CONSTRAINT "planned_entry_occurrences_month_first_day_check" CHECK (extract(day from "planned_entry_occurrences"."month") = 1),
	CONSTRAINT "planned_entry_occurrences_skipped_without_transaction_check" CHECK ("planned_entry_occurrences"."status" <> 'skipped' or "planned_entry_occurrences"."transaction_id" is null)
);
--> statement-breakpoint
ALTER TABLE "planned_entries" ADD CONSTRAINT "planned_entries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_entry_occurrences" ADD CONSTRAINT "planned_entry_occurrences_planned_entry_id_planned_entries_id_fk" FOREIGN KEY ("planned_entry_id") REFERENCES "public"."planned_entries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "planned_entry_occurrences" ADD CONSTRAINT "planned_entry_occurrences_transaction_id_transactions_id_fk" FOREIGN KEY ("transaction_id") REFERENCES "public"."transactions"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "planned_entry_occurrences_transaction_id_key" ON "planned_entry_occurrences" USING btree ("transaction_id") WHERE "planned_entry_occurrences"."transaction_id" is not null;