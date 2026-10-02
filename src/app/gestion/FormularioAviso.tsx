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
        className={`rounded-full px-5 py-2.5 min-h-12 font-bold text-white disabled:opacity-60 ${
          peligro ? "bg-error" : "bg-verde-profundo"
        }`}
      >
        {pendiente ? "Procesando…" : boton}
      </button>
      {aviso.error && (
        <p role="alert" className="rounded-xl bg-error/10 text-error font-semibold px-3 py-2 text-base">
          {aviso.error}
        </p>
      )}
      {aviso.ok && (
        <div role="status" className="rounded-xl bg-verde/20 text-verde-oscuro font-semibold px-3 py-2 text-base">
          <p>{aviso.ok}</p>
          {aviso.clave && (
            <p className="mt-1 font-mono text-2xl tracking-wider select-all bg-tarjeta rounded-lg px-3 py-2 inline-block">
              {aviso.clave}
            </p>
          )}
        </div>
      )}
    </form>
  );
}
