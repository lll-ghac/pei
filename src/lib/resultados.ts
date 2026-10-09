import "server-only";
import { desc, eq, like } from "drizzle-orm";
import { db, schema } from "@/db";
import {
  ENCUESTAS,
  preguntasDe,
  type Encuesta,
  type Estamento,
  type Opcion,
  type Pregunta,
  type Respuestas,
} from "./encuestas";
import * as L from "./encuestas/listas";
import { ESCALAS } from "./encuestas/listas";

/** Regla del MVP: no se muestran grupos con menos de 5 respuestas. */
export const MINIMO = 5;

/** Respuestas de la urna del modo indicado, por estamento. Nunca hay credenciales, fechas ni horas. */
export async function cargarUrna(
  prueba: boolean,
): Promise<Record<Estamento, Respuestas[]>> {
  const filas = await db
    .select({
      estamento: schema.respuestas.estamento,
      datos: schema.respuestas.datos,
    })
    .from(schema.respuestas)
    .where(eq(schema.respuestas.prueba, prueba));
  const urna: Record<Estamento, Respuestas[]> = { A: [], E: [], F: [] };
  for (const f of filas)
    urna[f.estamento as Estamento]?.push(f.datos as Respuestas);
  return urna;
}

/** Subgrupo de funcionarios por función (F1): solo para separar docentes y asistentes. */
export type GrupoFuncionarios = "todos" | "docentes" | "asistentes";
export function filtrarFuncionarios(
  lista: Respuestas[],
  grupo: GrupoFuncionarios,
) {
  if (grupo === "todos") return lista;
  const codigo = grupo === "docentes" ? "1" : "2";
  return lista.filter((r) => r.F1?.codigos?.[0] === codigo);
}

export type ConteoOpcion = Opcion & { conteo: number; pct: number };
export type ConteoItem = {
  codigo: string;
  texto: string;
  grupo?: string;
  n: number;
  /** Conteo por valor de la escala (1..4, 98). */
  valores: Record<string, number>;
  /** % de acuerdo / frecuencia alta (3 o 4) sobre quienes opinaron (sin «No sé»). */
  favorable: number;
  /** % «No sé» sobre el total. */
  noSe: number;
};

export type ResumenPregunta =
  | {
      tipo: "opciones";
      pregunta: Pregunta;
      n: number;
      opciones: ConteoOpcion[];
      textosOtra: number;
    }
  | {
      tipo: "escala";
      pregunta: Pregunta & { tipo: "escala" };
      n: number;
      items: ConteoItem[];
    }
  | { tipo: "abierta"; pregunta: Pregunta; n: number; escritas: number };

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

function opcionesBase(p: Pregunta, encuesta: Encuesta): Opcion[] {
  if (p.tipo === "masImportante") {
    const origen = preguntasDe(encuesta).find((q) => q.codigo === p.de);
    return origen && "opciones" in origen ? origen.opciones : [];
  }
  return "opciones" in p ? p.opciones : [];
}

export function resumir(
  p: Pregunta,
  lista: Respuestas[],
  encuesta: Encuesta,
): ResumenPregunta {
  if (p.tipo === "abierta") {
    return {
      tipo: "abierta",
      pregunta: p,
      n: lista.length,
      escritas: lista.filter((r) => r[p.codigo]?.texto).length,
    };
  }
  if (p.tipo === "escala") {
    const items: ConteoItem[] = p.grupos.flatMap((g) =>
      g.items.map((it) => {
        const valores: Record<string, number> = {};
        let n = 0;
        for (const r of lista) {
          const v = r[p.codigo]?.items?.[it.codigo];
          if (!v) continue;
          n++;
          valores[v] = (valores[v] ?? 0) + 1;
        }
        const noSe = valores["98"] ?? 0;
        const opinan = n - noSe;
        return {
          codigo: it.codigo,
          texto: it.texto,
          grupo: g.titulo,
          n,
          valores,
          favorable: pct((valores["3"] ?? 0) + (valores["4"] ?? 0), opinan),
          noSe: pct(noSe, n),
        };
      }),
    );
    return { tipo: "escala", pregunta: p, n: lista.length, items };
  }
  const respondieron = lista.filter(
    (r) => (r[p.codigo]?.codigos ?? []).length > 0,
  );
  const n = respondieron.length;
  const opciones = opcionesBase(p, encuesta).map((o) => {
    const conteo = respondieron.filter((r) =>
      r[p.codigo]!.codigos!.includes(o.codigo),
    ).length;
    return { ...o, conteo, pct: pct(conteo, n) };
  });
  const textosOtra = respondieron.filter((r) => r[p.codigo]?.texto).length;
  return { tipo: "opciones", pregunta: p, n, opciones, textosOtra };
}

