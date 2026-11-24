ALTER TABLE "alerts" DROP CONSTRAINT "alerts_type_check";--> statement-breakpoint
ALTER TABLE "accounts" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "investments" ADD COLUMN "created_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "alerts" ADD CONSTRAINT "alerts_type_check" CHECK ("alerts"."type" in ('duplicate_charge', 'subscription_detected', 'budget_warning', 'budget_exceeded', 'connection_error', 'year_end_snapshot_pending', 'year_end_snapshot_missing'));