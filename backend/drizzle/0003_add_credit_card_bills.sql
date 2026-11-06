CREATE TABLE "credit_card_bills" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"pluggy_bill_id" text NOT NULL,
	"due_date" date NOT NULL,
	"closing_date" date,
	"total_cents" bigint NOT NULL,
	"paid_cents" bigint DEFAULT 0 NOT NULL,
	"minimum_payment_cents" bigint,
	"raw" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "credit_card_bills_pluggy_bill_id_unique" UNIQUE("pluggy_bill_id")
);
--> statement-breakpoint
ALTER TABLE "credit_card_bills" ADD CONSTRAINT "credit_card_bills_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "credit_card_bills_account_id_due_date_idx" ON "credit_card_bills" USING btree ("account_id","due_date");