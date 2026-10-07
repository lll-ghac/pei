// Genera N credenciales PRUEBA- para la prueba de carga (mezcla de estamentos).
// Uso: node credenciales.mjs 150   → escribe ../salida/credenciales.json, ../salida/crear.sql y ../salida/borrar.sql
// El SQL se aplica en la base local (docker exec) o en el servidor (ssh + psql). Las credenciales
// llevan «-Q» en el usuario para reconocerlas y borrarlas después; el reinicio a cero también las borra.
import { writeFileSync } from "node:fs";

const n = Number(process.argv[2] ?? 150);
const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const azar = (k) => Array.from({ length: k }, () => ALFABETO[Math.floor(Math.random() * ALFABETO.length)]).join("");
const usados = new Set();
const lista = [];
for (let i = 0; i < n; i++) {
  const estamento = i % 20 < 8 ? "A" : i % 20 < 15 ? "E" : "F"; // 40% A, 35% E, 25% F
  let usuario;
  do usuario = estamento === "F" ? `PRUEBA-FUN-Q${azar(4)}` : `PRUEBA-5A-Q${azar(4)}`;
  while (usados.has(usuario));
  usados.add(usuario);
  lista.push({ usuario, clave: azar(6), estamento });
}
const salida = new URL("../salida/", import.meta.url);
writeFileSync(new URL("credenciales.json", salida), JSON.stringify(lista));
writeFileSync(
  new URL("crear.sql", salida),
  "insert into credenciales (usuario, clave, curso_codigo, estamento, prueba) values\n" +
    lista.map((c) => `('${c.usuario}', '${c.clave}', ${c.estamento === "F" ? "null" : "'5A'"}, '${c.estamento}', true)`).join(",\n") +
    ";\n",
);
writeFileSync(
  new URL("borrar.sql", salida),
  `delete from credenciales where prueba and usuario in (${lista.map((c) => `'${c.usuario}'`).join(",")});\n`,
);
console.log(`${n} credenciales: A ${lista.filter((c) => c.estamento === "A").length}, E ${lista.filter((c) => c.estamento === "E").length}, F ${lista.filter((c) => c.estamento === "F").length}`);
