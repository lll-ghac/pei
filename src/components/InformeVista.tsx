// Dibuja el modelo del informe (lib/informe.ts) en HTML: panel y página pública.
// Mismas reglas que Resultados: color fijo por estamento, valores escritos, texto en tinta.
import {
  Barra,
  Muestra,
  TablaComparativaVista,
} from "@/app/gestion/(panel)/resultados/Graficos";
import type { Bloque, Seccion } from "@/lib/informe";

function Origen({ texto }: { texto?: string }) {
  return texto ? (
    <p className="text-[14px] text-gris-texto mt-1">{texto}</p>
  ) : null;
}

export function VistaBloque({ b }: { b: Bloque }) {
  switch (b.tipo) {
    case "parrafo":
      return (
        <p className="text-[17px] leading-relaxed max-w-[80ch]">{b.texto}</p>
      );
    case "nota":
      return (
        <p className="text-[16px] text-grafito border-l-2 border-filete pl-3 max-w-[80ch]">
          {b.texto}
        </p>
      );
    case "cifras":
      return (
        <dl className="grid gap-3 sm:grid-cols-3">
          {b.items.map((it) => (
            <div
              key={it.etiqueta}
              className="border border-filete bg-papel px-4 py-3"
            >
              <dt className="rotulo text-[14px] text-grafito flex items-center gap-1.5">
                {it.e && <Muestra e={it.e} />} {it.etiqueta}
              </dt>
              <dd className="titulo text-[34px] leading-tight tabular-nums">
                {it.valor}
              </dd>
              {it.detalle && (
                <dd className="text-[15px] text-grafito">{it.detalle}</dd>
              )}
            </div>
          ))}
        </dl>
      );
    case "barras":
      return (
        <figure className="space-y-1">
          <figcaption className="font-bold text-[17px]">{b.titulo}</figcaption>
          <table className="w-full text-[16px]">
            <tbody>
              {b.filas.map((f, k) => (
                <tr key={k} className="border-t border-filete first:border-t-0">
                  <th
                    scope="row"
                    className="py-1.5 pr-3 text-left font-normal align-middle w-[48%]"
                  >
                    {f.texto}
                  </th>
                  <td className="py-1.5 align-middle">
                    <Barra
                      valor={f.pct}
                      e={b.e}
                      etiqueta={`${f.texto}: ${Math.round(f.pct)}% (${f.conteo})`}
                    />
                  </td>
                  <td className="py-1.5 pl-2 w-12 text-right text-[15px] text-gris-texto align-middle tabular-nums">
                    {f.conteo}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Origen texto={b.origen} />
        </figure>
      );
    case "comparativa":
      return (
        <figure className="space-y-1">
          <figcaption className="font-bold text-[17px]">{b.titulo}</figcaption>
          <TablaComparativaVista
            filas={b.filas}
            estamentos={b.estamentos}
            encabezado={b.encabezado}
            n={b.n}
            aviso={b.pocos}
          />
          <Origen texto={b.origen} />
        </figure>
      );
    case "tabla":
      return (
        <figure className="space-y-1">
          {b.titulo && (
            <figcaption className="font-bold text-[17px]">
              {b.titulo}
            </figcaption>
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-[15px] border-collapse">
              <thead>
                <tr>
                  {b.columnas.map((c, i) => (
                    <th
                      key={i}
                      scope="col"
                      className={`rotulo text-[13px] text-grafito pb-1.5 px-2 first:pl-0 align-bottom ${b.numericas?.includes(i) ? "text-right" : "text-left"}`}
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {b.filas.map((f, k) => (
                  <tr key={k} className="border-t border-filete align-top">
                    {f.map((c, i) => (
                      <td
                        key={i}
                        className={`py-1.5 px-2 first:pl-0 ${b.numericas?.includes(i) ? "text-right tabular-nums whitespace-nowrap" : ""}`}
                      >
                        {c}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Origen texto={b.origen} />
        </figure>
      );
    case "citas":
      return (
        <figure className="space-y-2">
          <figcaption className="font-bold text-[17px]">{b.titulo}</figcaption>
          <ul className="grid gap-2 md:grid-cols-2">
            {b.citas.map((c, i) => (
              <li key={i} className="border border-grafito bg-papel px-4 py-3">
                <blockquote className="text-[17px] leading-relaxed">
                  «{c.texto}»
                </blockquote>
                <p className="text-[14px] text-gris-texto mt-1">{c.origen}</p>
              </li>
            ))}
          </ul>
        </figure>
      );
  }
}

export function VistaSeccion({
  s,
  conAporte = true,
}: {
  s: Seccion;
  conAporte?: boolean;
}) {
  return (
    <section
      id={s.id}
      aria-labelledby={`t-${s.id}`}
      className="bg-papel border border-filete p-5 space-y-5 scroll-mt-4"
    >
      {(s.titulo || s.preguntas) && (
        <header className="space-y-0.5">
          {s.titulo && (
            <h2 id={`t-${s.id}`} className="titulo text-[24px]">
              <span className="text-timbre tabular-nums mr-2">{s.numero}</span>
              {s.titulo}
            </h2>
          )}
          {(s.preguntas || (conAporte && s.aporta)) && (
            <p className="text-[14px] text-grafito">
              {s.preguntas && <>Preguntas: {s.preguntas}</>}
              {conAporte && s.aporta && <> · Aporta al PEI: {s.aporta}</>}
            </p>
          )}
        </header>
      )}
      {s.bloques.map((b, i) => (
        <VistaBloque key={i} b={b} />
      ))}
    </section>
  );
}
