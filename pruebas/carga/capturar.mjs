// Captura cómo viajan el ingreso y el envío (acciones de servidor) desde un navegador real,
// para que la prueba de carga los repita. Solo contra la versión local.
import { execSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { chromium } from "playwright";
const BASE = process.env.BASE ?? "http://localhost:3100";
const sql = (q) => execSync(`docker exec -i pei-pg-dev psql -U pei_encuesta -d pei_encuesta -At`, { input: q }).toString().trim();
const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01IOL]/g, "K");
const cred = { A: { usuario: `PRUEBA-5A-C${sufijo}`, clave: "CAPAPO" }, E: { usuario: `PRUEBA-5A-D${sufijo}`, clave: "CAPEST" }, F: { usuario: `PRUEBA-FUN-E${sufijo}`, clave: "CAPFUN" } };
sql(`insert into credenciales (usuario, clave, curso_codigo, estamento, prueba) values ('${cred.A.usuario}','${cred.A.clave}','5A','A',true),('${cred.E.usuario}','${cred.E.clave}','5A','E',true),('${cred.F.usuario}','${cred.F.clave}',null,'F',true);`);
const b = await chromium.launch();
const ok = () => {};
async function ingresar(p, usuario, clave) {
  await p.goto(BASE + "/");
  await p.fill("#usuario", usuario);
  await p.fill("#clave", clave);
  await p.click("form button[type=submit]");
  await Promise.race([p.waitForURL("**/encuesta", { timeout: 20000 }), p.waitForSelector("[role=alert]:not([id])", { timeout: 20000 })]).catch(() => {});
  if (p.url().endsWith("/encuesta")) return null;
  return (await p.locator("[role=alert]:not([id])").first().innerText().catch(() => "")).trim();
}

const NO_ELEGIR = /^(Otra|No sé|Prefiero no responder|Por ahora no puedo)/;

/** Responde la encuesta completa eligiendo opciones válidas; deja las abiertas vacías. */
async function responder(p) {
  let pantallas = 0;
  for (let vuelta = 0; vuelta < 120; vuelta++) {
    const depositar = p.getByRole("button", { name: /^Depositar en la urna$/ });
    if (await depositar.count()) {
      await depositar.click();
      await p.waitForURL(/\/gracias/, { timeout: 30000 });
      return pantallas;
    }
    const comenzar = p.getByRole("button", { name: "Comenzar" });
    if (await comenzar.count()) {
      await comenzar.click();
      await p.waitForTimeout(300);
      continue;
    }
    pantallas++;
    const radios = p.locator("[role=radio]");
    const checks = p.locator("[role=checkbox]");
    if (await checks.count()) {
      const texto = await p.locator("main").innerText();
      const n = Number(texto.match(/exactamente (\d)/i)?.[1] ?? 1);
      let marcadas = 0;
      for (let i = 0; i < (await checks.count()) && marcadas < n; i++) {
        const c = checks.nth(i);
        if (NO_ELEGIR.test((await c.innerText()).replace(/^\d+\s*/, "").trim())) continue;
        if ((await c.getAttribute("aria-checked")) !== "true") await c.click();
        marcadas++;
      }
    } else if (await radios.count()) {
      // Una pantalla puede tener varios grupos (una escala: un grupo por frase): se marca uno en cada uno.
      const grupos = p.locator("[role=radiogroup]");
      for (let g = 0; g < (await grupos.count()); g++) {
        const rs = grupos.nth(g).locator("[role=radio]");
        for (let i = 0; i < (await rs.count()); i++) {
          const r = rs.nth(i);
          if (NO_ELEGIR.test((await r.innerText()).replace(/^\d+\s*/, "").trim())) continue;
          await r.click();
          break;
        }
      }
    }
    await p.getByRole("button", { name: /^(Siguiente|Volver al resumen)$/ }).click();
    await p.waitForTimeout(250);
  }
  throw new Error("La encuesta no terminó en 120 pantallas");
}

const capturas = {};
for (const e of ["A", "E", "F"]) {
  const ctx = await b.newContext();
  const p = await ctx.newPage();
  p.on("request", (r) => {
    if (r.method() !== "POST") return;
    if (r.url().endsWith("/encuesta/depositar")) {
      // Desde el 9/10 se deposita en una dirección fija (JSON); se guarda como [respuestas, envioId].
      const d = JSON.parse(r.postData() ?? "{}");
      (capturas[e] ??= {}).envio = { url: "/encuesta/depositar", headers: r.headers(), body: JSON.stringify([d.respuestas, d.envioId]) };
      return;
    }
    const h = r.headers();
    if (!h["next-action"]) return;
    const tipo = r.url().includes("/encuesta") ? "envio" : "ingreso";
    (capturas[e] ??= {})[tipo] = { url: r.url().replace(BASE, ""), headers: h, body: r.postData() };
  });
  await ingresar(p, cred[e].usuario, cred[e].clave);
  await responder(p);
  await ctx.close();
}
writeFileSync(new URL("../salida/capturas.json", import.meta.url), JSON.stringify(capturas, null, 2));
for (const [e, c] of Object.entries(capturas)) for (const [t, x] of Object.entries(c)) console.log(e, t, x.url, "next-action", x.headers["next-action"], "content-type", x.headers["content-type"], "body", (x.body ?? "").length, "bytes:", (x.body ?? "").slice(0, 160).replace(/\s+/g, " "));
await b.close();
