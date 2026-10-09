// Pruebas del detector de nombres e identificaciones (Panel → Abiertas). Casos de la revisión del 9/10.
// Uso:  npx tsx --test pruebas/detector.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { marcarNombres } from "../src/lib/detector.ts";

const PERSONAL = ["Clarett Julia Burgos Salas", "Sara Viviana del Rosario Camacho Cortés", "Isabel Lorena Galleguillos Bravo", "Julio Enrique Cruz Hernández"];
const marcado = (texto: string, personal: string[] = PERSONAL) =>
  marcarNombres(texto, personal).map((m) => `${texto.slice(m.inicio, m.fin)}|${m.tipo}`);

test("las tildes no cortan la palabra: no marca «Aqu» en «Aquí»", () => {
  const r = marcado("Me gusta la escuela. Bueno, Aquí falta pintura.");
  assert.ok(!r.some((x) => x.startsWith("Aqu|")), r.join(", "));
});

test("una palabra con mayúscula al inicio de línea o de lista no es nombre", () => {
  const r = marcado("Valores importantes:\nEmpatía\n- Respeto\n1. Crear más talleres");
  assert.deepEqual(r, []);
});

test("tratamiento + nombre y mayúscula a mitad de oración siguen funcionando", () => {
  assert.deepEqual(marcado("La tía Carmen nos ayuda"), ["tía Carmen|nombre"]);
  assert.deepEqual(marcado("un compañero, Matías, molesta"), ["Matías|nombre"]);
});

test("palabras de enlace de la lista del personal no se marcan («del»)", () => {
  assert.deepEqual(marcado("Falta apoyo del equipo directivo de la sede"), []);
});

test("apellidos que son palabras comunes: solo con mayúscula a mitad de oración", () => {
  assert.deepEqual(marcado("Las salas están sucias y en julio hace frío"), []);
  assert.ok(marcado("Le dije a la profesora Salas que faltan sillas").length > 0);
  assert.deepEqual(marcado("hay que hablar con Salas pronto"), ["Salas|nombre"]);
});

test("nombres de la lista sin mayúscula ni tilde se marcan igual", () => {
  assert.deepEqual(marcado("le dije a galleguillos lo que pasó"), ["galleguillos|nombre"]);
});

test("identificación sin nombre: cargo + asignatura, curso o lugar", () => {
  assert.deepEqual(marcado("Sacar a la profe de lenguaje (ya saben a cuál)"), ["profe de lenguaje|identificacion"]);
  assert.deepEqual(marcado("la de inglés no explica"), ["la de inglés|identificacion"]);
  assert.ok(marcado("la profesora jefe de 5° A es muy buena").some((x) => x.endsWith("|identificacion")));
  assert.deepEqual(marcado("el inspector del patio grita mucho"), ["inspector del patio|identificacion"]);
});

test("un curso solo, sin cargo, no se marca", () => {
  assert.deepEqual(marcado("la silla rota de 5 A"), []);
});

test("cargos únicos como posible identificación", () => {
  assert.deepEqual(marcado("la directora debería escuchar más"), ["directora|identificacion"]);
  assert.deepEqual(marcado("La Jefa de UTP no responde"), ["Jefa de UTP|identificacion"]);
});
