import Link from "next/link";
import { ENCUESTAS, preguntasDe, type Estamento } from "@/lib/encuestas";
import { listarTemas, listarTextos, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { AvisoEnsayo } from "../../Ayuda";
import {
  BRECHA,
  COMPARABLES,
  MINIMO,
  avisoPocos,
  cargarUrna,
  comparar,
  fechaCierre,
  filtrarFuncionarios,
  prioridades,
  resumir,
  sintesis,
  universo,
  type GrupoFuncionarios,
  type Orden,
} from "@/lib/resultados";
import {
  BarrasOpciones,
  CalorEscala,
  DistribucionItem,
  Leyenda,
  Muestra,
  NOMBRE,
  TablaComparativa,
  TablaPrioridades,
} from "./Graficos";

export const metadata = { title: "Resultados · Encuesta PEI 2027" };

const VISTAS = [
  { id: "resumen", texto: "Resumen" },
  { id: "prioridades", texto: "Prioridades y sellos" },
  { id: "escalas", texto: "Escalas" },
  { id: "abiertas", texto: "Abiertas" },
  { id: "A", texto: "Apoderados" },
  { id: "E", texto: "Estudiantes" },
  { id: "F", texto: "Funcionarios" },
] as const;
type Vista = (typeof VISTAS)[number]["id"];

const ESCALAS_POR: Record<Estamento, string> = { A: "A5", E: "E2", F: "F7" };

const ORDENES: { id: Orden; texto: string }[] = [
  { id: "promedio", texto: "Promedio de estamentos" },
  { id: "A", texto: "Apoderados" },
  { id: "E", texto: "Estudiantes" },
  { id: "F", texto: "Funcionarios" },
  { id: "dif", texto: "Diferencia" },
];
const fechaLarga = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "long",
  timeStyle: "short",
});
const hora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "long",
  timeStyle: "short",
});
const idDe = (titulo: string) =>
  "p-" +
  titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-");
/** Sección de gestión de funcionarios: solo en total o separada entre docentes y asistentes (MVP). */
const GESTION = ["F7", "F8"];

