import "server-only";
import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { listarTemas, listarTextos, type Texto } from "./abiertas";
import { NIVELES } from "./cursos-iniciales";
import {
  ENCUESTAS,
  VERSION_INSTRUMENTO,
  preguntasDe,
  type Estamento,
  type Pregunta,
  type Respuestas,
} from "./encuestas";
import { ESCALAS } from "./encuestas/listas";
import { avance } from "./gestion";
import {
  COMPARABLES,
  MINIMO,
  cargarUrna,
  comparar,
  filtrarFuncionarios,
  prepararComparativa,
  prioridades,
  resumir,
  type Comparable,
  type FilaVista,
  type GrupoFuncionarios,
} from "./resultados";

/**
 * Informe final (MVP): un modelo de datos que se dibuja igual en la página del panel, en la
 * página pública y en el PDF. Solo datos: cada cifra lleva pregunta, estamento y n; la
 * interpretación es de la comisión. Grupos con menos de 5 respuestas no se muestran.
 */

export const NOMBRE: Record<Estamento, string> = {
  A: "Apoderados",
  E: "Estudiantes",
  F: "Funcionarios",
};
const ESTAMENTOS: Estamento[] = ["A", "E", "F"];

export type FilaBarra = { texto: string; pct: number; conteo: number };
export type Bloque =
  | { tipo: "parrafo"; texto: string }
  | { tipo: "nota"; texto: string }
  | {
      tipo: "cifras";
      items: {
        etiqueta: string;
        valor: string;
        detalle?: string;
        e?: Estamento;
      }[];
    }
  | {
      tipo: "barras";
      titulo: string;
      origen: string;
      e: Estamento;
      filas: FilaBarra[];
    }
  | {
      tipo: "comparativa";
      titulo: string;
      origen: string;
      encabezado: string;
      estamentos: Estamento[];
      /** Ya preparadas: orden, lugar 1°–3° por estamento y filas menores (ver prepararComparativa). */
      filas: FilaVista[];
      pocos: string | null;
    }
  | {
      tipo: "tabla";
      titulo?: string;
      origen?: string;
      columnas: string[];
      filas: string[][];
      numericas?: number[];
    }
  | {
      tipo: "citas";
      titulo: string;
      citas: { texto: string; origen: string }[];
    };

export type Seccion = {
  id: string;
  numero: string;
  titulo: string;
  aporta: string;
  preguntas: string;
  bloques: Bloque[];
};
export type Informe = {
  prueba: boolean;
  cerrada: boolean;
  generado: Date;
  n: Record<Estamento, number>;
  secciones: Seccion[];
  anexos: Seccion[];
};

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);
export const fmtPct = (x: number) => `${Math.round(x)}%`;
const origen = (codigos: string, e: Estamento | string, n: number) =>
  `${codigos} · ${typeof e === "string" && e in NOMBRE ? NOMBRE[e as Estamento] : e} · n = ${n}`;
const ESPECIALES = ["96", "97", "98", "99"];

function pregunta(codigo: string): { p: Pregunta; e: Estamento } {
  const e = codigo[0] as Estamento;
  const p = preguntasDe(ENCUESTAS[e]).find((x) => x.codigo === codigo);
  if (!p) throw new Error(`Pregunta ${codigo} no existe`);
  return { p, e };
}

const menosDe = (codigo: string, e: Estamento | string) =>
  ({
    tipo: "nota",
    texto: `${codigo} · ${typeof e === "string" && e in NOMBRE ? NOMBRE[e as Estamento] : e}: menos de ${MINIMO} respuestas; no se muestra.`,
  }) as Bloque;

/** Barras de una pregunta de opciones en un estamento (o subgrupo de funcionarios). */
function barras(
  codigo: string,
  lista: Respuestas[],
  opciones: { titulo?: string; ordenar?: boolean; grupo?: string } = {},
): Bloque {
  const { p, e } = pregunta(codigo);
  const r = resumir(p, lista, ENCUESTAS[e]);
  const quien = opciones.grupo ?? NOMBRE[e];
  if (r.tipo !== "opciones") throw new Error(`${codigo} no es de opciones`);
  if (r.n < MINIMO) return menosDe(codigo, quien);
  let filas = r.opciones
    .filter((o) => !(ESPECIALES.includes(o.codigo) && o.conteo === 0))
    .map((o) => ({
      texto: `${/^[a-o]$/.test(o.codigo) ? `${o.codigo}) ` : ""}${o.texto}`,
      pct: o.pct,
      conteo: o.conteo,
    }));
  if (opciones.ordenar !== false) filas = filas.sort((a, b) => b.pct - a.pct);
  return {
    tipo: "barras",
    titulo: opciones.titulo ?? p.texto,
    origen: origen(codigo, quien, r.n),
    e,
    filas,
  };
}

