// Pruebas de la bitácora de la sábana «para terceros» (roles en vez de nombres de usuario).
// Uso, desde la carpeta del proyecto:  npx tsx --test pruebas/bitacora-terceros.test.mts
import assert from "node:assert/strict";
import { test } from "node:test";
import { detalleSinUsuarios, rolDeActor } from "../src/lib/bitacora-terceros.ts";

const ROLES = new Map([
  ["ger", "admin"],
  ["aleyton", "comision"],
  ["sortiz", "comision"],
]);

test("quién: cuentas por su rol; consola y sistema por su origen", () => {
  assert.equal(rolDeActor("ger", ROLES), "Administración");
  assert.equal(rolDeActor("aleyton", ROLES), "Comisión");
  assert.equal(rolDeActor("admin (consola)", ROLES), "Administración (consola)");
  assert.equal(rolDeActor("consola", ROLES), "Administración (consola)");
  assert.equal(rolDeActor("sistema", ROLES), "Sistema");
  assert.equal(rolDeActor("cuenta-borrada", ROLES), "Panel");
});

test("acciones sobre cuentas: solo el rol de la cuenta", () => {
  assert.equal(detalleSinUsuarios("Cuenta creada", "aleyton (comision)", ROLES), "cuenta de Comisión");
  assert.equal(detalleSinUsuarios("Contraseña nueva asignada", "sortiz", ROLES), "cuenta de Comisión");
  assert.equal(detalleSinUsuarios("Cuenta dada de baja", "desconocido", ROLES), "una cuenta del panel");
});

test("otros detalles: el nombre de usuario se cambia por el rol, sin tocar palabras que lo contienen", () => {
  assert.equal(
    detalleSinUsuarios("Lista del personal actualizada", "46 nombres, cargados por consola a pedido de Ger", ROLES),
    "46 nombres, cargados por consola a pedido de Administración",
  );
  assert.equal(detalleSinUsuarios("Nota", "pedido de ger · gerencia", ROLES), "pedido de Administración · gerencia");
  assert.equal(detalleSinUsuarios("Informe final descargado", "informe.pdf · SHA-256 abc", ROLES), "informe.pdf · SHA-256 abc");
});
