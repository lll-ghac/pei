"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { aleatorio, hashClave, verificarClave } from "@/lib/cripto";
import type { Estamento } from "@/lib/encuestas";
import { guardarEstado, leerEstado, registrar } from "@/lib/estado";
import { exigirGestor, generarLote, reiniciarACero } from "@/lib/gestion";
import { ipCliente, permitir } from "@/lib/limite";
import { cerrarGestion, iniciarGestion } from "@/lib/sesion";

export type Aviso = { error?: string; ok?: string; clave?: string };

export async function ingresarGestion(_p: Aviso, form: FormData): Promise<Aviso> {
  if (!permitir("gestion:" + (await ipCliente()))) return { error: "Demasiados intentos. Espere un minuto." };
  const usuario = String(form.get("usuario") ?? "").trim().toLowerCase();
  const clave = String(form.get("clave") ?? "");
  const [g] = await db.select().from(schema.gestores).where(eq(schema.gestores.usuario, usuario));
  // Se verifica siempre una clave para no revelar si el usuario existe por el tiempo de respuesta.
  const valida = await verificarClave(clave, g?.claveHash ?? "scrypt$32768$AAAAAAAAAAAAAAAAAAAAAA==$AAAA");
  if (!g || !g.activo || !valida) return { error: "Usuario o contraseña incorrectos." };
  await iniciarGestion(g.id);
  await registrar(g.usuario, "Ingreso al panel");
  redirect("/gestion");
}

export async function salirGestion() {
  await cerrarGestion();
  redirect("/gestion/ingreso");
}

export async function cambiarClavePropia(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor();
  const actual = String(form.get("actual") ?? "");
  const nueva = String(form.get("nueva") ?? "");
  if (nueva.length < 12) return { error: "La nueva contraseña debe tener al menos 12 caracteres." };
  if (!(await verificarClave(actual, g.claveHash))) return { error: "La contraseña actual no coincide." };
  await db.update(schema.gestores).set({ claveHash: await hashClave(nueva) }).where(eq(schema.gestores.id, g.id));
  await registrar(g.usuario, "Cambio de contraseña propia");
  return { ok: "Contraseña actualizada." };
}

// ----- Cursos -----

export async function guardarCurso(form: FormData) {
  const g = await exigirGestor("admin");
  const codigo = String(form.get("codigo"));
  const matricula = Math.max(0, Math.min(99, Number(form.get("matricula")) || 0));
  const papeletasTexto = String(form.get("papeletas") ?? "").trim();
  const papeletas = papeletasTexto === "" ? null : Math.max(0, Math.min(99, Number(papeletasTexto) || 0));
  await db
    .update(schema.cursos)
    .set({ matricula, papeletasApoderados: papeletas, activo: matricula > 0 })
    .where(eq(schema.cursos.codigo, codigo));
  await registrar(g.usuario, "Curso actualizado", `${codigo}: matrícula ${matricula}, papeletas apoderados ${papeletas ?? "sin registrar"}`);
  revalidatePath("/gestion/cursos");
}

export async function guardarFuncionarios(form: FormData) {
  const g = await exigirGestor("admin");
  const total = Math.max(0, Math.min(500, Number(form.get("total")) || 0));
  await guardarEstado({ funcionariosTotal: total });
  await registrar(g.usuario, "Total de funcionarios", String(total));
  revalidatePath("/gestion/cursos");
}

// ----- Credenciales -----

export async function crearLote(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor("admin");
  const estamento = String(form.get("estamento")) as Estamento;
  const curso = estamento === "F" ? null : String(form.get("curso") || "");
  const cantidad = Number(form.get("cantidad"));
  const prueba = form.get("tipo") === "prueba";
  if (!["A", "E", "F"].includes(estamento)) return { error: "Estamento no válido." };
  if (estamento !== "F" && !curso) return { error: "Elija un curso." };
  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 300) {
    return { error: "La cantidad debe estar entre 1 y 300." };
  }
  if (estamento === "E" && curso) {
    const [c] = await db.select().from(schema.cursos).where(eq(schema.cursos.codigo, curso));
    if (!c?.tieneEstudiantes) return { error: "Solo 5° a 8° básico responden la encuesta de estudiantes." };
  }
  const lote = await generarLote({ curso, estamento, cantidad, prueba, autor: g.usuario });
  revalidatePath("/gestion/credenciales");
  return { ok: `Lote ${lote.id} creado con ${cantidad} credenciales. Ya puede descargar el PDF.` };
}

