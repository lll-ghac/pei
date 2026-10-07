import { exigirGestor } from "@/lib/gestion";
import { cambiarClavePropia } from "../../acciones";
import { FormularioAviso } from "../../FormularioAviso";

export const metadata = { title: "Mi cuenta · Encuesta PEI 2027" };

const campo =
  "w-full min-w-0 rounded-[2px] border border-grafito bg-tarjeta px-3 py-2 text-base";

/** Datos de la cuenta propia y cambio de contraseña (administración y comisión). */
export default async function Cuenta() {
  const g = await exigirGestor();
  return (
    <div className="space-y-6 max-w-3xl">
      <h1 className="titulo text-[30px]">Mi cuenta</h1>
      <section className="rounded-[3px] bg-tarjeta border border-borde p-5 space-y-3">
        <p className="text-[17px]">
          <strong>{g.nombre}</strong> · usuario <code>{g.usuario}</code> ·{" "}
          {g.rol === "admin" ? "Administración" : "Comisión"}
        </p>
        <h2 className="rotulo text-[17px] pt-2">Cambiar mi contraseña</h2>
        <p className="text-base text-gris-texto">
          Use una contraseña propia de al menos 12 caracteres, que no use en
          otros sitios. Si la olvida, la administración le asigna una nueva.
        </p>
        <FormularioAviso
          accion={cambiarClavePropia}
          boton="Cambiar contraseña"
          className="grid gap-3 sm:grid-cols-3 items-end"
        >
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Actual
            <input
              name="actual"
              type="password"
              autoComplete="current-password"
              className={campo}
            />
          </label>
          <label className="grid gap-1 min-w-0 text-base font-bold">
            Nueva (mínimo 12 caracteres)
            <input
              name="nueva"
              type="password"
              autoComplete="new-password"
              className={campo}
            />
          </label>
        </FormularioAviso>
      </section>
    </div>
  );
}
