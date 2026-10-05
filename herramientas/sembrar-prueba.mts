// SOLO DESARROLLO: llena la urna local con respuestas de prueba al azar, válidas según el diccionario.
// Uso: npx tsx --env-file=.env.local herramientas/sembrar-prueba.mts [apoderados] [estudiantes] [funcionarios]
// Nunca usar contra el servidor: escribe directo en la base indicada por DATABASE_URL.
import postgres from "postgres";
import { ENCUESTAS, validarEncuesta, type Estamento, type Respuestas } from "../src/lib/encuestas";
import { ESCALAS } from "../src/lib/encuestas/listas";

const url = process.env.DATABASE_URL ?? "";
if (!/127\.0\.0\.1|localhost/.test(url)) {
  console.error("Este script solo se usa contra la base local.");
  process.exit(1);
}

// Preferencias para que los gráficos tengan forma (no todo uniforme).
const peso = (codigo: string, i: number) => 1 + ((codigo.charCodeAt(0) * 7 + i * 13) % 5);
function elegir<T extends { codigo: string }>(lista: T[], k: number, excluir: string[] = []): string[] {
  const pool = lista.filter((o) => !excluir.includes(o.codigo));
  const elegidas: string[] = [];
  while (elegidas.length < k && elegidas.length < pool.length) {
    const candidatos = pool.filter((o) => !elegidas.includes(o.codigo));
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
  const enc = ENCUESTAS[e];
  const r: Respuestas = {};
  for (const s of enc.secciones) {
    for (const p of s.preguntas) {
      if (p.tipo === "abierta") {
        if (Math.random() < 0.4) r[p.codigo] = { texto: "Respuesta de prueba: más talleres y mejores baños." };
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

const [nA = 60, nE = 45, nF = 30] = process.argv.slice(2).map(Number);
const sql = postgres(url, { max: 1, onnotice: () => {} });
let total = 0;
for (const [e, cantidad, curso] of [["A", nA, "5A"], ["E", nE, "5A"], ["F", nF, null]] as const) {
  for (let i = 0; i < cantidad; i++) {
    const v = validarEncuesta(ENCUESTAS[e], responder(e));
    if (!v.ok) throw new Error(`${e}: ${v.error}`);
    await sql`insert into respuestas (estamento, curso_codigo, prueba, datos) values (${e}, ${curso}, true, ${sql.json(v.datos as never)})`;
    total++;
  }
}
await sql.end();
console.log(`Sembradas ${total} respuestas de prueba (A ${nA}, E ${nE}, F ${nF}).`);
