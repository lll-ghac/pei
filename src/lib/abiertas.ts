import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Estamento } from "./encuestas";

/** Lista inicial aprobada de temas (Diccionario de datos). */
export const TEMAS_INICIALES: { codigo: string; nombre: string; descripcion: string }[] = [
  { codigo: "T01", nombre: "Infraestructura y espacios", descripcion: "Baños, patios, salas, techos, mobiliario" },
  { codigo: "T02", nombre: "Convivencia y buen trato", descripcion: "Peleas, bullying, respeto entre compañeros" },
  { codigo: "T03", nombre: "Seguridad", descripcion: "Entrada y salida, portones, accidentes" },
  { codigo: "T04", nombre: "Clases y metodologías", descripcion: "Clases más entretenidas, prácticas, explicaciones" },
  { codigo: "T05", nombre: "Apoyo al aprendizaje", descripcion: "Reforzamiento, apoyo a quien le cuesta, PIE" },
  { codigo: "T06", nombre: "Resultados y exigencia académica", descripcion: "Mejores notas, SIMCE, preparación para la media" },
  { codigo: "T07", nombre: "Talleres, deporte y arte", descripcion: "Más talleres, academias, actividades extraprogramáticas" },
  { codigo: "T08", nombre: "Tecnología y recursos", descripcion: "Computadores, internet, materiales" },
  { codigo: "T09", nombre: "Comunicación escuela–familia", descripcion: "Informar a tiempo, canales, reuniones" },
  { codigo: "T10", nombre: "Participación y escucha", descripcion: "Que escuchen a estudiantes, apoderados o funcionarios" },
  { codigo: "T11", nombre: "Gestión y organización", descripcion: "Planificación, horarios, reemplazos, decisiones" },
  { codigo: "T12", nombre: "Clima laboral y condiciones de trabajo", descripcion: "Carga administrativa, reconocimiento, trato entre funcionarios" },
  { codigo: "T13", nombre: "Bienestar y salud emocional", descripcion: "Apoyo psicológico, estrés, contención" },
  { codigo: "T14", nombre: "Valores y formación personal", descripcion: "Respeto, responsabilidad, disciplina" },
  { codigo: "T15", nombre: "Inglés e idiomas", descripcion: "Más horas de inglés" },
  { codigo: "T16", nombre: "Medioambiente", descripcion: "Reciclaje, áreas verdes" },
  { codigo: "T17", nombre: "Identidad y tradiciones", descripcion: "Himno, aniversario, actos, historia de la escuela" },
  { codigo: "T18", nombre: "Organización diaria", descripcion: "Alimentación, horarios de entrada y salida, transporte" },
  { codigo: "T98", nombre: "Tema nuevo", descripcion: "No calza en ninguno; se anota una etiqueta breve para revisar" },
  { codigo: "T99", nombre: "Sin contenido o no pertinente", descripcion: "«Nada», «no sé», respuestas sin relación con la escuela" },
];

/** Roles genéricos para reemplazar nombres (MVP). */
export const ROLES = ["[un docente]", "[una docente]", "[un asistente]", "[una asistente]", "[un estudiante]", "[un apoderado]", "[un directivo]", "[dato personal]"];

/**
 * Crea las filas de revisión para los textos de la urna que aún no las tienen (abiertas y «Otra»).
 * Se puede llamar las veces que haga falta: solo agrega lo nuevo.
 */
export async function sincronizarTextos(prueba: boolean) {
  await db.execute(sql`
    insert into textos (respuesta_id, pregunta, estamento)
    select r.id, kv.key, r.estamento
    from respuestas r, jsonb_each(r.datos) kv
    where r.prueba = ${prueba}
      and jsonb_typeof(kv.value) = 'object'
      and coalesce(kv.value->>'texto', '') <> ''
      and not exists (select 1 from textos t where t.respuesta_id = r.id and t.pregunta = kv.key)`);
}

