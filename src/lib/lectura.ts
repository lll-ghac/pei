// Reglas de lectura de las comparaciones entre estamentos (Resultados, Informe y página pública).
// Módulo puro, sin base de datos: se prueba con `pruebas/lectura.test.mts`.
import type { Estamento } from "./encuestas";

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
  // Si más de 3 opciones comparten un mismo lugar, ese lugar ya no informa: se omite solo ese grupo
  // (un 1° claro se mantiene aunque haya un empate múltiple en el 2°). Si el empate es en el 1°, el
  // estamento queda «sin preferencia clara».
  const sinPreferencia: Estamento[] = [];
  for (const e of estamentos) {
    for (const l of [1, 2, 3]) {
      const grupo = lugar.filter((x) => x[e] === l);
      if (grupo.length <= 3) continue;
      lugar.forEach((x, i) => {
        if (x[e] === l) {
          delete x[e];
          delete empate[i][e];
        }
      });
      if (l === 1) sinPreferencia.push(e);
    }
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

export type DiferenciaGrande = {
  opcion: string;
  alto: [Estamento, number];
  bajo: [Estamento, number];
  dif: number;
  /** Frágil: con una persona distinta en un estamento de pocos casos, bajaría de BRECHA. */
  fragil: boolean;
};

/**
 * Una diferencia es frágil si bastaría que una persona del extremo con pocos casos (menos de
 * POCOS_CASOS) hubiera respondido distinto para que bajara de BRECHA: −1 persona en el extremo alto o
 * +1 en el bajo. La diferencia se vuelve a calcular con todos los estamentos (el máximo o el mínimo
 * pueden pasar a otro estamento), con los porcentajes redondeados que se ven.
 */
export function esFragil(opciones: {
  fila: Pick<FilaVista, "pct" | "conteo">;
  estamentos: Estamento[];
  n: Partial<Record<Estamento, number>>;
  alto: [Estamento, number];
  bajo: [Estamento, number];
}): boolean {
  const { fila, estamentos, n } = opciones;
  const redondeado = (e: Estamento) => Math.round(fila.pct[e] ?? 0);
  return (
    [
      [opciones.alto[0], -1],
      [opciones.bajo[0], +1],
    ] as [Estamento, number][]
  ).some(([e, cambio]) => {
    const nE = n[e] ?? 0;
    if (nE >= POCOS_CASOS || fila.conteo[e] == null) return false;
    const nuevo = Math.round(
      (((fila.conteo[e] as number) + cambio) / nE) * 100,
    );
    const v = estamentos.map((x) => (x === e ? nuevo : redondeado(x)));
    return Math.max(...v) - Math.min(...v) < BRECHA;
  });
}

/** «1 pt», «12 pts». */
export const puntos = (x: number) =>
  `${Math.round(x)} ${Math.round(x) === 1 ? "pt" : "pts"}`;

// ---------- Prioridades: top 5 y lectura de las razones (reglas acordadas 9/10) ----------

export const TOP = 5;

export type LugarTop = {
  /** Lugar con las mismas reglas del Resumen: 2 personas o más y empate técnico (una persona o menos). */
  lugar?: number;
  empate: boolean;
  enTop5: boolean;
  /** En el top 5, pero el corte depende de una persona: hay una opción fuera a una persona o menos. */
  fragil: boolean;
};

/**
 * Top 5 de un estamento a partir de cuántas personas eligieron cada prioridad. Si el corte es un empate,
 * entran todas las empatadas, marcadas frágiles. Devuelve también cuántas reciben lugar (el top 5 queda
 * más corto si menos de 5 opciones tienen 2 personas o más) y si el corte no es claro.
 */
export function rankingTop5(conteos: number[]): {
  filas: LugarTop[];
  conLugar: number;
  corteDudoso: boolean;
} {
  const filas: LugarTop[] = conteos.map((v) => {
    const rango = 1 + conteos.filter((x) => x > v + 1).length;
    const lugar = v >= 2 ? rango : undefined;
    return {
      lugar,
      empate: false,
      enTop5: lugar != null && lugar <= TOP,
      fragil: false,
    };
  });
  filas.forEach((f, i) => {
    if (f.lugar != null)
      f.empate = filas.some((g, k) => k !== i && g.lugar === f.lugar);
  });
  // Frágil en el corte: hay una opción fuera del top 5 a una persona o menos.
  filas.forEach((f, i) => {
    if (!f.enTop5) return;
    f.fragil = conteos.some(
      (x, k) => !filas[k].enTop5 && x >= conteos[i] - 1 && x > 0,
    );
  });
  const enTop = filas.filter((f) => f.enTop5).length;
  // Empate en el corte que deja más de 5 dentro: las que quedan a una persona o menos del 5° lugar
  // entran todas, pero frágiles.
  if (enTop > TOP) {
    const quinto = conteos
      .filter((_, i) => filas[i].enTop5)
      .sort((a, b) => b - a)[TOP - 1];
    filas.forEach((f, i) => {
      if (f.enTop5 && conteos[i] <= quinto + 1) f.fragil = true;
    });
  }
  const corteDudoso = enTop > TOP || filas.some((f) => f.fragil);
  return {
    filas,
    conLugar: filas.filter((f) => f.lugar != null).length,
    corteDudoso,
  };
}

export type Razones = {
  debilidad: number;
  fortaleza: number;
  futuro: number;
  sector: number;
  distinguiria: number;
  otra: number;
  total: number;
};
export type Lectura = "sello" | "mejora" | "discutir";

/**
 * Lectura de una prioridad convergente según por qué la eligieron como la más importante (MVP):
 * sello candidato si más de la mitad la justifica como fortaleza o «nos distinguiría»; objetivo de
 * mejora si más de la mitad la justifica como debilidad; si no, a discutir. «Clave para el futuro»,
 * «familias del sector» y «otra» cuentan en el total pero no suman a ninguna (son neutrales).
 * Exactamente la mitad no es mayoría. Frágil: una persona con otra razón cambiaría la lectura.
 */
export function leerRazones(r: Razones): {
  lectura: Lectura;
  fragil: boolean;
  sinBase: boolean;
} {
  const sello = r.fortaleza + r.distinguiria;
  const mayoria = (x: number, total: number) => x * 2 > total;
  const lectura = (s: number, d: number, t: number): Lectura =>
    mayoria(s, t) ? "sello" : mayoria(d, t) ? "mejora" : "discutir";
  if (r.total === 0)
    return { lectura: "discutir", fragil: false, sinBase: true };
  const actual = lectura(sello, r.debilidad, r.total);
  // Una persona cambia de razón: de sello a neutral o a debilidad, de debilidad a neutral o a sello, etc.
  const neutrales = r.total - sello - r.debilidad;
  const variantes: [number, number][] = [];
  if (sello > 0)
    variantes.push([sello - 1, r.debilidad], [sello - 1, r.debilidad + 1]);
  if (r.debilidad > 0)
    variantes.push([sello, r.debilidad - 1], [sello + 1, r.debilidad - 1]);
  if (neutrales > 0)
    variantes.push([sello + 1, r.debilidad], [sello, r.debilidad + 1]);
  const fragil = variantes.some(([s, d]) => lectura(s, d, r.total) !== actual);
  return { lectura: actual, fragil, sinBase: false };
}
