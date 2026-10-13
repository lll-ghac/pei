// Temas de las respuestas abiertas: cómo se cuentan (Resultados → Abiertas y sección 10 del Informe).
// Módulo puro, sin base de datos: se prueba con `pruebas/temas-abiertas.test.mts`.
// Reglas acordadas con Ger el 13/10/2026:
// - una tabla por tipo de pregunta (la escuela en el 2030 / cambios), sin mezclar los textos de «Otra»;
// - cada persona escribe a lo más un texto por pregunta, así que la base son personas;
// - T99 (sin contenido) no entra a la base y se informa aparte;
// - T98 (tema nuevo) cuenta en la base, pero no es una fila de la tabla: su etiqueta va en «Temas nuevos propuestos».
import type { Estamento } from "./encuestas/tipos";

export const GRUPOS_ABIERTAS = [
  {
    id: "2030",
    titulo: "La escuela en el 2030",
    preguntas: ["A19", "E13", "F20"],
  },
  {
    id: "cambios",
    titulo: "Cambios propuestos",
    preguntas: ["A20", "E14", "F21"],
  },
] as const;

/** Las 6 preguntas abiertas; el resto de los textos son de «Otra» en preguntas cerradas. */
export const PREGUNTAS_ABIERTAS: readonly string[] = GRUPOS_ABIERTAS.flatMap(
  (g) => g.preguntas,
);

const ESTAMENTOS: Estamento[] = ["A", "E", "F"];

export type TextoTemas = {
  pregunta: string;
  estamento: Estamento;
  estado: "pendiente" | "revisado" | "no_publicar";
  tema1: string | null;
  tema2: string | null;
  tema3: string | null;
  temaNuevo: string | null;
};

export const tieneTema = (t: TextoTemas, codigo: string) =>
  t.tema1 === codigo || t.tema2 === codigo || t.tema3 === codigo;

type PorEstamento = Record<Estamento, number>;

export type TemasDeGrupo = {
  /** Personas en la base del %: textos revisados, clasificados y con contenido (sin T99). */
  n: PorEstamento;
  /** Personas que escribieron algo en estas preguntas (cualquier estado). */
  escribieron: PorEstamento;
  sinContenido: PorEstamento;
  noPublicar: PorEstamento;
  sinClasificar: PorEstamento;
  /** Estamentos con al menos `minimo` personas en la base. */
  estamentos: Estamento[];
  filas: {
    codigo: string;
    texto: string;
    pct: Partial<Record<Estamento, number | null>>;
  }[];
  /** Etiquetas de T98 con cuántas personas las usan. */
  nuevos: [string, number][];
};

export function temasDeGrupo(
  textos: TextoTemas[],
  temas: { codigo: string; nombre: string }[],
  preguntas: readonly string[],
  minimo: number,
): TemasDeGrupo {
  const delGrupo = textos.filter((t) => preguntas.includes(t.pregunta));
  const revisados = delGrupo.filter((t) => t.estado === "revisado");
  const base = revisados.filter((t) => t.tema1 && !tieneTema(t, "T99"));
  const contar = (lista: TextoTemas[]) =>
    Object.fromEntries(
      ESTAMENTOS.map((e) => [e, lista.filter((t) => t.estamento === e).length]),
    ) as PorEstamento;
  const n = contar(base);
  const estamentos = ESTAMENTOS.filter((e) => n[e] >= minimo);
  const filas = temas
    .filter((t) => t.codigo !== "T98" && t.codigo !== "T99")
    .map((t) => {
      const pct: Partial<Record<Estamento, number | null>> = {};
      for (const e of estamentos)
        pct[e] =
          (base.filter((x) => x.estamento === e && tieneTema(x, t.codigo))
            .length /
            n[e]) *
          100;
      return { codigo: t.codigo, texto: `${t.codigo} · ${t.nombre}`, pct };
    })
    .filter((f) => estamentos.some((e) => (f.pct[e] ?? 0) > 0));
  const nuevos = new Map<string, number>();
  for (const t of base)
    if (t.temaNuevo && tieneTema(t, "T98"))
      nuevos.set(t.temaNuevo, (nuevos.get(t.temaNuevo) ?? 0) + 1);
  return {
    n,
    escribieron: contar(delGrupo),
    sinContenido: contar(
      revisados.filter((t) => t.tema1 && tieneTema(t, "T99")),
    ),
    noPublicar: contar(delGrupo.filter((t) => t.estado === "no_publicar")),
    sinClasificar: contar(
      delGrupo.filter((t) => t.estado !== "no_publicar" && !t.tema1),
    ),
    estamentos,
    filas,
    nuevos: [...nuevos].sort((a, b) => b[1] - a[1]),
  };
}

/** Textos de «Otra» (preguntas cerradas) clasificados: por pregunta, cuántos y con qué temas. Sin %. */
export function temasDeOtra(
  textos: TextoTemas[],
  temas: { codigo: string; nombre: string }[],
) {
  const nombre = new Map(temas.map((t) => [t.codigo, t.nombre]));
  const otros = textos.filter(
    (t) =>
      !PREGUNTAS_ABIERTAS.includes(t.pregunta) &&
      t.estado === "revisado" &&
      t.tema1,
  );
  const preguntas = [...new Set(otros.map((t) => t.pregunta))].sort((a, b) =>
    a.localeCompare(b, "es", { numeric: true }),
  );
  return preguntas.map((p) => {
    const lista = otros.filter((t) => t.pregunta === p);
    const cuenta = new Map<string, number>();
    for (const t of lista)
      for (const c of [t.tema1, t.tema2, t.tema3])
        if (c) {
          const etiqueta =
            c === "T98" && t.temaNuevo
              ? `T98 · ${t.temaNuevo}`
              : `${c} · ${nombre.get(c) ?? ""}`;
          cuenta.set(etiqueta, (cuenta.get(etiqueta) ?? 0) + 1);
        }
    return {
      pregunta: p,
      estamento: lista[0].estamento,
      textos: lista.length,
      temas: [...cuenta].sort((a, b) => b[1] - a[1]),
    };
  });
}
