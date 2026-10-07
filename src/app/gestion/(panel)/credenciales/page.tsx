import { desc, eq, sql } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { NOMBRE_ESTAMENTO, type Estamento } from "@/lib/encuestas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { crearLote } from "../../acciones";
import { FormularioAviso } from "../../FormularioAviso";
import { CamposLote } from "./CamposLote";

export default async function Credenciales() {
  const g = await exigirGestor();
  const [cursos, estado, lotes] = await Promise.all([
    db.select().from(schema.cursos).where(eq(schema.cursos.activo, true)).orderBy(schema.cursos.orden),
    leerEstado(),
    db
      .select({
        id: schema.lotes.id,
        curso: schema.cursos.nombre,
        estamento: schema.lotes.estamento,
        prueba: schema.lotes.prueba,
        cantidad: schema.lotes.cantidad,
        creado: schema.lotes.creado,
        usadas: sql<number>`(select count(*) from ${schema.credenciales} c where c.lote_id = ${schema.lotes.id} and c.estado = 'usada')`.mapWith(Number),
        desactivadas: sql<number>`(select count(*) from ${schema.credenciales} c where c.lote_id = ${schema.lotes.id} and c.estado = 'desactivada')`.mapWith(Number),
      })
      .from(schema.lotes)
      .leftJoin(schema.cursos, eq(schema.cursos.codigo, schema.lotes.cursoCodigo))
      .orderBy(desc(schema.lotes.id)),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="titulo text-[30px]">Credenciales</h1>
        <p className="mt-1 text-base text-gris-texto">
          Las credenciales se generan por lotes (un curso y un estamento) y se imprimen en papeletas que se
          reparten al azar. Nadie anota qué papeleta recibe cada persona.
        </p>
        <p className="mt-2 text-base">
          Para los profesores jefes:{" "}
          <a href="/manual/profesores" target="_blank" className="text-timbre underline font-bold">
            manual de una página
          </a>{" "}
          (se imprime o se comparte el enlace encuesta.escuelaecuador.cl/manual/profesores).
        </p>
      </div>

      {g.rol === "admin" && (
        <section className="rounded-[3px] bg-tarjeta border border-borde p-5">
          <h2 className="rotulo text-[17px]">Generar un lote</h2>
          <p className="text-base text-gris-texto mb-3">
            La cantidad sugerida es la matrícula + 10% de reserva. Las de prueba llevan el prefijo PRUEBA- y solo funcionan en
            modo Prueba; las oficiales solo funcionan en modo Oficial con el periodo abierto.
          </p>
          <FormularioAviso accion={crearLote} boton="Generar credenciales">
            <CamposLote
              cursos={cursos.map((c) => ({
                codigo: c.codigo,
                nombre: c.nombre,
                matricula: c.matricula,
                tieneEstudiantes: c.tieneEstudiantes,
              }))}
              tipoInicial={estado.modo === "prueba" ? "prueba" : "oficial"}
            />
          </FormularioAviso>
        </section>
      )}

      <section>
        <h2 className="rotulo text-[17px] mb-2">Lotes</h2>
        {lotes.length === 0 ? (
          <p className="text-gris-texto">Aún no hay credenciales generadas.</p>
        ) : (
          <div className="overflow-x-auto rounded-[3px] bg-tarjeta border border-borde">
            <table className="w-full text-base">
              <thead>
                <tr className="text-left border-b border-borde">
                  <th className="px-3 py-2">Lote</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Estamento</th>
                  <th className="px-3 py-2">Curso</th>
                  <th className="px-3 py-2 text-right">Usadas / total</th>
                  <th className="px-3 py-2 text-right">Desactivadas</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lotes.map((l) => (
                  <tr key={l.id} className="border-t border-borde">
                    <td className="px-3 py-2 font-bold">{l.id}</td>
                    <td className="px-3 py-2">
                      {l.prueba ? (
                        <span className="sello text-lacre text-[12px]">PRUEBA</span>
                      ) : (
                        "Oficial"
                      )}
                    </td>
                    <td className="px-3 py-2">{NOMBRE_ESTAMENTO[l.estamento as Estamento]}</td>
                    <td className="px-3 py-2">{l.curso ?? "—"}</td>
                    <td className="px-3 py-2 text-right tabular-nums">
                      {l.usadas} / {l.cantidad}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums">{l.desactivadas}</td>
                    <td className="px-3 py-2 whitespace-nowrap text-right">
                      <Link href={`/gestion/credenciales/${l.id}`} className="font-bold text-azul underline mr-3">
                        Ver
                      </Link>
                      {g.rol === "admin" && (
                        <a href={`/gestion/papeletas/${l.id}`} className="font-bold text-verde-profundo underline">
                          PDF papeletas
                        </a>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
