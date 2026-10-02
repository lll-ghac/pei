#!/usr/bin/env node
// Crea una cuenta de gestión desde la consola del servidor y muestra su contraseña una sola vez.
// Uso (dentro de la carpeta de la app):
//   node --env-file=../.env scripts/crear-admin.mjs <usuario> "<Nombre>" [admin|comision]
// Si el usuario ya existe, le asigna una contraseña nueva (sirve para recuperar el acceso).
import { randomBytes, randomInt, scrypt } from "node:crypto";
import { promisify } from "node:util";
import postgres from "postgres";

const [usuarioCrudo, nombre, rolCrudo = "admin"] = process.argv.slice(2);
const usuario = (usuarioCrudo ?? "").trim().toLowerCase();
const rol = rolCrudo === "comision" ? "comision" : "admin";

if (!/^[a-z0-9._-]{3,30}$/.test(usuario) || !nombre) {
  console.error('Uso: node --env-file=../.env scripts/crear-admin.mjs <usuario> "<Nombre>" [admin|comision]');
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("Falta DATABASE_URL (use --env-file con el .env de la app).");
  process.exit(1);
}

const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const trozo = () => Array.from({ length: 4 }, () => ALFABETO[randomInt(ALFABETO.length)]).join("");
const clave = `${trozo()}-${trozo()}-${trozo()}`;

// Mismo formato que src/lib/cripto.ts (hashClave).
const N = 2 ** 15;
const sal = randomBytes(16);
const hash = await promisify(scrypt)(clave, sal, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
const claveHash = `scrypt$${N}$${sal.toString("base64")}$${hash.toString("base64")}`;

const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  const [fila] = await sql`
    insert into gestores (usuario, nombre, rol, clave_hash)
    values (${usuario}, ${nombre}, ${rol}, ${claveHash})
    on conflict (usuario) do update set clave_hash = excluded.clave_hash, activo = true
    returning (xmax = 0) as nueva`;
  await sql`
    insert into bitacora (actor, accion, detalle)
    values ('consola', ${fila.nueva ? "Cuenta creada" : "Contraseña restablecida"}, ${`${usuario} (${rol})`})`;
  console.log(`\nCuenta ${fila.nueva ? "creada" : "actualizada"}: ${usuario} (${rol})`);
  console.log(`Contraseña: ${clave}`);
  console.log("Anótela ahora: no se vuelve a mostrar. Puede cambiarla en Panel → Sistema.\n");
} finally {
  await sql.end();
}
