import { CheckCircle, Confetti } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { ENCUESTAS, type Estamento } from "@/lib/encuestas";

export default async function Gracias(props: PageProps<"/gracias">) {
  const { e } = await props.searchParams;
  const estamento: Estamento = e === "E" || e === "F" ? e : "A";
  const esEstudiante = estamento === "E";

  return (
    <div className={`fondo-formas flex-1 flex flex-col ${esEstudiante ? "estudiante" : ""}`}>
      <Cabecera />
      <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12 text-center">
        <div className="rounded-[24px] bg-tarjeta border border-borde p-8 shadow-sm">
          {esEstudiante ? (
            <Confetti size={88} weight="duotone" className="mx-auto text-amarillo" aria-hidden />
          ) : (
            <CheckCircle size={88} weight="duotone" className="mx-auto text-verde-profundo" aria-hidden />
          )}
          <h1 className="titulo-encuesta mt-4 text-3xl sm:text-4xl font-extrabold text-azul">
            {ENCUESTAS[estamento].despedida}
          </h1>
          <p className="mt-4 text-lg">
            {esEstudiante
              ? "¡Gracias! Tus respuestas quedaron guardadas en secreto."
              : "Gracias. Sus respuestas quedaron guardadas de forma anónima."}
          </p>
          <p className="mt-2 text-base text-gris-texto">
            {esEstudiante
              ? "Ya puedes cerrar esta página."
              : "Ya puede cerrar esta página. En este equipo no quedó guardada ninguna respuesta."}
          </p>
          <Link href="/" className="mt-6 inline-block text-azul underline font-semibold">
            Volver al inicio
          </Link>
        </div>
      </main>
    </div>
  );
}
