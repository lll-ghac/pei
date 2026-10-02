import Link from "next/link";
import { ENCUESTAS, VERSION_INSTRUMENTO, preguntasDe, type Estamento } from "@/lib/encuestas";
import { exigirGestor } from "@/lib/gestion";

const ORDEN: Estamento[] = ["A", "E", "F"];

/** Revisión de las encuestas sin credenciales y sin guardar respuestas. */
export default async function Encuestas() {
  await exigirGestor();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold text-azul">Encuestas</h1>
        <p className="mt-1 text-base text-gris-texto">
          Instrumento {VERSION_INSTRUMENTO}. Revise la redacción y el diseño sin usar credenciales: en la vista
          previa no se guarda ninguna respuesta ni cambia el avance.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {ORDEN.map((e) => {
          const enc = ENCUESTAS[e];
          return (
            <section key={e} className="rounded-[24px] bg-tarjeta border border-borde p-5 flex flex-col gap-3">
              <h2 className="text-xl font-extrabold">{enc.titulo}</h2>
              <p className="text-base text-gris-texto">
                {preguntasDe(enc).length} preguntas · unos {enc.minutos} minutos
              </p>
              <div className="mt-auto flex flex-col gap-2">
                <Link
                  href={`/gestion/vista-previa/${e}`}
                  className="rounded-full bg-verde-profundo text-white text-center px-5 py-2.5 font-bold"
                >
                  Recorrer como participante
                </Link>
                <Link
                  href={`/gestion/encuestas/${e}`}
                  className="rounded-full border-2 border-verde-profundo text-verde-profundo text-center px-5 py-2.5 font-bold"
                >
                  Ver todas las preguntas
                </Link>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
