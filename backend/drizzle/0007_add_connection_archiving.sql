ALTER TABLE "connections" DROP CONSTRAINT "connections_status_check";--> statement-breakpoint
ALTER TABLE "connections" ADD COLUMN "archived_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_status_check" CHECK ("connections"."status" in ('ok', 'syncing', 'error', 'consent_expired', 'item_not_found'));