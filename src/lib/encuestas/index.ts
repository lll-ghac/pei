// Encuestas v9 y reglas de respuesta del diccionario (sección "Reglas de respuesta").
// Este módulo se usa en el navegador y en el servidor: no debe importar nada de Node.
import { apoderados } from "./apoderados";
import { estudiantes } from "./estudiantes";
import { funcionarios } from "./funcionarios";
import { ESCALAS } from "./listas";
import {
  EXCLUYENTES,
  MAX_TEXTO,
  OTRA,
  type Encuesta,
  type Estamento,
  type Pregunta,
  type Respuestas,
  type ValorRespuesta,
} from "./tipos";

export * from "./tipos";

export const VERSION_INSTRUMENTO = "v9 (aprobada 2026-10-02)";

export const ENCUESTAS: Record<Estamento, Encuesta> = {
  A: apoderados,
  E: estudiantes,
  F: funcionarios,
};

export const NOMBRE_ESTAMENTO: Record<Estamento, string> = {
  A: "Apoderados",
  E: "Estudiantes",
  F: "Funcionarios",
};

export function preguntasDe(encuesta: Encuesta): Pregunta[] {
  return encuesta.secciones.flatMap((s) => s.preguntas);
}

/** Limpia un texto libre: sin caracteres de control, espacios recortados y largo máximo. */
export function limpiarTexto(texto: string | undefined): string {
  if (!texto) return "";
  return texto
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim()
    .slice(0, MAX_TEXTO);
}

/** Opciones válidas de una pregunta, considerando "la más importante". */
export function opcionesDe(p: Pregunta, respuestas: Respuestas, encuesta: Encuesta) {
  if (p.tipo === "masImportante") {
    const origen = preguntasDe(encuesta).find((q) => q.codigo === p.de);
    const marcadas = respuestas[p.de]?.codigos ?? [];
    if (!origen || !("opciones" in origen)) return [];
    return origen.opciones.filter((o) => marcadas.includes(o.codigo));
  }
  if ("opciones" in p) return p.opciones;
  return [];
}

function tu(estamento: Estamento, paraTi: string, paraUsted: string) {
  return estamento === "E" ? paraTi : paraUsted;
}

/**
 * Valida una pregunta. Devuelve un mensaje para la persona, o null si está bien.
 * Las cerradas son obligatorias; las abiertas, opcionales.
 */
export function validarPregunta(
  p: Pregunta,
  valor: ValorRespuesta | undefined,
  respuestas: Respuestas,
  encuesta: Encuesta,
): string | null {
  const e = encuesta.estamento;

  if (p.tipo === "abierta") {
    const t = valor?.texto ?? "";
    if (t.length > MAX_TEXTO) return `El texto puede tener hasta ${MAX_TEXTO} caracteres.`;
    return null;
  }

  if (p.tipo === "escala") {
    const permitidos = ESCALAS[p.escala].map((o) => o.codigo);
    for (const grupo of p.grupos) {
      for (const item of grupo.items) {
        const v = valor?.items?.[item.codigo];
        if (!v) return tu(e, "Responde todas las frases.", "Responda todas las frases.");
        if (!permitidos.includes(v)) return "Hay una respuesta no válida.";
      }
    }
    return null;
  }

  const codigos = valor?.codigos ?? [];
  const validos = opcionesDe(p, respuestas, encuesta).map((o) => o.codigo);
  if (new Set(codigos).size !== codigos.length) return "Hay una opción repetida.";
  if (codigos.some((c) => !validos.includes(c))) return "Hay una opción no válida.";

  if (codigos.length === 0) {
    return tu(e, "Elige una opción para seguir.", "Elija una opción para seguir.");
  }

  if (p.tipo === "unica" || p.tipo === "masImportante") {
    if (codigos.length !== 1) return tu(e, "Elige solo una opción.", "Elija solo una opción.");
  }

  if (p.tipo === "multiple") {
    if (codigos.length > p.max) {
      return tu(e, `Elige máximo ${p.max}.`, `Elija máximo ${p.max}.`);
    }
    if (codigos.length > 1 && codigos.some((c) => EXCLUYENTES.includes(c))) {
      return "Esa opción no se puede marcar junto con otras.";
    }
  }

  if (p.tipo === "exacta" && codigos.length !== p.n) {
    return tu(
      e,
      `Elige ${p.n} opciones, llevas ${codigos.length}.`,
      `Elija ${p.n} opciones, lleva ${codigos.length}.`,
    );
  }

  if (codigos.includes(OTRA) && !limpiarTexto(valor?.texto)) {
    return tu(e, "Escribe cuál es la otra opción.", "Escriba cuál es la otra opción.");
  }
  if ((valor?.texto ?? "").length > MAX_TEXTO) {
    return `El texto puede tener hasta ${MAX_TEXTO} caracteres.`;
  }
  return null;
}

/**
 * Valida la encuesta completa en el servidor y devuelve solo los datos conocidos,
 * limpios y con el texto de "Otra" únicamente cuando se marcó "Otra".
 */
export function validarEncuesta(
  encuesta: Encuesta,
  entrada: unknown,
): { ok: true; datos: Respuestas } | { ok: false; error: string } {
  if (!entrada || typeof entrada !== "object") return { ok: false, error: "Respuestas vacías." };
  const crudo = entrada as Record<string, ValorRespuesta>;
  const datos: Respuestas = {};

  for (const p of preguntasDe(encuesta)) {
    const v = crudo[p.codigo];
    const valor: ValorRespuesta = {};
    if (v && typeof v === "object") {
      if (Array.isArray(v.codigos)) valor.codigos = v.codigos.map(String);
      if (typeof v.texto === "string") valor.texto = limpiarTexto(v.texto);
      if (v.items && typeof v.items === "object") {
        valor.items = Object.fromEntries(
          Object.entries(v.items).map(([k, x]) => [String(k), String(x)]),
        );
      }
    }
    const error = validarPregunta(p, valor, datos, encuesta);
    if (error) return { ok: false, error: `${p.codigo}: ${error}` };

    if (p.tipo === "abierta") {
      if (valor.texto) datos[p.codigo] = { texto: valor.texto };
    } else if (p.tipo === "escala") {
      const items: Record<string, string> = {};
      for (const item of p.grupos.flatMap((g) => g.items)) {
        items[item.codigo] = valor.items![item.codigo];
      }
      datos[p.codigo] = { items };
    } else {
      const limpio: ValorRespuesta = { codigos: valor.codigos };
      if (valor.codigos?.includes(OTRA)) limpio.texto = valor.texto;
      datos[p.codigo] = limpio;
    }
  }
  return { ok: true, datos };
}
