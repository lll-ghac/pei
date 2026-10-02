import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";

export const metadata = { title: "¿Cómo protegemos tu anonimato? · Encuesta PEI 2027" };

export default function Anonimato() {
  return (
    <div className="flex-1 flex flex-col">
      <Cabecera ancho="documento" />
      <main className="mx-auto w-full max-w-3xl flex-1 sm:px-4 py-6 sm:py-10">
        <article className="bg-papel border-y sm:border border-filete px-5 py-7 sm:px-10 sm:py-10 space-y-4 [&>p]:max-w-[68ch]">
          <h1 className="titulo text-[30px]">¿Cómo protegemos tu anonimato?</h1>
          <p>
            Las papeletas se reparten <strong>al azar</strong>, desde una bolsa. Nadie anota cuál recibe cada
            persona, igual que en una votación.
          </p>
          <p>La plataforma guarda la información en dos lugares separados:</p>

          <div className="grid gap-3 sm:grid-cols-2" role="img" aria-label="Esquema: el padrón y la urna no tienen ningún vínculo">
            <div className="border border-timbre p-4">
              <p className="rotulo text-[18px] text-timbre">Padrón</p>
              <p className="text-base">Credencial, curso y si ya respondió (sí o no).</p>
              <p className="text-base text-gris-texto">No guarda respuestas.</p>
            </div>
            <div className="border border-grafito p-4">
              <p className="rotulo text-[18px] text-tinta">Urna</p>
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
            <Link href="/privacidad" className="text-timbre underline font-bold">
              Ver la página de privacidad
            </Link>
          </p>
        </article>
      </main>
    </div>
  );
}
