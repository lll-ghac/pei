import { desc } from "drizzle-orm";
import { db, schema } from "@/db";
import { VERSION_INSTRUMENTO } from "@/lib/encuestas";
import { exigirGestor } from "@/lib/gestion";

const formato = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

/** Bitácora del proceso (Anexo E del informe). */
export default async function Bitacora() {
  await exigirGestor();
  const filas = await db.select().from(schema.bitacora).orderBy(desc(schema.bitacora.id)).limit(300);
  return (
    <div className="space-y-4">
      <h1 className="titulo text-[30px]">Bitácora del proceso</h1>
      <p className="text-base text-gris-texto">Instrumento: {VERSION_INSTRUMENTO}. Últimos 300 registros.</p>
      <div className="overflow-x-auto rounded-[3px] bg-tarjeta border border-borde">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left border-b border-borde">
              <th className="px-3 py-2">Fecha</th>
              <th className="px-3 py-2">Quién</th>
              <th className="px-3 py-2">Acción</th>
              <th className="px-3 py-2">Detalle</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className="border-t border-borde align-top">
                <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formato.format(f.fecha)}</td>
                <td className="px-3 py-2 font-mono">{f.actor}</td>
                <td className="px-3 py-2 font-bold">{f.accion}</td>
                <td className="px-3 py-2">{f.detalle}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
