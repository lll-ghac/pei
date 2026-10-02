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
      <div className="bg-azul text-white text-center text-sm font-extrabold tracking-wide py-1.5 px-4">
        VISTA PREVIA · Nada se guarda
      </div>
      <Cabecera
        logo="escudo"
        derecha={
          <>
            <Ayuda />
            <Link href="/gestion/encuestas" className="rounded-full px-3 py-1.5 min-h-11 font-bold text-gris-texto">
              Salir
            </Link>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Formulario estamento={e} curso={CURSO_EJEMPLO[e]} vistaPrevia />
      </main>
    </div>
  );
}
