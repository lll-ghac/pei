import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { ENCUESTAS, validarEncuesta, type Estamento, type Respuestas } from "./encuestas";
import { ESCALAS } from "./encuestas/listas";
import { leerEstado } from "./estado";

/**
 * Respuestas de prueba al azar (solo modo Prueba), válidas según el diccionario, para ensayar
 * resultados y abiertas sin tener que responder a mano. Quedan marcadas como prueba y el
 * reinicio a cero las borra.
 */

// Textos de ejemplo: la mayoría sin nombres; algunos con nombres o datos para ensayar la revisión.
const TEXTOS = [
  "Más talleres después de clases, de música y deporte.",
  "Que arreglen los baños y haya papel siempre.",
  "Me gustaría que la escuela tenga más actividades al aire libre.",
  "Mejorar la comunicación con las familias, a veces las notas llegan tarde.",
  "Más apoyo para los niños que les cuesta leer.",
  "El patio necesita sombra para el verano.",
  "Que los recreos sean más tranquilos, hay mucho empujón.",
  "Más horas de computación y que funcione el internet.",
  "Agradezco el cariño de los profesores con mi hijo.",
  "Que haya talleres para apoderados sobre cómo ayudar con las tareas.",
  "La tía Carmen siempre nos ayuda en el recreo.",
  "El profesor Rojas explica muy bien matemáticas.",
  "Quiero agradecer a la señora Juana del comedor.",
  "En el curso de mi hija hay un compañero, Matías, que molesta todos los días.",
  "Mi teléfono es 9 8765 4321 si quieren conversar.",
  "La Miss Paula hace las clases entretenidas, ojalá todos fueran así.",
];

const peso = (codigo: string, i: number) => 1 + ((codigo.charCodeAt(0) * 7 + i * 13) % 5);
function elegir<T extends { codigo: string }>(lista: T[], k: number): string[] {
  const elegidas: string[] = [];
  while (elegidas.length < k && elegidas.length < lista.length) {
    const candidatos = lista.filter((o) => !elegidas.includes(o.codigo));
    const total = candidatos.reduce((s, o, i) => s + peso(o.codigo, i), 0);
    let r = Math.random() * total;
    for (const [i, o] of candidatos.entries()) {
      r -= peso(o.codigo, i);
      if (r <= 0) {
        elegidas.push(o.codigo);
        break;
      }
    }
  }
  return elegidas;
}

function responder(e: Estamento): Respuestas {
  const r: Respuestas = {};
  for (const s of ENCUESTAS[e].secciones) {
    for (const p of s.preguntas) {
      if (p.tipo === "abierta") {
        if (Math.random() < 0.45) r[p.codigo] = { texto: TEXTOS[Math.floor(Math.random() * TEXTOS.length)] };
      } else if (p.tipo === "escala") {
        const items: Record<string, string> = {};
        for (const it of p.grupos.flatMap((g) => g.items)) {
          const vals = ESCALAS[p.escala].map((o) => o.codigo);
          const sesgo = Math.random() < 0.65 ? vals.slice(2, 4) : vals;
          items[it.codigo] = sesgo[Math.floor(Math.random() * sesgo.length)];
        }
        r[p.codigo] = { items };
      } else if (p.tipo === "masImportante") {
        const de = r[p.de]?.codigos ?? [];
        r[p.codigo] = { codigos: [de[Math.floor(Math.random() * de.length)]] };
      } else {
        const sinEspeciales = p.opciones.filter((o) => !["96", "97", "98", "99"].includes(o.codigo));
        const k = p.tipo === "exacta" ? p.n : p.tipo === "multiple" ? 1 + Math.floor(Math.random() * p.max) : 1;
        r[p.codigo] = { codigos: elegir(p.tipo === "unica" ? p.opciones.filter((o) => o.codigo !== "99") : sinEspeciales, k) };
      }
    }
  }
  return r;
}

export const CANTIDADES: Record<Estamento, number> = { A: 40, E: 30, F: 20 };

export async function cargarDatosPrueba(): Promise<number> {
  const estado = await leerEstado();
  if (estado.modo !== "prueba") throw new Error("Solo en modo Prueba.");
  const cursos = (
    await db
      .select({ codigo: schema.cursos.codigo })
      .from(schema.cursos)
      .where(and(eq(schema.cursos.activo, true), eq(schema.cursos.tieneEstudiantes, true)))
  ).map((c) => c.codigo);
  const filas = (["A", "E", "F"] as Estamento[]).flatMap((e) =>
    Array.from({ length: CANTIDADES[e] }, () => {
      const v = validarEncuesta(ENCUESTAS[e], responder(e));
      if (!v.ok) throw new Error(`${e}: ${v.error}`);
      return {
        estamento: e,
        cursoCodigo: e === "F" ? null : cursos[Math.floor(Math.random() * cursos.length)] ?? null,
        prueba: true,
        datos: v.datos,
      };
    }),
  );
  await db.insert(schema.respuestas).values(filas);
  return filas.length;
}
