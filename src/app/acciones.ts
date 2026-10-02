"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { compararSeguro, normalizarCredencial } from "@/lib/cripto";
import { ENCUESTAS, validarEncuesta, type Estamento } from "@/lib/encuestas";
import { leerEstado, puedeResponder } from "@/lib/estado";
import { contarFallido, ipCliente, permitir } from "@/lib/limite";
import { cerrarParticipante, iniciarParticipante, leerParticipante } from "@/lib/sesion";

export type EstadoIngreso = { error?: string; usuario?: string };

const INTENTOS_MAX = 5;
const BLOQUEO_MIN = 15;

export async function ingresar(_previo: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const usuario = normalizarCredencial(String(form.get("usuario") ?? ""));
  const clave = normalizarCredencial(String(form.get("clave") ?? ""));

  if (!usuario || !clave) return { error: "Escribe tu usuario y tu contraseña.", usuario };
  if (!permitir(await ipCliente())) {
    return { error: "Hay demasiados intentos desde esta conexión. Espera un minuto.", usuario };
  }

  const [cred] = await db
    .select()
    .from(schema.credenciales)
    .where(eq(schema.credenciales.usuario, usuario));

  if (!cred) {
    contarFallido();
    return { error: "No encontramos ese usuario. Revisa que esté bien escrito.", usuario };
  }
  if (cred.bloqueadaHasta && cred.bloqueadaHasta > new Date()) {
    return { error: `Hubo muchos intentos. Espera ${BLOQUEO_MIN} minutos y vuelve a intentar.`, usuario };
  }
  if (!compararSeguro(clave, cred.clave)) {
    contarFallido();
    const n = cred.intentosFallidos + 1;
    await db
      .update(schema.credenciales)
      .set(
        n >= INTENTOS_MAX
          ? { intentosFallidos: 0, bloqueadaHasta: new Date(Date.now() + BLOQUEO_MIN * 60_000) }
          : { intentosFallidos: n },
      )
      .where(eq(schema.credenciales.id, cred.id));
    return { error: "La contraseña no coincide. Revisa que esté bien escrita.", usuario };
  }
  if (cred.estado === "usada") return { error: "Esta credencial ya fue usada.", usuario };
  if (cred.estado === "desactivada") {
    return {
      error: "Esta credencial no está activa. Pide una papeleta de reserva al profesor jefe o a la comisión.",
      usuario,
    };
  }

  const estado = await leerEstado();
  if (!puedeResponder(estado, cred.prueba)) {
    if (estado.modo === "prueba") {
      return { error: "La encuesta aún no comienza. Guarda tu papeleta para cuando se abra.", usuario };
    }
    if (cred.prueba) return { error: "Esta credencial era de prueba y ya no sirve.", usuario };
    return { error: "La encuesta no está abierta en este momento.", usuario };
  }

  if (cred.intentosFallidos > 0) {
    await db
      .update(schema.credenciales)
      .set({ intentosFallidos: 0 })
      .where(eq(schema.credenciales.id, cred.id));
  }
  await iniciarParticipante(cred.id);
  redirect("/encuesta");
}

export type ResultadoEnvio = { ok: true } | { ok: false; error: string };

/**
 * Guarda la encuesta en la urna y marca la credencial como usada, en una sola transacción.
 * La urna no recibe la credencial, ni la fecha, ni la hora.
 */
export async function enviarEncuesta(respuestas: unknown): Promise<ResultadoEnvio> {
  const id = await leerParticipante();
  if (!id) return { ok: false, error: "Tu sesión terminó. Vuelve a ingresar con tu credencial." };

  const estado = await leerEstado();
  const resultado = await db.transaction(async (tx) => {
    const [cred] = await tx
      .select()
      .from(schema.credenciales)
      .where(eq(schema.credenciales.id, id))
      .for("update");
    if (!cred || cred.estado !== "sin_usar") {
      return { ok: false as const, error: "Esta credencial ya fue usada." };
    }
    if (!puedeResponder(estado, cred.prueba)) {
      return { ok: false as const, error: "La encuesta no está abierta en este momento." };
    }

    const validacion = validarEncuesta(ENCUESTAS[cred.estamento as Estamento], respuestas);
    if (!validacion.ok) return { ok: false as const, error: "Falta responder algo: " + validacion.error };

    await tx.insert(schema.respuestas).values({
      estamento: cred.estamento,
      cursoCodigo: cred.estamento === "F" ? null : cred.cursoCodigo,
      prueba: cred.prueba,
      datos: validacion.datos,
    });
    await tx
      .update(schema.credenciales)
      .set({
        estado: "usada",
        usadaEl: sql`(now() at time zone 'America/Santiago')::date`,
      })
      .where(and(eq(schema.credenciales.id, cred.id), eq(schema.credenciales.estado, "sin_usar")));
    return { ok: true as const };
  });

  if (resultado.ok) await cerrarParticipante();
  return resultado;
}

export async function salir() {
  await cerrarParticipante();
  redirect("/");
}
