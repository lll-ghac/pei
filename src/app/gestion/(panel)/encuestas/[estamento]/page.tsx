import Link from "next/link";
import { notFound } from "next/navigation";
import { ENCUESTAS, VERSION_INSTRUMENTO, type Estamento, type Pregunta } from "@/lib/encuestas";
import { ESCALAS } from "@/lib/encuestas/listas";
import { exigirGestor } from "@/lib/gestion";

function Opciones({ p }: { p: Pregunta }) {
  if (p.tipo === "abierta") {
    return <p className="mt-2 text-base text-gris-texto italic">Respuesta escrita, hasta 500 caracteres.</p>;
  }
  if (p.tipo === "masImportante") {
    return (
      <p className="mt-2 text-base text-gris-texto italic">
        Muestra solo las 3 prioridades marcadas en {p.de}; se elige una.
      </p>
    );
  }
  if (p.tipo === "escala") {
    return (
      <div className="mt-2 space-y-2">
        <p className="text-base text-gris-texto">
          Escala: {ESCALAS[p.escala].map((o) => o.texto).join(" · ")}
        </p>
        {p.grupos.map((g, i) => (
          <div key={i}>
            {g.titulo && <p className="font-bold text-verde-profundo">{g.titulo}</p>}
            <ol className="list-none space-y-0.5">
              {g.items.map((it) => (
                <li key={it.codigo} className="flex gap-2">
                  <code className="shrink-0 w-16 text-sm text-gris-texto">{`${p.codigo}_${it.codigo}`}</code>
                  <span>{it.texto}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>
    );
  }
  return (
    <ul className="mt-2 space-y-0.5">
      {p.opciones.map((o) => (
        <li key={o.codigo} className="flex gap-2">
          <code className="shrink-0 w-8 text-sm text-gris-texto text-right">{o.codigo}</code>
          <span>
            {/^[a-o]$/.test(o.codigo) ? `${o.codigo}) ` : ""}
            {o.texto}
            {o.codigo === "99" ? ": ____" : ""}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Todas las preguntas de una encuesta en una página, para revisar la redacción. */
export default async function TodasLasPreguntas(props: PageProps<"/gestion/encuestas/[estamento]">) {
  await exigirGestor();
  const { estamento } = await props.params;
  if (!["A", "E", "F"].includes(estamento)) notFound();
  const enc = ENCUESTAS[estamento as Estamento];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/gestion/encuestas" className="text-azul underline font-bold">
          ← Encuestas
        </Link>
        <Link href={`/gestion/vista-previa/${estamento}`} className="ml-auto rounded-full bg-verde-profundo text-white px-4 py-2 font-bold">
          Recorrer como participante
        </Link>
      </div>
      <article className="rounded-[24px] bg-tarjeta border border-borde p-5 sm:p-8 space-y-5">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-verde-profundo">
            Instrumento {VERSION_INSTRUMENTO}
          </p>
          <h1 className="text-3xl font-extrabold text-azul">{enc.titulo}</h1>
          {enc.introduccion.map((t) => (
            <p key={t} className="mt-2">
              {t}
            </p>
          ))}
        </header>
        {enc.secciones.map((s) => (
          <section key={s.titulo} className="space-y-4">
            <h2 className="text-xl font-extrabold border-b-2 border-verde pb-1">{s.titulo}</h2>
            {s.preguntas.map((p) => (
              <div key={p.codigo} className="break-inside-avoid">
                {p.cita && (
                  <p className="text-base text-gris-texto">
                    {p.cita.antes} <em>«{p.cita.texto}»</em>
                  </p>
                )}
                <p className="font-bold">
                  <span className="text-azul">{p.numero}.</span> {p.texto}{" "}
                  {p.indicacion && <span className="font-semibold text-gris-texto">({p.indicacion})</span>}
                  <code className="ml-2 text-sm font-normal text-gris-texto">{p.codigo}</code>
                </p>
                <Opciones p={p} />
              </div>
            ))}
          </section>
        ))}
        <p className="font-bold">{enc.despedida}</p>
      </article>
    </div>
  );
}
