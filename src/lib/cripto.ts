import "server-only";
import { createHmac, randomInt, scrypt, timingSafeEqual, randomBytes } from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(scrypt) as (
  clave: string,
  sal: Buffer,
  largo: number,
  opciones: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/** Sin caracteres ambiguos: sin O/0, I/l/1. */
export const ALFABETO = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function aleatorio(largo: number): string {
  let s = "";
  for (let i = 0; i < largo; i++) s += ALFABETO[randomInt(ALFABETO.length)];
  return s;
}

/** Normaliza lo que escribe la persona: mayúsculas, sin espacios y guiones uniformes. */
export function normalizarCredencial(texto: string): string {
  return texto.toUpperCase().replace(/\s+/g, "").replace(/[–—]/g, "-");
}

export function compararSeguro(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

// Contraseñas de las cuentas de gestión: scrypt con sal.
const N = 2 ** 15;
export async function hashClave(clave: string): Promise<string> {
  const sal = randomBytes(16);
  const h = await scryptAsync(clave, sal, 32, { N, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$${N}$${sal.toString("base64")}$${h.toString("base64")}`;
}

export async function verificarClave(clave: string, guardado: string): Promise<boolean> {
  const [alg, n, sal, hash] = guardado.split("$");
  if (alg !== "scrypt") return false;
  const h = await scryptAsync(clave, Buffer.from(sal, "base64"), 32, {
    N: Number(n),
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  const esperado = Buffer.from(hash ?? "", "base64");
  return esperado.length === h.length && timingSafeEqual(h, esperado);
}

// Cookies de sesión firmadas con HMAC.
function secreto(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET debe tener al menos 32 caracteres");
  return s;
}

export function firmar(datos: object): string {
  const cuerpo = Buffer.from(JSON.stringify(datos)).toString("base64url");
  const firma = createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
  return `${cuerpo}.${firma}`;
}

export function leerFirmado<T>(valor: string | undefined): T | null {
  if (!valor) return null;
  const [cuerpo, firma] = valor.split(".");
  if (!cuerpo || !firma) return null;
  const esperada = createHmac("sha256", secreto()).update(cuerpo).digest("base64url");
  if (!compararSeguro(firma, esperada)) return null;
  try {
    const datos = JSON.parse(Buffer.from(cuerpo, "base64url").toString()) as T & { exp?: number };
    if (datos.exp && Date.now() > datos.exp) return null;
    return datos;
  } catch {
    return null;
  }
}
