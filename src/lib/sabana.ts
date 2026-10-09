import "server-only";
import { createHash } from "node:crypto";
import { asc, eq } from "drizzle-orm";
import ExcelJS from "exceljs";
import { strToU8, zipSync } from "fflate";
import { db, schema } from "@/db";
import { aCsv, listarTemas, listarTextos } from "./abiertas";
import { NIVELES } from "./cursos-iniciales";
import {
  ENCUESTAS,
  OTRA,
  VERSION_INSTRUMENTO,
  preguntasDe,
  type Estamento,
  type Respuestas,
} from "./encuestas";
import { ESCALAS } from "./encuestas/listas";
import { leerEstado } from "./estado";
import { MINIMO } from "./resultados";

/**
 * Sábana de datos (MVP): todas las respuestas, una fila por encuesta, para revisar o rehacer
 * el análisis sin la plataforma. Dos versiones: completa (comisión) y para terceros (con
 * cursos pequeños agrupados y la gestión de funcionarios separada del resto).
 */

export type Version = "completa" | "terceros";
export type Valores = "codigos" | "etiquetas";
export type Formato = "xlsx" | "csv";

type Celda = string | number | null;
type Hoja = {
  nombre: string;
  columnas: string[];
  anchos?: number[];
  filas: Celda[][];
};

/** Una columna de datos derivada de una pregunta. */
type Columna = {
  col: string;
  pregunta: string;
  enunciado: string;
  tipo: string;
  valores: [string, string][];
  leer: (
    r: Respuestas,
    textoOtra: (pregunta: string) => string | null,
  ) => Celda;
};

const ESTAMENTOS: Estamento[] = ["A", "E", "F"];
const HOJA: Record<Estamento, string> = {
  A: "Apoderados",
  E: "Estudiantes",
  F: "Funcionarios",
};
const GESTION = ["F7", "F8"];
const MARCO: [string, string][] = [
  ["1", "Marcó"],
  ["0", "No marcó"],
];
/** Fisher-Yates: deja las filas en un orden al azar. */
function barajar<T>(lista: T[]) {
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
}

const numero = (v: string | undefined | null): Celda =>
  v == null ? null : /^\d+$/.test(v) ? Number(v) : v;

function columnasDe(e: Estamento): Columna[] {
  const cols: Columna[] = [];
  const preguntas = preguntasDe(ENCUESTAS[e]);
  for (const p of preguntas) {
    const otra = (tipo: string): Columna => ({
      col: `${p.codigo}_otra`,
      pregunta: p.codigo,
      enunciado: `${p.texto} — texto de «Otra»`,
      tipo,
      valores: [],
      leer: (_r, textoOtra) => textoOtra(p.codigo),
    });
    if (p.tipo === "unica") {
      cols.push({
        col: p.codigo,
        pregunta: p.codigo,
        enunciado: p.texto,
        tipo: "Única",
        valores: p.opciones.map((o) => [o.codigo, o.texto]),
        leer: (r) => numero(r[p.codigo]?.codigos?.[0]),
      });
      if (p.opciones.some((o) => o.codigo === OTRA)) cols.push(otra("Texto"));
    } else if (p.tipo === "multiple" || p.tipo === "exacta") {
      for (const o of p.opciones) {
        cols.push({
          col: `${p.codigo}_${o.codigo}`,
          pregunta: p.codigo,
          enunciado: `${p.texto} — ${o.texto}`,
          tipo:
            p.tipo === "multiple"
              ? `Múltiple (máx. ${p.max}), una columna por opción`
              : `Exacta ${p.n}, una columna por opción`,
          valores: MARCO,
          leer: (r) =>
            r[p.codigo]
              ? r[p.codigo].codigos?.includes(o.codigo)
                ? 1
                : 0
              : null,
        });
      }
      if (p.opciones.some((o) => o.codigo === OTRA)) cols.push(otra("Texto"));
    } else if (p.tipo === "masImportante") {
      const de = preguntas.find((x) => x.codigo === p.de);
      cols.push({
        col: p.codigo,
        pregunta: p.codigo,
        enunciado: p.texto,
        tipo: `La más importante entre las marcadas en ${p.de}`,
        valores:
          de && "opciones" in de
            ? de.opciones.map((o) => [o.codigo, o.texto])
            : [],
        leer: (r) => numero(r[p.codigo]?.codigos?.[0]),
      });
    } else if (p.tipo === "escala") {
      for (const it of p.grupos.flatMap((g) => g.items)) {
        cols.push({
          col: `${p.codigo}_${it.codigo}`,
          pregunta: p.codigo,
          enunciado: `${p.texto} — ${it.texto}`,
          tipo: `Escala ${p.escala}`,
          valores: ESCALAS[p.escala].map((o) => [o.codigo, o.texto]),
          leer: (r) => numero(r[p.codigo]?.items?.[it.codigo]),
        });
      }
    }
    // Las abiertas van en la hoja Abiertas, con un identificador propio.
  }
  return cols;
}