function comparativa(
  c: Comparable,
  urna: Record<Estamento, Respuestas[]>,
  titulo = c.titulo,
): Bloque {
  const { n, filas } = comparar(c, urna);
  const est = (Object.keys(c.codigos) as Estamento[]).filter(
    (e) => (n[e] ?? 0) >= MINIMO,
  );
  const codigos = Object.values(c.codigos).join(", ");
  const ns = (Object.keys(c.codigos) as Estamento[])
    .map((e) => `${e} ${n[e] ?? 0}`)
    .join(" · ");
  if (!est.length)
    return {
      tipo: "nota",
      texto: `${codigos}: ningún estamento llega a ${MINIMO} respuestas.`,
    };
  const vista = prepararComparativa({
    filas: filas.map((f) => ({ texto: f.opcion.texto, pct: f.pct })),
    estamentos: est,
    n,
    ordinal: c.ordinal,
  });
  return {
    tipo: "comparativa",
    titulo,
    origen: `${codigos} · n = ${ns}${c.nota ? ` · ${c.nota}` : ""}`,
    encabezado: "Opción",
    estamentos: est,
    filas: vista.filas,
    pocos: vista.pocos,
  };
}

const comparable = (titulo: string) =>
  COMPARABLES.find((c) => c.titulo.startsWith(titulo))!;

/** Escala: % de acuerdo o frecuencia alta (3 o 4) por frase, en columnas por grupo; con «No sé» si aplica. */
function escala(
  codigo: string,
  grupos: { nombre: string; lista: Respuestas[] }[],
): Bloque[] {
  const { p, e } = pregunta(codigo);
  if (p.tipo !== "escala") throw new Error(`${codigo} no es escala`);
  const validos = grupos.filter((g) => g.lista.length >= MINIMO);
  if (!validos.length) return [menosDe(codigo, NOMBRE[e])];
  const resumenes = validos.map((g) => resumir(p, g.lista, ENCUESTAS[e]));
  const conNoSe = p.escala === "ACU";
  const columnas = [
    "Frase",
    ...validos.map((g) => `${g.nombre} (n ${g.lista.length})`),
    ...(conNoSe ? ["No sé"] : []),
  ];
  const items = p.grupos.flatMap((g) =>
    g.items.map((it) => ({ ...it, grupo: g.titulo })),
  );
  const filas = items.map((it, i) => [
    `${it.grupo ? `${it.grupo}: ` : ""}${it.texto}`,
    ...resumenes.map((r) =>
      r.tipo === "escala" ? fmtPct(r.items[i].favorable) : "",
    ),
    ...(conNoSe && resumenes[0].tipo === "escala"
      ? [fmtPct(resumenes[0].items[i].noSe)]
      : []),
  ]);
  const medida =
    p.escala === "ACU"
      ? "% de acuerdo («De acuerdo» + «Muy de acuerdo») entre quienes opinaron"
      : "% «Casi siempre» + «Siempre»";
  return [
    {
      tipo: "tabla",
      titulo: p.texto,
      origen: `${codigo} · ${NOMBRE[e]} · ${medida}${conNoSe ? `; «No sé» sobre el total${validos.length > 1 ? ` (${validos[0].nombre})` : ""}` : ""}`,
      columnas,
      filas,
      numericas: columnas.map((_, i) => i).slice(1),
    },
  ];
}

/** Opciones donde los estamentos difieren 20 puntos o más. */
function brechas(urna: Record<Estamento, Respuestas[]>) {
  const filas: string[][] = [];
  for (const c of COMPARABLES) {
    const { n, filas: fs } = comparar(c, urna);
    const est = (Object.keys(c.codigos) as Estamento[]).filter(
      (e) => (n[e] ?? 0) >= MINIMO,
    );
    if (est.length < 2) continue;
    for (const f of fs) {
      const v = est.map((e) => f.pct[e] ?? 0);
      const dif = Math.max(...v) - Math.min(...v);
      if (dif >= 20) {
        filas.push([
          c.titulo,
          f.opcion.texto,
          ...ESTAMENTOS.map((e) =>
            est.includes(e) ? fmtPct(f.pct[e] ?? 0) : "—",
          ),
          `${Math.round(dif)} pts`,
        ]);
      }
    }
  }
  return filas;
}

