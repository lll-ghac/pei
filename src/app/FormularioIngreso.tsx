"use client";

import { ArrowRight, Eye, EyeSlash } from "@phosphor-icons/react";
import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { ingresar, type EstadoIngreso } from "./acciones";

const recuadro =
  "block border border-tinta bg-papel px-3 pt-1.5 pb-2 focus-within:outline focus-within:outline-3 focus-within:outline-timbre";
const entrada =
  "w-full min-w-0 bg-transparent font-[family-name:var(--font-credencial)] font-bold text-[24px] tracking-[0.12em] uppercase text-tinta placeholder:text-filete placeholder:tracking-[0.08em] focus:outline-none";

/** Ingreso con la papeleta: los recuadros imitan los de la papeleta impresa. */
export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(ingresar, {});
  const [verClave, setVerClave] = useState(false);
  const aviso = useRef<HTMLDivElement>(null);

  // El error siempre queda a la vista (en celular podría quedar bajo el teclado o fuera de pantalla).
  useEffect(() => {
    if (estado.error) aviso.current?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [estado]);

  return (
    <form
      // Envío manual: React 19 vacía el formulario tras una acción y se perdería lo escrito.
      onSubmit={(e) => {
        e.preventDefault();
        const datos = new FormData(e.currentTarget);
        startTransition(() => accion(datos));
      }}
      className="space-y-3"
      noValidate
    >
      <label className={recuadro}>
        <span className="rotulo block text-[13px] text-grafito">Usuario</span>
        <input
          id="usuario"
          name="usuario"
          defaultValue={estado.usuario}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="5A-K7P3"
          className={entrada}
          required
        />
      </label>
      <div className={recuadro}>
        <label htmlFor="clave" className="rotulo block text-[13px] text-grafito">
          Contraseña
        </label>
        <div className="flex items-center gap-2">
          <input
            id="clave"
            name="clave"
            type={verClave ? "text" : "password"}
            autoComplete="off"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            className={entrada}
            required
          />
          <button
            type="button"
            onClick={() => setVerClave((v) => !v)}
            aria-pressed={verClave}
            aria-controls="clave"
            className="shrink-0 inline-flex items-center gap-1.5 min-h-12 px-2 -mr-1 font-bold text-timbre text-[17px]"
          >
            {verClave ? <EyeSlash size={22} weight="bold" aria-hidden /> : <Eye size={22} weight="bold" aria-hidden />}
            {verClave ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>

      {estado.error && (
        <div ref={aviso} role="alert" className="flex items-start gap-3 border border-lacre bg-lacre-claro px-4 py-3 scroll-mt-4">
          <span className="sello text-lacre text-[12px] mt-0.5 shrink-0">Revise</span>
          <span>{estado.error}</span>
        </div>
      )}

      <button type="submit" disabled={enviando} className="boton boton-primario w-full text-[19px]">
        {enviando ? "Revisando la papeleta…" : "Entrar a la encuesta"}
        <ArrowRight size={20} weight="bold" aria-hidden />
      </button>
    </form>
  );
}
