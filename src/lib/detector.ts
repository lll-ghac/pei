// Detección de posibles nombres e identificaciones en las respuestas abiertas (Panel → Abiertas).
// Módulo puro, sin base de datos: se prueba con `pruebas/detector.test.mts`.
// Solo marca: quien revisa decide qué cambiar. Reglas acordadas con Ger el 9/10.

const sinTildes = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Roles para reemplazar un nombre. Sin género: en una escuela chica, «una docente» puede identificar. */
export const ROLES = [
  "[docente]",
  "[asistente]",
  "[estudiante]",
  "[apoderado/a]",
  "[directivo/a]",
  "[funcionario/a]",
  "[dato personal]",
];

/**
 * Cargos que tiene una sola persona en la escuela: nombrarlos ya la identifica. Lista inicial; la
 * administración la ajusta en Panel → Abiertas (se guarda en ajustes, clave «cargos»).
 */
export const CARGOS_INICIALES = [
  "director",
  "directora",
  "subdirector",
  "subdirectora",
  "jefe de UTP",
  "jefa de UTP",
  "jefe técnico",
  "jefa técnica",
  "inspector general",
  "inspectora general",
  "encargado de convivencia",
  "encargada de convivencia",
  "psicólogo",
  "psicóloga",
  "orientador",
  "orientadora",
  "trabajador social",
  "trabajadora social",
  "fonoaudiólogo",
  "fonoaudióloga",
  "coordinador PIE",
  "coordinadora PIE",
  "secretaria",
  "portero",
  "portera",
  "bibliotecario",
  "bibliotecaria",
  "enfermero",
  "enfermera",
];

export type TipoMarca = "nombre" | "identificacion";
export type Marca = {
  inicio: number;
  fin: number;
  motivo: string;
  tipo: TipoMarca;
};

/** Palabras con mayúscula que no son nombres de personas (lugares, siglas, instituciones, días, meses, ramos). */
const NO_SON_NOMBRES = new Set(
  [
    "chile",
    "antofagasta",
    "ecuador",
    "republica",
    "escuela",
    "dios",
    "pei",
    "pme",
    "simce",
    "junaeb",
    "cesfam",
    "carabineros",
    "pdi",
    "mineduc",
    "pie",
    "sae",
    "uta",
    "inacap",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
    "domingo",
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
    "ingles",
    "matematica",
    "matematicas",
    "lenguaje",
    "historia",
    "ciencias",
    "musica",
    "arte",
    "artes",
    "educacion",
    "fisica",
    "tecnologia",
    "religion",
    "orientacion",
    "kinder",
    "prekinder",
    "basico",
    "media",
    "utp",
    "ok",
  ].map(sinTildes),
);

/** De un nombre del personal no se usan las palabras de enlace. */
const CONECTORES = new Set([
  "de",
  "del",
  "la",
  "las",
  "los",
  "y",
  "san",
  "da",
  "di",
  "van",
  "von",
]);

/**
 * Nombres o apellidos que también son palabras comunes («las salas», «en julio», «las paredes»):
 * de la lista del personal se marcan solo con mayúscula y fuera del inicio de una oración.
 */
const COMUNES = new Set(
  [
    "salas",
    "campos",
    "rosas",
    "rosa",
    "torres",
    "paz",
    "cruz",
    "vega",
    "ramos",
    "reyes",
    "bravo",
    "rojas",
    "morales",
    "tapia",
    "paredes",
    "cordero",
    "palacios",
    "victoria",
    "julio",
    "rosario",
    "aurora",
    "rocha",
    "leon",
    "flores",
    "soto",
    "rios",
    "vera",
    "mora",
    "blanco",
    "pinto",
    "prado",
    "nieves",
    "luz",
    "angeles",
    "dolores",
    "soledad",
    "mercedes",
    "castillo",
    "montes",
    "valle",
    "fuentes",
    "silva",
    "rivera",
    "molina",
    "luna",
    "sol",
    "esperanza",
    "gracia",
    "santos",
    "cordova",
    "alegria",
    "pastor",
    "marin",
  ].map(sinTildes),
);

const TRATAMIENTO =
  /(?<!\p{L})(t[ií]as?|t[ií]os?|profes?|profesora?|se[ñn]ora?|sr\.?|sra\.?|srta\.?|don|do[ñn]a|miss|director(?:a)?|inspector(?:a)?|auxiliar|apoderad[oa])\s+(\p{Lu}\p{Ll}+)/giu;