export default async function Resultados(
  props: PageProps<"/gestion/resultados">,
) {
  await exigirGestor();
  const estado = await leerEstado();
  const q = await props.searchParams;
  const vista = (VISTAS.find((v) => v.id === q.ver)?.id ?? "resumen") as Vista;
  const grupo = (
    ["docentes", "asistentes"].includes(String(q.grupo)) ? q.grupo : "todos"
  ) as GrupoFuncionarios;

  if (!estado.cerrada && estado.modo !== "prueba") {
    return (
      <div className="space-y-4 max-w-[70ch]">
        <h1 className="titulo text-[30px]">Resultados</h1>
        <p>
          Los resultados se abren cuando la administración{" "}
          <strong>cierra la encuesta</strong>. Mientras está abierta, el panel
          muestra solo la participación, para que nadie pueda deducir qué
          respondió alguien comparando el antes y el después de un envío.
        </p>
        <p className="text-grafito">En modo Oficial el cierre es definitivo.</p>
      </div>
    );
  }

  const prueba = estado.modo === "prueba";
  const orden = (ORDENES.find((o) => o.id === q.orden)?.id ??
    "promedio") as Orden;
  const [urna, base, cierre] = await Promise.all([
    cargarUrna(prueba),
    universo(),
    estado.cerrada ? fechaCierre() : null,
  ]);
  const n = { A: urna.A.length, E: urna.E.length, F: urna.F.length };
  const href = (ver: string, extra = "") =>
    `/gestion/resultados?ver=${ver}${extra}`;
  const avisoGlobal = avisoPocos(["A", "E", "F"], n);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="titulo text-[30px]">Resultados</h1>
        {prueba && (
          <span className="sello text-lacre text-[13px]">Datos de prueba</span>
        )}
        <p className="text-[16px] text-grafito">
          {(["A", "E", "F"] as Estamento[]).map((e, i) => (
            <span key={e}>
              {i > 0 && " · "}
              {NOMBRE[e]}: <strong className="text-tinta">{n[e]}</strong>
              {base[e].base > 0 && (
                <span>
                  {" "}
                  de {base[e].base} {base[e].texto} (
                  {Math.round((n[e] / base[e].base) * 100)}%)
                </span>
              )}
            </span>
          ))}
        </p>
      </div>
      <p className="text-[14px] text-gris-texto -mt-3">
        {cierre ? `Encuesta cerrada el ${fechaLarga.format(cierre)}. ` : ""}
        Cálculo del {hora.format(new Date())}
      </p>
      {!estado.cerrada && <AvisoEnsayo />}

      <nav aria-label="Vistas de resultados" className="border-b border-filete">
        <ul className="flex flex-wrap -mb-px">
          {VISTAS.map((v) => (
            <li key={v.id}>
              <Link
                href={href(v.id)}
                aria-current={vista === v.id ? "page" : undefined}
                className={`rotulo inline-block px-3 py-2.5 text-[15px] no-underline border-b-2 ${
                  vista === v.id
                    ? "border-tinta text-tinta"
                    : "border-transparent text-grafito hover:text-timbre"
                }`}
              >
                {v.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <p className="text-[15px] text-gris-texto max-w-[80ch]">
        Cada cifra indica su pregunta, estamento y número de respuestas (n). No
        se muestran grupos con menos de {MINIMO} respuestas. Esto es el dato; la
        interpretación es de la comisión.
      </p>

      {vista === "resumen" &&
        (() => {
          const sin = sintesis(urna);
          return (
            <div className="space-y-6">
              {avisoGlobal && (
                <p
                  role="note"
                  className="border-l-4 border-ocre-claro bg-ocre-claro/60 px-3 py-2 text-[16px] text-tinta"
                >
                  {avisoGlobal} En cada pregunta,{" "}
                  <span className="text-lacre font-bold">⚠</span> junto al n
                  marca el estamento con pocos casos.
                </p>
              )}

              <section
                className="bg-papel border border-tinta p-5 space-y-4"
                aria-labelledby="t-sintesis"
              >
                <h2 id="t-sintesis" className="titulo text-[22px]">
                  Síntesis
                </h2>
                <p className="text-[15px] text-grafito -mt-2">
                  Calculada sola a partir de las preguntas comunes, con
                  estamentos de {MINIMO} respuestas o más. No interpreta: señala
                  qué conversar.
                </p>
                <div className="grid gap-5 md:grid-cols-2">
                  <div>
                    <h3 className="font-bold text-[17px]">Coincidencias</h3>
                    <p className="text-[14px] text-grafito mb-1.5">
                      La misma opción es la primera en todos los estamentos.
                    </p>
                    {sin.coincidencias.length ? (
                      <ul className="space-y-1 text-[16px]">
                        {sin.coincidencias.map((c) => (
                          <li key={c.pregunta + c.opcion}>
                            <strong>{c.opcion}</strong>
                            <span className="text-grafito">
                              {" "}
                              · 1° en todos · {c.pregunta}
                            </span>
                            {c.empates.length > 0 && (
                              <span className="block text-[14px] text-grafito">
                                {c.empates
                                  .map(
                                    (x) =>
                                      `en ${NOMBRE[x.e]}, empatada con ${x.con.join(" y ")}`,
                                  )
                                  .join("; ")}
                              </span>
                            )}
                            {c.distintaIntensidad && (
                              <span className="block text-[14px] text-grafito">
                                <span aria-hidden className="text-lacre">
                                  ▲
                                </span>{" "}
                                Coincide en el lugar, no en la intensidad:
                                también está en Diferencias grandes.
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[16px] text-gris-texto">
                        Ninguna opción es la primera en todos.
                      </p>
                    )}
                  </div>
                  <div>
                    <h3 className="font-bold text-[17px]">
                      Diferencias grandes
                    </h3>
                    <p className="text-[14px] text-grafito mb-1.5">
                      {BRECHA} puntos o más entre estamentos.{" "}
                      <span className="text-lacre font-bold">⚠</span>: frágil,
                      con una persona distinta en un estamento de pocos casos
                      bajaría de {BRECHA} puntos.
                    </p>
                    {sin.diferencias.length ? (
                      <ul className="space-y-1.5 text-[16px]">
                        {sin.diferencias.map((d) => (
                          <li key={d.pregunta + d.items[0].opcion}>
                            {d.items.map((it, k) => (
                              <span key={it.opcion}>
                                {k > 0 && (
                                  <span className="text-grafito"> · </span>
                                )}
                                <strong>{it.opcion}</strong>{" "}
                                <span className="tabular-nums">
                                  ({NOMBRE[it.alto[0]]} {it.alto[1]}% /{" "}
                                  {NOMBRE[it.bajo[0]]} {it.bajo[1]}%)
                                </span>
                                {it.fragil && (
                                  <span
                                    className="text-lacre font-bold"
                                    title={`Frágil: con una persona distinta bajaría de ${BRECHA} puntos`}
                                  >
                                    {" "}
                                    ⚠<span className="sr-only"> frágil</span>
                                  </span>
                                )}
                              </span>
                            ))}
                            <span className="text-grafito">
                              {" "}
                              · {d.pregunta}
                              {d.dosEstamentos && " (2 estamentos)"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-[16px] text-gris-texto">
                        No hay diferencias de {BRECHA} puntos o más.
                      </p>
                    )}
                  </div>
                </div>
              </section>

              <section
                id="como-leer"
                className="bg-papel border border-filete p-4 scroll-mt-4"
                aria-labelledby="t-como-leer"
              >
                <h2 id="t-como-leer" className="font-bold text-[17px]">
                  Cómo leer estas tablas
                </h2>
                <ul className="mt-1 list-disc pl-5 space-y-0.5 text-[15px] text-grafito">
                  <li>
                    Las barras van de 0 a 100%. Pase el mouse o toque una barra
                    para ver cuántas personas son.
                  </li>
                  <li>
                    <strong className="text-tinta">1° 2° 3°</strong>: las
                    opciones más elegidas por cada estamento. «=1°» es empate
                    técnico: se separan por una persona o menos. Una opción
                    elegida por una sola persona no recibe lugar.
                  </li>
                  <li>
                    «Sin preferencia clara»: más de 3 opciones comparten un
                    lugar en ese estamento, así que no se marcan lugares.
                  </li>
                  <li>
                    Diferencia: puntos entre el estamento más alto y el más
                    bajo, con los porcentajes que se ven;{" "}
                    <span className="text-lacre">▲</span> desde {BRECHA}. El
                    promedio de estamentos es simple: cada estamento pesa lo
                    mismo, sin importar cuántos respondieron.
                  </li>
                </ul>
              </section>

              <nav
                aria-label="Preguntas del resumen"
                className="bg-papel border border-filete p-4 space-y-3"
              >
                <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-[16px]">
                  {COMPARABLES.map((c, i) => (
                    <li key={c.titulo}>
                      <a
                        href={`#${idDe(c.titulo)}`}
                        className="text-timbre underline"
                      >
                        {i + 1}. {c.titulo}
                      </a>
                    </li>
                  ))}
                </ol>
                <p className="text-[15px] flex flex-wrap items-center gap-x-1 gap-y-1 border-t border-filete pt-3">
                  <span className="text-grafito mr-1">Ordenar por:</span>
                  {ORDENES.map((o) => (
                    <Link
                      key={o.id}
                      href={href("resumen", `&orden=${o.id}`)}
                      aria-current={orden === o.id ? "true" : undefined}
                      className={`px-2 py-1 rounded-[2px] no-underline ${
                        orden === o.id
                          ? "bg-tinta text-papel font-bold"
                          : "text-timbre underline hover:bg-fondo"
                      }`}
                    >
                      {o.texto}
                    </Link>
                  ))}
                </p>
              </nav>

              {COMPARABLES.map((c, i) => {
                const { n: nc, filas } = comparar(c, urna);
                const est = (Object.keys(c.codigos) as Estamento[]).filter(
                  (e) => (nc[e] ?? 0) >= MINIMO,
                );
                return (
                  <details
                    key={c.titulo}
                    id={idDe(c.titulo)}
                    open
                    className="bg-papel border border-filete group scroll-mt-4"
                  >
                    <summary className="cursor-pointer list-none px-5 pt-5 pb-3 flex items-start gap-2">
                      <span
                        aria-hidden
                        className="text-timbre text-[15px] pt-1.5 group-open:rotate-90 transition-transform inline-block"
                      >
                        ▸
                      </span>
                      <span>
                        <span className="block text-[20px] font-bold">
                          {i + 1}. {c.titulo}
                        </span>
                        <span className="block text-[15px] text-grafito font-normal">
                          {(Object.entries(c.codigos) as [Estamento, string][])
                            .map(([e, cod]) => `${cod} (n=${nc[e] ?? 0})`)
                            .join(" · ")}
                          {c.nota ? ` · ${c.nota}` : ""}
                          {c.ordinal ? " · En el orden de la pregunta." : ""}
                        </span>
                      </span>
                    </summary>
                    <div className="px-5 pb-5">
                      {est.length ? (
                        <TablaComparativa
                          filas={filas}
                          estamentos={est}
                          n={nc}
                          ordinal={c.ordinal}
                          orden={orden}
                          conAviso={false}
                        />
                      ) : (
                        <p className="text-gris-texto">
                          Ningún estamento llega a {MINIMO} respuestas.
                        </p>
                      )}
                    </div>
                  </details>
                );
              })}
            </div>
          );
        })()}

      {vista === "prioridades" &&
        (() => {
          const p = prioridades(urna);
          return (
            <section className="bg-papel border border-filete p-5 space-y-3">
              <h2 className="text-[20px] font-bold">
                Prioridades del nuevo PEI y sellos candidatos
              </h2>
              <p className="text-[16px] text-grafito max-w-[85ch]">
                A9 · E6 · F9 (top 3) y A10 · E7 · F10 (la más importante).{" "}
                <strong className="text-tinta">Sello candidato</strong>:
                prioridad entre las 5 primeras en al menos 2 de los 3
                estamentos. Si la mayoría la eligió como la más importante por
                ser una debilidad, se lee como objetivo de mejora; si por
                fortaleza o porque distinguiría a la escuela, como sello. La
                plataforma propone; la decisión es de la comisión.
              </p>
              <Leyenda estamentos={p.validos} />
              {p.validos.length >= 2 ? (
                <TablaPrioridades filas={p.filas} validos={p.validos} />
              ) : (
                <p className="text-gris-texto">
                  Se necesitan al menos 2 estamentos con {MINIMO} respuestas o
                  más.
                </p>
              )}
            </section>
          );
        })()}

      {vista === "escalas" && (
        <div className="space-y-8">
          {(["A", "E", "F"] as Estamento[]).map((e) => {
            const p = preguntasDe(ENCUESTAS[e]).find(
              (x) => x.codigo === ESCALAS_POR[e],
            )!;
            const columnas =
              e === "F"
                ? (
                    ["todos", "docentes", "asistentes"] as GrupoFuncionarios[]
                  ).map((g) => {
                    const lista = filtrarFuncionarios(urna.F, g);
                    const r = resumir(p, lista, ENCUESTAS.F);
                    return {
                      nombre:
                        g === "todos"
                          ? "Total"
                          : g === "docentes"
                            ? "Docentes"
                            : "Asistentes",
                      items:
                        lista.length >= MINIMO && r.tipo === "escala"
                          ? r.items
                          : null,
                    };
                  })
                : [
                    {
                      nombre: "Total",
                      items: (() => {
                        const r = resumir(p, urna[e], ENCUESTAS[e]);
                        return urna[e].length >= MINIMO && r.tipo === "escala"
                          ? r.items
                          : null;
                      })(),
                    },
                  ];
            return (
              <section key={e} className="bg-papel border border-filete p-5">
                <h2 className="text-[20px] font-bold inline-flex items-center gap-2">
                  <Muestra e={e} /> {NOMBRE[e]} · {p.codigo}
                </h2>
                <p className="text-[15px] text-grafito mb-3">
                  {p.texto} · %{" "}
                  {e === "E"
                    ? "casi siempre o siempre"
                    : "de acuerdo o muy de acuerdo"}
                  , sin contar «No sé» · n={n[e]}
                  {e === "F" && " · se separa solo entre docentes y asistentes"}
                </p>
                <CalorEscala columnas={columnas} />
              </section>
            );
          })}
        </div>
      )}

      {vista === "abiertas" &&
        (await (async () => {
          await sincronizarTextos(prueba);
          const [textos, temas] = await Promise.all([
            listarTextos(prueba),
            listarTemas(),
          ]);
          const clasificados = textos.filter(
            (t) => t.estado === "revisado" && t.tema1,
          );
          if (!clasificados.length) {
            return (
              <p className="text-grafito max-w-[75ch]">
                Aún no hay clasificación cargada. Primero se revisan los nombres
                y se carga la clasificación en Panel → Abiertas.
              </p>
            );
          }
          const est = (["A", "E", "F"] as Estamento[]).filter(
            (e) =>
              clasificados.filter((t) => t.estamento === e).length >= MINIMO,
          );
          const nE = Object.fromEntries(
            (["A", "E", "F"] as Estamento[]).map((e) => [
              e,
              clasificados.filter((t) => t.estamento === e).length,
            ]),
          );
          const filas = temas
            .map((t) => {
              const pct: Partial<Record<Estamento, number | null>> = {};
              for (const e of ["A", "E", "F"] as Estamento[]) {
                const lista = clasificados.filter((x) => x.estamento === e);
                pct[e] =
                  lista.length < MINIMO
                    ? null
                    : (lista.filter((x) =>
                        [x.tema1, x.tema2, x.tema3].includes(t.codigo),
                      ).length /
                        lista.length) *
                      100;
              }
              return {
                opcion: {
                  codigo: t.codigo,
                  texto: `${t.codigo} · ${t.nombre}`,
                },
                pct,
              };
            })
            .filter((f) => Object.values(f.pct).some((v) => (v ?? 0) > 0));
          const nuevos = clasificados
            .filter((t) => t.temaNuevo)
            .map((t) => t.temaNuevo!);
          const citas = clasificados.filter((t) => t.cita);
          return (
            <div className="space-y-8">
              <section className="bg-papel border border-filete p-5">
                <h2 className="text-[20px] font-bold">
                  Temas de las respuestas abiertas
                </h2>
                <p className="text-[15px] text-grafito mb-3">
                  % de textos clasificados que mencionan cada tema (un texto
                  puede tener hasta 3) ·{" "}
                  {(["A", "E", "F"] as Estamento[])
                    .map((e) => `${NOMBRE[e]} n=${nE[e]}`)
                    .join(" · ")}
                </p>
                {est.length ? (
                  <TablaComparativa
                    filas={filas}
                    estamentos={est}
                    n={nE}
                    encabezado="Tema"
                  />
                ) : (
                  <p className="text-gris-texto">
                    Ningún estamento llega a {MINIMO} textos clasificados.
                  </p>
                )}
              </section>
              {nuevos.length > 0 && (
                <section className="bg-papel border border-filete p-5">
                  <h2 className="text-[20px] font-bold">
                    Temas nuevos propuestos (T98)
                  </h2>
                  <ul className="mt-2 columns-1 sm:columns-2 text-[16px]">
                    {[...new Set(nuevos)].map((x) => (
                      <li key={x}>
                        {x}{" "}
                        <span className="text-grafito">
                          ({nuevos.filter((y) => y === x).length})
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="bg-papel border border-filete p-5">
                <h2 className="text-[20px] font-bold">
                  Citas destacadas ({citas.length})
                </h2>
                <p className="text-[15px] text-grafito mb-3">
                  Textos ya revisados, sin nombres de personas.
                </p>
                <ul className="space-y-3">
                  {citas.map((c) => (
                    <li key={c.id} className="border-l border-grafito pl-3">
                      <p className="text-[17px]">«{c.texto}»</p>
                      <p className="text-[14px] text-grafito">
                        {NOMBRE[c.estamento]} · {c.pregunta}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          );
        })())}

      {(vista === "A" || vista === "E" || vista === "F") &&
        (() => {
          const e = vista as Estamento;
          const lista =
            e === "F" ? filtrarFuncionarios(urna.F, grupo) : urna[e];
          if (lista.length < MINIMO) {
            return (
              <p className="text-gris-texto">
                Este grupo tiene menos de {MINIMO} respuestas: no se muestra.
              </p>
            );
          }
          return (
            <div className="space-y-5">
              {e === "F" && (
                <nav
                  aria-label="Grupo de funcionarios"
                  className="flex flex-wrap gap-2"
                >
                  {(
                    ["todos", "docentes", "asistentes"] as GrupoFuncionarios[]
                  ).map((g) => (
                    <Link
                      key={g}
                      href={href("F", g === "todos" ? "" : `&grupo=${g}`)}
                      aria-current={grupo === g ? "true" : undefined}
                      className={`boton !min-h-11 !py-1.5 text-[16px] no-underline ${grupo === g ? "bg-tinta text-papel" : "boton-secundario"}`}
                    >
                      {g === "todos"
                        ? "Todos"
                        : g === "docentes"
                          ? "Docentes"
                          : "Asistentes"}
                    </Link>
                  ))}
                  <span className="self-center text-[15px] text-grafito">
                    n={lista.length}
                  </span>
                </nav>
              )}
              {preguntasDe(ENCUESTAS[e]).map((p) => {
                if (e === "F" && p.codigo === "F1") return null;
                const r = resumir(p, lista, ENCUESTAS[e]);
                return (
                  <section
                    key={p.codigo}
                    className="bg-papel border border-filete p-5"
                    aria-labelledby={`p-${p.codigo}`}
                  >
                    <h2 id={`p-${p.codigo}`} className="text-[19px] font-bold">
                      <span className="rotulo text-timbre mr-2">
                        {p.numero}
                      </span>
                      {p.texto}
                    </h2>
                    <p className="text-[15px] text-grafito mb-3">
                      {p.codigo} · {NOMBRE[e]}
                      {e === "F" && grupo !== "todos" ? ` (${grupo})` : ""} · n=
                      {r.n}
                      {GESTION.includes(p.codigo) &&
                        " · gestión: solo total o docentes/asistentes"}
                    </p>
                    {r.tipo === "opciones" && (
                      <>
                        <BarrasOpciones
                          opciones={r.opciones}
                          e={e}
                          ordenar={p.tipo !== "unica"}
                        />
                        {r.textosOtra > 0 && (
                          <p className="mt-2 text-[15px] text-grafito">
                            {r.textosOtra} texto(s) en «Otra»: se leen en
                            Abiertas, después de la revisión de nombres.
                          </p>
                        )}
                      </>
                    )}
                    {r.tipo === "escala" && (
                      <ul className="divide-y divide-filete">
                        {r.items.map((it) => (
                          <li key={it.codigo} className="py-2">
                            <p>{it.texto}</p>
                            <DistribucionItem
                              it={it}
                              escala={r.pregunta.escala}
                            />
                          </li>
                        ))}
                      </ul>
                    )}
                    {r.tipo === "abierta" && (
                      <p className="text-grafito">
                        {r.escritas} respuesta(s) escrita(s). Se leen en
                        Abiertas, después de la revisión de nombres.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          );
        })()}
    </div>
  );
}
