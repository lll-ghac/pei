"use client";

import { Question, X } from "@phosphor-icons/react";
import { useRef } from "react";

const PREGUNTAS = [
  {
    p: "¿Perdí mi papeleta?",
    r: "Pida una papeleta de reserva a su profesor jefe o a la comisión del PEI. La que se perdió no se puede recuperar, porque nadie sabe cuál le tocó a cada persona.",
  },
  {
    p: "¿Tengo más de un hijo o hija en la escuela?",
    r: "Cada familia responde una sola encuesta, con la papeleta que llega por el hijo o hija menor. Si por error recibió más de una, responda solo una vez.",
  },
  {
    p: "¿Es anónima?",
    r: "Sí. Las papeletas se reparten al azar y nadie sabe cuál recibió cada persona. El sistema anota que una papeleta ya se usó, pero guarda las respuestas por separado, sin ningún vínculo con ella.",
  },
  {
    p: "¿Puedo cambiar mis respuestas?",
    r: "Sí, mientras no envíe la encuesta: use Anterior y Siguiente. Después de enviarla ya no se puede modificar.",
  },
  {
    p: "¿Se guardó mi avance?",
    r: "No. Por seguridad, el avance no se guarda en ningún lado: si se corta o se cierra la página, se empieza de nuevo. La papeleta sigue sirviendo hasta que se envía la encuesta.",
  },
];

export function Ayuda() {
  const ref = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => ref.current?.showModal()}
        className="inline-flex items-center gap-1.5 rounded-[2px] px-2 sm:px-3 min-h-12 font-bold text-white hover:bg-white/10"
      >
        <Question size={22} weight="bold" aria-hidden />
        Ayuda
      </button>
      <dialog
        ref={ref}
        className="m-auto w-[min(38rem,calc(100%-2rem))] rounded-[3px] p-0 bg-papel text-tinta border border-grafito backdrop:bg-tinta/55"
        aria-labelledby="titulo-ayuda"
      >
        <div className="flex items-center gap-3 bg-timbre text-white px-5 py-3">
          <h2 id="titulo-ayuda" className="rotulo text-[17px]">
            Ayuda
          </h2>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            className="ml-auto grid place-items-center min-h-12 min-w-12 rounded-[2px] hover:bg-white/10"
            aria-label="Cerrar ayuda"
          >
            <X size={22} weight="bold" />
          </button>
        </div>
        <dl className="divide-y divide-filete px-5">
          {PREGUNTAS.map((x) => (
            <div key={x.p} className="py-3.5">
              <dt className="font-bold">{x.p}</dt>
              <dd className="mt-0.5 text-grafito">{x.r}</dd>
            </div>
          ))}
        </dl>
        <div className="border-t border-filete px-5 py-4 text-[17px] space-y-2">
          <p>¿Problemas con su papeleta? Hable con su profesor jefe o con alguien de la comisión del PEI.</p>
          <p className="flex flex-wrap gap-x-4">
            <a className="text-timbre underline font-bold" href="/anonimato" target="_blank">
              Cómo protegemos el anonimato
            </a>
            <a className="text-timbre underline font-bold" href="/privacidad" target="_blank">
              Privacidad
            </a>
          </p>
        </div>
      </dialog>
    </>
  );
}
