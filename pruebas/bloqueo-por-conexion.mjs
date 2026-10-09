import { chromium } from "playwright";
// Prueba: el bloqueo de una papeleta es solo para la conexión que falló (decisión 9/10).
// Uso (solo local): BASE=http://localhost:3102 node bloqueo-por-conexion.mjs
// Simula dos redes con la cabecera x-forwarded-for (en el servidor la pone Cloudflare).
import { execSync } from "node:child_process";
const U = `PRUEBA-5A-L${Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01IOL]/g, "K")}`;
execSync(`docker exec -i pei-pg-dev psql -U pei_encuesta -d pei_encuesta -q`, {
  input: `insert into credenciales (usuario, clave, curso_codigo, estamento, prueba) values ('${U}','BLOQUE','5A','A',true);`,
});
process.env.U = U;
const B = process.env.BASE ?? "http://localhost:3102";
const b = await chromium.launch();
async function intento(ip, clave) {
  const ctx = await b.newContext({ extraHTTPHeaders: { "x-forwarded-for": ip } });
  const p = await ctx.newPage(); p.setDefaultTimeout(60000);
  await p.goto(B + "/"); await p.fill("#usuario", U); await p.fill("#clave", clave); await p.click("form button[type=submit]");
  await Promise.race([p.waitForURL(/\/encuesta/, { timeout: 20000 }), p.waitForSelector("[role=alert]:not([id])", { timeout: 20000 })]).catch(() => {});
  const r = p.url().includes("/encuesta") ? "ENTRÓ" : (await p.locator("[role=alert]:not([id])").first().innerText()).replace(/\s+/g, " ").replace("REVISE ", "");
  await ctx.close(); return r;
}
for (let i = 1; i <= 5; i++) console.log(`conexión 1, clave mala ${i}:`, await intento("10.0.0.1", "MALMAL"));
const r1 = await intento("10.0.0.1", "BLOQUE");
const r2 = await intento("10.0.0.2", "BLOQUE");
console.log("conexión 1, clave correcta:", r1);
console.log("conexión 2 (otra red), clave correcta:", r2);
await b.close();
const ok = r1.includes("muchos intentos") && r2 === "ENTRÓ";
console.log(ok ? "OK: el bloqueo es solo para la conexión que falló" : "FALLA");
process.exit(ok ? 0 : 1);