export type Texto = {
  id: string;
  pregunta: string;
  estamento: Estamento;
  estado: "pendiente" | "revisado" | "no_publicar";
  texto: string;
  tema1: string | null;
  tema2: string | null;
  tema3: string | null;
  temaNuevo: string | null;
  cita: boolean;
};

export async function listarTextos(prueba: boolean): Promise<Texto[]> {
  const filas = await db
    .select({
      id: schema.textos.id,
      pregunta: schema.textos.pregunta,
      estamento: schema.textos.estamento,
      estado: schema.textos.estado,
      texto: sql<string>`${schema.respuestas.datos} -> ${schema.textos.pregunta} ->> 'texto'`,
      tema1: schema.textos.tema1,
      tema2: schema.textos.tema2,
      tema3: schema.textos.tema3,
      temaNuevo: schema.textos.temaNuevo,
      cita: schema.textos.cita,
    })
    .from(schema.textos)
    .innerJoin(schema.respuestas, eq(schema.respuestas.id, schema.textos.respuestaId))
    .where(eq(schema.respuestas.prueba, prueba))
    .orderBy(asc(schema.textos.estamento), asc(schema.textos.pregunta), asc(schema.textos.id));
  return filas.map((f) => ({ ...f, texto: f.texto ?? "", estamento: f.estamento as Estamento, estado: f.estado as Texto["estado"] }));
}

// ---------- Detección de posibles nombres ----------

const sinTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Palabras con mayúscula que no son nombres de personas (lugares, siglas, instituciones, días, meses). */
const NO_SON_NOMBRES = new Set(
  [
    "chile", "antofagasta", "ecuador", "republica", "escuela", "dios", "pei", "pme", "simce", "junaeb", "cesfam", "carabineros",
    "pdi", "mineduc", "pie", "sae", "uta", "inacap", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo",
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
    "ingles", "matematica", "matematicas", "lenguaje", "historia", "ciencias", "musica", "arte", "educacion", "fisica",
    "tecnologia", "religion", "orientacion", "kinder", "prekinder", "basico", "media", "utp", "ok",
  ].map(sinTildes),
);

const TRATAMIENTO = /\b(t[ií]as?|t[ií]os?|profes?|profesora?|se[ñn]ora?|sr\.?|sra\.?|srta\.?|don|do[ñn]a|miss|director(?:a)?|inspector(?:a)?|auxiliar|apoderad[oa])\s+([A-ZÁÉÍÓÚÑ][\wáéíóúñü]+)/gi;

export type Marca = { inicio: number; fin: number; motivo: string };

/** Marca posibles nombres: tratamiento + nombre, nombres del personal y palabras con mayúscula fuera de inicio de oración. */
export function marcarNombres(texto: string, personal: string[]): Marca[] {
  const marcas: Marca[] = [];
  const agregar = (inicio: number, fin: number, motivo: string) => {
    if (!marcas.some((m) => inicio < m.fin && fin > m.inicio)) marcas.push({ inicio, fin, motivo });
  };
  for (const m of texto.matchAll(TRATAMIENTO)) {
    // Solo si lo que sigue al tratamiento parte con mayúscula («la tía Carmen», no «la directora escuche»).
    if (/^[A-ZÁÉÍÓÚÑ]/.test(m[2])) agregar(m.index!, m.index! + m[0].length, "tratamiento");
  }
  const palabrasPersonal = new Set(
    personal.flatMap((n) => n.split(/\s+/)).map(sinTildes).filter((p) => p.length >= 3),
  );
  for (const m of texto.matchAll(/[\p{L}]{3,}/gu)) {
    const palabra = sinTildes(m[0]);
    if (palabrasPersonal.has(palabra)) agregar(m.index!, m.index! + m[0].length, "personal");
  }
  for (const m of texto.matchAll(/\b[A-ZÁÉÍÓÚÑ][a-záéíóúñü]{2,}\b/g)) {
    const antes = texto.slice(0, m.index!).trimEnd();
    const inicioOracion = antes === "" || /[.!?¡¿:\n«"(]$/.test(antes);
    if (!inicioOracion && !NO_SON_NOMBRES.has(sinTildes(m[0]))) agregar(m.index!, m.index! + m[0].length, "mayúscula");
  }
  return marcas.sort((a, b) => a.inicio - b.inicio);
}

export async function leerPersonal(): Promise<string[]> {
  return (await db.select({ n: schema.nombresPersonal.nombre }).from(schema.nombresPersonal)).map((x) => x.n);
}

// ---------- Revisión ----------

/** Guarda el texto revisado en la urna (el original no se conserva) y su estado. */
export async function guardarRevision(id: string, texto: string, estado: "revisado" | "no_publicar") {
  const limpio = texto.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, 1000);
  await db.transaction(async (tx) => {
    const [t] = await tx.select().from(schema.textos).where(eq(schema.textos.id, id));
    if (!t) return;
    await tx.execute(sql`
      update respuestas
      set datos = jsonb_set(datos, array[${t.pregunta}, 'texto'], to_jsonb(${limpio}::text))
      where id = ${t.respuestaId}`);
    await tx.update(schema.textos).set({ estado }).where(eq(schema.textos.id, id));
  });
}

