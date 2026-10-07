"use server";

import { and, eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { compararSeguro, normalizarCredencial } from "@/lib/cripto";
import { ENCUESTAS, validarEncuesta, type Estamento } from "@/lib/encuestas";
import { leerEstado, puedeResponder } from "@/lib/estado";
import { contarFallido, fallosExcedidos, ipCliente, sumarFallo } from "@/lib/limite";
import { cerrarParticipante, iniciarParticipante, leerParticipante } from "@/lib/sesion";

export type EstadoIngreso = { error?: string; usuario?: string };

const INTENTOS_MAX = 5;
const BLOQUEO_MIN = 15;

export async function ingresar(_previo: EstadoIngreso, form: FormData): Promise<EstadoIngreso> {
  const usuario = normalizarCredencial(String(form.get("usuario") ?? ""));
  const clave = normalizarCredencial(String(form.get("clave") ?? ""));

  if (!usuario || !clave) return { error: "Escriba su usuario y su contraseña.", usuario };
  const ip = "participante:" + (await ipCliente());
  if (fallosExcedidos(ip)) {
    return { error: "Hay demasiados intentos desde esta conexión. Espere un minuto.", usuario };
  }

  const [cred] = await db
    .select()
    .from(schema.credenciales)
    .where(eq(schema.credenciales.usuario, usuario));

  if (!cred) {
    contarFallido();
    sumarFallo(ip);
    return { error: "No encontramos ese usuario. Revise que esté bien escrito.", usuario };
  }
  if (cred.bloqueadaHasta && cred.bloqueadaHasta > new Date()) {
    return { error: `Hubo muchos intentos. Espere ${BLOQUEO_MIN} minutos y vuelva a intentar.`, usuario };
  }
  if (!compararSeguro(clave, cred.clave)) {
    contarFallido();
    sumarFallo(ip);
    const n = cred.intentosFallidos + 1;
    await db
      .update(schema.credenciales)
      .set(
        n >= INTENTOS_MAX
          ? { intentosFallidos: 0, bloqueadaHasta: new Date(Date.now() + BLOQUEO_MIN * 60_000) }
          : { intentosFallidos: n },
      )
      .where(eq(schema.credenciales.id, cred.id));
    return { error: "La contraseña no coincide. Revise que esté bien escrita.", usuario };
  }
  if (cred.estado === "usada") return { error: "Esta credencial ya fue usada.", usuario };
  if (cred.estado === "desactivada") {
    return {
      error: "Esta papeleta no está activa. Pida una de reserva al profesor jefe o a la comisión.",
      usuario,
    };
  }

  const estado = await leerEstado();
  if (!puedeResponder(estado, cred.prueba)) {
    if (estado.cerrada) return { error: "La encuesta ya está cerrada. Gracias por su interés.", usuario };
    if (estado.modo === "prueba") {
      return { error: "La encuesta aún no comienza. Guarde su papeleta para cuando se abra.", usuario };
    }
    if (cred.prueba) return { error: "Esta papeleta era de prueba y ya no sirve.", usuario };
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

export type ResultadoEnvio = { ok: true; yaRecibida?: boolean } | { ok: false; error: string };

/**
 * Guarda la encuesta en la urna y marca la credencial como usada, en una sola transacción.
 * La urna no recibe la credencial, ni la fecha, ni la hora.
 */
export async function enviarEncuesta(respuestas: unknown, envioId: string): Promise<ResultadoEnvio> {
  const envio = typeof envioId === "string" && /^[A-Za-z0-9-]{16,64}$/.test(envioId) ? envioId : null;
  const id = await leerParticipante();
  if (!id) {
    // La respuesta del primer intento pudo perderse después de cerrar la sesión: si este mismo envío
    // ya llegó, se reconoce por su número (aleatorio, solo lo conoce este navegador).
    if (envio) {
      const [previa] = await db
        .select({ id: schema.credenciales.id })
        .from(schema.credenciales)
        .where(and(eq(schema.credenciales.envioId, envio), eq(schema.credenciales.estado, "usada")));
      if (previa) return { ok: true, yaRecibida: true };
    }
    return { ok: false, error: "La sesión terminó. Vuelva a ingresar con su papeleta." };
  }

  const estado = await leerEstado();
  const resultado = await db.transaction(async (tx) => {
    const [cred] = await tx
      .select()
      .from(schema.credenciales)
      .where(eq(schema.credenciales.id, id))
      .for("update");
    // Reintento del mismo envío: la papeleta ya había llegado y no se cuenta dos veces.
    if (cred && cred.estado === "usada" && envio && cred.envioId === envio) {
      return { ok: true as const, yaRecibida: true };
    }
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
        envioId: envio,
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
