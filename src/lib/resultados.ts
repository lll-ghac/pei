import "server-only";
import { eq } from "drizzle-orm";
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
export async function cargarUrna(prueba: boolean): Promise<Record<Estamento, Respuestas[]>> {
  const filas = await db
    .select({ estamento: schema.respuestas.estamento, datos: schema.respuestas.datos })
    .from(schema.respuestas)
    .where(eq(schema.respuestas.prueba, prueba));
  const urna: Record<Estamento, Respuestas[]> = { A: [], E: [], F: [] };
  for (const f of filas) urna[f.estamento as Estamento]?.push(f.datos as Respuestas);
  return urna;
}

/** Subgrupo de funcionarios por función (F1): solo para separar docentes y asistentes. */
export type GrupoFuncionarios = "todos" | "docentes" | "asistentes";
export function filtrarFuncionarios(lista: Respuestas[], grupo: GrupoFuncionarios) {
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
  | { tipo: "opciones"; pregunta: Pregunta; n: number; opciones: ConteoOpcion[]; textosOtra: number }
  | { tipo: "escala"; pregunta: Pregunta & { tipo: "escala" }; n: number; items: ConteoItem[] }
  | { tipo: "abierta"; pregunta: Pregunta; n: number; escritas: number };

const pct = (a: number, b: number) => (b > 0 ? (a / b) * 100 : 0);

function opcionesBase(p: Pregunta, encuesta: Encuesta): Opcion[] {
  if (p.tipo === "masImportante") {
    const origen = preguntasDe(encuesta).find((q) => q.codigo === p.de);
    return origen && "opciones" in origen ? origen.opciones : [];
  }
  return "opciones" in p ? p.opciones : [];
}

export function resumir(p: Pregunta, lista: Respuestas[], encuesta: Encuesta): ResumenPregunta {
  if (p.tipo === "abierta") {
    return { tipo: "abierta", pregunta: p, n: lista.length, escritas: lista.filter((r) => r[p.codigo]?.texto).length };
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
  const respondieron = lista.filter((r) => (r[p.codigo]?.codigos ?? []).length > 0);
  const n = respondieron.length;
  const opciones = opcionesBase(p, encuesta).map((o) => {
    const conteo = respondieron.filter((r) => r[p.codigo]!.codigos!.includes(o.codigo)).length;
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
};

export const COMPARABLES: Comparable[] = [
  { titulo: "Conocimiento del lema o los sellos actuales", codigos: { A: "A2", E: "E1", F: "F2" }, opciones: L.CON_ADULTOS },
  { titulo: "Propósito principal de la escuela", codigos: { A: "A8", E: "E5", F: "F5" }, opciones: L.PROP_ADULTOS, nota: "Se marcaban exactamente 2." },
  { titulo: "Valores que deberían guiar a la escuela", codigos: { A: "A15", E: "E10", F: "F16" }, opciones: L.VAL_ADULTOS, nota: "Se marcaban exactamente 3." },
  { titulo: "Perfil de egreso", codigos: { A: "A16", E: "E11", F: "F17" }, opciones: L.PER_ADULTOS, nota: "Se marcaban exactamente 3." },
  { titulo: "Perfil docente", codigos: { A: "A17", E: "E12", F: "F18" }, opciones: L.DOC_ADULTOS, nota: "Se marcaban exactamente 3." },
  { titulo: "Perfil de la familia", codigos: { A: "A18", F: "F19" }, opciones: L.FAM, nota: "No se preguntó a estudiantes." },
  { titulo: "Redes con el entorno", codigos: { A: "A14", E: "E9", F: "F14" }, opciones: L.RED_ADULTOS, nota: "Máximo 2." },
];

export type FilaComparable = { opcion: Opcion; pct: Partial<Record<Estamento, number | null>> };

export function comparar(c: Comparable, urna: Record<Estamento, Respuestas[]>) {
  const n: Partial<Record<Estamento, number>> = {};
  for (const [e, codigo] of Object.entries(c.codigos) as [Estamento, string][]) {
    n[e] = urna[e].filter((r) => (r[codigo]?.codigos ?? []).length > 0).length;
  }
  const filas: FilaComparable[] = c.opciones.map((o) => {
    const fila: FilaComparable = { opcion: o, pct: {} };
    for (const [e, codigo] of Object.entries(c.codigos) as [Estamento, string][]) {
      const total = n[e] ?? 0;
      fila.pct[e] =
        total < MINIMO ? null : pct(urna[e].filter((r) => r[codigo]?.codigos?.includes(o.codigo)).length, total);
    }
    return fila;
  });
  return { n, filas };
}

// ---------- Prioridades y sellos candidatos ----------

const TOP3: Record<Estamento, string> = { A: "A9", E: "E6", F: "F9" };
const MAS_IMPORTANTE: Record<Estamento, string> = { A: "A10", E: "E7", F: "F10" };
const POR_QUE: Record<Estamento, string> = { A: "A11", E: "E8", F: "F11" };

export type CeldaPrioridad = { pctTop3: number; rango: number; enTop5: boolean; masImportante: number } | null;
export type FilaPrioridad = {
  opcion: Opcion;
  por: Record<Estamento, CeldaPrioridad>;
  estamentosTop5: number;
  candidato: boolean;
  converge: boolean;
  /** Razones de quienes la eligieron como la más importante (todos los estamentos). */
  razones: { debilidad: number; fortaleza: number; futuro: number; sector: number; distinguiria: number; otra: number; total: number };
};

export function prioridades(urna: Record<Estamento, Respuestas[]>) {
  const n: Record<Estamento, number> = { A: urna.A.length, E: urna.E.length, F: urna.F.length };
  const validos = (Object.keys(n) as Estamento[]).filter((e) => n[e] >= MINIMO);
  const base = L.PRIORIDADES_ADULTOS;

  const porEstamento: Record<Estamento, Map<string, CeldaPrioridad>> = { A: new Map(), E: new Map(), F: new Map() };
  for (const e of validos) {
    const lista = urna[e];
    const filas = base.map((o) => ({
      codigo: o.codigo,
      pctTop3: pct(lista.filter((r) => r[TOP3[e]]?.codigos?.includes(o.codigo)).length, lista.length),
      masImportante: lista.filter((r) => r[MAS_IMPORTANTE[e]]?.codigos?.[0] === o.codigo).length,
    }));
    const orden = [...filas].sort((a, b) => b.pctTop3 - a.pctTop3 || b.masImportante - a.masImportante);
    // Rango por competencia (1, 2, 2, 4…): los empates comparten lugar.
    orden.forEach((f, i) => {
      const rango = i > 0 && f.pctTop3 === orden[i - 1].pctTop3 ? porEstamento[e].get(orden[i - 1].codigo)!.rango : i + 1;
      porEstamento[e].set(f.codigo, { pctTop3: f.pctTop3, masImportante: f.masImportante, rango, enTop5: rango <= 5 && f.pctTop3 > 0 });
    });
  }

  const filas: FilaPrioridad[] = base.map((o) => {
    const por = { A: null, E: null, F: null } as Record<Estamento, CeldaPrioridad>;
    for (const e of validos) por[e] = porEstamento[e].get(o.codigo) ?? null;
    const estamentosTop5 = validos.filter((e) => por[e]?.enTop5).length;
    const razones = { debilidad: 0, fortaleza: 0, futuro: 0, sector: 0, distinguiria: 0, otra: 0, total: 0 };
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
  const r = Object.values(f.por).filter(Boolean).map((c) => c!.rango);
  return r.length ? r.reduce((s, x) => s + x, 0) / r.length : 99;
}

export { ENCUESTAS, ESCALAS };
