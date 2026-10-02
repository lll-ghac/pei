CREATE TABLE "observaciones" (
	"id" serial PRIMARY KEY NOT NULL,
	"estamento" text NOT NULL,
	"pregunta" text NOT NULL,
	"autor_id" integer NOT NULL,
	"texto" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	"resuelta" boolean DEFAULT false NOT NULL,
	"resuelta_por" text
);
--> statement-breakpoint
ALTER TABLE "observaciones" ADD CONSTRAINT "observaciones_autor_id_gestores_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."gestores"("id") ON DELETE no action ON UPDATE no action;