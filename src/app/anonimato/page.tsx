import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";

export const metadata = { title: "¿Cómo protegemos tu anonimato? · Encuesta PEI 2027" };

export default function Anonimato() {
  return (
    <div className="flex-1 flex flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="rounded-[24px] bg-tarjeta border border-borde p-6 sm:p-8 shadow-sm space-y-4">
          <h1 className="text-3xl font-extrabold text-azul">¿Cómo protegemos tu anonimato?</h1>
          <p>
            Las papeletas se reparten <strong>al azar</strong>, desde una bolsa. Nadie anota cuál recibe cada
            persona, igual que en una votación.
          </p>
          <p>La plataforma guarda la información en dos lugares separados:</p>

          <div className="grid gap-3 sm:grid-cols-2" role="img" aria-label="Esquema: el padrón y la urna no tienen ningún vínculo">
            <div className="rounded-2xl border-2 border-azul p-4">
              <p className="font-extrabold text-azul">Padrón</p>
              <p className="text-base">Credencial, curso y si ya respondió (sí o no).</p>
              <p className="text-base text-gris-texto">No guarda respuestas.</p>
            </div>
            <div className="rounded-2xl border-2 border-verde-profundo p-4">
              <p className="font-extrabold text-verde-profundo">Urna</p>
              <p className="text-base">Respuestas, con curso y estamento.</p>
              <p className="text-base text-gris-texto">No guarda la credencial, ni la fecha, ni la hora.</p>
            </div>
          </div>
          <p className="text-center font-bold">No existe ningún dato que una el padrón con la urna.</p>

          <ul className="list-disc pl-6 space-y-2">
            <li>Ni la dirección, ni la comisión, ni el administrador pueden saber qué respondió una credencial.</li>
            <li>
              Durante la encuesta solo se ve cuántas personas respondieron por curso. Los resultados se abren
              recién al cierre.
            </li>
            <li>Los resultados se muestran solo en grupos de 5 o más personas.</li>
            <li>
              Las respuestas escritas se revisan antes de analizarlas: si aparece un nombre, se reemplaza por un
              rol general, como [un docente].
            </li>
            <li>El avance no se guarda en el equipo: al enviar o salir, no queda rastro de tus respuestas.</li>
          </ul>
          <p>
            <Link href="/privacidad" className="text-azul underline font-semibold">
              Ver la página de privacidad
            </Link>
          </p>
        </article>
      </main>
    </div>
  );
}
