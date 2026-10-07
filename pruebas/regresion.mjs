// Prueba de regresión de punta a punta (navegador automático), SOLO contra la versión local.
// Uso, desde esta carpeta:
//   npm install && npx playwright install chromium      (la primera vez)
//   BASE=http://localhost:3100 CLAVE_DEV=<contraseña de la cuenta dev> node regresion.mjs
// Crea credenciales PRUEBA- en la base local (contenedor pei-pg-dev), responde las 3 encuestas,
// prueba los rechazos del ingreso, recorre el panel y las páginas públicas. No usa el servidor.
import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const BASE = process.env.BASE ?? "http://localhost:3100";
if (!/localhost|127\.0\.0\.1/.test(BASE)) {
  console.error("Esta prueba solo se usa contra la versión local.");
  process.exit(1);
}
const SALIDA = new URL("./salida/", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
mkdirSync(SALIDA, { recursive: true });
const sql = (q) =>
  execSync(`docker exec -i pei-pg-dev psql -U pei_encuesta -d pei_encuesta -At`, { input: q }).toString().trim();

let fallas = 0;
const ok = (cond, texto) => {
  console.log(`${cond ? "OK   " : "FALLA"} ${texto}`);
  if (!cond) fallas++;
};

// ---------- Preparación ----------
const estado = JSON.parse(sql("select valor from ajustes where clave='estado';"));
if (estado.modo !== "prueba") {
  console.error("La base local no está en modo Prueba; no se prueba.");
  process.exit(1);
}
if (estado.cerrada) {
  sql(`update ajustes set valor = valor || '{"cerrada": false}' where clave='estado';`);
  console.log("(la encuesta local estaba cerrada: se reabrió para la prueba)");
}
const sufijo = Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01IOL]/g, "K");
const cred = {
  A: { usuario: `PRUEBA-5A-R${sufijo}`, clave: "RGAPDO" },
  E: { usuario: `PRUEBA-5A-S${sufijo}`, clave: "RGESTU" },
  F: { usuario: `PRUEBA-FUN-T${sufijo}`, clave: "RGFUNC" },
  oficial: { usuario: `FUN-U${sufijo}`, clave: "RGOFIC" },
};
sql(`insert into credenciales (usuario, clave, curso_codigo, estamento, prueba) values
  ('${cred.A.usuario}', '${cred.A.clave}', '5A', 'A', true),
  ('${cred.E.usuario}', '${cred.E.clave}', '5A', 'E', true),
  ('${cred.F.usuario}', '${cred.F.clave}', null, 'F', true),
  ('${cred.oficial.usuario}', '${cred.oficial.clave}', null, 'F', false);`);

const b = await chromium.launch();
const errores = [];

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
    // Las frases de escala muestran «Frase N de M» y avanzan solas al elegir.
    const enEscala = /frase \d+ de \d+/i.test(await p.locator("main").innerText());
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
      for (let i = 0; i < (await radios.count()); i++) {
        const r = radios.nth(i);
        if (NO_ELEGIR.test((await r.innerText()).replace(/^\d+\s*/, "").trim())) continue;
        await r.click();
        break;
      }
      if (enEscala) {
        // Las frases de escala avanzan solas al elegir.
        await p.waitForTimeout(450);
        continue;
      }
    }
    await p.getByRole("button", { name: /^(Siguiente|Volver al resumen)$/ }).click();
    await p.waitForTimeout(250);
  }
  throw new Error("La encuesta no terminó en 120 pantallas");
}

// ---------- Las 3 encuestas ----------
const antes = Number(sql("select count(*) from respuestas where prueba;"));
for (const e of ["F", "A", "E"]) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const p = await ctx.newPage();
  p.on("pageerror", (x) => errores.push(`${e}: ${x.message}`));
  const error = await ingresar(p, cred[e].usuario.toLowerCase(), ` ${cred[e].clave.toLowerCase()} `);
  ok(error === null, `${e}: ingreso con usuario en minúsculas y espacios`);
  if (error === null) {
    try {
      const n = await responder(p);
      ok(true, `${e}: encuesta depositada (${n} pantallas)`);
    } catch (x) {
      ok(false, `${e}: ${x.message}`);
      await p.screenshot({ path: SALIDA + `falla-${e}.png` });
    }
  }
  const repetido = await ingresar(await ctx.newPage(), cred[e].usuario, cred[e].clave);
  ok(repetido?.includes("ya fue usada"), `${e}: reintento con la misma papeleta → «${repetido}»`);
  await ctx.close();
}
const despues = Number(sql("select count(*) from respuestas where prueba;"));
ok(despues - antes === 3, `la urna recibió 3 respuestas (${despues - antes})`);
ok(sql(`select count(*) from credenciales where usuario in ('${cred.A.usuario}','${cred.E.usuario}','${cred.F.usuario}') and estado='usada';`) === "3", "las 3 papeletas quedaron usadas en el padrón");

