CREATE TABLE "dismissed_rule_suggestions" (
	"pattern" text NOT NULL,
	"category_id" uuid NOT NULL,
	"dismissed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "dismissed_rule_suggestions_pattern_category_id_pk" PRIMARY KEY("pattern","category_id")
);
--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "reviewed_at" timestamp with time zone;--> statement-breakpoint
-- A carga que já existe entra revisada: a caixa "Para revisar" começa vazia, não com meses de fila.
UPDATE "transactions" SET "reviewed_at" = now();--> statement-breakpoint
ALTER TABLE "dismissed_rule_suggestions" ADD CONSTRAINT "dismissed_rule_suggestions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "transactions_unreviewed_idx" ON "transactions" USING btree ("date") WHERE "transactions"."reviewed_at" is null;