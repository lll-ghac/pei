"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { aleatorio, hashClave, verificarClave } from "@/lib/cripto";
import type { Estamento } from "@/lib/encuestas";
import { guardarEstado, leerEstado, registrar } from "@/lib/estado";
import { aplicarClasificacion, confirmarSinNombres, guardarRevision, revisarClasificacion } from "@/lib/abiertas";
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
  await guardarEstado({ modo: "oficial", abierta: false, cerrada: false });
  await registrar(g.usuario, "Paso a modo Oficial", "Reinicio bloqueado desde ahora");
  revalidatePath("/", "layout");
  return { ok: "La plataforma está en modo Oficial. Abra el periodo cuando la comisión lo indique." };
}

export async function cambiarPeriodo(form: FormData) {
  const g = await exigirGestor("admin");
  const estado = await leerEstado();
  if (estado.modo !== "oficial" || estado.cerrada) return;
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

// ----- Observaciones de la comisión sobre las encuestas -----

export async function agregarObservacion(form: FormData) {
  const g = await exigirGestor();
  const estamento = String(form.get("estamento"));
  const pregunta = String(form.get("pregunta"));
  const texto = String(form.get("texto") ?? "").trim().slice(0, 2000);
  if (!["A", "E", "F"].includes(estamento) || !/^(intro|[AEF]\d{1,2})$/.test(pregunta) || !texto) return;
  await db.insert(schema.observaciones).values({ estamento, pregunta, autorId: g.id, texto });
  revalidatePath("/gestion/encuestas", "layout");
}

export async function cambiarObservacion(form: FormData) {
  const g = await exigirGestor();
  const id = Number(form.get("id"));
  const accion = String(form.get("accion"));
  const [obs] = await db.select().from(schema.observaciones).where(eq(schema.observaciones.id, id));
  if (!obs) return;
  if (accion === "eliminar") {
    // Solo quien la escribió o administración.
    if (obs.autorId !== g.id && g.rol !== "admin") return;
    await db.delete(schema.observaciones).where(eq(schema.observaciones.id, id));
  } else if (g.rol === "admin") {
    const resuelta = accion === "resolver";
    await db
      .update(schema.observaciones)
      .set({ resuelta, resueltaPor: resuelta ? g.nombre : null })
      .where(eq(schema.observaciones.id, id));
  }
  revalidatePath("/gestion/encuestas", "layout");
}

// ----- Cierre y resultados -----

/** Cierra la encuesta: nadie más puede responder y se abren los resultados para la comisión. */
export async function cerrarEncuesta(_p: Aviso, form: FormData): Promise<Aviso> {
  const g = await exigirGestor("admin");
  if (String(form.get("confirmacion")).trim() !== "CERRAR") {
    return { error: "Escriba CERRAR, en mayúsculas, para confirmar." };
  }
  const estado = await leerEstado();
  if (estado.cerrada) return { error: "La encuesta ya está cerrada." };
  await guardarEstado({ cerrada: true, abierta: false });
  await registrar(
    g.usuario,
    estado.modo === "prueba" ? "Cierre de ensayo (modo Prueba)" : "Cierre de la encuesta oficial",
    "Respuestas detenidas; resultados abiertos para la comisión",
  );
  revalidatePath("/", "layout");
  return { ok: "Encuesta cerrada. Los resultados ya están en Panel → Resultados." };
}

/** Solo en modo Prueba: vuelve a permitir respuestas para seguir ensayando. */
export async function reabrirPrueba() {
  const g = await exigirGestor("admin");
  const estado = await leerEstado();
  if (estado.modo !== "prueba" || !estado.cerrada) return;
  await guardarEstado({ cerrada: false });
  await registrar(g.usuario, "Reapertura del ensayo (modo Prueba)");
  revalidatePath("/", "layout");
}

// ----- Respuestas abiertas: revisión de nombres -----

export async function guardarTexto(form: FormData) {
  await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada) return;
  const id = String(form.get("id") ?? "");
  const texto = String(form.get("texto") ?? "");
  const accion = form.get("accion") === "no_publicar" ? "no_publicar" : "revisado";
  if (!/^[0-9a-f-]{36}$/.test(id) || !texto.trim()) return;
  await guardarRevision(id, texto, accion);
  revalidatePath("/gestion/abiertas");
}

export async function confirmarRevisados(form: FormData) {
  const g = await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada) return;
  const ids = form.getAll("id").map(String).filter((x) => /^[0-9a-f-]{36}$/.test(x));
  const n = await confirmarSinNombres(ids, estado.modo === "prueba");
  if (n) await registrar(g.usuario, "Textos revisados sin nombres", String(n));
  revalidatePath("/gestion/abiertas");
}

