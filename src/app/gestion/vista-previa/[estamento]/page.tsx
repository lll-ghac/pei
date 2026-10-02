import Link from "next/link";
import { notFound } from "next/navigation";
import { Formulario } from "@/app/encuesta/Formulario";
import { Ayuda } from "@/components/Ayuda";
import { Cabecera } from "@/components/Cabecera";
import type { Estamento } from "@/lib/encuestas";
import { exigirGestor } from "@/lib/gestion";

export const metadata = { title: "Vista previa · Encuesta PEI 2027" };

const CURSO_EJEMPLO: Record<Estamento, string | null> = { A: "5° básico A", E: "5° básico A", F: null };

/** La encuesta tal como la ve quien responde, sin credencial y sin guardar nada. */
export default async function VistaPrevia(props: PageProps<"/gestion/vista-previa/[estamento]">) {
  await exigirGestor();
  const { estamento } = await props.params;
  if (!["A", "E", "F"].includes(estamento)) notFound();
  const e = estamento as Estamento;

  return (
    <div className="flex-1 flex flex-col">
      <Cabecera
        detalle="Vista previa · nada se guarda"
        derecha={
          <>
            <Ayuda />
            <Link
              href="/gestion/encuestas"
              className="rounded-[2px] px-3 min-h-12 inline-flex items-center font-bold text-white/85 no-underline hover:bg-white/10"
            >
              Salir
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 sm:px-4 py-5 sm:py-8">
        <Formulario estamento={e} curso={CURSO_EJEMPLO[e]} vistaPrevia />
      </main>
    </div>
  );
}