// ---------- Comparación entre estamentos (listas comunes, mismos códigos) ----------

export type Comparable = {
  titulo: string;
  codigos: Partial<Record<Estamento, string>>;
  opciones: Opcion[];
  nota?: string;
  /** Opciones con orden propio (Sí / Más o menos / No): se muestran en ese orden, no por porcentaje. */
  ordinal?: boolean;
};

const MARCA = (k: number) =>
  `% de personas que la eligieron; cada una marcaba ${k}, por eso las columnas no suman 100%.`;

export const COMPARABLES: Comparable[] = [
  {
    titulo: "Conocimiento del lema o los sellos actuales",
    codigos: { A: "A2", E: "E1", F: "F2" },
    opciones: L.CON_ADULTOS,
    nota: "Una respuesta por persona: cada columna suma 100%.",
    ordinal: true,
  },
  {
    titulo: "Propósito principal de la escuela",
    codigos: { A: "A8", E: "E5", F: "F5" },
    opciones: L.PROP_ADULTOS,
    nota: MARCA(2),
  },
  {
    titulo: "Valores que deberían guiar a la escuela",
    codigos: { A: "A15", E: "E10", F: "F16" },
    opciones: L.VAL_ADULTOS,
    nota: MARCA(3),
  },
  {
    titulo: "Perfil de egreso",
    codigos: { A: "A16", E: "E11", F: "F17" },
    opciones: L.PER_ADULTOS,
    nota: MARCA(3),
  },
  {
    titulo: "Perfil docente",
    codigos: { A: "A17", E: "E12", F: "F18" },
    opciones: L.DOC_ADULTOS,
    nota: MARCA(3),
  },
  {
    titulo: "Perfil de la familia",
    codigos: { A: "A18", F: "F19" },
    opciones: L.FAM,
    nota: `${MARCA(3)} No se preguntó a estudiantes.`,
  },
  {
    titulo: "Redes con el entorno",
    codigos: { A: "A14", E: "E9", F: "F14" },
    opciones: L.RED_ADULTOS,
    nota: "% de personas que la eligieron; cada una marcaba hasta 2, por eso las columnas no suman 100%.",
  },
];

export type FilaComparable = {
  opcion: Opcion;
  pct: Partial<Record<Estamento, number | null>>;
};

export function comparar(c: Comparable, urna: Record<Estamento, Respuestas[]>) {
  const n: Partial<Record<Estamento, number>> = {};
  for (const [e, codigo] of Object.entries(c.codigos) as [
    Estamento,
    string,
  ][]) {
    n[e] = urna[e].filter((r) => (r[codigo]?.codigos ?? []).length > 0).length;
  }
  const filas: FilaComparable[] = c.opciones.map((o) => {
    const fila: FilaComparable = { opcion: o, pct: {} };
    for (const [e, codigo] of Object.entries(c.codigos) as [
      Estamento,
      string,
    ][]) {
      const total = n[e] ?? 0;
      fila.pct[e] =
        total < MINIMO
          ? null
          : pct(
              urna[e].filter((r) => r[codigo]?.codigos?.includes(o.codigo))
                .length,
              total,
            );
    }
    return fila;
  });
  return { n, filas };
}

// ---------- Cómo se lee una comparación (Resultados, Informe y página pública) ----------

/** Bajo este n, los porcentajes saltan mucho: una persona pesa varios puntos. */
export const POCOS_CASOS = 30;
/** Diferencia entre estamentos (en puntos) que se marca y entra en la síntesis. */
export const BRECHA = 30;
/** Listas largas: se recogen las opciones bajo este % en todos los estamentos. */
const BAJO = 10;

const NOMBRE_E: Record<Estamento, string> = {
  A: "Apoderados",
  E: "Estudiantes",
  F: "Funcionarios",
};

export type Orden = "promedio" | "dif" | Estamento;

