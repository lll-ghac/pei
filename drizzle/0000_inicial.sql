CREATE TABLE "ajustes" (
	"clave" text PRIMARY KEY NOT NULL,
	"valor" jsonb NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bitacora" (
	"id" serial PRIMARY KEY NOT NULL,
	"fecha" timestamp with time zone DEFAULT now() NOT NULL,
	"actor" text NOT NULL,
	"accion" text NOT NULL,
	"detalle" text
);
--> statement-breakpoint
CREATE TABLE "credenciales" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"clave" text NOT NULL,
	"curso_codigo" text,
	"estamento" text NOT NULL,
	"prueba" boolean NOT NULL,
	"lote_id" integer,
	"estado" text DEFAULT 'sin_usar' NOT NULL,
	"usada_el" date,
	"intentos_fallidos" integer DEFAULT 0 NOT NULL,
	"bloqueada_hasta" timestamp with time zone,
	CONSTRAINT "credenciales_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
CREATE TABLE "cursos" (
	"codigo" text PRIMARY KEY NOT NULL,
	"nombre" text NOT NULL,
	"nivel" text NOT NULL,
	"orden" integer NOT NULL,
	"matricula" integer DEFAULT 0 NOT NULL,
	"tiene_estudiantes" boolean DEFAULT false NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"papeletas_apoderados" integer
);
--> statement-breakpoint
CREATE TABLE "gestores" (
	"id" serial PRIMARY KEY NOT NULL,
	"usuario" text NOT NULL,
	"nombre" text NOT NULL,
	"rol" text NOT NULL,
	"clave_hash" text NOT NULL,
	"activo" boolean DEFAULT true NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "gestores_usuario_unique" UNIQUE("usuario")
);
--> statement-breakpoint
CREATE TABLE "lotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"curso_codigo" text,
	"estamento" text NOT NULL,
	"prueba" boolean NOT NULL,
	"cantidad" integer NOT NULL,
	"creado_por" text NOT NULL,
	"creado" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "respuestas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"estamento" text NOT NULL,
	"curso_codigo" text,
	"prueba" boolean NOT NULL,
	"datos" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credenciales" ADD CONSTRAINT "credenciales_curso_codigo_cursos_codigo_fk" FOREIGN KEY ("curso_codigo") REFERENCES "public"."cursos"("codigo") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credenciales" ADD CONSTRAINT "credenciales_lote_id_lotes_id_fk" FOREIGN KEY ("lote_id") REFERENCES "public"."lotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "lotes" ADD CONSTRAINT "lotes_curso_codigo_cursos_codigo_fk" FOREIGN KEY ("curso_codigo") REFERENCES "public"."cursos"("codigo") ON DELETE no action ON UPDATE no action;