/** Temas de las respuestas abiertas por estamento (% de textos clasificados que mencionan el tema). */
function temasPorEstamento(
  titulo: string,
  textos: Texto[],
  temas: { codigo: string; nombre: string }[],
  preguntas?: string[],
): Bloque {
  const clasificados = textos.filter(
    (t) =>
      t.estado === "revisado" &&
      t.tema1 &&
      (!preguntas || preguntas.includes(t.pregunta)),
  );
  const n = Object.fromEntries(
    ESTAMENTOS.map((e) => [
      e,
      clasificados.filter((t) => t.estamento === e).length,
    ]),
  ) as Record<Estamento, number>;
  const est = ESTAMENTOS.filter((e) => n[e] >= MINIMO);
  if (!est.length)
    return {
      tipo: "nota",
      texto: `${titulo}: ningún estamento llega a ${MINIMO} textos clasificados.`,
    };
  const filas = temas
    .map((t) => {
      const fila: Partial<Record<Estamento, number | null>> = {};
      for (const e of est) {
        const lista = clasificados.filter((x) => x.estamento === e);
        fila[e] = pct(
          lista.filter((x) => [x.tema1, x.tema2, x.tema3].includes(t.codigo))
            .length,
          lista.length,
        );
      }
      return { texto: `${t.codigo} ${t.nombre}`, pct: fila };
    })
    .filter((f) => est.some((e) => (f.pct[e] ?? 0) > 0));
  const vista = prepararComparativa({ filas, estamentos: est, n });
  return {
    tipo: "comparativa",
    titulo,
    origen: `${preguntas?.join(", ") ?? "Todas las abiertas"} · textos clasificados: ${est.map((e) => `${e} ${n[e]}`).join(" · ")} · % de textos que mencionan el tema; un texto puede tener hasta 3, por eso no suma 100%`,
    encabezado: "Tema",
    estamentos: est,
    filas: vista.filas,
    pocos: vista.pocos,
  };
}