export type FilaVista = {
  texto: string;
  pct: Partial<Record<Estamento, number | null>>;
  /** Personas que la eligieron, por estamento (para «6 de 9 personas»). */
  conteo: Partial<Record<Estamento, number>>;
  /** Lugar (1, 2 o 3) dentro de cada estamento. */
  lugar: Partial<Record<Estamento, number>>;
  /** Empate técnico: comparte el lugar con otra opción que está a una persona o menos. */
  empate: Partial<Record<Estamento, boolean>>;
  /** Diferencia máxima entre estamentos, en puntos (null si hay menos de 2 estamentos). */
  dif: number | null;
  /** Fila menor (bajo 10% en todos y sin lugar): va en «Ver todas». */
  menor: boolean;
};

/**
 * Prepara una comparación para leerla: personas, lugar 1°–3° con empate técnico (se separan por una
 * persona o menos), diferencia entre estamentos, orden y filas menores. Promedio = simple entre
 * estamentos, nunca por persona, para que un estamento grande no pese más que los otros.
 */
export function prepararComparativa(opciones: {
  filas: { texto: string; pct: Partial<Record<Estamento, number | null>> }[];
  estamentos: Estamento[];
  n: Partial<Record<Estamento, number>>;
  ordinal?: boolean;
  orden?: Orden;
}): { filas: FilaVista[]; pocos: string | null; sinPreferencia: Estamento[] } {
  const { estamentos, n } = opciones;
  const conteos = opciones.filas.map((f) => {
    const c: Partial<Record<Estamento, number>> = {};
    for (const e of estamentos)
      if (f.pct[e] != null)
        c[e] = Math.round(((f.pct[e] as number) * (n[e] ?? 0)) / 100);
    return c;
  });
  const lugar = opciones.filas.map(
    () => ({}) as Partial<Record<Estamento, number>>,
  );
  const empate = opciones.filas.map(
    () => ({}) as Partial<Record<Estamento, boolean>>,
  );
  for (const e of estamentos) {
    const c = conteos.map((x) => x[e] ?? 0);
    c.forEach((v, i) => {
      // Solo cuentan como delante las opciones que le ganan por más de una persona.
      // Una opción elegida por una sola persona no recibe lugar.
      const rango = 1 + c.filter((x) => x > v + 1).length;
      if (v >= 2 && rango <= 3) lugar[i][e] = rango;
    });
    c.forEach((v, i) => {
      if (
        lugar[i][e] &&
        c.some((x, k) => k !== i && lugar[k][e] === lugar[i][e])
      )
        empate[i][e] = true;
    });
  }
  // Si más de 3 opciones comparten un mismo lugar, el lugar ya no informa: «sin preferencia clara».
  const sinPreferencia = estamentos.filter((e) =>
    [1, 2, 3].some((l) => lugar.filter((x) => x[e] === l).length > 3),
  );
  for (const e of sinPreferencia) {
    lugar.forEach((x) => delete x[e]);
    empate.forEach((x) => delete x[e]);
  }
  const prom = (f: { pct: Partial<Record<Estamento, number | null>> }) =>
    estamentos.reduce((s, e) => s + (f.pct[e] ?? 0), 0) /
    Math.max(1, estamentos.length);
  let filas: FilaVista[] = opciones.filas.map((f, i) => {
    // Diferencia con los porcentajes redondeados que se ven, para que cuadre con la resta mental.
    const v = estamentos
      .map((e) => f.pct[e])
      .filter((x): x is number => typeof x === "number")
      .map((x) => Math.round(x));
    return {
      texto: f.texto,
      pct: f.pct,
      conteo: conteos[i],
      lugar: lugar[i],
      empate: empate[i],
      dif: v.length >= 2 ? Math.max(...v) - Math.min(...v) : null,
      menor:
        !opciones.ordinal &&
        estamentos.every((e) => (f.pct[e] ?? 0) < BAJO) &&
        Object.keys(lugar[i]).length === 0,
    };
  });
  if (!opciones.ordinal) {
    const orden = opciones.orden ?? "promedio";
    const clave = (f: FilaVista) =>
      orden === "promedio"
        ? prom(f)
        : orden === "dif"
          ? (f.dif ?? -1)
          : (f.pct[orden] ?? -1);
    filas = filas.sort((a, b) => clave(b) - clave(a));
  }
  // Solo se recoge si la lista es larga y se esconden al menos 3; si no, se muestran todas.
  const menores = filas.filter((f) => f.menor).length;
  if (filas.length <= 8 || menores < 3 || opciones.orden === "dif")
    filas = filas.map((f) => ({ ...f, menor: false }));
  return { filas, pocos: avisoPocos(estamentos, n), sinPreferencia };
}

