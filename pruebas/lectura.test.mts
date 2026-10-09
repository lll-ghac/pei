// Pruebas de las reglas de lectura de Resultados (casos de las revisiones externas del 9/10).
// Uso, desde la carpeta del proyecto:  npx tsx --test pruebas/lectura.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { BRECHA, esFragil, prepararComparativa, puntos } from "../src/lib/lectura.ts";

type E = "A" | "E" | "F";
/** Arma filas a partir de cuántas personas eligieron cada opción. */
function filas(n: Partial<Record<E, number>>, conteos: Record<string, Partial<Record<E, number>>>) {
  return Object.entries(conteos).map(([texto, c]) => ({
    texto,
    pct: Object.fromEntries(Object.entries(c).map(([e, k]) => [e, ((k as number) / n[e as E]!) * 100])) as Partial<Record<E, number>>,
  }));
}
const lugarDe = (r: ReturnType<typeof prepararComparativa>, texto: string, e: E) => r.filas.find((f) => f.texto === texto)!.lugar[e];

test("un 1° claro se mantiene aunque 4 opciones empaten en el 2°", () => {
  const n = { F: 38 };
  const r = prepararComparativa({
    filas: filas(n, { Salud: { F: 21 }, B: { F: 9 }, C: { F: 9 }, D: { F: 9 }, E2: { F: 8 }, Otra: { F: 2 } }),
    estamentos: ["F"],
    n,
  });
  assert.equal(lugarDe(r, "Salud", "F"), 1);
  for (const t of ["B", "C", "D", "E2"]) assert.equal(lugarDe(r, t, "F"), undefined, `${t} no debe tener lugar`);
  assert.deepEqual(r.sinPreferencia, []);
});

test("más de 3 empatadas en el 1° → «sin preferencia clara» y sin lugares", () => {
  const n = { E: 19 };
  const r = prepararComparativa({
    filas: filas(n, { A1: { E: 5 }, A2: { E: 5 }, A3: { E: 5 }, A4: { E: 4 }, A5: { E: 1 } }),
    estamentos: ["E"],
    n,
  });
  assert.deepEqual(r.sinPreferencia, ["E"]);
  assert.ok(r.filas.every((f) => f.lugar.E === undefined));
});

test("dos opciones a una persona comparten el 1° como empate técnico", () => {
  const n = { A: 20 };
  const r = prepararComparativa({ filas: filas(n, { X: { A: 10 }, Y: { A: 9 }, Z: { A: 3 } }), estamentos: ["A"], n });
  const x = r.filas.find((f) => f.texto === "X")!;
  const y = r.filas.find((f) => f.texto === "Y")!;
  assert.equal(x.lugar.A, 1);
  assert.equal(y.lugar.A, 1);
  assert.ok(x.empate.A && y.empate.A);
});

test("una opción elegida por una sola persona no recibe lugar", () => {
  const n = { A: 9 };
  const r = prepararComparativa({ filas: filas(n, { Mucho: { A: 6 }, Poco: { A: 2 }, Uno: { A: 1 } }), estamentos: ["A"], n });
  assert.equal(lugarDe(r, "Uno", "A"), undefined);
});

test("la diferencia usa los porcentajes redondeados que se ven", () => {
  const r = prepararComparativa({
    filas: [
      { texto: "Más o menos", pct: { A: 66.7, E: 36.8 } }, // se ven 67 y 37 → 30
      { texto: "Iguales", pct: { A: 78.3, E: 77.6 } }, // se ven 78 y 78 → 0
    ],
    estamentos: ["A", "E"],
    n: { A: 9, E: 19 },
  });
  assert.equal(r.filas.find((f) => f.texto === "Más o menos")!.dif, 30);
  assert.equal(r.filas.find((f) => f.texto === "Iguales")!.dif, 0);
  assert.ok(30 >= BRECHA);
  assert.equal(puntos(1), "1 pt");
  assert.equal(puntos(12), "12 pts");
});

test("fragilidad: se recalcula con todos los estamentos (el máximo puede cambiar)", () => {
  // A 8/9 = 89 %, F 35/40 = 88 %, E 23/40 = 58 %: diferencia 31. Si A pierde una persona queda en 78 %,
  // pero el máximo pasa a F (88 %): 88 − 58 = 30, sigue ≥ 30 → NO es frágil. Restar solo los extremos
  // originales (78 − 58 = 20) la marcaría frágil por error.
  const fila = { pct: { A: (8 / 9) * 100, F: 87.5, E: 57.5 }, conteo: { A: 8, F: 35, E: 23 } };
  assert.equal(esFragil({ fila, estamentos: ["A", "E", "F"], n: { A: 9, F: 40, E: 40 }, alto: ["A", 89], bajo: ["E", 58] }), false);
});

test("fragilidad: frágil si una persona de pocos casos la baja de 30", () => {
  // Bien preparado/a: A 4/9 = 44 %, E 1/19 = 5 %. Con una persona menos en A: 33 − 5 = 28 → frágil.
  const fila = { pct: { A: (4 / 9) * 100, E: (1 / 19) * 100 }, conteo: { A: 4, E: 1 } };
  assert.equal(esFragil({ fila, estamentos: ["A", "E"], n: { A: 9, E: 19 }, alto: ["A", 44], bajo: ["E", 5] }), true);
});

test("fragilidad: sólida si ni el cambio de una persona la baja de 30", () => {
  // «Sí, podría decirlos»: E 12/19 = 63 %, A 2/9 = 22 %. +1 en A → 33 %: 63 − 33 = 30 → no frágil (en el límite).
  // −1 en E → 11/19 = 58 %: 58 − 22 = 36 → no frágil.
  const fila = { pct: { E: (12 / 19) * 100, A: (2 / 9) * 100 }, conteo: { E: 12, A: 2 } };
  assert.equal(esFragil({ fila, estamentos: ["A", "E"], n: { A: 9, E: 19 }, alto: ["E", 63], bajo: ["A", 22] }), false);
});
