import path from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, schema } from "@/db";
import { TEMAS_INICIALES } from "./abiertas";
import { CURSOS_INICIALES, FUNCIONARIOS_INICIALES } from "./cursos-iniciales";

export async function prepararBase() {
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });

  const existentes = await db.select({ codigo: schema.cursos.codigo }).from(schema.cursos);
  if (existentes.length === 0) {
    await db.insert(schema.cursos).values(
      CURSOS_INICIALES.map((c, i) => ({
        ...c,
        orden: i + 1,
        tieneEstudiantes: c.nivel === "basica_5_8",
        activo: c.matricula > 0,
      })),
    );
    await db
      .insert(schema.ajustes)
      .values({
        clave: "estado",
        valor: { modo: "prueba", abierta: false, funcionariosTotal: FUNCIONARIOS_INICIALES },
      })
      .onConflictDoNothing();
    await db.insert(schema.bitacora).values({
      actor: "sistema",
      accion: "Base inicial",
      detalle: `${CURSOS_INICIALES.length} cursos cargados; modo Prueba`,
    });
  }

  // Lista inicial aprobada de temas, si aún no existe.
  const [hayTemas] = await db.select({ c: schema.temas.codigo }).from(schema.temas).limit(1);
  if (!hayTemas) {
    await db.insert(schema.temas).values(TEMAS_INICIALES.map((t, i) => ({ ...t, orden: i + 1 })));
  }
}