/** Lista del personal (una persona por línea): reemplaza la anterior. Solo administración. */
export async function guardarPersonal(form: FormData) {
  const g = await exigirGestor("admin");
  const nombres = [
    ...new Set(
      String(form.get("nombres") ?? "")
        .split(/\r?\n/)
        .map((x) => x.trim().replace(/\s+/g, " "))
        .filter((x) => x.length >= 3 && x.length <= 80),
    ),
  ].slice(0, 400);
  await db.transaction(async (tx) => {
    await tx.delete(schema.nombresPersonal);
    if (nombres.length) await tx.insert(schema.nombresPersonal).values(nombres.map((nombre) => ({ nombre })));
  });
  await registrar(g.usuario, "Lista del personal actualizada", `${nombres.length} nombres`);
  revalidatePath("/gestion/abiertas");
}

export async function borrarPersonal() {
  const g = await exigirGestor("admin");
  await db.delete(schema.nombresPersonal);
  await registrar(g.usuario, "Lista del personal borrada");
  revalidatePath("/gestion/abiertas");
}

// ----- Respuestas abiertas: importar clasificación y temas -----

export type AvisoImportacion = Aviso & { resumen?: { filas: number; sinClasificar: number; porTema: [string, number][] }; contenido?: string };

/** Paso 1 revisa el archivo y muestra un resumen; paso 2 (confirmar) lo aplica. Cada carga reemplaza la anterior. */
export async function importarClasificacion(_p: AvisoImportacion, form: FormData): Promise<AvisoImportacion> {
  const g = await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada) return { error: "La encuesta no está cerrada." };
  const prueba = estado.modo === "prueba";
  let contenido = String(form.get("contenido") ?? "");
  const archivo = form.get("archivo");
  if (!contenido && archivo instanceof File && archivo.size > 0) {
    if (archivo.size > 3_000_000) return { error: "El archivo es demasiado grande (máximo 3 MB)." };
    contenido = await archivo.text();
  }
  if (!contenido) return { error: "Elija el archivo con la clasificación." };
  const r = await revisarClasificacion(contenido, prueba);
  if (r.errores.length) {
    return {
      error: `El archivo tiene ${r.errores.length} problema(s); no se cargó nada. ${r.errores.slice(0, 8).join(" ")}${r.errores.length > 8 ? " …" : ""}`,
    };
  }
  const resumen = {
    filas: r.filas.length,
    sinClasificar: r.sinClasificar,
    porTema: Object.entries(r.porTema).sort((a, b) => b[1] - a[1]),
  };
  if (form.get("confirmar") !== "si") {
    return { ok: "Archivo válido. Revise el resumen y confirme la carga.", resumen, contenido };
  }
  await aplicarClasificacion(r.filas, prueba);
  await registrar(g.usuario, "Clasificación de abiertas cargada", `${r.filas.length} textos; reemplaza la carga anterior`);
  revalidatePath("/gestion", "layout");
  return { ok: `Clasificación cargada: ${r.filas.length} textos.` };
}

export async function guardarTema(form: FormData) {
  const g = await exigirGestor("admin");
  const codigo = String(form.get("codigo") ?? "");
  const nombre = String(form.get("nombre") ?? "").trim().slice(0, 80);
  const descripcion = String(form.get("descripcion") ?? "").trim().slice(0, 200);
  if (!nombre) return;
  if (codigo) {
    await db.update(schema.temas).set({ nombre, descripcion }).where(eq(schema.temas.codigo, codigo));
    await registrar(g.usuario, "Tema editado", `${codigo}: ${nombre}`);
  } else {
    // Código siguiente: T19, T20… (T98 y T99 quedan reservados).
    const usados = (await db.select({ c: schema.temas.codigo, o: schema.temas.orden }).from(schema.temas)).map((x) => x);
    const nums = usados.map((x) => Number(x.c.slice(1))).filter((x) => x < 98);
    const nuevo = `T${String(Math.max(18, ...nums) + 1).padStart(2, "0")}`;
    if (Number(nuevo.slice(1)) >= 98) return;
    await db.insert(schema.temas).values({ codigo: nuevo, nombre, descripcion, orden: Math.max(...usados.map((x) => x.o)) + 1 });
    await registrar(g.usuario, "Tema agregado", `${nuevo}: ${nombre}`);
  }
  revalidatePath("/gestion/abiertas");
}

export async function cambiarTema(form: FormData) {
  const g = await exigirGestor("admin");
  const codigo = String(form.get("codigo") ?? "");
  const activo = form.get("accion") === "activar";
  await db.update(schema.temas).set({ activo }).where(eq(schema.temas.codigo, codigo));
  await registrar(g.usuario, activo ? "Tema reactivado" : "Tema desactivado", codigo);
  revalidatePath("/gestion/abiertas");
}
