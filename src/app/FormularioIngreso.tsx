"use client";

import { ArrowRight } from "@phosphor-icons/react";
import { startTransition, useActionState } from "react";
import { ingresar, type EstadoIngreso } from "./acciones";

const recuadro =
  "block border border-tinta bg-papel px-3 pt-1.5 pb-2 focus-within:outline focus-within:outline-3 focus-within:outline-timbre";
const entrada =
  "w-full bg-transparent font-[family-name:var(--font-credencial)] font-bold text-[24px] tracking-[0.12em] uppercase text-tinta placeholder:text-filete placeholder:tracking-[0.08em] focus:outline-none";

/** Ingreso con la papeleta: los recuadros imitan los de la papeleta impresa. */
export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(ingresar, {});

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
      <label className={recuadro}>
        <span className="rotulo block text-[13px] text-grafito">Contraseña</span>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={entrada}
          required
        />
      </label>

      {estado.error && (
        <div role="alert" className="flex items-start gap-3 border border-lacre bg-lacre-claro px-4 py-3">
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