/** «Pocos casos: Apoderados n = 9 (1 persona = 11 puntos)…», o null. */
export function avisoPocos(
  estamentos: Estamento[],
  n: Partial<Record<Estamento, number>>,
): string | null {
  const pocos = estamentos
    .filter((e) => (n[e] ?? 0) > 0 && (n[e] ?? 0) < POCOS_CASOS)
    .map(
      (e) =>
        `${NOMBRE_E[e]} n = ${n[e]} (1 persona = ${Math.round(100 / n[e]!)} puntos)`,
    );
  return pocos.length
    ? `Pocos casos: ${pocos.join(" · ")}. Lea los porcentajes con cuidado.`
    : null;
}

/** Síntesis neutral de las preguntas comunes: coincidencias (1° en todos) y diferencias grandes. */
export function sintesis(urna: Record<Estamento, Respuestas[]>) {
  const coincidencias: {
    pregunta: string;
    opcion: string;
    /** Estamentos donde comparte el 1° y con qué opciones. */
    empates: { e: Estamento; con: string[] }[];
    /** También está entre las diferencias grandes: coincide en el lugar, no en la intensidad. */
    distintaIntensidad: boolean;
  }[] = [];
  const diferencias: {
    pregunta: string;
    opcion: string;
    alto: [Estamento, number];
    bajo: [Estamento, number];
    dif: number;
    /** El extremo alto o el bajo es un estamento con pocos casos. */
    pocos: boolean;
  }[] = [];
  for (const c of COMPARABLES) {
    const { n, filas } = comparar(c, urna);
    const est = (Object.keys(c.codigos) as Estamento[]).filter(
      (e) => (n[e] ?? 0) >= MINIMO,
    );
    if (est.length < 2) continue;
    const vista = prepararComparativa({
      filas: filas.map((f) => ({ texto: f.opcion.texto, pct: f.pct })),
      estamentos: est,
      n,
      ordinal: c.ordinal,
    });
    for (const f of vista.filas) {
      const esDiferencia = f.dif != null && f.dif >= BRECHA;
      if (est.every((e) => f.lugar[e] === 1)) {
        coincidencias.push({
          pregunta: c.titulo,
          opcion: f.texto,
          empates: est
            .filter((e) => f.empate[e])
            .map((e) => ({
              e,
              con: vista.filas
                .filter((x) => x !== f && x.lugar[e] === 1)
                .map((x) => x.texto),
            })),
          distintaIntensidad: esDiferencia,
        });
      }
      if (esDiferencia) {
        const orden = est
          .map((e) => [e, Math.round(f.pct[e] ?? 0)] as [Estamento, number])
          .sort((a, b) => b[1] - a[1]);
        const alto = orden[0];
        const bajo = orden[orden.length - 1];
        diferencias.push({
          pregunta: c.titulo,
          opcion: f.texto,
          alto,
          bajo,
          dif: f.dif!,
          pocos: [alto[0], bajo[0]].some((e) => (n[e] ?? 0) < POCOS_CASOS),
        });
      }
    }
  }
  diferencias.sort((a, b) => b.dif - a.dif);
  return { coincidencias, diferencias };
}

/** «1 pt», «12 pts». */
export const puntos = (x: number) =>
  `${Math.round(x)} ${Math.round(x) === 1 ? "pt" : "pts"}`;

// ---------- Prioridades y sellos candidatos ----------

const TOP3: Record<Estamento, string> = { A: "A9", E: "E6", F: "F9" };
const MAS_IMPORTANTE: Record<Estamento, string> = {
  A: "A10",
  E: "E7",
  F: "F10",
};
const POR_QUE: Record<Estamento, string> = { A: "A11", E: "E8", F: "F11" };

export type CeldaPrioridad = {
  pctTop3: number;
  rango: number;
  enTop5: boolean;
  masImportante: number;
} | null;
export type FilaPrioridad = {
  opcion: Opcion;
  por: Record<Estamento, CeldaPrioridad>;
  estamentosTop5: number;
  candidato: boolean;
  converge: boolean;
  /** Razones de quienes la eligieron como la más importante (todos los estamentos). */
  razones: {
    debilidad: number;
    fortaleza: number;
    futuro: number;
    sector: number;
    distinguiria: number;
    otra: number;
    total: number;
  };
};

