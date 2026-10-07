import { asc } from "drizzle-orm";
import { db, schema } from "@/db";
import { CONTACTO_POR_DEFECTO, leerContacto, leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import {
  cambiarCuenta,
  cambiarPeriodo,
  cerrarEncuesta,
  crearCuenta,
  pasarAOficial,
  reabrirPrueba,
  guardarAyuda,
  reiniciar,
  restablecerClave,
  sembrarPrueba,
} from "../../acciones";
import { CANTIDADES } from "@/lib/datos-prueba";
import { FormularioAviso } from "../../FormularioAviso";

const campo = "w-full min-w-0 rounded-[2px] border border-grafito bg-tarjeta px-3 py-2 text-base";
const tarjeta = "rounded-[3px] bg-tarjeta border border-borde p-5 space-y-3";

export default async function Sistema() {
  const g = await exigirGestor("admin");
  const [estado, contacto, cuentas] = await Promise.all([
    leerEstado(),
    leerContacto(),
    db.select().from(schema.gestores).orderBy(asc(schema.gestores.id)),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="titulo text-[30px]">Sistema</h1>

      <section className={tarjeta}>
        <h2 className="rotulo text-[17px]">Modo de la plataforma</h2>
        <p>
          Modo actual: <strong>{estado.modo === "prueba" ? "Prueba" : "Oficial"}</strong>
          {estado.modo === "oficial" && (
            <>
              {" "}
              · periodo <strong>{estado.abierta ? "abierto" : "cerrado"}</strong>
            </>
          )}
        </p>

        {estado.modo === "prueba" ? (
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-[2px] border border-lacre/50 p-4 space-y-2">
              <h3 className="font-bold">Reinicio a cero</h3>
              <p className="text-base">
                Borra todas las respuestas y el conteo de avance, elimina las credenciales de prueba y deja las
                oficiales sin usar. Conserva cursos, matrícula, cuentas y ajustes. Antes de borrar se guarda un
                respaldo automático.
              </p>
              <FormularioAviso accion={reiniciar} boton="Reiniciar a cero" peligro>
                <label className="grid gap-1 min-w-0 text-base font-bold">
                  Escriba REINICIAR para confirmar
                  <input name="confirmacion" autoComplete="off" className={campo} />
                </label>
              </FormularioAviso>
            </div>
            <div className="rounded-[2px] border border-timbre/40 p-4 space-y-2">
              <h3 className="font-bold">Pasar a modo Oficial</h3>
              <p className="text-base">
                Requiere haber hecho el reinicio a cero. Desde ese momento el reinicio queda bloqueado para que
                nadie borre respuestas reales por error. Después se abre el periodo oficial.
              </p>
              <FormularioAviso accion={pasarAOficial} boton="Pasar a Oficial">
                <label className="grid gap-1 min-w-0 text-base font-bold">
                  Escriba OFICIAL para confirmar
                  <input name="confirmacion" autoComplete="off" className={campo} />
                </label>
              </FormularioAviso>
            </div>
          </div>
        ) : (
          <form action={cambiarPeriodo}>
            <input type="hidden" name="accion" value={estado.abierta ? "cerrar" : "abrir"} />
            <button
              type="submit"
              className={`boton ${estado.abierta ? "boton-peligro" : "boton-primario"}`}
            >
              {estado.abierta ? "Cerrar el periodo oficial" : "Abrir el periodo oficial"}
            </button>
          </form>
        )}
      </section>

      {estado.modo === "prueba" && (
        <section className={tarjeta}>
          <h2 className="rotulo text-[17px]">Respuestas de prueba</h2>
          <p className="text-[17px] max-w-[80ch]">
            Agrega {CANTIDADES.A} respuestas de apoderados, {CANTIDADES.E} de estudiantes y {CANTIDADES.F} de
            funcionarios, al azar, para ver Resultados y Abiertas con datos. Algunos textos traen nombres a propósito,
            para ensayar la revisión. No cuentan en el avance (no usan credenciales) y el reinicio a cero las borra.
            Se puede usar varias veces.
          </p>
          <FormularioAviso accion={sembrarPrueba} boton="Agregar respuestas de prueba" />
        </section>
      )}

      <section className={tarjeta}>
        <h2 className="rotulo text-[17px]">Cierre y resultados</h2>
        {estado.cerrada ? (
          <>
            <p>
              La encuesta está <strong>cerrada</strong>: no se reciben respuestas y los resultados están abiertos en
              Panel → Resultados.
            </p>
            {estado.modo === "prueba" && (
              <form action={reabrirPrueba}>
                <button type="submit" className="boton boton-secundario">
                  Reabrir para seguir probando
                </button>
              </form>
            )}
          </>
        ) : (
          <>
            <p className="text-[17px]">
              Al cerrar, nadie más puede responder y se abren los resultados para la administración y la comisión.
              {estado.modo === "prueba"
                ? " En modo Prueba sirve para ensayar el cierre con los datos de prueba; después se puede reabrir."
                : " En modo Oficial el cierre es definitivo."}
            </p>
            <FormularioAviso accion={cerrarEncuesta} boton="Cerrar la encuesta" peligro className="grid gap-3 sm:grid-cols-[1fr_auto] items-end max-w-xl">
              <label className="grid gap-1 min-w-0 text-base font-bold">
                Escriba CERRAR para confirmar
                <input name="confirmacion" autoComplete="off" className={campo} />
              </label>
            </FormularioAviso>
          </>
        )}
      </section>

      <section className={tarjeta}>
        <h2 className="rotulo text-[17px]">Contacto en la Ayuda</h2>
        <p className="text-[17px] max-w-[80ch]">
          Es el texto que ve cada participante al final de la ventana «Ayuda» (en el ingreso y en la encuesta): a quién
          pedir una papeleta de reserva o avisar un problema. Se pueden usar varias líneas. Si se deja vacío, se usa el
          texto por defecto.
        </p>
        <FormularioAviso accion={guardarAyuda} boton="Guardar texto" className="space-y-3 max-w-2xl">
          <label className="grid gap-1 text-base font-bold">
            Texto de contacto (máx. 400 caracteres)
            <textarea
              name="contacto"
              rows={4}
              maxLength={400}
              defaultValue={contacto === CONTACTO_POR_DEFECTO ? "" : contacto}
              placeholder={CONTACTO_POR_DEFECTO}
              className={campo + " font-normal"}
            />
          </label>
        </FormularioAviso>
      </section>

      <section className={tarjeta}>
        <h2 className="rotulo text-[17px]">Cuentas de gestión</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-base">
            <thead>
              <tr className="text-left border-b border-borde">
                <th className="py-2 pr-3">Usuario</th>
                <th className="py-2 pr-3">Nombre</th>
                <th className="py-2 pr-3">Rol</th>
                <th className="py-2 pr-3">Estado</th>
                <th className="py-2"></th>
              </tr>
            </thead>
            <tbody>
              {cuentas.map((c) => (
                <tr key={c.id} className="border-t border-borde">
                  <td className="py-2 pr-3 font-mono">{c.usuario}</td>
                  <td className="py-2 pr-3">{c.nombre}</td>
                  <td className="py-2 pr-3">{c.rol === "admin" ? "Administración" : "Comisión"}</td>
                  <td className="py-2 pr-3">{c.activo ? "Activa" : "De baja"}</td>
                  <td className="py-2 text-right">
                    {c.id !== g.id && (
                      <form action={cambiarCuenta}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="accion" value={c.activo ? "baja" : "activar"} />
                        <button type="submit" className="font-bold text-azul underline">
                          {c.activo ? "Dar de baja" : "Reactivar"}
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <h3 className="font-bold pt-2">Asignar contraseña nueva</h3>
        <p className="text-base text-gris-texto">
          Si alguien olvidó su contraseña. La anterior deja de servir. Cada persona puede cambiarla después en Mi cuenta.
        </p>
        <FormularioAviso accion={restablecerClave} boton="Asignar contraseña nueva" className="grid gap-3 sm:grid-cols-[minmax(0,20rem)_auto] items-end">
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Cuenta
            <select name="id" className={campo} defaultValue="">
              <option value="" disabled>
                Elija una cuenta
              </option>
              {cuentas
                .filter((c) => c.id !== g.id)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.usuario} · {c.nombre}
                  </option>
                ))}
            </select>
          </label>
        </FormularioAviso>
        <h3 className="font-bold pt-2">Crear cuenta</h3>
        <FormularioAviso accion={crearCuenta} boton="Crear cuenta" className="grid gap-3 sm:grid-cols-4 items-end">
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Usuario
            <input name="usuario" placeholder="ej. mperez" autoComplete="off" className={campo} />
          </label>
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Nombre
            <input name="nombre" autoComplete="off" className={campo} />
          </label>
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Rol
            <select name="rol" className={campo}>
              <option value="comision">Comisión</option>
              <option value="admin">Administración</option>
            </select>
          </label>
        </FormularioAviso>
      </section>

    </div>
  );
}