export async function desactivarSobrantes(form: FormData) {
  const g = await exigirGestor();
  const loteId = Number(form.get("lote"));
  const ids = form.getAll("credencial").map(Number).filter(Boolean);
  if (!ids.length) return;
  let n = 0;
  for (const id of ids) {
    const r = await db
      .update(schema.credenciales)
      .set({ estado: "desactivada" })
      .where(
        and(
          eq(schema.credenciales.id, id),
          eq(schema.credenciales.loteId, loteId),
          eq(schema.credenciales.estado, "sin_usar"),
        ),
      )
      .returning({ id: schema.credenciales.id });
    n += r.length;
  }
  await registrar(g.usuario, "Credenciales desactivadas", `Lote ${loteId}: ${n}`);
  revalidatePath(`/gestion/credenciales/${loteId}`);
}

// ----- Sistema -----

export async function reiniciar(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor("admin");
  if (String(form.get("confirmacion")).trim() !== "REINICIAR") {
    return { error: "Escriba REINICIAR, en mayúsculas, para confirmar." };
  }
  try {
    await reiniciarACero(g.usuario);
  } catch (e) {
    return { error: (e as Error).message };
  }
  revalidatePath("/gestion", "layout");
  return { ok: "Reinicio a cero listo: respuestas borradas, credenciales de prueba eliminadas." };
}

export async function pasarAOficial(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor("admin");
  if (String(form.get("confirmacion")).trim() !== "OFICIAL") {
    return { error: "Escriba OFICIAL, en mayúsculas, para confirmar." };
  }
  const [{ n: respuestas }] = await db.select({ n: count() }).from(schema.respuestas);
  const [{ n: deprueba }] = await db
    .select({ n: count() })
    .from(schema.credenciales)
    .where(eq(schema.credenciales.prueba, true));
  if (respuestas > 0 || deprueba > 0) {
    return { error: "Antes de pasar a Oficial haga el reinicio a cero: aún hay respuestas o credenciales de prueba." };
  }
  await guardarEstado({ modo: "oficial", abierta: false });
  await registrar(g.usuario, "Paso a modo Oficial", "Reinicio bloqueado desde ahora");
  revalidatePath("/", "layout");
  return { ok: "La plataforma está en modo Oficial. Abra el periodo cuando la comisión lo indique." };
}

export async function cambiarPeriodo(form: FormData) {
  const g = await exigirGestor("admin");
  const estado = await leerEstado();
  if (estado.modo !== "oficial") return;
  const abrir = form.get("accion") === "abrir";
  await guardarEstado({ abierta: abrir });
  await registrar(g.usuario, abrir ? "Apertura del periodo oficial" : "Cierre del periodo oficial");
  revalidatePath("/", "layout");
}

// ----- Cuentas de gestión -----

export async function crearCuenta(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor("admin");
  const usuario = String(form.get("usuario") ?? "").trim().toLowerCase();
  const nombre = String(form.get("nombre") ?? "").trim();
  const rol = form.get("rol") === "admin" ? "admin" : "comision";
  if (!/^[a-z0-9._-]{3,30}$/.test(usuario)) {
    return { error: "El usuario debe tener entre 3 y 30 letras minúsculas, números, punto o guion." };
  }
  if (!nombre) return { error: "Escriba el nombre de la persona." };
  const [existe] = await db.select().from(schema.gestores).where(eq(schema.gestores.usuario, usuario));
  if (existe) return { error: "Ese usuario ya existe." };
  const clave = aleatorio(4) + "-" + aleatorio(4) + "-" + aleatorio(4);
  await db.insert(schema.gestores).values({ usuario, nombre, rol, claveHash: await hashClave(clave) });
  await registrar(g.usuario, "Cuenta creada", `${usuario} (${rol})`);
  revalidatePath("/gestion/sistema");
  return { ok: `Cuenta "${usuario}" creada. Entregue esta contraseña en persona; no se volverá a mostrar:`, clave };
}

export async function cambiarCuenta(form: FormData) {
  const g = await exigirGestor("admin");
  const id = Number(form.get("id"));
  if (id === g.id) return;
  const activo = form.get("accion") === "activar";
  const [c] = await db
    .update(schema.gestores)
    .set({ activo })
    .where(eq(schema.gestores.id, id))
    .returning({ usuario: schema.gestores.usuario });
  if (c) await registrar(g.usuario, activo ? "Cuenta reactivada" : "Cuenta dada de baja", c.usuario);
  revalidatePath("/gestion/sistema");
}
