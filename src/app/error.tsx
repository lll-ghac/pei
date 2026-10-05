"use client";

import Link from "next/link";

/** Si algo falla en una página, un aviso en español en vez de la pantalla técnica. */
export default function ErrorDePagina({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto w-full max-w-2xl flex-1 sm:px-4 py-10">
      <section className="bg-papel border-y sm:border border-filete px-5 sm:px-10 py-9">
        <span className="sello text-lacre text-[13px]">Sin conexión</span>
        <h1 className="titulo mt-4 text-[28px]">No pudimos cargar esta página</h1>
        <p className="mt-3">
          Puede ser un corte de internet o del servidor de la escuela. Si estaba respondiendo la encuesta, sus
          respuestas no se han enviado todavía: vuelva a intentar en un momento.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => retry()} className="boton boton-primario">
            Reintentar
          </button>
          <Link href="/" className="boton boton-secundario no-underline">
            Ir al inicio
          </Link>
        </div>
      </section>
    </main>
  );
}