/** Marca como revisados textos pendientes sin ninguna marca de posible nombre (se vuelve a comprobar aquí). */
export async function confirmarSinNombres(ids: string[], prueba: boolean) {
  if (!ids.length) return 0;
  const personal = await leerPersonal();
  const textos = (await listarTextos(prueba)).filter((t) => ids.includes(t.id) && t.estado === "pendiente");
  const limpios = textos.filter((t) => marcarNombres(t.texto, personal).length === 0).map((t) => t.id);
  if (limpios.length) {
    await db.update(schema.textos).set({ estado: "revisado" }).where(and(inArray(schema.textos.id, limpios), eq(schema.textos.estado, "pendiente")));
  }
  return limpios.length;
}

// ---------- Exportar e importar (la plataforma no interviene en cómo se clasifica) ----------

const BOM = "﻿";
function celdaCsv(v: string) {
  return /[";\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}
/** CSV con punto y coma y BOM, para que Excel en español lo abra con tildes correctas. */
export function aCsv(filas: string[][]) {
  return BOM + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n") + "\r\n";
}

/** Lee CSV con «;» o «,» (lo que use la primera línea) y comillas dobles. */
export function leerCsv(texto: string): string[][] {
  const t = texto.replace(/^﻿/, "");
  const primera = t.split(/\r?\n/, 1)[0] ?? "";
  const sep = (primera.match(/;/g)?.length ?? 0) >= (primera.match(/,/g)?.length ?? 0) ? ";" : ",";
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = "";
  let comillas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (comillas) {
      if (c === '"' && t[i + 1] === '"') {
        celda += '"';
        i++;
      } else if (c === '"') comillas = false;
      else celda += c;
    } else if (c === '"') comillas = true;
    else if (c === sep) {
      fila.push(celda);
      celda = "";
    } else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      fila.push(celda);
      if (fila.some((x) => x.trim() !== "")) filas.push(fila);
      fila = [];
      celda = "";
    } else celda += c;
  }
  fila.push(celda);
  if (fila.some((x) => x.trim() !== "")) filas.push(fila);
  return filas;
}

export async function pendientes(prueba: boolean) {
  return (await listarTextos(prueba)).filter((t) => t.estado === "pendiente").length;
}

export async function archivoAbiertas(prueba: boolean) {
  const textos = (await listarTextos(prueba)).filter((t) => t.estado === "revisado");
  return {
    n: textos.length,
    csv: aCsv([["id_respuesta", "estamento", "pregunta", "texto"], ...textos.map((t) => [t.id, t.estamento, t.pregunta, t.texto])]),
  };
}

export async function listarTemas() {
  return db.select().from(schema.temas).orderBy(asc(schema.temas.orden));
}

export async function archivoTemas() {
  const temas = (await listarTemas()).filter((t) => t.activo);
  return aCsv([["codigo", "tema", "descripcion"], ...temas.map((t) => [t.codigo, t.nombre, t.descripcion])]);
}

