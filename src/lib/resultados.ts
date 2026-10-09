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
import {
  BRECHA,
  esFragil,
  leerRazones,
  prepararComparativa,
  rankingTop5,
  type DiferenciaGrande,
  type Lectura,
  type LugarTop,
  type Razones,
} from "./lectura";

export * from "./lectura";

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
  /**
   * Una línea por diferencia; en preguntas de una sola respuesta (el lema) las opciones de la misma
   * pregunta van juntas, porque son dos caras de la misma brecha.
   */
  const diferencias: {
    pregunta: string;
    dosEstamentos: boolean;
    items: DiferenciaGrande[];
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
    const items: DiferenciaGrande[] = [];
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
      if (!esDiferencia) continue;
      const redondeado = (e: Estamento) => Math.round(f.pct[e] ?? 0);
      const orden = est
        .map((e) => [e, redondeado(e)] as [Estamento, number])
        .sort((a, b) => b[1] - a[1]);
      const alto = orden[0];
      const bajo = orden[orden.length - 1];
      const fragil = esFragil({ fila: f, estamentos: est, n, alto, bajo });
      items.push({ opcion: f.texto, alto, bajo, dif: f.dif!, fragil });
    }
    if (c.ordinal && items.length)
      diferencias.push({
        pregunta: c.titulo,
        dosEstamentos: est.length === 2,
        items,
      });
    else
      for (const it of items)
        diferencias.push({
          pregunta: c.titulo,
          dosEstamentos: est.length === 2,
          items: [it],
        });
  }
  const mayor = (d: { items: DiferenciaGrande[] }) =>
    Math.max(...d.items.map((x) => x.dif));
  diferencias.sort((a, b) => mayor(b) - mayor(a));
  return { coincidencias, diferencias };
}

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
  /** Personas que la pusieron en su top 3. */
  conteo: number;
  /** Personas que la eligieron como la más importante. */
  masImportante: number;
} & LugarTop;

export type FilaPrioridad = {
  opcion: Opcion;
  por: Record<Estamento, CeldaPrioridad | null>;
  estamentosTop5: number;
  /** Prioridad convergente: en el top 5 de al menos 2 estamentos (con MINIMO respuestas o más). */
  convergente: boolean;
  /** En el top 5 de los 3 estamentos. */
  converge3: boolean;
  /** Es convergente solo gracias a un corte frágil del top 5 en algún estamento. */
  convergenciaFragil: boolean;
  /** Razones de quienes la eligieron como la más importante (todas las personas juntas). */
  razones: Razones;
  /** Lectura de la convergente: sello candidato, objetivo de mejora o a discutir (null si no es convergente). */
  lectura: Lectura | null;
  lecturaFragil: boolean;
  /** Nadie la eligió como la más importante: no hay razones para leerla. */
  sinRazones: boolean;
};

