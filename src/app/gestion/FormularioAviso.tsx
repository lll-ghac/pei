"use client";

import { startTransition, useActionState } from "react";
import type { Aviso } from "./acciones";

type Props = {
  accion: (previo: Aviso, form: FormData) => Promise<Aviso>;
  boton: string;
  peligro?: boolean;
  children?: React.ReactNode;
  className?: string;
};

/** Formulario del panel con su mensaje de resultado (error, éxito o contraseña nueva). */
export function FormularioAviso({ accion, boton, peligro, children, className }: Props) {
  const [aviso, enviar, pendiente] = useActionState<Aviso, FormData>(accion, {});
  return (
    <form
      // Envío manual: React 19 vacía el formulario tras una acción y se perdería lo escrito.
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => enviar(datos));
      }}
      className={className ?? "space-y-3"}>
      {children}
      <button
        type="submit"
        disabled={pendiente}
        className={`boton ${peligro ? "boton-peligro" : "boton-primario"}`}
      >
        {pendiente ? "Procesando…" : boton}
      </button>
      {aviso.error && (
        <p role="alert" className="border border-lacre bg-lacre-claro text-lacre font-bold px-3 py-2 text-[17px]">
          {aviso.error}
        </p>
      )}
      {aviso.ok && (
        <div role="status" className="border border-verde-tinta bg-verde-claro text-verde-oscuro font-bold px-3 py-2 text-[17px]">
          <p>{aviso.ok}</p>
          {aviso.clave && (
            <p className="mt-1 font-[family-name:var(--font-credencial)] text-2xl tracking-wider select-all bg-papel border border-tinta px-3 py-2 inline-block">
              {aviso.clave}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