export type FilaClasificada = { id: string; temas: string[]; temaNuevo: string | null; cita: boolean };
export type Revision = {
  filas: FilaClasificada[];
  errores: string[];
  porTema: Record<string, number>;
  sinClasificar: number;
};

const SI = new Set(["si", "sí", "s", "1", "x", "true", "verdadero"]);
const NORMAL = (s: string) => s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** Valida un archivo de clasificación sin cambiar nada. */
export async function revisarClasificacion(contenido: string, prueba: boolean): Promise<Revision> {
  const filas = leerCsv(contenido);
  const errores: string[] = [];
  if (filas.length < 2) return { filas: [], errores: ["El archivo no tiene filas de datos."], porTema: {}, sinClasificar: 0 };
  const cab = filas[0].map(NORMAL);
  const col = (nombre: string) => cab.indexOf(nombre);
  const iId = col("id_respuesta");
  const iT = [col("tema_1"), col("tema_2"), col("tema_3")];
  const iNuevo = col("tema_nuevo_texto");
  const iCita = col("cita_destacada");
  if (iId < 0 || iT[0] < 0) {
    return { filas: [], errores: ["Faltan columnas: se necesitan al menos id_respuesta y tema_1."], porTema: {}, sinClasificar: 0 };
  }
  const textos = (await listarTextos(prueba)).filter((t) => t.estado === "revisado");
  const ids = new Set(textos.map((t) => t.id));
  const activos = new Set((await listarTemas()).filter((t) => t.activo).map((t) => t.codigo));
  const vistos = new Set<string>();
  const salida: FilaClasificada[] = [];
  const porTema: Record<string, number> = {};
  filas.slice(1).forEach((f, k) => {
    const linea = k + 2;
    const id = (f[iId] ?? "").trim().toLowerCase();
    if (!ids.has(id)) return void errores.push(`Línea ${linea}: el id «${id || "(vacío)"}» no corresponde a ningún texto revisado.`);
    if (vistos.has(id)) return void errores.push(`Línea ${linea}: el id está repetido.`);
    vistos.add(id);
    const temas = iT.filter((i) => i >= 0).map((i) => (f[i] ?? "").trim().toUpperCase()).filter(Boolean);
    const malos = temas.filter((t) => !activos.has(t));
    if (malos.length) return void errores.push(`Línea ${linea}: tema(s) inexistente(s) o desactivado(s): ${malos.join(", ")}.`);
    if (new Set(temas).size !== temas.length) return void errores.push(`Línea ${linea}: un tema está repetido.`);
    const temaNuevo = iNuevo >= 0 ? (f[iNuevo] ?? "").trim().slice(0, 80) || null : null;
    if (temas.includes("T98") && !temaNuevo) return void errores.push(`Línea ${linea}: usa T98 (tema nuevo) sin etiqueta en tema_nuevo_texto.`);
    const cita = iCita >= 0 ? SI.has(NORMAL(f[iCita] ?? "")) : false;
    for (const t of temas) porTema[t] = (porTema[t] ?? 0) + 1;
    salida.push({ id, temas, temaNuevo: temas.includes("T98") ? temaNuevo : null, cita });
  });
  return { filas: salida, errores, porTema, sinClasificar: textos.length - salida.filter((x) => x.temas.length).length };
}

/** Aplica una clasificación ya revisada: reemplaza por completo la carga anterior. */
export async function aplicarClasificacion(filas: FilaClasificada[], prueba: boolean) {
  await db.transaction(async (tx) => {
    await tx.execute(sql`
      update textos set tema_1 = null, tema_2 = null, tema_3 = null, tema_nuevo = null, cita = false
      where respuesta_id in (select id from respuestas where prueba = ${prueba})`);
    for (const f of filas) {
      await tx
        .update(schema.textos)
        .set({ tema1: f.temas[0] ?? null, tema2: f.temas[1] ?? null, tema3: f.temas[2] ?? null, temaNuevo: f.temaNuevo, cita: f.cita })
        .where(eq(schema.textos.id, f.id));
    }
  });
}
