ALTER TABLE "investments" ADD COLUMN "subtype" text;--> statement-breakpoint
UPDATE "investments" SET "subtype" = "raw"->>'subtype' WHERE "raw"->>'subtype' IS NOT NULL;