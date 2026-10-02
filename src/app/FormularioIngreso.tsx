"use client";

import { ArrowRight, LockKey } from "@phosphor-icons/react";
import { useActionState } from "react";
import { ingresar, type EstadoIngreso } from "./acciones";

export function FormularioIngreso() {
  const [estado, accion, enviando] = useActionState<EstadoIngreso, FormData>(ingresar, {});

  return (
    <form action={accion} className="space-y-4" noValidate>
      <div>
        <label htmlFor="usuario" className="block font-bold mb-1">
          Usuario
        </label>
        <input
          id="usuario"
          name="usuario"
          defaultValue={estado.usuario}
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="Ej.: 5A-K7P3"
          className="w-full rounded-2xl border-2 border-borde bg-tarjeta px-4 py-3 text-xl font-bold tracking-wider uppercase focus:border-azul"
          required
        />
      </div>
      <div>
        <label htmlFor="clave" className="block font-bold mb-1">
          Contraseña
        </label>
        <input
          id="clave"
          name="clave"
          type="password"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className="w-full rounded-2xl border-2 border-borde bg-tarjeta px-4 py-3 text-xl font-bold tracking-widest uppercase focus:border-azul"
          required
        />
      </div>

      {estado.error && (
        <p role="alert" className="rounded-2xl bg-error/10 text-error font-semibold px-4 py-3">
          {estado.error}
        </p>
      )}

      <button
        type="submit"
        disabled={enviando}
        className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-verde-profundo text-white text-xl font-bold px-6 py-4 min-h-14 disabled:opacity-60"
      >
        <LockKey size={24} weight="bold" aria-hidden />
        {enviando ? "Revisando…" : "Entrar a la encuesta"}
        <ArrowRight size={24} weight="bold" aria-hidden />
      </button>
    </form>
  );
}
