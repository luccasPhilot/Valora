ALTER TABLE "categories" ADD COLUMN "seed_key" text;--> statement-breakpoint
ALTER TABLE "categories" ADD CONSTRAINT "categories_seed_key_unique" UNIQUE("seed_key");