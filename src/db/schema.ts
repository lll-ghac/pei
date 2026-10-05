// Esquema de la base de datos.
// Anonimato estructural (MVP, "padrón separado de la urna"):
// - `credenciales` (padrón) sabe SI una credencial respondió, nunca QUÉ respondió.
// - `respuestas` (urna) guarda QUÉ se respondió, sin credencial, sin fecha ni hora
//   y con un UUID aleatorio que no revela el orden de envío.
// Ninguna columna vincula ambas tablas.
import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  integer,
  jsonb,
  pgTable,
  serial,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const cursos = pgTable("cursos", {
  /** Prefijo del usuario: PKA, 1A, OP4-2B… */
  codigo: text("codigo").primaryKey(),
  nombre: text("nombre").notNull(),
  nivel: text("nivel").notNull(), // parvularia | basica_1_4 | basica_5_8 | opcion4
  orden: integer("orden").notNull(),
  matricula: integer("matricula").notNull().default(0),
  tieneEstudiantes: boolean("tiene_estudiantes").notNull().default(false),
  activo: boolean("activo").notNull().default(true),
  /** Papeletas de apoderados entregadas (lo informa el profesor jefe); base del porcentaje. */
  papeletasApoderados: integer("papeletas_apoderados"),
});

export const lotes = pgTable("lotes", {
  id: serial("id").primaryKey(),
  cursoCodigo: text("curso_codigo").references(() => cursos.codigo),
  estamento: text("estamento").notNull(), // A | E | F
  prueba: boolean("prueba").notNull(),
  cantidad: integer("cantidad").notNull(),
  creadoPor: text("creado_por").notNull(),
  creado: timestamp("creado", { withTimezone: true }).notNull().defaultNow(),
});

/** Padrón: una fila por credencial. */
export const credenciales = pgTable("credenciales", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull().unique(),
  /**
   * La contraseña se guarda en claro para poder reimprimir las papeletas de un lote:
   * la credencial no identifica a nadie (se reparte al azar desde una bolsa).
   */
  clave: text("clave").notNull(),
  cursoCodigo: text("curso_codigo").references(() => cursos.codigo),
  estamento: text("estamento").notNull(), // A | E | F
  prueba: boolean("prueba").notNull(),
  loteId: integer("lote_id").references(() => lotes.id),
  estado: text("estado").notNull().default("sin_usar"), // sin_usar | usada | desactivada
  /** Solo el día de uso (participación por día); nunca la hora. */
  usadaEl: date("usada_el"),
  /**
   * Número aleatorio que el navegador genera al depositar. Permite reconocer un reintento del mismo
   * envío (si la respuesta se perdió en el camino). Solo vive en el padrón; la urna no lo tiene.
   */
  envioId: text("envio_id"),
  intentosFallidos: integer("intentos_fallidos").notNull().default(0),
  bloqueadaHasta: timestamp("bloqueada_hasta", { withTimezone: true }),
});

/** Urna: una fila por encuesta enviada. Sin fecha, sin hora, sin credencial. */
export const respuestas = pgTable("respuestas", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  estamento: text("estamento").notNull(),
  cursoCodigo: text("curso_codigo"), // vacío en funcionarios
  prueba: boolean("prueba").notNull(),
  datos: jsonb("datos").notNull(),
});

/** Cuentas de gestión (administrador y comisión). */
export const gestores = pgTable("gestores", {
  id: serial("id").primaryKey(),
  usuario: text("usuario").notNull().unique(),
  nombre: text("nombre").notNull(),
  rol: text("rol").notNull(), // admin | comision
  claveHash: text("clave_hash").notNull(),
  activo: boolean("activo").notNull().default(true),
  creado: timestamp("creado", { withTimezone: true }).notNull().defaultNow(),
});

/** Ajustes generales (modo, periodo, total de funcionarios). */
export const ajustes = pgTable("ajustes", {
  clave: text("clave").primaryKey(),
  valor: jsonb("valor").notNull(),
});

/** Bitácora del proceso (Anexo E del informe). Nunca guarda IP ni credenciales. */
export const bitacora = pgTable("bitacora", {
  id: serial("id").primaryKey(),
  fecha: timestamp("fecha", { withTimezone: true }).notNull().defaultNow(),
  actor: text("actor").notNull(),
  accion: text("accion").notNull(),
  detalle: text("detalle"),
});

/** Observaciones de la comisión sobre la redacción de las encuestas (revisión previa). */
export const observaciones = pgTable("observaciones", {
  id: serial("id").primaryKey(),
  estamento: text("estamento").notNull(), // A | E | F
  /** Código de la pregunta (A5, E7…) o "intro" para la introducción. */
  pregunta: text("pregunta").notNull(),
  autorId: integer("autor_id")
    .notNull()
    .references(() => gestores.id),
  texto: text("texto").notNull(),
  creado: timestamp("creado", { withTimezone: true }).notNull().defaultNow(),
  resuelta: boolean("resuelta").notNull().default(false),
  resueltaPor: text("resuelta_por"),
});
