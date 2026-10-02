import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const globalParaDb = globalThis as unknown as { sqlPei?: ReturnType<typeof postgres> };

function conexion() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("Falta DATABASE_URL");
  // Sin registro de consultas: nunca se escriben respuestas ni credenciales en los logs.
  return postgres(url, { max: 10, onnotice: () => {} });
}

export const sqlCliente = globalParaDb.sqlPei ?? conexion();
if (process.env.NODE_ENV !== "production") globalParaDb.sqlPei = sqlCliente;

export const db = drizzle(sqlCliente, { schema });
export { schema };
