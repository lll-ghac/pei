import { and, count, eq } from "drizzle-orm";
import Link from "next/link";
import { db, schema } from "@/db";
import { ENCUESTAS, VERSION_INSTRUMENTO, preguntasDe, type Estamento } from "@/lib/encuestas";
import { exigirGestor } from "@/lib/gestion";

const ORDEN: Estamento[] = ["A", "E", "F"];

/** Revisión de las encuestas sin credenciales y sin guardar respuestas. */
export default async function Encuestas() {
  await exigirGestor();
  const filas = await db
    .select({ estamento: schema.observaciones.estamento, n: count() })
    .from(schema.observaciones)
    .where(and(eq(schema.observaciones.resuelta, false)))
    .groupBy(schema.observaciones.estamento);
  const pendientes = (e: string) => filas.find((f) => f.estamento === e)?.n ?? 0;
  return (
    <div className="space-y-5">
      <div>
        <h1 className="titulo text-[30px]">Encuestas</h1>
        <p className="mt-1 text-base text-gris-texto">
          Instrumento {VERSION_INSTRUMENTO}. Revise la redacción y el diseño sin usar credenciales: en la vista
          previa no se guarda ninguna respuesta ni cambia el avance. En «Ver preguntas y observaciones» cada
          integrante de la comisión puede dejar comentarios sobre cada pregunta.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ORDEN.map((e) => {
          const enc = ENCUESTAS[e];
          return (
            <section key={e} className="rounded-[3px] bg-tarjeta border border-borde p-5 flex flex-col gap-3">
              <h2 className="rotulo text-[17px]">{enc.titulo}</h2>
              <p className="text-base text-gris-texto">
                {preguntasDe(enc).length} preguntas · unos {enc.minutos} minutos
              </p>
              <p className="text-base">
                {pendientes(e) > 0 ? (
                  <span className="sello text-lacre text-[13px]">
                    {pendientes(e)} {pendientes(e) === 1 ? "observación pendiente" : "observaciones pendientes"}
                  </span>
                ) : (
                  <span className="text-gris-texto">Sin observaciones pendientes</span>
                )}
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <Link
                  href={`/gestion/vista-previa/${e}`}
                  className="boton boton-primario no-underline"
                >
                  Recorrer como participante
                </Link>
                <Link
                  href={`/gestion/encuestas/${e}`}
                  className="boton boton-secundario no-underline"
                >
                  Ver preguntas y observaciones
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