// ---------- Rechazos del ingreso ----------
{
  const p = await b.newPage();
  const oficial = await ingresar(p, cred.oficial.usuario, cred.oficial.clave);
  ok(/aún no comienza|no está abierta/.test(oficial ?? ""), `papeleta oficial en modo Prueba → «${oficial}»`);
  const inexistente = await ingresar(p, "PRUEBA-5A-ZZZZ", "AAAAAA");
  ok(inexistente?.includes("No encontramos"), `usuario inexistente → «${inexistente}»`);
  let ultimo = "";
  for (let i = 0; i < 6; i++) ultimo = (await ingresar(p, cred.oficial.usuario, "MALMAL")) ?? "";
  ok(ultimo.includes("muchos intentos"), `6 intentos fallidos → «${ultimo}»`);
  await p.close();
}

// ---------- Anonimato de la urna ----------
const columnas = sql("select string_agg(column_name, ',' order by ordinal_position) from information_schema.columns where table_name='respuestas';");
ok(columnas === "id,estamento,curso_codigo,prueba,datos", `columnas de la urna: ${columnas}`);

// ---------- Panel ----------
if (process.env.CLAVE_DEV) {
  const p = await b.newPage({ viewport: { width: 1280, height: 900 } });
  p.on("pageerror", (x) => errores.push(`panel: ${x.message}`));
  await p.goto(BASE + "/gestion/ingreso");
  await p.fill("#usuario", "dev");
  await p.fill("#clave", process.env.CLAVE_DEV);
  await p.click("button[type=submit]");
  await p.waitForURL(BASE + "/gestion", { timeout: 20000 }).catch(() => {});
  ok(p.url() === BASE + "/gestion", "ingreso al panel");
  for (const r of ["", "/resultados", "/informe", "/abiertas", "/descargas", "/encuestas", "/encuestas/E", "/credenciales", "/cursos", "/sistema", "/bitacora", "/manual", "/cuenta"]) {
    const resp = await p.goto(BASE + "/gestion" + r);
    const texto = await p.locator("main").innerText().catch(() => "");
    ok(resp?.status() === 200 && !/Algo salió mal|Error/.test(texto.slice(0, 200)), `panel ${r || "/"} (${resp?.status()})`);
  }
  for (const r of ["temas", "abiertas", "sabana?version=terceros&valores=etiquetas&formato=xlsx", "informe"]) {
    const resp = await p.request.get(BASE + "/gestion/descargas/" + r);
    ok([200, 409].includes(resp.status()), `descarga ${r.split("?")[0]} (${resp.status()}${resp.status() === 409 ? ": " + (await resp.text()) : ""})`);
  }
  await p.close();
} else {
  console.log("(sin CLAVE_DEV: no se recorre el panel)");
}

// ---------- Páginas públicas ----------
{
  const p = await b.newPage({ viewport: { width: 390, height: 844 } });
  for (const r of ["/", "/avance", "/resultados", "/anonimato", "/privacidad", "/manual/profesores"]) {
    const resp = await p.goto(BASE + r);
    const ancho = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
    ok(resp?.status() === 200 && !ancho, `pública ${r} (${resp?.status()}${ancho ? ", con desplazamiento horizontal" : ""})`);
  }
  await p.close();
}

ok(errores.length === 0, `errores de JavaScript en el navegador: ${errores.length}${errores.length ? " · " + errores.slice(0, 3).join(" | ") : ""}`);
await b.close();
console.log(fallas ? `\n${fallas} FALLA(S)` : "\nTodo OK");
process.exit(fallas ? 1 : 0);
