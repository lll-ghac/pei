// Tipos de la definición de las encuestas (fuente: Diccionario de datos v9).
// Los códigos se guardan siempre como texto: "1", "98", "a".

export type Estamento = "A" | "E" | "F";

export type Opcion = {
  codigo: string;
  texto: string;
};

type Base = {
  /** Código de la pregunta en el diccionario, ej. "A3". */
  codigo: string;
  /** Número que ve la persona (el del Word). */
  numero: number;
  texto: string;
  /** Texto de ayuda bajo el enunciado, ej. "(marque máximo 2)". */
  indicacion?: string;
  /** Texto citado antes de la pregunta (visión o misión actual). */
  cita?: { antes: string; texto: string };
};

export type PreguntaUnica = Base & {
  tipo: "unica";
  opciones: Opcion[];
};

export type PreguntaMultiple = Base & {
  tipo: "multiple";
  max: number;
  opciones: Opcion[];
};

export type PreguntaExacta = Base & {
  tipo: "exacta";
  n: number;
  opciones: Opcion[];
};

export type ItemEscala = {
  /** Sufijo del ítem: "1", "L1", "C3"… La columna queda como A5_1, F7_L1. */
  codigo: string;
  texto: string;
};

export type GrupoEscala = {
  titulo?: string;
  items: ItemEscala[];
};

export type PreguntaEscala = Base & {
  tipo: "escala";
  escala: "ACU" | "FRE";
  grupos: GrupoEscala[];
};

/** "La más importante": una opción entre las marcadas en otra pregunta exacta. */
export type PreguntaMasImportante = Base & {
  tipo: "masImportante";
  de: string;
};

export type PreguntaAbierta = Base & {
  tipo: "abierta";
};

export type Pregunta =
  | PreguntaUnica
  | PreguntaMultiple
  | PreguntaExacta
  | PreguntaEscala
  | PreguntaMasImportante
  | PreguntaAbierta;

export type Seccion = {
  titulo: string;
  preguntas: Pregunta[];
};

export type Encuesta = {
  estamento: Estamento;
  titulo: string;
  introduccion: string[];
  minutos: number;
  secciones: Seccion[];
  despedida: string;
};

/** Respuesta a una pregunta, tal como viaja del navegador al servidor. */
export type ValorRespuesta = {
  /** Códigos elegidos (única, múltiple, exacta, más importante). */
  codigos?: string[];
  /** Texto de "Otra" (si se marcó 99) o de una pregunta abierta. */
  texto?: string;
  /** Escalas: código de ítem → valor elegido. */
  items?: Record<string, string>;
};

export type Respuestas = Record<string, ValorRespuesta>;

/** Códigos especiales del diccionario. */
export const OTRA = "99";
export const NO_SE = "98";
export const PREFIERO_NO = "97";
export const POR_AHORA_NO = "96";
export const EXCLUYENTES = [NO_SE, PREFIERO_NO, POR_AHORA_NO];

/** Texto de "Otra". */
export const MAX_TEXTO = 500;
/** Respuestas abiertas (2030, un cambio concreto): más espacio para desarrollar una idea. */
export const MAX_ABIERTA = 1000;