// Identificaciones sin nombre: un cargo con su asignatura, su curso o su lugar.
const CARGO = String.raw`(?:profe(?:sor(?:a)?)?|profes|t[ií]a|t[ií]o|miss|inspector(?:a)?|auxiliar|asistente|educador(?:a)?|portero|portera|se[ñn]ora|se[ñn]or)`;
const ASIGNATURA = String.raw`(?:lenguaje|matem[aá]ticas?|ingl[eé]s|historia|ciencias|educaci[oó]n\s+f[ií]sica|ed\.?\s*f[ií]sica|m[uú]sica|artes?|religi[oó]n|tecnolog[ií]a|computaci[oó]n|orientaci[oó]n|taller(?:\s+de\s+\p{L}+)?)`;
const CURSO = String.raw`(?:pre-?k[ií]nder|k[ií]nder|\d{1,2}\s*°?\s*(?:b[aá]sico)?\s*(?:[a-c](?!\p{L}))?|primero|segundo|tercero|cuarto|quinto|sexto|s[eé]ptimo|octavo)`;
const LUGAR = String.raw`(?:patio|porter[ií]a|comedor|casino|biblioteca|laboratorio|enfermer[ií]a|gimnasio|bodega|cocina|entrada|(?:primer|segundo|tercer)\s+piso)`;
const IDENTIFICACIONES: { re: RegExp; motivo: string }[] = [
  // «la profe de lenguaje», «el profesor jefe de matemáticas», «la de inglés», «el de educación física»
  {
    re: new RegExp(
      String.raw`(?<!\p{L})(?:${CARGO}(?:\s+jef[ea])?|la|el)\s+del?\s+${ASIGNATURA}(?!\p{L})`,
      "giu",
    ),
    motivo: "cargo + asignatura",
  },
  // «la profesora de 5° A», «el profe jefe de quinto», «la tía de kínder»
  {
    re: new RegExp(
      String.raw`(?<!\p{L})${CARGO}(?:\s+jef[ea])?\s+del?\s+(?:curso\s+)?${CURSO}`,
      "giu",
    ),
    motivo: "cargo + curso",
  },
  // «el inspector del patio», «la señora de la portería»
  {
    re: new RegExp(
      String.raw`(?<!\p{L})${CARGO}\s+del?\s+(?:la\s+)?${LUGAR}(?!\p{L})`,
      "giu",
    ),
    motivo: "cargo + lugar",
  },
];

/** Expresión para un cargo de la lista: sin importar mayúsculas ni tildes, con palabras completas. */
function reCargo(cargo: string): RegExp {
  const conTildes: Record<string, string> = {
    a: "[aá]",
    e: "[eé]",
    i: "[ií]",
    o: "[oó]",
    u: "[uúü]",
    n: "[nñ]",
  };
  const patron = sinTildes(cargo)
    .trim()
    .replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    .replace(/\s+/g, String.raw`\s+`)
    .replace(/[aeioun]/g, (c) => conTildes[c]);
  return new RegExp(String.raw`(?<!\p{L})${patron}(?!\p{L})`, "giu");
}

/** ¿La palabra en `indice` inicia una oración, una línea o un elemento de lista? */
function inicioDeOracion(texto: string, indice: number): boolean {
  const antes = texto.slice(0, indice);
  if (/(^|\n)[ \t]*(?:[-•*·–]|\d+[.)])?[ \t]*$/.test(antes)) return true;
  return /[.!?¡¿:«"(][ \t]*$/.test(antes);
}

/**
 * Marca posibles nombres (amarillo) y posibles identificaciones (otro color). Reglas, en este orden:
 * tratamiento + nombre, lista del personal, cargo + asignatura/curso/lugar, cargos únicos y palabra con
 * mayúscula fuera del inicio de oración. Las marcas no se superponen: gana la primera regla.
 */
export function marcarNombres(
  texto: string,
  personal: string[],
  cargos: string[] = CARGOS_INICIALES,
): Marca[] {
  const marcas: Marca[] = [];
  const agregar = (
    inicio: number,
    fin: number,
    motivo: string,
    tipo: TipoMarca,
  ) => {
    if (!marcas.some((m) => inicio < m.fin && fin > m.inicio))
      marcas.push({ inicio, fin, motivo, tipo });
  };

  for (const m of texto.matchAll(TRATAMIENTO)) {
    // Solo si lo que sigue parte con mayúscula («la tía Carmen», no «la directora escuche»).
    // Con la bandera «i», \p{Lu} también acepta minúsculas: se exige la mayúscula aparte.
    if (/^\p{Lu}/u.test(m[2]) && !NO_SON_NOMBRES.has(sinTildes(m[2])))
      agregar(m.index!, m.index! + m[0].length, "tratamiento", "nombre");
  }

  const palabras = new Set(
    personal
      .flatMap((n) => n.split(/\s+/))
      .map(sinTildes)
      .filter((p) => p.length >= 3 && !CONECTORES.has(p)),
  );
  for (const m of texto.matchAll(/(?<!\p{L})\p{L}{3,}(?!\p{L})/gu)) {
    const palabra = sinTildes(m[0]);
    if (!palabras.has(palabra)) continue;
    if (COMUNES.has(palabra)) {
      const conMayuscula = /^\p{Lu}/u.test(m[0]);
      if (!conMayuscula || inicioDeOracion(texto, m.index!)) continue;
    }
    agregar(m.index!, m.index! + m[0].length, "personal", "nombre");
  }

  for (const { re, motivo } of IDENTIFICACIONES) {
    for (const m of texto.matchAll(re))
      agregar(
        m.index!,
        m.index! + m[0].trimEnd().length,
        motivo,
        "identificacion",
      );
  }
  for (const cargo of cargos) {
    if (!cargo.trim()) continue;
    for (const m of texto.matchAll(reCargo(cargo)))
      agregar(
        m.index!,
        m.index! + m[0].length,
        "cargo único",
        "identificacion",
      );
  }

  for (const m of texto.matchAll(/(?<!\p{L})\p{Lu}\p{Ll}{2,}(?!\p{L})/gu)) {
    if (inicioDeOracion(texto, m.index!) || NO_SON_NOMBRES.has(sinTildes(m[0])))
      continue;
    agregar(m.index!, m.index! + m[0].length, "mayúscula", "nombre");
  }
  return marcas.sort((a, b) => a.inicio - b.inicio);
}
