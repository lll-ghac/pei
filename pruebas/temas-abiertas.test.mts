// Pruebas de cómo se cuentan los temas de las abiertas (reglas acordadas con Ger el 13/10/2026).
// Uso, desde la carpeta del proyecto:  npx tsx --test pruebas/temas-abiertas.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { temasDeGrupo, temasDeOtra, type TextoTemas } from "../src/lib/temas-abiertas.ts";

const TEMAS = [
  { codigo: "T01", nombre: "Infraestructura" },
  { codigo: "T02", nombre: "Convivencia" },
  { codigo: "T98", nombre: "Tema nuevo" },
  { codigo: "T99", nombre: "Sin contenido" },
];
const t = (pregunta: string, temas: string[], extra: Partial<TextoTemas> = {}): TextoTemas => ({
  pregunta,
  estamento: pregunta[0] as "A" | "E" | "F",
  estado: "revisado",
  tema1: temas[0] ?? null,
  tema2: temas[1] ?? null,
  tema3: temas[2] ?? null,
  temaNuevo: null,
  ...extra,
});
const repetir = (k: number, f: () => TextoTemas) => Array.from({ length: k }, f);

test("T99 no entra a la base: 6 con contenido y 2 sin contenido → 50% sobre 6", () => {
  const textos = [
    ...repetir(3, () => t("F20", ["T01"])),
    ...repetir(3, () => t("F20", ["T02"])),
    ...repetir(2, () => t("F20", ["T99"])),
  ];
  const r = temasDeGrupo(textos, TEMAS, ["A19", "E13", "F20"], 5);
  assert.equal(r.n.F, 6);
  assert.equal(r.escribieron.F, 8);
  assert.equal(r.sinContenido.F, 2);
  assert.equal(r.filas.find((f) => f.codigo === "T01")!.pct.F, 50);
});

test("T98 cuenta en la base pero no es fila; su etiqueta va en nuevos", () => {
  const textos = [
    ...repetir(4, () => t("A20", ["T01"])),
    t("A20", ["T98"], { temaNuevo: "Uso de celular" }),
    t("A20", ["T02", "T98"], { temaNuevo: "Uso de celular" }),
  ];
  const r = temasDeGrupo(textos, TEMAS, ["A20", "E14", "F21"], 5);
  assert.equal(r.n.A, 6);
  assert.ok(!r.filas.some((f) => f.codigo === "T98" || f.codigo === "T99"));
  assert.deepEqual(r.nuevos, [["Uso de celular", 2]]);
});

test("las preguntas del otro grupo y los textos de «Otra» no se mezclan", () => {
  const textos = [
    ...repetir(5, () => t("E13", ["T01"])),
    ...repetir(5, () => t("E14", ["T02"])),
    ...repetir(5, () => t("E4", ["T02"])),
  ];
  const r = temasDeGrupo(textos, TEMAS, ["A19", "E13", "F20"], 5);
  assert.equal(r.n.E, 5);
  assert.deepEqual(r.filas.map((f) => f.codigo), ["T01"]);
});

test("con menos de 5 personas en la base el estamento no se muestra", () => {
  const textos = [...repetir(4, () => t("A19", ["T01"])), ...repetir(3, () => t("A19", ["T99"]))];
  const r = temasDeGrupo(textos, TEMAS, ["A19", "E13", "F20"], 5);
  assert.deepEqual(r.estamentos, []);
  assert.equal(r.escribieron.A, 7);
});

test("«no publicar» y sin clasificar quedan fuera y se cuentan aparte", () => {
  const textos = [
    ...repetir(5, () => t("F21", ["T01"])),
    t("F21", [], { estado: "no_publicar" }),
    t("F21", []),
  ];
  const r = temasDeGrupo(textos, TEMAS, ["A20", "E14", "F21"], 5);
  assert.equal(r.n.F, 5);
  assert.equal(r.noPublicar.F, 1);
  assert.equal(r.sinClasificar.F, 1);
  assert.equal(r.escribieron.F, 7);
});

test("«Otra»: por pregunta, solo fuera de las 6 abiertas", () => {
  const textos = [t("A4", ["T98"], { temaNuevo: "Cercanía" }), t("A19", ["T01"]), t("E8", ["T99"])];
  const o = temasDeOtra(textos, TEMAS);
  assert.deepEqual(o.map((x) => x.pregunta), ["A4", "E8"]);
  assert.deepEqual(o[0].temas, [["T98 · Cercanía", 1]]);
});
