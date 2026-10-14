// Bitácora de la sábana «para terceros»: roles en vez de nombres de usuario (acordado con Ger).
// Módulo puro, sin base de datos: se prueba con `pruebas/bitacora-terceros.test.mts`.

const ROL: Record<string, string> = {
  admin: "Administración",
  comision: "Comisión",
};

/** Acciones cuyo detalle nombra una cuenta («aleyton (comision)», «sortiz»). */
const SOBRE_CUENTAS = new Set([
  "Cuenta creada",
  "Contraseña nueva asignada",
  "Contraseña restablecida",
  "Cuenta reactivada",
  "Cuenta dada de baja",
]);

/** Quién, como rol: las cuentas del panel por su rol; la consola y el sistema, por su origen. */
export function rolDeActor(actor: string, rolDe: Map<string, string>): string {
  const rol = rolDe.get(actor);
  if (rol) return ROL[rol] ?? "Panel";
  if (/consola/i.test(actor)) return "Administración (consola)";
  if (actor === "sistema") return "Sistema";
  return "Panel";
}

/**
 * Detalle sin nombres de usuario. En las acciones sobre cuentas se informa solo el rol de la cuenta
 * («cuenta de Comisión»); en las demás, cualquier nombre de usuario que aparezca (sin importar mayúsculas) se cambia por su rol.
 */
export function detalleSinUsuarios(
  accion: string,
  detalle: string | null,
  rolDe: Map<string, string>,
): string | null {
  if (!detalle) return detalle;
  if (SOBRE_CUENTAS.has(accion)) {
    const m = detalle.match(/\((admin|comision)\)/);
    const rol = m?.[1] ?? rolDe.get(detalle.trim().split(/\s+/)[0]);
    return rol ? `cuenta de ${ROL[rol] ?? "Panel"}` : "una cuenta del panel";
  }
  let salida = detalle;
  for (const [usuario, rol] of rolDe)
    salida = salida.replace(
      new RegExp(
        String.raw`(?<![\p{L}\p{N}_.-])${usuario.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\p{L}\p{N}_-])`,
        "giu",
      ),
      ROL[rol] ?? "Panel",
    );
  return salida;
}
