import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ENCUESTAS, VERSION_INSTRUMENTO, type Estamento, type Pregunta } from "@/lib/encuestas";
import { ESCALAS } from "@/lib/encuestas/listas";
import { db, schema } from "@/db";
import { exigirGestor } from "@/lib/gestion";
import { Observaciones, type Observacion } from "../Observaciones";

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
  const g = await exigirGestor();
  const { estamento } = await props.params;
  if (!["A", "E", "F"].includes(estamento)) notFound();
  const enc = ENCUESTAS[estamento as Estamento];

  const todas: Observacion[] = await db
    .select({
      id: schema.observaciones.id,
      pregunta: schema.observaciones.pregunta,
      texto: schema.observaciones.texto,
      creado: schema.observaciones.creado,
      resuelta: schema.observaciones.resuelta,
      resueltaPor: schema.observaciones.resueltaPor,
      autorId: schema.observaciones.autorId,
      autor: schema.gestores.nombre,
    })
    .from(schema.observaciones)
    .innerJoin(schema.gestores, eq(schema.gestores.id, schema.observaciones.autorId))
    .where(eq(schema.observaciones.estamento, estamento))
    .orderBy(asc(schema.observaciones.id));
  const de = (pregunta: string) => todas.filter((o) => o.pregunta === pregunta);
  const pendientes = todas.filter((o) => !o.resuelta);
  const conPendientes = [...new Set(pendientes.map((o) => o.pregunta))];
  const gestor = { id: g.id, rol: g.rol };

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
      <div className="rounded-[24px] bg-azul/8 border border-azul/30 p-4 text-base space-y-1">
        <p>
          <strong>Revisión de la comisión.</strong> Bajo cada pregunta puede dejar una observación: redacción
          confusa, una opción que falta, un error. Todas las cuentas del panel ven las observaciones; la
          administración las marca como resueltas. La encuesta aprobada solo cambia si la comisión lo acuerda.
        </p>
        <p>
          {pendientes.length === 0 ? (
            "No hay observaciones pendientes en esta encuesta."
          ) : (
            <>
              <strong>{pendientes.length}</strong>{" "}
              {pendientes.length === 1 ? "observación pendiente" : "observaciones pendientes"} en:{" "}
              {conPendientes.map((c, i) => (
                <span key={c}>
                  {i > 0 && ", "}
                  <a href={`#${c}`} className="font-bold text-azul underline">
                    {c === "intro" ? "introducción" : c}
                  </a>
                </span>
              ))}
            </>
          )}
        </p>
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
          <div id="intro" className="scroll-mt-4">
            <Observaciones lista={de("intro")} estamento={estamento} pregunta="intro" gestor={gestor} />
          </div>
        </header>
        {enc.secciones.map((s) => (
          <section key={s.titulo} className="space-y-4">
            <h2 className="text-xl font-extrabold border-b-2 border-verde pb-1">{s.titulo}</h2>
            {s.preguntas.map((p) => (
              <div key={p.codigo} id={p.codigo} className="break-inside-avoid scroll-mt-4">
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
                <Observaciones lista={de(p.codigo)} estamento={estamento} pregunta={p.codigo} gestor={gestor} />
              </div>
            ))}
          </section>
        ))}
        <p className="font-bold">{enc.despedida}</p>
      </article>
    </div>
  );
}
