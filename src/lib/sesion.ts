import "server-only";
import { cookies } from "next/headers";
import { firmar, leerFirmado } from "./cripto";
import { gestorPorId } from "./estado";

// La sesión de quien responde solo guarda el id de la credencial y su vencimiento.
// Dura 90 minutos para que nadie quede fuera a mitad de la encuesta (MVP: al menos 60).
const PARTICIPANTE = "pei_participante";
const GESTION = "pei_gestion";
const MIN_PARTICIPANTE = 90;
const HORAS_GESTION = 8;

const opcionesCookie = (maxAge: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge,
});

export async function iniciarParticipante(credencialId: number) {
  const exp = Date.now() + MIN_PARTICIPANTE * 60_000;
  (await cookies()).set(
    PARTICIPANTE,
    firmar({ c: credencialId, exp }),
    opcionesCookie(MIN_PARTICIPANTE * 60),
  );
}

export async function leerParticipante(): Promise<number | null> {
  const datos = leerFirmado<{ c: number }>((await cookies()).get(PARTICIPANTE)?.value);
  return datos?.c ?? null;
}

export async function cerrarParticipante() {
  (await cookies()).delete(PARTICIPANTE);
}

export async function iniciarGestion(gestorId: number) {
  const exp = Date.now() + HORAS_GESTION * 3_600_000;
  (await cookies()).set(GESTION, firmar({ g: gestorId, exp }), opcionesCookie(HORAS_GESTION * 3600));
}

export async function cerrarGestion() {
  (await cookies()).delete(GESTION);
}

/** Cuenta de gestión de la sesión actual, o null. Revisa en la base que siga activa. */
export async function gestorActual() {
  const datos = leerFirmado<{ g: number }>((await cookies()).get(GESTION)?.value);
  if (!datos) return null;
  return gestorPorId(datos.g);
}
