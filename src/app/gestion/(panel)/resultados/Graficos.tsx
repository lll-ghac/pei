// Gráficos de resultados (servidor, HTML y CSS). Reglas de la skill de visualización:
// barras de 14 px con extremo redondeado de 4 px y base recta, valor en la punta, color fijo por
// estamento (nunca por rango), texto siempre en tinta, nunca en el color de la serie.
import type { Estamento } from "@/lib/encuestas";
import { ESCALAS } from "@/lib/encuestas/listas";
import type { ConteoItem, ConteoOpcion, FilaComparable, FilaPrioridad } from "@/lib/resultados";

export const NOMBRE: Record<Estamento, string> = { A: "Apoderados", E: "Estudiantes", F: "Funcionarios" };
const fmt = (x: number) => `${Math.round(x)}%`;

/** Muestra de color de un estamento (clave de identidad; el texto va al lado, en tinta). */
export function Muestra({ e }: { e: Estamento }) {
  return <span className="inline-block size-3 shrink-0 rounded-[2px] align-middle" style={{ background: `var(--serie-${e})` }} aria-hidden />;
}

export function Leyenda({ estamentos }: { estamentos: Estamento[] }) {
  return (
    <p className="flex flex-wrap gap-x-5 gap-y-1 text-[15px] text-grafito" aria-hidden>
      {estamentos.map((e) => (
        <span key={e} className="inline-flex items-center gap-1.5">
          <Muestra e={e} /> {NOMBRE[e]}
        </span>
      ))}
    </p>
  );
}

/** Barra horizontal con su valor en la punta. */
export function Barra({ valor, e, etiqueta }: { valor: number; e: Estamento; etiqueta?: string }) {
  return (
    <div className="flex items-center gap-2 min-w-0" title={etiqueta}>
      <span className="relative h-[14px] flex-1 min-w-10 border-l border-grafito" aria-hidden>
        <span
          className="absolute inset-y-0 left-0 rounded-r-[4px]"
          style={{ width: `${Math.max(valor > 0 ? 1.5 : 0, Math.min(100, valor))}%`, background: `var(--serie-${e})` }}
        />
      </span>
      <span className="w-11 shrink-0 text-right text-[16px] text-tinta">{fmt(valor)}</span>
    </div>
  );
}