function etiqueta(c: Columna, v: Celda): Celda {
  if (v == null || !c.valores.length) return v;
  return c.valores.find(([k]) => k === String(v))?.[1] ?? v;
}

const fechaHora = new Intl.DateTimeFormat("es-CL", {
  timeZone: "America/Santiago",
  dateStyle: "short",
  timeStyle: "short",
});

/** Arma todas las hojas. */
export async function armarSabana(version: Version, valores: Valores) {
  const estado = await leerEstado();
  const prueba = estado.modo === "prueba";
  const [urna, cursos, textos, temas, credenciales, bitacora] =
    await Promise.all([
      db
        .select()
        .from(schema.respuestas)
        .where(eq(schema.respuestas.prueba, prueba))
        .orderBy(asc(schema.respuestas.cursoCodigo), asc(schema.respuestas.id)),
      db.select().from(schema.cursos).orderBy(asc(schema.cursos.orden)),
      listarTextos(prueba),
      listarTemas(),
      db
        .select({
          curso: schema.credenciales.cursoCodigo,
          estamento: schema.credenciales.estamento,
          estado: schema.credenciales.estado,
        })
        .from(schema.credenciales)
        .where(eq(schema.credenciales.prueba, prueba)),
      db.select().from(schema.bitacora).orderBy(asc(schema.bitacora.id)),
    ]);
  const curso = new Map(cursos.map((c) => [c.codigo, c]));
  const textoDe = new Map(textos.map((t) => [`${t.id}`, t]));
  // Estado de revisión de cada texto de «Otra», por respuesta y pregunta.
  const revision = new Map<string, string>();
  const filasTextos = await db
    .select({
      respuesta: schema.textos.respuestaId,
      pregunta: schema.textos.pregunta,
      id: schema.textos.id,
    })
    .from(schema.textos);
  for (const f of filasTextos)
    revision.set(
      `${f.respuesta}|${f.pregunta}`,
      textoDe.get(f.id)?.estado ?? "",
    );
  const nombreTema = new Map(temas.map((t) => [t.codigo, t.nombre]));
  const lbl = valores === "etiquetas";

  // Terceros: cursos con menos de MINIMO respuestas (por estamento) y Opción 4 se agrupan por nivel.
  const porCurso = new Map<string, number>();
  for (const r of urna)
    porCurso.set(
      `${r.estamento}|${r.cursoCodigo}`,
      (porCurso.get(`${r.estamento}|${r.cursoCodigo}`) ?? 0) + 1,
    );
  const cursoVisible = (e: Estamento, codigo: string | null): Celda => {
    if (!codigo) return null;
    const c = curso.get(codigo);
    if (!c) return codigo;
    if (version === "completa") return lbl ? c.nombre : c.codigo;
    if (c.nivel === "opcion4" || (porCurso.get(`${e}|${codigo}`) ?? 0) < MINIMO)
      return `${NIVELES[c.nivel] ?? c.nivel} (agrupado)`;
    return lbl ? c.nombre : c.codigo;
  };

  const hojas: Hoja[] = [];
  const conteo: Record<string, number> = {};
  const diccionario: Celda[][] = [
    [
      "(todas)",
      "id_respuesta",
      "Identificador aleatorio de la encuesta (no revela orden ni credencial)",
      "Texto",
      "",
    ],
    [
      "(todas)",
      "estamento",
      "A apoderados · E estudiantes · F funcionarios",
      "Código",
      "",
    ],
    [
      "Apoderados, Estudiantes",
      "curso",
      "Curso de la credencial (no se pregunta)",
      "Código",
      version === "terceros"
        ? "Cursos con menos de 5 respuestas y Opción 4: agrupados por nivel"
        : "",
    ],
    ["Apoderados, Estudiantes", "nivel", "Nivel del curso", "Texto", ""],
  ];

  for (const e of ESTAMENTOS) {
    const todas = columnasDe(e);
    const separar = version === "terceros" && e === "F";
    const cols = separar
      ? todas.filter((c) => !GESTION.includes(c.pregunta))
      : todas;
    const lista = urna.filter((r) => r.estamento === e);
    const filas = lista.map((r) => {
      const datos = r.datos as Respuestas;
      const textoOtra = (pregunta: string) => {
        const t = datos[pregunta]?.texto;
        if (!t) return null;
        const est = revision.get(`${r.id}|${pregunta}`);
        return est === "revisado"
          ? t
          : est === "no_publicar"
            ? "[no publicado]"
            : null;
      };
      const c = r.cursoCodigo ? curso.get(r.cursoCodigo) : undefined;
      return [
        r.id,
        e,
        cursoVisible(e, r.cursoCodigo),
        c ? (NIVELES[c.nivel] ?? c.nivel) : null,
        ...cols.map((col) =>
          lbl
            ? etiqueta(col, col.leer(datos, textoOtra))
            : col.leer(datos, textoOtra),
        ),
      ];
    });
    hojas.push({
      nombre: HOJA[e],
      columnas: [
        "id_respuesta",
        "estamento",
        "curso",
        "nivel",
        ...cols.map((c) => c.col),
      ],
      anchos: [38, 10, 18, 20],
      filas,
    });
    conteo[HOJA[e]] = filas.length;
    for (const c of todas) {
      diccionario.push([
        separar && GESTION.includes(c.pregunta)
          ? "Funcionarios_gestion"
          : HOJA[e],
        c.col,
        c.enunciado,
        c.tipo,
        c.valores.map(([k, v]) => `${k} = ${v}`).join(" · "),
      ]);
    }
    for (const p of preguntasDe(ENCUESTAS[e]).filter(
      (p) => p.tipo === "abierta",
    )) {
      diccionario.push([
        "Abiertas",
        p.codigo,
        p.texto,
        "Abierta (texto revisado, en la hoja Abiertas)",
        "",
      ]);
    }

    if (separar) {
      // Gestión de funcionarios: solo cruzada con Docente/Asistente, en filas sin identificador y en otro orden.
      const gestion = todas.filter((c) => GESTION.includes(c.pregunta));
      const grupos = { "1": 0, "2": 0 } as Record<string, number>;
      for (const r of lista) {
        const g = (r.datos as Respuestas).F1?.codigos?.[0];
        if (g) grupos[g] = (grupos[g] ?? 0) + 1;
      }
      const mostrarGrupo = grupos["1"] >= MINIMO && grupos["2"] >= MINIMO;
      const f1 = todas.find((c) => c.col === "F1")!;
      const filasG = lista.map((r) => {
        const d = r.datos as Respuestas;
        const g = mostrarGrupo ? f1.leer(d, () => null) : null;
        return [
          lbl ? etiqueta(f1, g) : g,
          ...gestion.map((c) =>
            lbl
              ? etiqueta(
                  c,
                  c.leer(d, () => null),
                )
              : c.leer(d, () => null),
          ),
        ];
      });
      barajar(filasG);
      hojas.push({
        nombre: "Funcionarios_gestion",
        columnas: ["F1", ...gestion.map((c) => c.col)],
        anchos: [12],
        filas: filasG,
      });
      conteo.Funcionarios_gestion = filasG.length;
    }
  }

  // Abiertas: solo textos revisados, con su identificador propio y los temas cargados.
  const tema = (c: string | null) =>
    c && lbl ? `${c} ${nombreTema.get(c) ?? ""}`.trim() : c;
  const abiertas = textos
    .filter((t) => t.estado === "revisado")
    .map((t) => [
      t.id,
      t.estamento,
      t.pregunta,
      t.texto,
      tema(t.tema1),
      tema(t.tema2),
      tema(t.tema3),
      t.temaNuevo,
      t.tema1 ? (t.cita ? "sí" : "no") : null,
    ]);
  hojas.push({
    nombre: "Abiertas",
    columnas: [
      "id_respuesta",
      "estamento",
      "pregunta",
      "texto",
      "tema_1",
      "tema_2",
      "tema_3",
      "tema_nuevo_texto",
      "cita_destacada",
    ],
    anchos: [38, 10, 10, 80, 14, 14, 14, 24, 14],
    filas: abiertas,
  });
  conteo.Abiertas = abiertas.length;
  diccionario.push(
    [
      "Abiertas",
      "id_respuesta",
      "Identificador propio del texto (no permite cruzarlo con las otras hojas)",
      "Texto",
      "",
    ],
    [
      "Abiertas",
      "tema_1 … tema_3",
      "Temas asignados por la comisión",
      "Código",
      temas
        .map(
          (t) => `${t.codigo} = ${t.nombre}${t.activo ? "" : " (desactivado)"}`,
        )
        .join(" · "),
    ],
    [
      "Abiertas",
      "tema_nuevo_texto",
      "Etiqueta breve cuando se usó T98",
      "Texto",
      "",
    ],
    [
      "Abiertas",
      "cita_destacada",
      "La comisión la marcó como cita destacada",
      "sí / no",
      "",
    ],
  );

  // Participación: credenciales por curso y estamento.
  const cuenta = (c: string | null, e: Estamento, est?: string) =>
    credenciales.filter(
      (x) => x.curso === c && x.estamento === e && (!est || x.estado === est),
    ).length;
  const participacion: Celda[][] = [];
  for (const c of cursos.filter((c) => c.activo)) {
    for (const e of (c.tieneEstudiantes ? ["A", "E"] : ["A"]) as Estamento[]) {
      const usadas = cuenta(c.codigo, e, "usada");
      const base =
        e === "A" ? (c.papeletasApoderados ?? c.matricula) : c.matricula;
      participacion.push([
        lbl ? c.nombre : c.codigo,
        NIVELES[c.nivel] ?? c.nivel,
        e,
        base,
        cuenta(c.codigo, e),
        cuenta(c.codigo, e, "desactivada"),
        usadas,
        base ? Math.round((usadas / base) * 1000) / 10 : null,
      ]);
    }
  }
  const usadasF = cuenta(null, "F", "usada");
  participacion.push([
    "Funcionarios",
    null,
    "F",
    estado.funcionariosTotal,
    cuenta(null, "F"),
    cuenta(null, "F", "desactivada"),
    usadasF,
    estado.funcionariosTotal
      ? Math.round((usadasF / estado.funcionariosTotal) * 1000) / 10
      : null,
  ]);
  hojas.push({
    nombre: "Participación",
    columnas: [
      "curso",
      "nivel",
      "estamento",
      "base_del_porcentaje",
      "credenciales_generadas",
      "credenciales_desactivadas",
      "credenciales_usadas",
      "porcentaje",
    ],
    anchos: [18, 20, 10, 18, 20, 22, 18, 12],
    filas: participacion,
  });
  conteo.Participación = participacion.length;
  diccionario.push(
    [
      "Participación",
      "base_del_porcentaje",
      "Apoderados: papeletas entregadas informadas por el profesor jefe (o la matrícula si no se informó). Estudiantes: matrícula. Funcionarios: total de funcionarios",
      "Número",
      "",
    ],
    [
      "Participación",
      "porcentaje",
      "credenciales_usadas / base_del_porcentaje × 100",
      "Número",
      "",
    ],
  );

  hojas.push({
    nombre: "Diccionario",
    columnas: ["hoja", "columna", "pregunta o significado", "tipo", "valores"],
    anchos: [22, 14, 80, 34, 80],
    filas: diccionario,
  });

  hojas.push({
    nombre: "Bitácora",
    columnas: ["fecha", "quién", "acción", "detalle"],
    anchos: [18, 16, 36, 90],
    filas: bitacora.map((b) => [
      fechaHora.format(b.fecha),
      b.actor,
      b.accion,
      b.detalle,
    ]),
  });
  conteo.Bitácora = bitacora.length;

  const corte = fechaHora.format(new Date());
  const leeme: Celda[][] = [
    [
      "Sábana de datos · Encuesta PEI 2027 · Escuela República del Ecuador E-79",
    ],
    [
      prueba
        ? "ATENCIÓN: DATOS DE PRUEBA. Este archivo es un ensayo; no son respuestas reales."
        : "Datos del periodo oficial (las respuestas de prueba no aparecen).",
    ],
    [],
    [
      "Versión",
      version === "completa"
        ? "Completa (comisión y administración)"
        : "Para terceros (revisión externa del proceso)",
    ],
    [
      "Valores",
      lbl
        ? "Etiquetas en palabras (para leer)"
        : "Códigos numéricos (para calcular)",
    ],
    ["Instrumento", VERSION_INSTRUMENTO],
    ["Fecha y hora de corte", corte],
    [],
    ["Filas por hoja"],
    ...Object.entries(conteo).map(([h, n]) => [h, n]),
    [],
    ["Cómo vienen los datos"],
    [
      "Una fila por encuesta enviada. Columnas fijas: id_respuesta, estamento, curso y nivel. No hay fecha, hora ni credencial.",
    ],
    [
      "Escalas: una columna por ítem con su código (ej. A5_3 = 4). Opciones múltiples, top 3, valores y perfil: una columna por opción, 1 si la marcó y 0 si no (ej. A9_l = 1).",
    ],
    [
      "Texto de «Otra»: en su propia columna (ej. A3_otra). Las preguntas abiertas están en la hoja Abiertas, con un identificador propio que no permite cruzarlas con las demás hojas.",
    ],
    [
      "Valores especiales: 98 = No sé · 97 = Prefiero no responder · 96 = Por ahora no puedo · 99 = Otra. Celda vacía = sin respuesta.",
    ],
    ["La hoja Diccionario explica cada columna y sus valores."],
    [],
    ["Reglas de anonimato"],
    [
      "Los textos se revisaron antes de exportar: los nombres se reemplazaron por un rol general ([docente]…). Los textos marcados «no publicar» no aparecen.",
    ],
    ["Los resultados por grupo se informan solo con 5 respuestas o más."],
    ...(version === "terceros"
      ? [
          [
            "Cursos con menos de 5 respuestas y los cursos PIE Opción 4 aparecen agrupados por nivel.",
          ],
          [
            "La gestión de funcionarios (F7 y F8) está en la hoja Funcionarios_gestion, sin identificador y en otro orden, cruzada solo con Docente/Asistente (F1). Si un grupo tiene menos de 5, F1 queda vacío.",
          ],
        ]
      : []),
    [],
    ["Huella digital (SHA-256)"],
    [
      "La huella de este archivo quedó anotada en la bitácora del panel con fecha y autor. Para comprobar que no cambió: en Windows, certutil -hashfile <archivo> SHA256, o Panel → Descargas → Verificar un archivo.",
    ],
    [
      "Guarde el original sin abrirlo ni volver a guardarlo y trabaje siempre en una copia: Excel cambia la huella al guardar, aunque no se modifiquen los datos.",
    ],
  ];
  hojas.unshift({
    nombre: "LÉEME",
    columnas: ["Encuesta PEI 2027", ""],
    anchos: [34, 110],
    filas: leeme,
  });

  return { hojas, conteo, prueba };
}