export function prioridades(urna: Record<Estamento, Respuestas[]>) {
  const n: Record<Estamento, number> = {
    A: urna.A.length,
    E: urna.E.length,
    F: urna.F.length,
  };
  const validos = (Object.keys(n) as Estamento[]).filter((e) => n[e] >= MINIMO);
  const base = L.PRIORIDADES_ADULTOS;

  const porEstamento: Record<Estamento, Map<string, CeldaPrioridad>> = {
    A: new Map(),
    E: new Map(),
    F: new Map(),
  };
  for (const e of validos) {
    const lista = urna[e];
    const filas = base.map((o) => ({
      codigo: o.codigo,
      pctTop3: pct(
        lista.filter((r) => r[TOP3[e]]?.codigos?.includes(o.codigo)).length,
        lista.length,
      ),
      masImportante: lista.filter(
        (r) => r[MAS_IMPORTANTE[e]]?.codigos?.[0] === o.codigo,
      ).length,
    }));
    const orden = [...filas].sort(
      (a, b) => b.pctTop3 - a.pctTop3 || b.masImportante - a.masImportante,
    );
    // Rango por competencia (1, 2, 2, 4…): los empates comparten lugar.
    orden.forEach((f, i) => {
      const rango =
        i > 0 && f.pctTop3 === orden[i - 1].pctTop3
          ? porEstamento[e].get(orden[i - 1].codigo)!.rango
          : i + 1;
      porEstamento[e].set(f.codigo, {
        pctTop3: f.pctTop3,
        masImportante: f.masImportante,
        rango,
        enTop5: rango <= 5 && f.pctTop3 > 0,
      });
    });
  }

  const filas: FilaPrioridad[] = base.map((o) => {
    const por = { A: null, E: null, F: null } as Record<
      Estamento,
      CeldaPrioridad
    >;
    for (const e of validos) por[e] = porEstamento[e].get(o.codigo) ?? null;
    const estamentosTop5 = validos.filter((e) => por[e]?.enTop5).length;
    const razones = {
      debilidad: 0,
      fortaleza: 0,
      futuro: 0,
      sector: 0,
      distinguiria: 0,
      otra: 0,
      total: 0,
    };
    for (const e of ["A", "E", "F"] as Estamento[]) {
      for (const r of urna[e]) {
        if (r[MAS_IMPORTANTE[e]]?.codigos?.[0] !== o.codigo) continue;
        const c = r[POR_QUE[e]]?.codigos?.[0];
        razones.total++;
        if (c === "1") razones.debilidad++;
        else if (c === "2") razones.fortaleza++;
        else if (c === "3") razones.futuro++;
        else if (c === "4") razones.sector++;
        else if (c === "5") razones.distinguiria++;
        else razones.otra++;
      }
    }
    return {
      opcion: o,
      por,
      estamentosTop5,
      candidato: validos.length >= 2 && estamentosTop5 >= 2,
      converge: validos.length === 3 && estamentosTop5 === 3,
      razones,
    };
  });
  filas.sort(
    (a, b) =>
      Number(b.candidato) - Number(a.candidato) ||
      b.estamentosTop5 - a.estamentosTop5 ||
      promedioRango(a) - promedioRango(b),
  );
  return { n, validos, filas };
}

function promedioRango(f: FilaPrioridad) {
  const r = Object.values(f.por)
    .filter(Boolean)
    .map((c) => c!.rango);
  return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 99;
}

export { ENCUESTAS, ESCALAS };

// ---------- Contexto de lectura: representatividad y trazabilidad ----------

/** Universo de cada estamento (mismas bases del Avance): papeletas de apoderados, matrícula de 5° a 8°, funcionarios. */
export async function universo(): Promise<
  Record<Estamento, { base: number; texto: string }>
> {
  const { avance } = await import("./gestion");
  const av = await avance();
  const sumar = (k: "apoderados" | "estudiantes") =>
    av.filas.reduce((t, f) => t + (f[k]?.base ?? 0), 0);
  return {
    A: { base: sumar("apoderados"), texto: "papeletas de apoderados" },
    E: { base: sumar("estudiantes"), texto: "estudiantes de 5° a 8°" },
    F: { base: av.funcionarios.base, texto: "funcionarios" },
  };
}

/** Fecha del último cierre registrado en la bitácora (o null si la encuesta no se ha cerrado). */
export async function fechaCierre(): Promise<Date | null> {
  const [fila] = await db
    .select({ fecha: schema.bitacora.fecha })
    .from(schema.bitacora)
    .where(like(schema.bitacora.accion, "Cierre%"))
    .orderBy(desc(schema.bitacora.id))
    .limit(1);
  return fila?.fecha ?? null;
}
