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
  return (
    h.get("cf-connecting-ip") ??
    h.get("x-forwarded-for")?.split(",")[0].trim() ??
    "local"
  );
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
  return (
    !!r && Date.now() - r.inicio <= VENTANA_MS && r.n >= MAX_FALLOS_CONEXION
  );
}

/**
 * Fallos por conexión antes de frenarla, por minuto. Más alto que el límite general: en una reunión de
 * apoderados con el wifi de la escuela, 30 personas que se equivocan al escribir comparten una conexión.
 * El freno real contra quien adivina es el bloqueo de cada papeleta.
 */
const MAX_FALLOS_CONEXION = 200;

// ---------- Bloqueo de una papeleta, solo para la conexión que falló ----------
// Si el bloqueo fuera para todos, alguien podría bloquear a propósito las papeletas de otros (los usuarios
// siguen un patrón por curso). Así quien ataca se bloquea a sí mismo y el apoderado real entra igual desde
// su casa o su celular. Vive en memoria: no se guarda ninguna IP.
export const INTENTOS_PAPELETA = 5;
export const BLOQUEO_PAPELETA_MIN = 15;
const bloqueos = new Map<string, { fallos: number; hasta: number }>();
const llave = (credencial: number, conexion: string) =>
  `${credencial}|${conexion}`;

/** ¿Está bloqueada esta papeleta para esta conexión? */
export function papeletaBloqueada(
  credencial: number,
  conexion: string,
): boolean {
  const b = bloqueos.get(llave(credencial, conexion));
  return !!b && b.hasta > Date.now();
}

/** Anota un fallo; a los INTENTOS_PAPELETA, bloquea la papeleta para esta conexión. */
export function fallarPapeleta(credencial: number, conexion: string) {
  const k = llave(credencial, conexion);
  const b = bloqueos.get(k) ?? { fallos: 0, hasta: 0 };
  b.fallos += 1;
  if (b.fallos >= INTENTOS_PAPELETA) {
    b.fallos = 0;
    b.hasta = Date.now() + BLOQUEO_PAPELETA_MIN * 60_000;
  }
  bloqueos.set(k, b);
  if (bloqueos.size > 20_000) {
    const ahora = Date.now();
    for (const [x, v] of bloqueos)
      if (v.hasta < ahora && v.fallos === 0) bloqueos.delete(x);
  }
}

/** Ingreso correcto: se olvidan los fallos de esta papeleta en esta conexión. */
export function limpiarPapeleta(credencial: number, conexion: string) {
  bloqueos.delete(llave(credencial, conexion));
}

/** Papeletas bloqueadas ahora (en alguna conexión), para el panel. */
export function papeletasBloqueadas(): number {
  const ahora = Date.now();
  const ids = new Set<string>();
  for (const [k, v] of bloqueos) if (v.hasta > ahora) ids.add(k.split("|")[0]);
  return ids.size;
}

/** Reinicio a cero: se borran todos los bloqueos. */
export function limpiarBloqueos() {
  bloqueos.clear();
}

export function sumarFallo(clave: string) {
  permitir(clave);
}

function limpiar(ahora: number) {
  for (const [k, v] of intentos)
    if (ahora - v.inicio > VENTANA_MS) intentos.delete(k);
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