/** Opciones de una pregunta en un estamento: una sola serie, sin leyenda (el título la nombra). */
export function BarrasOpciones({ opciones, e, ordenar }: { opciones: ConteoOpcion[]; e: Estamento; ordenar?: boolean }) {
  const filas = ordenar ? [...opciones].sort((a, b) => b.pct - a.pct) : opciones;
  return (
    <table className="w-full text-[16px]">
      <tbody>
        {filas.map((o) => (
          <tr key={o.codigo} className="border-t border-filete first:border-t-0">
            <th scope="row" className="py-1.5 pr-3 text-left font-normal align-middle w-[48%]">
              {/^[a-o]$/.test(o.codigo) ? `${o.codigo}) ` : ""}
              {o.texto}
            </th>
            <td className="py-1.5 align-middle">
              <Barra valor={o.pct} e={e} etiqueta={`${o.texto}: ${fmt(o.pct)} (${o.conteo})`} />
            </td>
            <td className="py-1.5 pl-2 w-12 text-right text-[15px] text-gris-texto align-middle">{o.conteo}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Comparación entre estamentos: tabla con barra por celda (más de 7 opciones: la tabla manda). */
export function TablaComparativa({ filas, estamentos, encabezado = "Opción" }: { filas: FilaComparable[]; estamentos: Estamento[]; encabezado?: string }) {
  const prom = (f: FilaComparable) => {
    const v = estamentos.map((e) => f.pct[e]).filter((x): x is number => typeof x === "number");
    return v.length ? v.reduce((s, x) => s + x, 0) / v.length : 0;
  };
  const orden = [...filas].sort((a, b) => prom(b) - prom(a));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[36rem] text-[16px]">
        <thead>
          <tr className="text-left">
            <th scope="col" className="rotulo text-[13px] text-grafito pb-1.5 pr-3 w-[34%]">{encabezado}</th>
            {estamentos.map((e) => (
              <th key={e} scope="col" className="rotulo text-[13px] text-grafito pb-1.5 px-2">
                <span className="inline-flex items-center gap-1.5">
                  <Muestra e={e} /> {NOMBRE[e]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {orden.map((f) => (
            <tr key={f.opcion.codigo} className="border-t border-filete">
              <th scope="row" className="py-1.5 pr-3 text-left font-normal">{f.opcion.texto}</th>
              {estamentos.map((e) => (
                <td key={e} className="py-1.5 px-2">
                  {f.pct[e] === null || f.pct[e] === undefined ? (
                    <span className="text-[15px] text-gris-texto">Menos de 5</span>
                  ) : (
                    <Barra valor={f.pct[e]!} e={e} etiqueta={`${NOMBRE[e]} · ${f.opcion.texto}: ${fmt(f.pct[e]!)}`} />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Rampa secuencial azul de la skill (pasos 100→650): más oscuro = más acuerdo.
const RAMPA = ["#cde2fb", "#b7d3f6", "#9ec5f4", "#86b6ef", "#6da7ec", "#5598e7", "#3987e5", "#2a78d6", "#256abf", "#1c5cab", "#184f95", "#104281"];
function celda(v: number) {
  const i = Math.min(RAMPA.length - 1, Math.floor((v / 100) * RAMPA.length));
  return { background: RAMPA[i], color: i >= 6 ? "#ffffff" : "#16181a" };
}

/** Mapa de calor de una escala: filas = frases, columnas = grupos; % de acuerdo o frecuencia alta. */
export function CalorEscala({
  columnas,
}: {
  columnas: { nombre: string; items: ConteoItem[] | null }[];
}) {
  const base = columnas.find((c) => c.items)?.items ?? [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[34rem] text-[16px] border-separate [border-spacing:2px]">
        <thead>
          <tr>
            <th scope="col" className="rotulo text-[13px] text-grafito text-left pb-1 pr-3">Frase</th>
            {columnas.map((c) => (
              <th key={c.nombre} scope="col" className="rotulo text-[13px] text-grafito pb-1 px-1 text-center w-28">
                {c.nombre}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {base.map((it, i) => (
            <tr key={it.codigo}>
              <th scope="row" className="py-1 pr-3 text-left font-normal align-middle">
                {it.grupo && (i === 0 || base[i - 1].grupo !== it.grupo) && (
                  <span className="rotulo block text-[12px] text-grafito pt-2">{it.grupo}</span>
                )}
                {it.texto}
              </th>
              {columnas.map((c) => {
                const x = c.items?.find((y) => y.codigo === it.codigo);
                if (!c.items || !x || x.n < 5) {
                  return (
                    <td key={c.nombre} className="text-center text-[14px] text-gris-texto bg-fondo rounded-[2px] align-middle">
                      Menos de 5
                    </td>
                  );
                }
                return (
                  <td
                    key={c.nombre}
                    className="text-center rounded-[2px] align-middle py-2"
                    style={celda(x.favorable)}
                    title={`${it.texto} · ${c.nombre}: ${fmt(x.favorable)} favorable, ${fmt(x.noSe)} «No sé», n=${x.n}`}
                  >
                    <strong className="text-[16px]">{fmt(x.favorable)}</strong>
                    {x.noSe >= 1 && <span className="block text-[13px] opacity-90">No sé {fmt(x.noSe)}</span>}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Distribución completa de una frase (para la vista por estamento). */
export function DistribucionItem({ it, escala }: { it: ConteoItem; escala: "ACU" | "FRE" }) {
  return (
    <span className="text-[15px] text-grafito">
      {ESCALAS[escala]
        .map((o) => `${o.texto} ${fmt(it.n ? ((it.valores[o.codigo] ?? 0) / it.n) * 100 : 0)}`)
        .join(" · ")}
    </span>
  );
}

const ESTADO_SELLO = {
  converge: { texto: "Converge en los 3", clase: "text-timbre" },
  candidato: { texto: "Sello candidato", clase: "text-timbre" },
  divide: { texto: "Divide opiniones", clase: "text-lacre" },
  nada: { texto: "—", clase: "text-gris-texto" },
};

/** Ranking de las 15 prioridades por estamento, con la regla de sello candidato del MVP. */
export function TablaPrioridades({ filas, validos }: { filas: FilaPrioridad[]; validos: Estamento[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[56rem] text-[16px]">
        <thead>
          <tr className="text-left align-bottom">
            <th scope="col" className="rotulo text-[13px] text-grafito pb-1.5 pr-3">Prioridad</th>
            {validos.map((e) => (
              <th key={e} scope="col" className="rotulo text-[13px] text-grafito pb-1.5 px-2">
                <span className="inline-flex items-center gap-1.5">
                  <Muestra e={e} /> {NOMBRE[e]}
                </span>
                <span className="block normal-case tracking-normal font-normal text-[13px]">lugar · % en su top 3</span>
              </th>
            ))}
            <th scope="col" className="rotulo text-[13px] text-grafito pb-1.5 px-2">Regla</th>
            <th scope="col" className="rotulo text-[13px] text-grafito pb-1.5 pl-2">
              Por qué la eligieron
              <span className="block normal-case tracking-normal font-normal text-[13px]">como la más importante</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const estado = f.converge ? "converge" : f.candidato ? "candidato" : f.estamentosTop5 === 1 ? "divide" : "nada";
            const r = f.razones;
            const sello = r.fortaleza + r.distinguiria;
            return (
              <tr key={f.opcion.codigo} className={`border-t border-filete ${f.candidato ? "bg-timbre-claro/60" : ""}`}>
                <th scope="row" className="py-2 pr-3 text-left font-normal align-top">
                  <span className="font-bold text-timbre mr-1.5">{f.opcion.codigo})</span>
                  {f.opcion.texto}
                </th>
                {validos.map((e) => {
                  const c = f.por[e];
                  return (
                    <td key={e} className="py-2 px-2 align-top">
                      {c && (
                        <>
                          <span className={`rotulo text-[15px] ${c.enTop5 ? "text-tinta" : "text-gris-texto"}`}>
                            {c.rango}.º{c.enTop5 ? " · top 5" : ""}
                          </span>
                          <Barra valor={c.pctTop3} e={e} etiqueta={`${NOMBRE[e]}: ${fmt(c.pctTop3)} la puso en su top 3; ${c.masImportante} la eligieron como la más importante`} />
                        </>
                      )}
                    </td>
                  );
                })}
                <td className={`py-2 px-2 align-top font-bold ${ESTADO_SELLO[estado].clase}`}>{ESTADO_SELLO[estado].texto}</td>
                <td className="py-2 pl-2 align-top text-[15px] text-grafito">
                  {r.total < 5 ? (
                    <span className="text-gris-texto">Menos de 5</span>
                  ) : (
                    <>
                      Fortaleza o distintiva {sello} · Debilidad {r.debilidad}
                      <span className="block font-bold text-tinta">
                        {sello >= r.debilidad ? "Lectura: sello" : "Lectura: objetivo de mejora"}
                      </span>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
