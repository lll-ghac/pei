import { redirect } from "next/navigation";
import { Cabecera } from "@/components/Cabecera";
import { existeGestor } from "@/lib/estado";
import { gestorActual } from "@/lib/sesion";
import { ingresarGestion } from "../acciones";
import { FormularioAviso } from "../FormularioAviso";

export const metadata = { title: "Panel de gestión · Encuesta PEI 2027" };

const campo = "w-full rounded-xl border-2 border-borde bg-tarjeta px-3 py-2.5 text-lg focus:border-azul";

export default async function IngresoGestion() {
  if (await gestorActual()) redirect("/gestion");
  const hayCuentas = await existeGestor();

  return (
    <div className="flex-1 flex flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-10">
        <div className="rounded-[24px] bg-tarjeta border border-borde p-6 shadow-sm">
          <h1 className="text-2xl font-extrabold text-azul">Panel de gestión</h1>
          <p className="mt-1 mb-5 text-base text-gris-texto">Solo administración y comisión del PEI.</p>
          {hayCuentas ? (
            <FormularioAviso accion={ingresarGestion} boton="Entrar">
              <div>
                <label htmlFor="usuario" className="block font-bold mb-1">
                  Usuario
                </label>
                <input id="usuario" name="usuario" autoComplete="username" className={campo} required />
              </div>
              <div>
                <label htmlFor="clave" className="block font-bold mb-1">
                  Contraseña
                </label>
                <input id="clave" name="clave" type="password" autoComplete="current-password" className={campo} required />
              </div>
            </FormularioAviso>
          ) : (
            <p className="rounded-xl bg-amarillo/25 p-4 text-base">
              Aún no hay cuentas de gestión. La primera cuenta de administrador se crea desde la consola del
              servidor, con el comando descrito en la guía de instalación.
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
