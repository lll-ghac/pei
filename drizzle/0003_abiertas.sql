CREATE TABLE "nombres_personal" (
	"id" serial PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	CONSTRAINT "nombres_personal_nombre_unique" UNIQUE("nombre")
);
--> statement-breakpoint
CREATE TABLE "temas" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"descripcion" text DEFAULT '' NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"orden" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "textos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"respuesta_id" uuid NOT NULL,
	"pregunta" text NOT NULL,
	"estamento" text NOT NULL,
	"estado" text DEFAULT 'pendiente' NOT NULL,
	"tema_1" text,
	"tema_2" text,
	"tema_3" text,
	"tema_nuevo" text,
	"cita" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "textos" ADD CONSTRAINT "textos_respuesta_id_respuestas_id_fk" FOREIGN KEY ("respuesta_id") REFERENCES "public"."respuestas"("id") ON DELETE cascade ON UPDATE no action;