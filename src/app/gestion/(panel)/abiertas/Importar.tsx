"use client";

import { startTransition, useActionState } from "react";
import { importarClasificacion, type AvisoImportacion } from "../../acciones";

/** Carga de la clasificación: primero se revisa y se muestra un resumen; luego se confirma. */
export function Importar({ temas }: { temas: Record<string, string> }) {
  const [aviso, accion, pendiente] = useActionState<AvisoImportacion, FormData>(
    importarClasificacion,
    {},
  );
  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const datos = new FormData(e.currentTarget);
          startTransition(() => accion(datos));
        }}
        className="flex flex-wrap items-end gap-3"
      >
        <label className="grid gap-1 font-bold text-[16px]">
          Archivo clasificado (CSV)
          <input
            type="file"
            name="archivo"
            accept=".csv,text/csv"
            required
            className="text-[16px] font-normal"
          />
        </label>
        <button
          type="submit"
          disabled={pendiente}
          className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]"
        >
          {pendiente ? "Revisando…" : "Revisar archivo"}
        </button>
      </form>

      {aviso.error && (
        <p
          role="alert"
          className="border border-lacre bg-lacre-claro text-lacre font-bold px-3 py-2 text-[16px]"
        >
          {aviso.error}
        </p>
      )}
      {aviso.ok && (
        <div
          role="status"
          className="border border-verde-tinta bg-verde-claro px-3 py-2 text-[16px] space-y-2"
        >
          <p className="font-bold text-verde-oscuro">{aviso.ok}</p>
          {aviso.resumen && (
            <>
              <p>
                {aviso.resumen.filas} textos en el archivo ·{" "}
                {aviso.resumen.sinClasificar} textos revisados quedarían sin
                tema.
              </p>
              <ul className="columns-1 sm:columns-2 text-[15px]">
                {aviso.resumen.porTema.map(([t, n]) => (
                  <li key={t}>
                    <strong>{t}</strong> {temas[t] ?? ""}: {n}
                  </li>
                ))}
              </ul>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const datos = new FormData();
                  datos.set("contenido", aviso.contenido ?? "");
                  datos.set("confirmar", "si");
                  startTransition(() => accion(datos));
                }}
              >
                <button
                  type="submit"
                  disabled={pendiente}
                  className="boton boton-primario !min-h-11 !py-1.5 text-[16px]"
                >
                  Confirmar carga (reemplaza la anterior)
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