export async function armarInforme(opciones: {
  prueba: boolean;
  cerrada: boolean;
  publico?: boolean;
}): Promise<Informe> {
  const { prueba } = opciones;
  const [urna, textos, temas, av, bitacora] = await Promise.all([
    cargarUrna(prueba),
    listarTextos(prueba),
    listarTemas(),
    avance(),
    opciones.publico
      ? Promise.resolve([])
      : db.select().from(schema.bitacora).orderBy(asc(schema.bitacora.id)),
  ]);
  const n = { A: urna.A.length, E: urna.E.length, F: urna.F.length };
  const prio = prioridades(urna);
  const docentes = filtrarFuncionarios(urna.F, "docentes");
  const asistentes = filtrarFuncionarios(urna.F, "asistentes");
  const gruposF = (g: GrupoFuncionarios[]) =>
    g.map((x) => ({
      nombre:
        x === "todos" ? "Total" : x === "docentes" ? "Docentes" : "Asistentes",
      lista: filtrarFuncionarios(urna.F, x),
    }));

  // ---------- Participación ----------
  const suma = (k: "apoderados" | "estudiantes") =>
    av.filas.reduce(
      (s, f) => {
        const c = f[k];
        return c ? { usadas: s.usadas + c.usadas, base: s.base + c.base } : s;
      },
      { usadas: 0, base: 0 },
    );
  const partA = suma("apoderados");
  const partE = suma("estudiantes");
  const partF = av.funcionarios;
  const tasa = (u: number, b: number) => (b ? fmtPct(pct(u, b)) : "—");
  const cifrasParticipacion: Bloque = {
    tipo: "cifras",
    items: [
      {
        etiqueta: "Apoderados",
        valor: String(n.A),
        detalle: `${tasa(n.A, partA.base)} de ${partA.base} papeletas entregadas`,
        e: "A",
      },
      {
        etiqueta: "Estudiantes",
        valor: String(n.E),
        detalle: `${tasa(n.E, partE.base)} de ${partE.base} (5° a 8°)`,
        e: "E",
      },
      {
        etiqueta: "Funcionarios",
        valor: String(n.F),
        detalle: `${tasa(n.F, partF.base)} de ${partF.base}`,
        e: "F",
      },
    ],
  };
  const porNivel = Object.keys(NIVELES).map((nivel) => {
    const fs = av.filas.filter((f) => f.nivel === nivel);
    const a = fs.reduce(
      (s, f) => ({ u: s.u + f.apoderados.usadas, b: s.b + f.apoderados.base }),
      { u: 0, b: 0 },
    );
    const e = fs
      .filter((f) => f.estudiantes)
      .reduce(
        (s, f) => ({
          u: s.u + f.estudiantes!.usadas,
          b: s.b + f.estudiantes!.base,
        }),
        { u: 0, b: 0 },
      );
    return [
      NIVELES[nivel],
      `${a.u} de ${a.b}`,
      tasa(a.u, a.b),
      e.b ? `${e.u} de ${e.b}` : "—",
      e.b ? tasa(e.u, e.b) : "—",
    ];
  });
  const a1 = resumir(pregunta("A1").p, urna.A, ENCUESTAS.A);
  const representados =
    a1.tipo === "opciones"
      ? a1.opciones.reduce((s, o) => s + Number(o.codigo) * o.conteo, 0)
      : 0;

  // ---------- Resumen ejecutivo ----------
  const candidatos = prio.filas.filter((f) => f.candidato);
  const top3 = (c: Comparable) => {
    const { n: nc, filas } = comparar(c, urna);
    const est = (Object.keys(c.codigos) as Estamento[]).filter(
      (e) => (nc[e] ?? 0) >= MINIMO,
    );
    if (!est.length) return null;
    const prom = (f: (typeof filas)[number]) =>
      est.reduce((s, e) => s + (f.pct[e] ?? 0), 0) / est.length;
    return [...filas]
      .sort((a, b) => prom(b) - prom(a))
      .slice(0, 3)
      .map((f) => `${f.opcion.texto} (${fmtPct(prom(f))})`);
  };
  const clasificados = textos.filter((t) => t.estado === "revisado" && t.tema1);
  const conteoTemas = temas
    .filter((t) => !["T98", "T99"].includes(t.codigo))
    .map((t) => ({
      t,
      c: clasificados.filter((x) =>
        [x.tema1, x.tema2, x.tema3].includes(t.codigo),
      ).length,
    }))
    .filter((x) => x.c > 0)
    .sort((a, b) => b.c - a.c)
    .slice(0, 3);
  const lineas: string[][] = [];
  const pushLinea = (que: string, v: string[] | null, fuente: string) =>
    lineas.push([
      que,
      v?.join(" · ") ?? `Menos de ${MINIMO} respuestas`,
      fuente,
    ]);
  pushLinea(
    "Sellos candidatos (top 5 en 2 o más estamentos)",
    candidatos.length
      ? candidatos.map(
          (f) =>
            `${f.opcion.codigo}) ${f.opcion.texto}${f.converge ? " (los 3 estamentos)" : ""}`,
        )
      : ["Ninguno cumple la regla"],
    "A9, E6, F9",
  );
  pushLinea(
    "Propósito más elegido",
    top3(comparable("Propósito")),
    "A8, E5, F5 · promedio de estamentos",
  );
  pushLinea(
    "Valores más elegidos",
    top3(comparable("Valores")),
    "A15, E10, F16 · promedio de estamentos",
  );
  pushLinea(
    "Perfil de egreso más elegido",
    top3(comparable("Perfil de egreso")),
    "A16, E11, F17 · promedio de estamentos",
  );
  pushLinea(
    "Temas más mencionados en las abiertas",
    clasificados.length >= MINIMO
      ? conteoTemas.map((x) => `${x.t.nombre} (${x.c} textos)`)
      : null,
    "A19–A20, E13–E14, F20–F21",
  );

  // ---------- Insumos ----------
  const noSe: string[][] = [];
  for (const e of ESTAMENTOS) {
    if (urna[e].length < MINIMO) continue;
    for (const p of preguntasDe(ENCUESTAS[e])) {
      const r = resumir(p, urna[e], ENCUESTAS[e]);
      if (r.tipo === "escala") {
        for (const it of r.items)
          if (it.noSe >= 20)
            noSe.push([
              `${p.codigo}_${it.codigo}`,
              NOMBRE[e],
              it.texto,
              fmtPct(it.noSe),
            ]);
      } else if (r.tipo === "opciones" && r.n >= MINIMO) {
        const o = r.opciones.find((x) => x.codigo === "98");
        if (o && o.pct >= 20)
          noSe.push([p.codigo, NOMBRE[e], p.texto, fmtPct(o.pct)]);
      }
    }
  }
  const nuevos = new Map<string, number>();
  for (const t of clasificados)
    if (t.temaNuevo && [t.tema1, t.tema2, t.tema3].includes("T98"))
      nuevos.set(t.temaNuevo, (nuevos.get(t.temaNuevo) ?? 0) + 1);
  const listaBrechas = brechas(urna);

  // ---------- Línea base ----------
  const base: string[][] = [];
  for (const [codigo, e] of [
    ["A2", "A"],
    ["E1", "E"],
    ["F2", "F"],
  ] as [string, Estamento][]) {
    const r = resumir(pregunta(codigo).p, urna[e], ENCUESTAS[e]);
    if (r.tipo === "opciones" && r.n >= MINIMO)
      base.push([
        codigo,
        "Conoce el lema o los sellos (Sí)",
        NOMBRE[e],
        String(r.n),
        fmtPct(r.opciones.find((o) => o.codigo === "1")?.pct ?? 0),
      ]);
  }
  for (const [codigo, e, lista] of [
    ["A5", "A", urna.A],
    ["E2", "E", urna.E],
    ["F7", "F", urna.F],
  ] as [string, Estamento, Respuestas[]][]) {
    if (lista.length < MINIMO) continue;
    const r = resumir(pregunta(codigo).p, lista, ENCUESTAS[e]);
    if (r.tipo !== "escala") continue;
    for (const it of r.items)
      base.push([
        `${codigo}_${it.codigo}`,
        `${it.grupo ? `${it.grupo}: ` : ""}${it.texto}`,
        NOMBRE[e],
        String(it.n),
        fmtPct(it.favorable),
      ]);
  }

  const citas = textos
    .filter((t) => t.estado === "revisado" && t.cita)
    .map((t) => ({
      texto: t.texto,
      origen: `${t.pregunta} · ${NOMBRE[t.estamento]}`,
    }));

  const secciones: Seccion[] = [
    {
      id: "resumen",
      numero: "1",
      titulo: "Resumen ejecutivo",
      aporta: "Visión general para la comisión y el Consejo Escolar",
      preguntas: "Todas",
      bloques: [
        cifrasParticipacion,
        {
          tipo: "tabla",
          columnas: ["Qué", "Lo que respondió la comunidad", "Origen"],
          filas: lineas,
        },
        {
          tipo: "nota",
          texto:
            "Estos son datos, no conclusiones. La plataforma propone sellos candidatos con una regla fija; la decisión es siempre de la comisión.",
        },
      ],
    },
    {
      id: "participacion",
      numero: "2",
      titulo: "Participación y representatividad",
      aporta: "Evidencia de construcción participativa",
      preguntas: "Padrón, A1",
      bloques: [
        cifrasParticipacion,
        {
          tipo: "tabla",
          titulo: "Participación por nivel",
          origen:
            "Padrón de credenciales usadas · base: papeletas entregadas (apoderados) y matrícula (estudiantes)",
          columnas: ["Nivel", "Apoderados", "%", "Estudiantes", "%"],
          filas: porNivel,
          numericas: [2, 4],
        },
        barras("A1", urna.A, { ordenar: false }),
        {
          tipo: "parrafo",
          texto: `Familias estimadas: cada encuesta de apoderados corresponde a una familia (se entrega por el hijo o hija menor). Las ${n.A} familias que respondieron representan al menos ${representados} estudiantes, según A1.`,
        },
        {
          tipo: "parrafo",
          texto:
            "Limitaciones: la participación fue voluntaria, así que quienes respondieron pueden no representar a toda la comunidad. Si alguna familia recibió más de una papeleta, se le pidió responder una sola vez; el efecto esperado es bajo. Los grupos con menos de 5 respuestas no se informan.",
        },
      ],
    },
    {
      id: "identidad",
      numero: "3",
      titulo: "Identidad actual",
      aporta: "Qué se conserva y qué se reformula del ideario",
      preguntas: "A2–A4, A7, E1, E3, F2–F4, F6",
      bloques: [
        comparativa(comparable("Conocimiento"), urna),
        barras("A7", urna.A, {
          titulo: "¿La visión actual representa lo que quiere para la escuela?",
          ordenar: false,
        }),
        barras("F3", urna.F, {
          titulo: "¿La visión actual sigue representando a la escuela?",
          ordenar: false,
        }),
        barras("F4", urna.F, {
          titulo: "¿La misión actual sigue representando a la escuela?",
          ordenar: false,
        }),
        barras("A3", urna.A),
        barras("A4", urna.A),
        barras("E3", urna.E),
        barras("F6", urna.F),
      ],
    },
    {
      id: "diagnostico",
      numero: "4",
      titulo: "Diagnóstico",
      aporta: "Diagnóstico y vínculo con el PME",
      preguntas: "A5, A6, E2, E4, F7, F8",
      bloques: [
        ...escala("A5", [{ nombre: "Apoderados", lista: urna.A }]),
        ...escala("E2", [{ nombre: "Estudiantes", lista: urna.E }]),
        ...escala("F7", gruposF(["todos", "docentes", "asistentes"])),
        {
          tipo: "nota",
          texto:
            "F7 y F8 se informan solo en total o separados entre docentes y asistentes, nunca con otra característica.",
        },
        barras("A6", urna.A),
        barras("E4", urna.E),
        barras("F8", urna.F, {
          titulo:
            "Principales nudos que traban el avance (funcionarios, total)",
        }),
        ...(docentes.length >= MINIMO && asistentes.length >= MINIMO
          ? [
              barras("F8", docentes, {
                grupo: "Docentes",
                titulo: "Nudos según docentes",
              }),
              barras("F8", asistentes, {
                grupo: "Asistentes",
                titulo: "Nudos según asistentes",
              }),
            ]
          : []),
      ],
    },
    {
      id: "proposito",
      numero: "5",
      titulo: "Propósito de la escuela",
      aporta: "Misión",
      preguntas: "A8, E5, F5",
      bloques: [comparativa(comparable("Propósito"), urna)],
    },
    {
      id: "prioridades",
      numero: "6",
      titulo: "Prioridades y sellos candidatos",
      aporta: "Sellos, objetivos estratégicos y líneas de acción",
      preguntas: "A9–A13, E6–E8, F9–F13",
      bloques: [
        {
          tipo: "parrafo",
          texto: `Regla: es sello candidato una prioridad que está entre las 5 primeras del top 3 en al menos 2 de los 3 estamentos (con ${MINIMO} respuestas o más). Si la mayoría la eligió como la más importante por ser una debilidad, se propone como objetivo de mejora y no como sello.`,
        },
        prio.validos.length >= 2
          ? {
              tipo: "tabla",
              titulo:
                "Prioridades: % que la puso en su top 3 (lugar en el estamento)",
              origen: `A9, E6, F9 · n = ${ESTAMENTOS.map((e) => `${e} ${n[e]}`).join(" · ")}`,
              columnas: [
                "Prioridad",
                ...prio.validos.map((e) => NOMBRE[e]),
                "Lectura",
              ],
              numericas: prio.validos.map((_, i) => i + 1),
              filas: prio.filas.map((f) => {
                const r = f.razones;
                const mejora = r.total >= MINIMO && r.debilidad > r.total / 2;
                return [
                  `${f.opcion.codigo}) ${f.opcion.texto}`,
                  ...prio.validos.map((e) =>
                    f.por[e]
                      ? `${fmtPct(f.por[e]!.pctTop3)} (${f.por[e]!.rango}°)`
                      : "—",
                  ),
                  f.candidato
                    ? mejora
                      ? "Candidato a objetivo de mejora"
                      : f.converge
                        ? "Sello candidato · 3 estamentos"
                        : "Sello candidato"
                    : "",
                ];
              }),
            }
          : {
              tipo: "nota",
              texto: `Se necesitan al menos 2 estamentos con ${MINIMO} respuestas o más.`,
            },
        candidatos.length
          ? {
              tipo: "tabla",
              titulo:
                "Por qué la eligieron como la más importante (sellos candidatos)",
              origen: "A10–A11, E7–E8, F10–F11 · todos los estamentos juntos",
              columnas: [
                "Prioridad",
                "n",
                "Debilidad",
                "Fortaleza",
                "Futuro",
                "Familias del sector",
                "Distinguiría",
                "Otra",
              ],
              filas: candidatos.map((f) => {
                const r = f.razones;
                const p = (x: number) =>
                  r.total >= MINIMO ? fmtPct(pct(x, r.total)) : "—";
                return [
                  `${f.opcion.codigo}) ${f.opcion.texto}`,
                  String(r.total),
                  p(r.debilidad),
                  p(r.fortaleza),
                  p(r.futuro),
                  p(r.sector),
                  p(r.distinguiria),
                  p(r.otra),
                ];
              }),
              numericas: [1, 2, 3, 4, 5, 6, 7],
            }
          : {
              tipo: "nota",
              texto:
                "Ninguna prioridad cumple todavía la regla de sello candidato.",
            },
        barras("A12", urna.A),
        barras("F12", urna.F),
        barras("A13", urna.A),
        barras("F13", urna.F),
      ],
    },
    {
      id: "enfoques",
      numero: "7",
      titulo: "Enfoques educativos",
      aporta: "Principios y enfoques",
      preguntas: "F15",
      bloques: [barras("F15", urna.F)],
    },
    {
      id: "valores",
      numero: "8",
      titulo: "Valores",
      aporta: "Valores",
      preguntas: "A15, E10, F16",
      bloques: [comparativa(comparable("Valores"), urna)],
    },
    {
      id: "perfiles",
      numero: "9",
      titulo: "Perfiles",
      aporta: "Perfiles de egreso, docente y familia",
      preguntas: "A16–A18, E11–E12, F17–F19",
      bloques: [
        comparativa(comparable("Perfil de egreso"), urna),
        comparativa(comparable("Perfil docente"), urna),
        comparativa(comparable("Perfil de la familia"), urna),
      ],
    },
    {
      id: "voces",
      numero: "10",
      titulo: "Voces de la comunidad",
      aporta: "Visión y líneas de acción",
      preguntas: "A19–A20, E13–E14, F20–F21",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Textos revisados (sin nombres de personas) y clasificados por la comisión. Los marcados «no publicar» no aparecen.",
        },
        temasPorEstamento("La escuela en el 2030: temas", textos, temas, [
          "A19",
          "E13",
          "F20",
        ]),
        temasPorEstamento("Cambios propuestos: temas", textos, temas, [
          "A20",
          "E14",
          "F21",
        ]),
        citas.length
          ? { tipo: "citas", titulo: "Citas destacadas", citas }
          : { tipo: "nota", texto: "Aún no hay citas destacadas." },
      ],
    },
    {
      id: "entorno",
      numero: "11",
      titulo: "Entorno y referentes",
      aporta: "Contexto comparado",
      preguntas: "A14, E9, F14 y estudio de referentes",
      bloques: [
        comparativa(comparable("Redes"), urna),
        {
          tipo: "nota",
          texto:
            "Los sellos frecuentes en los colegios top 20 SIMCE de Antofagasta y Chile vienen del estudio de referentes de la comisión; no son datos de esta encuesta.",
        },
      ],
    },
    {
      id: "insumos",
      numero: "12",
      titulo: "Insumos para la redacción y temas para taller",
      aporta: "Borradores de visión, misión, sellos, valores y perfiles",
      preguntas: "Secciones 3–11",
      bloques: [
        listaBrechas.length
          ? {
              tipo: "tabla",
              titulo: "Diferencias entre estamentos (20 puntos o más)",
              origen: "Preguntas comunes a los estamentos",
              columnas: [
                "Pregunta",
                "Opción",
                "Apoderados",
                "Estudiantes",
                "Funcionarios",
                "Diferencia",
              ],
              filas: listaBrechas,
              numericas: [2, 3, 4, 5],
            }
          : {
              tipo: "nota",
              texto: "No hay diferencias de 20 puntos o más entre estamentos.",
            },
        noSe.length
          ? {
              tipo: "tabla",
              titulo: "Preguntas con mucho «No sé» (20% o más)",
              columnas: ["Código", "Estamento", "Pregunta o frase", "No sé"],
              filas: noSe,
              numericas: [3],
            }
          : { tipo: "nota", texto: "Ninguna pregunta llega a 20% de «No sé»." },
        nuevos.size
          ? {
              tipo: "tabla",
              titulo: "Temas nuevos y no preguntados (T98)",
              origen: "Etiquetas que escribió la comisión al clasificar",
              columnas: ["Etiqueta", "Textos"],
              filas: [...nuevos]
                .sort((a, b) => b[1] - a[1])
                .map(([k, v]) => [k, String(v)]),
              numericas: [1],
            }
          : {
              tipo: "nota",
              texto: "No hay temas nuevos (T98) en la clasificación cargada.",
            },
      ],
    },
    {
      id: "linea-base",
      numero: "13",
      titulo: "Línea base e indicadores de seguimiento",
      aporta: "Evaluación y seguimiento del PEI",
      preguntas: "A2, A5, E1, E2, F2, F7",
      bloques: base.length
        ? [
            {
              tipo: "tabla",
              titulo: "Valores de 2026 para comparar en la próxima medición",
              origen: "Escalas: % de acuerdo o de frecuencia alta",
              columnas: ["Código", "Indicador", "Estamento", "n", "Valor 2026"],
              filas: base,
              numericas: [3, 4],
            },
          ]
        : [
            {
              tipo: "nota",
              texto: `Ningún estamento llega a ${MINIMO} respuestas.`,
            },
          ],
    },
  ];

  if (opciones.publico)
    return {
      prueba,
      cerrada: opciones.cerrada,
      generado: new Date(),
      n,
      secciones,
      anexos: [],
    };

  // ---------- Anexos ----------
  const instrumento: string[][] = ESTAMENTOS.flatMap((e) =>
    preguntasDe(ENCUESTAS[e]).map((p) => [
      p.codigo,
      p.texto,
      p.tipo === "escala"
        ? `${p.escala}: ${p.grupos
            .flatMap((g) => g.items)
            .map((it) => `${p.codigo}_${it.codigo} ${it.texto}`)
            .join(" · ")}`
        : "opciones" in p
          ? p.opciones.map((o) => `${o.codigo} ${o.texto}`).join(" · ")
          : p.tipo === "masImportante"
            ? `Una de las marcadas en ${p.de}`
            : "Texto libre (máx. 1.000 caracteres)",
    ]),
  );
  const tablasCompletas: Bloque[] = ESTAMENTOS.flatMap((e) => {
    if (urna[e].length < MINIMO) return [menosDe(e, NOMBRE[e])];
    return preguntasDe(ENCUESTAS[e]).flatMap((p): Bloque[] => {
      const r = resumir(p, urna[e], ENCUESTAS[e]);
      if (r.tipo === "abierta") return [];
      if (r.tipo === "escala") {
        const esc = ESCALAS[r.pregunta.escala];
        return [
          {
            tipo: "tabla",
            titulo: `${p.codigo}. ${p.texto}`,
            origen: origen(p.codigo, e, r.n),
            columnas: ["Frase", ...esc.map((o) => o.texto)],
            filas: r.items.map((it) => [
              it.texto,
              ...esc.map((o) => String(it.valores[o.codigo] ?? 0)),
            ]),
            numericas: esc.map((_, i) => i + 1),
          },
        ];
      }
      if (r.n < MINIMO) return [menosDe(p.codigo, NOMBRE[e])];
      return [
        {
          tipo: "tabla",
          titulo: `${p.codigo}. ${p.texto}`,
          origen: origen(p.codigo, e, r.n),
          columnas: ["Opción", "Respuestas", "%"],
          filas: r.opciones.map((o) => [
            `${o.codigo} ${o.texto}`,
            String(o.conteo),
            fmtPct(o.pct),
          ]),
          numericas: [1, 2],
        },
      ];
    });
  });
  const fecha = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "short",
    timeStyle: "short",
  });

  const anexos: Seccion[] = [
    {
      id: "anexo-a",
      numero: "A",
      titulo: "Instrumento",
      aporta: "",
      preguntas: VERSION_INSTRUMENTO,
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Código", "Pregunta", "Opciones o frases"],
          filas: instrumento,
        },
      ],
    },
    {
      id: "anexo-b",
      numero: "B",
      titulo: "Diccionario de datos",
      aporta: "",
      preguntas: "",
      bloques: [
        {
          tipo: "parrafo",
          texto:
            "Valores especiales: 98 = No sé · 97 = Prefiero no responder · 96 = Por ahora no puedo · 99 = Otra (con su texto). Escala ACU: 1 Muy en desacuerdo · 2 En desacuerdo · 3 De acuerdo · 4 Muy de acuerdo · 98 No sé. Escala FRE: 1 Nunca · 2 A veces · 3 Casi siempre · 4 Siempre. El diccionario completo, columna por columna, está en la sábana de datos (hoja Diccionario).",
        },
      ],
    },
    {
      id: "anexo-c",
      numero: "C",
      titulo: "Metodología",
      aporta: "",
      preguntas: "",
      bloques: [
        {
          tipo: "parrafo",
          texto: `Encuesta en línea con papeletas de acceso repartidas al azar: el padrón sabe si una papeleta se usó, nunca qué respondió; la urna guarda las respuestas sin papeleta, fecha ni hora. Instrumento ${VERSION_INSTRUMENTO}. No se informan grupos con menos de ${MINIMO} respuestas. F7 y F8 solo en total o separados entre docentes y asistentes.`,
        },
        {
          tipo: "parrafo",
          texto:
            "Respuestas abiertas: antes de exportarlas, la comisión reemplazó los nombres de personas por un rol general y apartó los textos que no se podían publicar. Luego las clasificó con hasta 3 temas por texto, usando la lista de temas vigente.",
        },
        {
          tipo: "tabla",
          titulo: "Lista de temas usada",
          columnas: ["Código", "Tema", "Descripción", "Estado"],
          filas: temas.map((t) => [
            t.codigo,
            t.nombre,
            t.descripcion,
            t.activo ? "Activo" : "Desactivado",
          ]),
        },
      ],
    },
    {
      id: "anexo-d",
      numero: "D",
      titulo: "Tablas completas por pregunta y estamento",
      aporta: "",
      preguntas: "",
      bloques: tablasCompletas,
    },
    {
      id: "anexo-e",
      numero: "E",
      titulo: "Bitácora del proceso",
      aporta: "",
      preguntas: "",
      bloques: [
        {
          tipo: "tabla",
          columnas: ["Fecha", "Quién", "Acción", "Detalle"],
          filas: bitacora.map((b) => [
            fecha.format(b.fecha),
            b.actor,
            b.accion,
            b.detalle ?? "",
          ]),
        },
      ],
    },
  ];

  return {
    prueba,
    cerrada: opciones.cerrada,
    generado: new Date(),
    n,
    secciones,
    anexos,
  };
}
