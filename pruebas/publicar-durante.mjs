// Prueba: una persona está respondiendo y se publica una versión nueva. Al depositar con la página
// que quedó abierta, la encuesta debe llegar igual (incidente del piloto de funcionarios, 9/10).
// Uso: node publicar-durante.mjs   (reinicia el contenedor local pei-local con una compilación nueva)
import { execSync } from "node:child_process";
import { chromium } from "playwright";

const BASE = "http://localhost:3100";
const sql = (q) => execSync(`docker exec -i pei-pg-dev psql -U pei_encuesta -d pei_encuesta -At`, { input: q }).toString().trim();
const RAIZ = new URL("..", import.meta.url).pathname.replace(/^\/([A-Z]:)/, "$1");
const CONTENEDOR =
  "docker run -d --name pei-local --restart unless-stopped -p 127.0.0.1:3100:8080 -w /out -e RESPALDOS_DIR=/tmp/respaldos -e NODE_ENV=production -e PORT=8080 -e HOSTNAME=0.0.0.0 -e NEXT_TELEMETRY_DISABLED=1 -e DATABASE_URL=postgres://pei_encuesta:dev_local_only@host.docker.internal:55432/pei_encuesta -e SESSION_SECRET=7c2c382e6a671912d52c629cc1b75a63e1038fc094437d1c13b30c60e3596903 encuesta-pei-build node server.js";
const env = { ...process.env, MSYS_NO_PATHCONV: "1" };
const compilar = () => execSync("docker build -q -f despliegue/Dockerfile -t encuesta-pei-build .", { cwd: RAIZ, env, stdio: "ignore" });
const reiniciar = () => {
  execSync("docker rm -f pei-local", { env, stdio: "ignore" });
  execSync(CONTENEDOR, { env, stdio: "ignore" });
};
const esperar = async () => {
  for (let i = 0; i < 60; i++) {
    try {
      if ((await fetch(BASE + "/")).ok) return;
    } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error("pei-local no responde");
};

const usuario = `PRUEBA-FUN-V${Math.random().toString(36).slice(2, 6).toUpperCase().replace(/[01IOL]/g, "K")}`;
sql(`insert into credenciales (usuario, clave, curso_codigo, estamento, prueba) values ('${usuario}', 'PUBDUR', null, 'F', true);`);

console.log("1. Compilación A y encuesta abierta");
compilar();
reiniciar();
await esperar();
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 390, height: 844 } });
p.setDefaultTimeout(60000);
await p.goto(BASE + "/");
await p.fill("#usuario", usuario);
await p.fill("#clave", "PUBDUR");
await p.click("form button[type=submit]");
await p.waitForURL(/\/encuesta/);
await p.getByRole("button", { name: "Comenzar" }).click();
// Responder todo con la primera opción válida de cada grupo.
for (let vuelta = 0; vuelta < 60; vuelta++) {
  if (await p.getByRole("button", { name: /^Depositar en la urna$/ }).count()) break;
  const texto = await p.locator("main").innerText();
  const checks = p.locator("[role=checkbox]");
  if (await checks.count()) {
    const n = Number(texto.match(/exactamente (\d)/i)?.[1] ?? 1);
    let k = 0;
    for (let i = 0; i < (await checks.count()) && k < n; i++) {
      if (/Otra|No sé|Prefiero|Por ahora/.test(await checks.nth(i).innerText())) continue;
      await checks.nth(i).click();
      k++;
    }
  } else {
    const grupos = p.locator("[role=radiogroup]");
    for (let g = 0; g < (await grupos.count()); g++) {
      const rs = grupos.nth(g).locator("[role=radio]");
      for (let i = 0; i < (await rs.count()); i++) {
        if (/Otra|No sé|Prefiero|Por ahora/.test(await rs.nth(i).innerText())) continue;
        await rs.nth(i).click();
        break;
      }
    }
  }
  await p.getByRole("button", { name: /^Siguiente$/ }).click();
  await p.waitForTimeout(200);
}
console.log("2. Se publica una compilación nueva mientras la persona está en el resumen");
compilar();
reiniciar();
await esperar();
const antes = Number(sql("select count(*) from respuestas where prueba;"));
console.log("3. Deposita con la página que quedó abierta");
await p.getByRole("button", { name: /^Depositar en la urna$/ }).click();
const llego = await p
  .waitForURL(/\/gracias/, { timeout: 30000 })
  .then(() => true)
  .catch(() => false);
const despues = Number(sql("select count(*) from respuestas where prueba;"));
const estado = sql(`select estado from credenciales where usuario='${usuario}';`);
console.log(`resultado: ${llego ? "pantalla de gracias" : "NO llegó a gracias: " + (await p.locator("[role=alert]").first().innerText().catch(() => ""))} · urna +${despues - antes} · papeleta ${estado}`);
await b.close();
process.exit(llego && despues - antes === 1 && estado === "usada" ? 0 : 1);
