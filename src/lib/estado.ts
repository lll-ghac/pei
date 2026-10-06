import "server-only";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export type Modo = "prueba" | "oficial";

export type Estado = {
  modo: Modo;
  /** Periodo oficial abierto (en modo Prueba siempre se puede responder). */
  abierta: boolean;
  /**
   * Encuesta cerrada: no se puede responder y se abren los resultados para la comisión.
   * En Prueba se puede reabrir para seguir ensayando; en Oficial el cierre es definitivo.
   */
  cerrada: boolean;
  funcionariosTotal: number;
  /** Página pública /resultados visible para la comunidad (la publica o retira la administración). */
  publicados: boolean;
};

const POR_DEFECTO: Estado = { modo: "prueba", abierta: false, cerrada: false, funcionariosTotal: 120, publicados: false };

export async function leerEstado(): Promise<Estado> {
  const filas = await db.select().from(schema.ajustes);
  const mapa = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  return { ...POR_DEFECTO, ...(mapa.estado as Partial<Estado> | undefined) };
}

export async function guardarEstado(cambios: Partial<Estado>) {
  const nuevo = { ...(await leerEstado()), ...cambios };
  await db
    .insert(schema.ajustes)
    .values({ clave: "estado", valor: nuevo })
    .onConflictDoUpdate({ target: schema.ajustes.clave, set: { valor: nuevo } });
  return nuevo;
}

/** ¿Se puede responder ahora con una credencial de prueba u oficial? */
export function puedeResponder(estado: Estado, credencialDePrueba: boolean) {
  if (estado.cerrada) return false;
  if (estado.modo === "prueba") return credencialDePrueba;
  return !credencialDePrueba && estado.abierta;
}

/** Texto de contacto de la Ayuda (editable por la administración). */
export const CONTACTO_POR_DEFECTO =
  "¿Problemas con su papeleta? Hable con su profesor jefe o con alguien de la comisión del PEI.";

export async function leerContacto(): Promise<string> {
  const [fila] = await db.select().from(schema.ajustes).where(eq(schema.ajustes.clave, "contacto"));
  const texto = (fila?.valor as { texto?: string } | undefined)?.texto?.trim();
  return texto || CONTACTO_POR_DEFECTO;
}

export async function guardarContacto(texto: string) {
  const valor = { texto };
  await db
    .insert(schema.ajustes)
    .values({ clave: "contacto", valor })
    .onConflictDoUpdate({ target: schema.ajustes.clave, set: { valor } });
}

export async function registrar(actor: string, accion: string, detalle?: string) {
  await db.insert(schema.bitacora).values({ actor, accion, detalle });
}

export async function existeGestor() {
  const [fila] = await db.select({ id: schema.gestores.id }).from(schema.gestores).limit(1);
  return Boolean(fila);
}

export async function gestorPorId(id: number) {
  const [g] = await db.select().from(schema.gestores).where(eq(schema.gestores.id, id));
  return g && g.activo ? g : null;
}
