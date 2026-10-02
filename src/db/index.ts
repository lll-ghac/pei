import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { sqlPei?: ReturnType<typeof postgres> };

function conexion() {
  // postgres() no se conecta hasta la primera consulta; así la compilación no necesita la base.
  // Sin registro de consultas: nunca se escriben respuestas ni credenciales en los logs.
  return postgres(process.env.DATABASE_URL ?? "postgres://falta-DATABASE_URL@localhost/invalida", {
    max: 10,
    onnotice: () => {},
  });
}

export const sqlCliente = globalParaDb.sqlPei ?? conexion();
if (process.env.NODE_ENV !== "production") globalParaDb.sqlPei = sqlCliente;

export const db = drizzle(sqlCliente, { schema });
export { schema };
