import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { Urna } from "@/components/Urna";
import { ENCUESTAS, type Estamento } from "@/lib/encuestas";

export default async function Gracias(props: PageProps<"/gracias">) {
  const { e } = await props.searchParams;
  const estamento: Estamento = e === "E" || e === "F" ? e : "A";
  const tu = estamento === "E";

  return (
    <div className="flex-1 flex flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-2xl flex-1 sm:px-4 py-8 sm:py-12">
        <section className="bg-papel border-y sm:border border-filete px-5 sm:px-10 py-9 text-center">
          <Urna className="mx-auto w-44" papeletas={4} />
          <h1 className="titulo mt-6 text-[30px] sm:text-[36px]">{ENCUESTAS[estamento].despedida}</h1>
          <p className="mt-3 text-[20px]">
            {tu ? "Tu papeleta ya está en la urna. Tus respuestas quedaron guardadas en secreto." : "Su papeleta ya está en la urna. Sus respuestas quedaron guardadas de forma anónima."}
          </p>
          <div className="mt-6 inline-flex items-center gap-3 border-t border-filete pt-5 text-left">
            <span className="sello text-timbre text-[13px] shrink-0">Voto secreto</span>
            <p className="text-[17px] text-grafito">
              {tu
                ? "Ya puedes cerrar esta página. En este computador no quedó nada guardado."
                : "Ya puede cerrar esta página. En este equipo no quedó guardada ninguna respuesta."}
            </p>
          </div>
          <p className="mt-6">
            <Link href="/" className="text-timbre underline font-bold">
              Volver al inicio
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
