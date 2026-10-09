// Prueba de carga con k6: N personas ingresan y depositan su encuesta casi a la vez.
// Uso:  k6 run -e BASE=https://encuesta.escuelaecuador.cl -e N=40 -e CREDENCIALES=../salida/credenciales.json carga.js
// Las credenciales son PRUEBA- (un archivo JSON [{usuario, clave, estamento}]); cada una se usa una sola vez.
// Las acciones de servidor (ingreso y envío) se repiten tal como las manda el navegador (ver capturar.mjs).
import { check, sleep } from "k6";
import exec from "k6/execution";
import http from "k6/http";
import { SharedArray } from "k6/data";
import { Trend, Counter } from "k6/metrics";

const BASE = __ENV.BASE || "http://localhost:3100";
const N = Number(__ENV.N || 10);
const PENSAR = Number(__ENV.PENSAR ?? 20); // segundos máximos «respondiendo», al azar entre 0 y PENSAR

const credenciales = new SharedArray("credenciales", () => JSON.parse(open(__ENV.CREDENCIALES || "../salida/credenciales.json")));
const capturas = JSON.parse(open("../salida/capturas.json"));

const tIngreso = new Trend("t_ingreso", true);
const tEncuesta = new Trend("t_pagina_encuesta", true);
const tEnvio = new Trend("t_envio", true);
const depositadas = new Counter("encuestas_depositadas");

export const options = {
  scenarios: {
    todos_a_la_vez: { executor: "per-vu-iterations", vus: N, iterations: 1, maxDuration: "5m" },
  },
  thresholds: {
    checks: ["rate>0.99"],
    t_envio: ["p(95)<3000"],
  },
};

function uuid() {
  const h = "0123456789abcdef";
  let s = "";
  for (let i = 0; i < 32; i++) s += h[Math.floor(Math.random() * 16)];
  return `${s.slice(0, 8)}-${s.slice(8, 12)}-4${s.slice(13, 16)}-a${s.slice(17, 20)}-${s.slice(20, 32)}`;
}

export default function () {
  const i = Number(__ENV.OFFSET || 0) + exec.scenario.iterationInTest;
  const cred = credenciales[i];
  if (!cred) {
    exec.test.abort(`Faltan credenciales: se necesitan ${N}`);
    return;
  }
  const cap = capturas[cred.estamento];

  // 1. Portada
  const portada = http.get(`${BASE}/`, { tags: { paso: "portada" } });
  check(portada, { "portada 200": (r) => r.status === 200 });

  // 2. Ingreso (acción de servidor con formulario)
  const limite = "----k6" + Math.random().toString(36).slice(2);
  const cuerpo =
    `--${limite}\r\nContent-Disposition: form-data; name="_1_usuario"\r\n\r\n${cred.usuario}\r\n` +
    `--${limite}\r\nContent-Disposition: form-data; name="_1_clave"\r\n\r\n${cred.clave}\r\n` +
    `--${limite}\r\nContent-Disposition: form-data; name="0"\r\n\r\n[{},"$K1"]\r\n--${limite}--\r\n`;
  const ingreso = http.post(`${BASE}/`, cuerpo, {
    headers: {
      "Next-Action": cap.ingreso.headers["next-action"],
      "Next-Router-State-Tree": cap.ingreso.headers["next-router-state-tree"],
      "Content-Type": `multipart/form-data; boundary=${limite}`,
      Accept: "text/x-component",
    },
    redirects: 0,
    tags: { paso: "ingreso" },
  });
  tIngreso.add(ingreso.timings.duration);
  // Éxito = la acción pide ir a /encuesta y entrega la cookie de sesión. La cookie es Secure:
  // en http://localhost k6 no la guarda sola, así que se copia al frasco a mano.
  const galleta = (ingreso.cookies.pei_participante || [])[0];
  if (galleta) http.cookieJar().set(BASE, "pei_participante", galleta.value);
  const conSesion = ingreso.status === 200 && String(ingreso.headers["X-Action-Redirect"] || "").startsWith("/encuesta") && !!galleta;
  if (!check(ingreso, { "ingreso aceptado": () => conSesion })) {
    console.warn(`ingreso ${cred.usuario}: ${ingreso.status} ${String(ingreso.body).slice(0, 160)}`);
    return;
  }

  // 3. Página de la encuesta
  const pagina = http.get(`${BASE}/encuesta`, { tags: { paso: "encuesta" } });
  tEncuesta.add(pagina.timings.duration);
  check(pagina, { "encuesta 200": (r) => r.status === 200 });

  // 4. Responder (tiempo al azar) y depositar
  if (PENSAR > 0) sleep(Math.random() * PENSAR);
  // Depositar: dirección fija /encuesta/depositar (JSON), igual que el navegador desde el 9/10.
  const datos = JSON.parse(cap.envio.body);
  const envio = http.post(`${BASE}/encuesta/depositar`, JSON.stringify({ respuestas: datos[0], envioId: uuid() }), {
    headers: { "Content-Type": "application/json", Origin: BASE },
    tags: { paso: "envio" },
  });
  tEnvio.add(envio.timings.duration);
  const ok = envio.status === 200 && String(envio.body).includes('"ok":true');
  if (check(envio, { "encuesta depositada": () => ok })) depositadas.add(1);
  else console.warn(`envío ${cred.usuario}: ${envio.status} ${String(envio.body).slice(0, 200)}`);
}
