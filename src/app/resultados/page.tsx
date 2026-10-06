import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { VistaSeccion } from "@/components/InformeVista";
import { leerEstado } from "@/lib/estado";
import { armarInforme, type Seccion } from "@/lib/informe";

export const metadata = { title: "Resultados de la encuesta PEI 2027" };

/** Secciones del informe que se muestran a la comunidad (sin diagnóstico interno, insumos ni línea base). */
const PUBLICAS = ["resumen", "participacion", "identidad", "proposito", "prioridades", "valores", "perfiles", "voces", "entorno"];

function paraComunidad(s: Seccion, i: number): Seccion {
  // Participación: solo las cifras por estamento y los párrafos (sin tablas por nivel).
  // Resumen: sin las cifras, que ya están en Participación.
  const bloques =
    s.id === "participacion"
      ? s.bloques.filter((b) => b.tipo === "cifras" || b.tipo === "parrafo")
      : s.id === "resumen"
        ? s.bloques.filter((b) => b.tipo !== "cifras")
        : s.bloques;
  return { ...s, numero: String(i + 1), aporta: "", bloques };
}

/** Página pública de resultados: versión resumida del informe, solo cuando la administración la publica. */
export default async function ResultadosPublicos() {
  const estado = await leerEstado();
  const prueba = estado.modo === "prueba";
  const visible = estado.publicados && (estado.cerrada || prueba);
  const inf = visible ? await armarInforme({ prueba, cerrada: estado.cerrada, publico: true }) : null;
  const secciones = inf ? inf.secciones.filter((s) => PUBLICAS.includes(s.id)).map(paraComunidad) : [];

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={prueba} />
      <Cabecera ancho="ancho" detalle="Resultados de la encuesta" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 space-y-6">
        <div className="space-y-2 max-w-[75ch]">
          <h1 className="titulo text-[32px]">Lo que dijo nuestra comunidad</h1>
          {visible ? (
            <>
              <p className="text-[18px]">
                Resultados de la encuesta para el nuevo Proyecto Educativo Institucional (PEI) 2027 de la Escuela
                República del Ecuador E-79. Gracias a cada familia, estudiante y funcionario que respondió.
              </p>
              <p className="text-gris-texto">
                Son datos, no decisiones: la comisión del PEI los usará para redactar el proyecto. Cada cifra indica su
                pregunta, el grupo y cuántas personas respondieron (n). Para cuidar el anonimato, no se muestra ningún
                grupo con menos de 5 respuestas, y los textos se revisaron para quitar nombres.
              </p>
              {prueba && (
                <p role="note" className="border border-lacre/50 bg-papel px-3 py-2 text-lacre font-bold">
                  Datos de prueba: esta página es un ensayo y no muestra respuestas reales.
                </p>
              )}
            </>
          ) : (
            <p className="text-[18px]">
              Los resultados se publicarán aquí cuando termine la encuesta y la comisión los revise. Mientras tanto, puede
              ver cuántos hemos respondido en{" "}
              <a href="/avance" className="text-timbre underline font-bold">
                la página de avance
              </a>
              .
            </p>
          )}
        </div>

        {visible && (
          <>
            <nav aria-label="Contenido" className="bg-papel border border-filete p-4">
              <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-[16px]">
                {secciones.map((s) => (
                  <li key={s.id}>
                    <a href={`#${s.id}`} className="text-timbre underline">
                      {s.numero}. {s.titulo}
                    </a>
                  </li>
                ))}
              </ol>
            </nav>
            {secciones.map((s) => (
              <VistaSeccion key={s.id} s={s} conAporte={false} />
            ))}
          </>
        )}
      </main>
    </div>
  );
}