/** Excel con una hoja por sección. */
export async function sabanaExcel(hojas: Hoja[]): Promise<Uint8Array> {
  const libro = new ExcelJS.Workbook();
  libro.creator = "Encuesta PEI 2027";
  libro.created = new Date();
  for (const h of hojas) {
    const ws = libro.addWorksheet(h.nombre, {
      views: [{ state: "frozen", ySplit: 1 }],
    });
    ws.addRow(h.columnas);
    ws.getRow(1).font = { bold: true };
    for (const f of h.filas) ws.addRow(f);
    h.columnas.forEach((_, i) => {
      ws.getColumn(i + 1).width = h.anchos?.[i] ?? 11;
    });
    if (
      h.nombre === "LÉEME" ||
      h.nombre === "Diccionario" ||
      h.nombre === "Abiertas"
    ) {
      ws.eachRow((fila) => {
        fila.alignment = { wrapText: true, vertical: "top" };
      });
    }
  }
  return new Uint8Array(await libro.xlsx.writeBuffer());
}

/** Una hoja = un CSV UTF-8 (separador «;»), todos en un .zip. */
export function sabanaCsv(hojas: Hoja[]): Uint8Array {
  const nombre = (h: string) =>
    h.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\s+/g, "_");
  const archivos: Record<string, Uint8Array> = {};
  for (const h of hojas) {
    archivos[`${nombre(h.nombre)}.csv`] = strToU8(
      aCsv([
        h.columnas,
        ...h.filas.map((f) => f.map((c) => (c == null ? "" : String(c)))),
      ]),
    );
  }
  return zipSync(archivos, { level: 6 });
}

export const huella = (datos: Uint8Array) =>
  createHash("sha256").update(datos).digest("hex");
