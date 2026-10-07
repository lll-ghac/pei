import "server-only";
import { headers } from "next/headers";

// Límite amplio por conexión (MVP: ~60 intentos por minuto) para frenar programas
// automáticos sin afectar a un laboratorio que sale a internet con una sola IP.
// Vive solo en memoria: no se guarda ninguna IP.
const VENTANA_MS = 60_000;
const MAXIMO = 60;
const intentos = new Map<string, { inicio: number; n: number }>();

// Contador de ingresos fallidos por hora, para el panel (sin IPs).
const fallidosPorHora = new Map<string, number>();

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return h.get("cf-connecting-ip") ?? h.get("x-forwarded-for")?.split(",")[0].trim() ?? "local";
}

export function permitir(clave: string): boolean {
  const ahora = Date.now();
  const r = intentos.get(clave);
  if (!r || ahora - r.inicio > VENTANA_MS) {
    intentos.set(clave, { inicio: ahora, n: 1 });
    if (intentos.size > 5000) limpiar(ahora);
    return true;
  }
  r.n += 1;
  return r.n <= MAXIMO;
}

/**
 * Ingreso de participantes: solo cuentan los intentos FALLIDOS por conexión. Toda la escuela sale a
 * internet con una sola IP (laboratorio, consejo de profesores con ~120 funcionarios): los ingresos
 * correctos no deben gastar el cupo; un programa que adivina credenciales falla siempre y se frena igual.
 */
export function fallosExcedidos(clave: string): boolean {
  const r = intentos.get(clave);
  return !!r && Date.now() - r.inicio <= VENTANA_MS && r.n >= MAXIMO;
}

export function sumarFallo(clave: string) {
  permitir(clave);
}

function limpiar(ahora: number) {
  for (const [k, v] of intentos) if (ahora - v.inicio > VENTANA_MS) intentos.delete(k);
}

function horaActual() {
  return new Date().toISOString().slice(0, 13);
}

export function contarFallido() {
  const h = horaActual();
  fallidosPorHora.set(h, (fallidosPorHora.get(h) ?? 0) + 1);
  if (fallidosPorHora.size > 48) {
    const [masAntigua] = fallidosPorHora.keys();
    fallidosPorHora.delete(masAntigua);
  }
}

export function fallidosUltimaHora(): number {
  return fallidosPorHora.get(horaActual()) ?? 0;
}
