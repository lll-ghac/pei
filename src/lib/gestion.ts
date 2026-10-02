import "server-only";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync } from "node:zlib";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { aleatorio } from "./cripto";
import type { Estamento } from "./encuestas";
import { leerEstado } from "./estado";
import { gestorActual } from "./sesion";

export type Rol = "admin" | "comision";

/** Exige una sesión de gestión; si se pide "admin", la comisión no pasa. */
export async function exigirGestor(rol?: Rol) {
  const g = await gestorActual();
  if (!g) redirect("/gestion/ingreso");
  if (rol === "admin" && g.rol !== "admin") redirect("/gestion?error=permiso");
  return g;
}

/** Usuario de la credencial: 5A-K7P3, FUN-M2X9; con PRUEBA- delante si es de prueba. */
function prefijo(curso: string | null, estamento: Estamento, prueba: boolean) {
  const base = estamento === "F" ? "FUN" : curso!;
  return `${prueba ? "PRUEBA-" : ""}${base}-`;
}

export async function generarLote(opciones: {
  curso: string | null;
  estamento: Estamento;
  cantidad: number;
  prueba: boolean;
  autor: string;
}) {
  const { curso, estamento, cantidad, prueba, autor } = opciones;
  const pre = prefijo(curso, estamento, prueba);
  const existentes = new Set(
    (
      await db
        .select({ u: schema.credenciales.usuario })
        .from(schema.credenciales)
        .where(like(schema.credenciales.usuario, `${pre}%`))
    ).map((r) => r.u),
  );
  const nuevas: string[] = [];
  while (nuevas.length < cantidad) {
    const u = pre + aleatorio(4);
    if (!existentes.has(u)) {
      existentes.add(u);
      nuevas.push(u);
    }
  }

  return db.transaction(async (tx) => {
    const [lote] = await tx
      .insert(schema.lotes)
      .values({ cursoCodigo: curso, estamento, prueba, cantidad, creadoPor: autor })
      .returning();
    await tx.insert(schema.credenciales).values(
      nuevas.map((usuario) => ({
        usuario,
        clave: aleatorio(6),
        cursoCodigo: curso,
        estamento,
        prueba,
        loteId: lote.id,
      })),
    );
    await tx.insert(schema.bitacora).values({
      actor: autor,
      accion: "Credenciales generadas",
      detalle: `Lote ${lote.id}: ${cantidad} ${prueba ? "de PRUEBA" : "oficiales"}, ${estamento}${curso ? ` ${curso}` : ""}`,
    });
    return lote;
  });
}

/** Respaldo completo en JSON comprimido, antes de borrar (reinicio a cero). */
export async function respaldoJson(motivo: string): Promise<string> {
  const tablas = {
    cursos: await db.select().from(schema.cursos),
    lotes: await db.select().from(schema.lotes),
    credenciales: await db.select().from(schema.credenciales),
    respuestas: await db.select().from(schema.respuestas),
    // Sin las contraseñas de las cuentas de gestión.
    gestores: await db
      .select({ id: schema.gestores.id, usuario: schema.gestores.usuario, nombre: schema.gestores.nombre, rol: schema.gestores.rol, activo: schema.gestores.activo })
      .from(schema.gestores),
    ajustes: await db.select().from(schema.ajustes),
    bitacora: await db.select().from(schema.bitacora),
  };
  const dir = process.env.RESPALDOS_DIR ?? path.join(process.cwd(), "respaldos");
  await mkdir(dir, { recursive: true, mode: 0o700 });
  const marca = new Date().toISOString().replace(/[:.]/g, "-");
  const archivo = path.join(dir, `${motivo}-${marca}.json.gz`);
  await writeFile(archivo, gzipSync(JSON.stringify(tablas)), { mode: 0o600 });
  return archivo;
}

/**
 * Reinicio a cero (solo en modo Prueba): borra respuestas y credenciales de prueba,
 * deja las oficiales sin usar y conserva cursos, matrícula, cuentas y ajustes.
 */
export async function reiniciarACero(autor: string) {
  const estado = await leerEstado();
  if (estado.modo !== "prueba") throw new Error("El reinicio está bloqueado en modo Oficial.");
  const archivo = await respaldoJson("antes-de-reinicio");

  await db.transaction(async (tx) => {
    await tx.delete(schema.respuestas);
    const lotesPrueba = await tx
      .select({ id: schema.lotes.id })
      .from(schema.lotes)
      .where(eq(schema.lotes.prueba, true));
    await tx.delete(schema.credenciales).where(eq(schema.credenciales.prueba, true));
    if (lotesPrueba.length) {
      await tx.delete(schema.lotes).where(
        inArray(
          schema.lotes.id,
          lotesPrueba.map((l) => l.id),
        ),
      );
    }
    await tx
      .update(schema.credenciales)
      .set({ estado: "sin_usar", usadaEl: null })
      .where(and(eq(schema.credenciales.prueba, false), eq(schema.credenciales.estado, "usada")));
    // También se limpian los bloqueos por intentos fallidos ocurridos durante las pruebas.
    await tx
      .update(schema.credenciales)
      .set({ intentosFallidos: 0, bloqueadaHasta: null })
      .where(eq(schema.credenciales.prueba, false));
    await tx.insert(schema.bitacora).values({
      actor: autor,
      accion: "Reinicio a cero",
      detalle: `Respaldo previo: ${path.basename(archivo)}`,
    });
  });
}

/** Conteo de credenciales usadas por curso y estamento, del modo indicado. */
export async function participacion(prueba: boolean) {
  const filas = await db
    .select({
      curso: schema.credenciales.cursoCodigo,
      estamento: schema.credenciales.estamento,
      usadas: sql<number>`count(*) filter (where ${schema.credenciales.estado} = 'usada')`.mapWith(Number),
      activas: sql<number>`count(*) filter (where ${schema.credenciales.estado} <> 'desactivada')`.mapWith(Number),
    })
    .from(schema.credenciales)
    .where(eq(schema.credenciales.prueba, prueba))
    .groupBy(schema.credenciales.cursoCodigo, schema.credenciales.estamento);
  return filas;
}

export type FilaAvance = {
  codigo: string;
  nombre: string;
  nivel: string;
  apoderados: { usadas: number; base: number };
  estudiantes: { usadas: number; base: number } | null;
};

/** Avance para la pantalla pública y el panel: solo números. */
export async function avance() {
  const estado = await leerEstado();
  const prueba = estado.modo === "prueba";
  const [cursos, conteos] = await Promise.all([
    db.select().from(schema.cursos).where(eq(schema.cursos.activo, true)).orderBy(schema.cursos.orden),
    participacion(prueba),
  ]);
  const usadas = (curso: string | null, est: string) =>
    conteos.find((c) => c.curso === curso && c.estamento === est)?.usadas ?? 0;

  const filas: FilaAvance[] = cursos.map((c) => ({
    codigo: c.codigo,
    nombre: c.nombre,
    nivel: c.nivel,
    apoderados: { usadas: usadas(c.codigo, "A"), base: c.papeletasApoderados ?? c.matricula },
    estudiantes: c.tieneEstudiantes ? { usadas: usadas(c.codigo, "E"), base: c.matricula } : null,
  }));
  const funcionarios = { usadas: usadas(null, "F"), base: estado.funcionariosTotal };
  return { estado, filas, funcionarios };
}
