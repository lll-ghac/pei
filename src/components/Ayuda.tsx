"use client";

import { Question, X } from "@phosphor-icons/react";
import { useRef } from "react";

const PREGUNTAS = [
  {
    p: "¿Perdí mi papeleta?",
    r: "Pide una papeleta de reserva a tu profesor jefe o a la comisión del PEI. La que se perdió no se puede recuperar, porque nadie sabe cuál le tocó a cada persona.",
  },
  {
    p: "¿Tengo más de un hijo o hija en la escuela?",
    r: "Cada familia responde una sola encuesta, con la papeleta que llega por el hijo o hija menor. Si por error recibió más de una, responda solo una vez.",
  },
  {
    p: "¿Es anónima?",
    r: "Sí. Las papeletas se reparten al azar y nadie sabe cuál recibió cada persona. El sistema anota que una credencial ya participó, pero guarda las respuestas por separado, sin ningún vínculo con ella.",
  },
  {
    p: "¿Puedo cambiar mis respuestas?",
    r: "Sí, mientras no envíe la encuesta: use los botones Anterior y Siguiente. Después de enviarla ya no se puede modificar.",
  },
  {
    p: "¿Se guardó mi avance?",
    r: "No. Por seguridad, el avance no se guarda en ningún lado: si se corta o se cierra la página, se empieza de nuevo. La credencial sigue sirviendo hasta que se envía la encuesta.",
  },
];

export function Ayuda() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex items-center gap-1.5 rounded-full border-2 border-azul text-azul font-bold px-3 py-1.5 text-base min-h-11"
      >
        <Question size={22} weight="bold" aria-hidden />
        Ayuda
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(40rem,calc(100%-2rem))] rounded-[24px] p-0 backdrop:bg-grafito/60"
        aria-labelledby="titulo-ayuda"
      >
        <div className="p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <h2 id="titulo-ayuda" className="text-2xl font-extrabold text-azul">
              Ayuda
            </h2>
            <button
              type="button"
              onClick={() => ref.current?.close()}
              className="ml-auto rounded-full p-2 min-h-11 min-w-11 grid place-items-center"
              aria-label="Cerrar ayuda"
            >
              <X size={24} weight="bold" />
            </button>
          </div>
          <dl className="mt-3 space-y-4">
            {PREGUNTAS.map((x) => (
              <div key={x.p}>
                <dt className="font-bold">{x.p}</dt>
                <dd className="text-gris-texto">{x.r}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-5 text-base">
            ¿Necesita ayuda con su credencial? Hable con su profesor jefe o con un miembro de la comisión del PEI.
          </p>
          <p className="mt-2 text-base">
            <a className="text-azul underline font-semibold" href="/anonimato" target="_blank">
              ¿Cómo protegemos tu anonimato?
            </a>{" "}
            ·{" "}
            <a className="text-azul underline font-semibold" href="/privacidad" target="_blank">
              Privacidad
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