export function prioridades(urna: Record<Estamento, Respuestas[]>) {
  const n: Record<Estamento, number> = {
    A: urna.A.length,
    E: urna.E.length,
    F: urna.F.length,
  };
  const validos = (Object.keys(n) as Estamento[]).filter((e) => n[e] >= MINIMO);
  const base = L.PRIORIDADES_ADULTOS;

  const porEstamento: Record<Estamento, CeldaPrioridad[]> = {
    A: [],
    E: [],
    F: [],
  };
  const cortes: Partial<
    Record<Estamento, { conLugar: number; corteDudoso: boolean }>
  > = {};
  for (const e of validos) {
    const lista = urna[e];
    const conteos = base.map(
      (o) =>
        lista.filter((r) => r[TOP3[e]]?.codigos?.includes(o.codigo)).length,
    );
    const top = rankingTop5(conteos);
    cortes[e] = { conLugar: top.conLugar, corteDudoso: top.corteDudoso };
    porEstamento[e] = base.map((o, i) => ({
      pctTop3: pct(conteos[i], lista.length),
      conteo: conteos[i],
      masImportante: lista.filter(
        (r) => r[MAS_IMPORTANTE[e]]?.codigos?.[0] === o.codigo,
      ).length,
      ...top.filas[i],
    }));
  }

  const filas: FilaPrioridad[] = base.map((o, i) => {
    const por = { A: null, E: null, F: null } as Record<
      Estamento,
      CeldaPrioridad | null
    >;
    for (const e of validos) por[e] = porEstamento[e][i];
    const enTop = validos.filter((e) => por[e]?.enTop5);
    const solidos = enTop.filter((e) => !por[e]!.fragil);
    const razones: Razones = {
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
    const convergente = validos.length >= 2 && enTop.length >= 2;
    const leida = leerRazones(razones);
    return {
      opcion: o,
      por,
      estamentosTop5: enTop.length,
      convergente,
      converge3: validos.length === 3 && enTop.length === 3,
      convergenciaFragil: convergente && solidos.length < 2,
      razones,
      lectura: convergente ? leida.lectura : null,
      lecturaFragil: convergente && leida.fragil,
      sinRazones: leida.sinBase,
    };
  });
  filas.sort(
    (a, b) =>
      Number(b.convergente) - Number(a.convergente) ||
      b.estamentosTop5 - a.estamentosTop5 ||
      promedioLugar(a) - promedioLugar(b),
  );
  return { n, validos, filas, cortes };
}

function promedioLugar(f: FilaPrioridad) {
  const r = Object.values(f.por)
    .filter((c): c is CeldaPrioridad => c != null && c.lugar != null)
    .map((c) => c.lugar!);
  return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 99;
}

/** La regla, explicada igual en Resultados, Informe y Manual (reglas acordadas 9/10, según el MVP). */
export const REGLA_PRIORIDADES = [
  `Prioridad convergente: está en el top 5 de al menos 2 estamentos (con ${MINIMO} respuestas o más). El lugar sigue las mismas reglas del Resumen: hace falta que la elijan 2 personas o más, y las que se separan por una persona comparten lugar («=»). Si el corte del 5° lugar es un empate, entran todas las empatadas, marcadas frágiles (⚠).`,
  "Su lectura sale de por qué la eligieron como la más importante, con todas las personas juntas: sello candidato si más de la mitad la justifica como fortaleza o porque distinguiría a la escuela; objetivo de mejora si más de la mitad la justifica como debilidad; a discutir en cualquier otro caso. «Clave para el futuro», «familias del sector» y «otra» cuentan en el total pero no inclinan la lectura (el MVP no las asigna a ninguna). Exactamente la mitad no es mayoría.",
  "⚠ marca una lectura o un corte frágil: una persona que hubiera respondido distinto lo cambiaría. Con bases chicas casi todas las lecturas son frágiles: es lo que dicen los datos, no un error. La plataforma propone; la decisión es de la comisión.",
];

/** Notas por estamento: top 5 más corto o corte del top 5 poco claro. */
export function notasCortes(
  cortes: Partial<
    Record<Estamento, { conLugar: number; corteDudoso: boolean }>
  >,
): string[] {
  const nombre: Record<Estamento, string> = {
    A: "Apoderados",
    E: "Estudiantes",
    F: "Funcionarios",
  };
  const notas: string[] = [];
  for (const [e, c] of Object.entries(cortes) as [
    Estamento,
    { conLugar: number; corteDudoso: boolean },
  ][]) {
    if (c.conLugar < 5)
      notas.push(
        `${nombre[e]}: solo ${c.conLugar} ${c.conLugar === 1 ? "prioridad recibe" : "prioridades reciben"} lugar (elegidas por 2 personas o más), así que su top 5 es más corto.`,
      );
    else if (c.corteDudoso)
      notas.push(
        `${nombre[e]}: el corte del top 5 no es claro (lo cambia una persona).`,
      );
  }
  return notas;
}

/** Texto de cada lectura, igual en el panel, el Informe y la página pública. */
export const LECTURA: Record<Lectura, string> = {
  sello: "Sello candidato",
  mejora: "Objetivo de mejora",
  discutir: "A discutir",
};

/** Aviso cuando ninguna convergente tiene mayoría clara (para que no parezca un error). */
export function avisoSinSellos(filas: FilaPrioridad[]): string | null {
  const conv = filas.filter((f) => f.convergente);
  if (!conv.length || conv.some((f) => f.lectura === "sello")) return null;
  return `Ninguna prioridad convergente tiene mayoría clara de razones para ser sello candidato; ${
    conv.length === 1
      ? "la convergente queda"
      : `las ${conv.length} convergentes quedan`
  } para discutir en taller${conv.some((f) => f.lectura === "mejora") ? " o como objetivos de mejora" : ""}.`;
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
    A: {
      base: sumar("apoderados"),
      texto: av.filas.some((f) => f.apoderados.estimada)
        ? "apoderados según matrícula (aún no se registran todas las papeletas)"
        : "papeletas de apoderados entregadas",
    },
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
