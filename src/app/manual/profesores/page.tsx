import Image from "next/image";
import { Cabecera } from "@/components/Cabecera";
import { Imprimir } from "./Imprimir";

export const metadata = { title: "Manual del profesor jefe · Encuesta PEI 2027" };

/**
 * Manual de profesores jefes (MVP: 1 página). Público y sin datos: se comparte por enlace
 * y se imprime en una hoja A4.
 */

function Paso({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <li className="grid grid-cols-[1.75rem_1fr] gap-2 print:grid-cols-[1.6rem_1fr] print:gap-1.5">
      <span className="size-7 grid place-items-center rounded-full bg-tinta text-papel text-[15px] font-bold print:size-6 print:text-[12.5px]" aria-hidden>
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="border border-grafito bg-papel break-inside-avoid">
      <h2 className="rotulo bg-tinta text-papel px-4 py-2 text-[16px] print:text-[13px] print:px-3.5 print:py-1.5">{titulo}</h2>
      <div className="px-4 py-3 print:px-3.5 print:py-2.5">{children}</div>
    </section>
  );
}

const PROBLEMAS: [string, string][] = [
  ["Perdió su papeleta", "Pida una de reserva a la comisión. La perdida no se puede recuperar: nadie sabe cuál era."],
  ["«Esta credencial ya fue usada»", "Esa papeleta ya respondió. Si la persona no alcanzó a responder, entréguele una de reserva y avise a la comisión."],
  ["«No encontramos ese usuario» o «La contraseña no coincide»", "Revise que esté bien copiada. Da lo mismo escribir en mayúsculas o minúsculas."],
  ["«Hubo muchos intentos»", "Esa papeleta queda bloqueada 15 minutos. Espere y vuelva a intentar."],
  ["Se cortó internet o se cerró la página", "Vuelva a entrar con la misma papeleta. El avance no se guarda: se empieza de nuevo."],
];

export default function ManualProfesores() {
  return (
    <div className="flex-1 flex flex-col">
      <div className="print:hidden">
        <Cabecera ancho="medio" detalle="Manual del profesor jefe" />
      </div>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-7 space-y-4 print:p-0 print:space-y-3.5 print:text-[12.5px] print:leading-snug print:max-w-none">
        <header className="flex flex-wrap items-start gap-x-4 gap-y-3 print:flex-nowrap print:gap-3">
          <Image src="/insignia.png" alt="" width={64} height={57} className="w-14 h-auto shrink-0 print:w-16" />
          <div className="flex-1 min-w-[14rem]">
            <p className="rotulo text-timbre text-[14px] print:text-[11px]">Encuesta PEI 2027 · Escuela República del Ecuador E-79</p>
            <h1 className="titulo text-[30px] print:text-[25px] leading-tight">Manual del profesor jefe</h1>
            <p className="text-[17px] mt-1 max-w-[70ch] print:text-[12.5px] print:max-w-none">
              La encuesta es <strong>anónima</strong> porque las papeletas se reparten <strong>al azar</strong> y nadie anota
              cuál recibió cada persona. Usted cuida que eso se cumpla. Encuesta en{" "}
              <strong>encuesta.escuelaecuador.cl</strong>, desde computador, tablet o celular; toma unos 15 minutos.
            </p>
          </div>
          <div className="print:hidden">
            <Imprimir />
          </div>
        </header>

        <p className="text-[16px] text-grafito print:text-[12px]">
          Su sobre trae las papeletas del curso (más un 10% de reserva), separadas por tipo: <strong>APODERADO/A</strong> en
          todos los cursos y <strong>ESTUDIANTE</strong> en 5° a 8° básico.
        </p>

        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Bloque titulo="Papeletas de apoderados">
            <ol className="space-y-2 text-[16px] print:space-y-1.5 print:text-[12px]">
              <Paso n={1}>
                Pregunte en el curso <strong>quién tiene un hermano o hermana menor en la escuela</strong>. Esos estudiantes
                no reciben papeleta: su familia la recibe por el hijo menor. En parvularia, confírmelo con la planilla de
                hermanos o con el apoderado.
              </Paso>
              <Paso n={2}>
                <strong>Mezcle las papeletas</strong> y póngalas en las libretas <strong>sin anotar</strong> cuál va en
                cada una.
              </Paso>
              <Paso n={3}>
                Informe a la comisión <strong>solo cuántas entregó</strong>, sin nombres. Con ese número se calcula el
                porcentaje del curso.
              </Paso>
              <Paso n={4}>
                <strong>Devuelva las sobrantes</strong> a la comisión: se desactivan y ya no sirven.
              </Paso>
            </ol>
          </Bloque>

          <Bloque titulo="Estudiantes de 5° a 8° (en clase)">
            <ol className="space-y-2 text-[16px] print:space-y-1.5 print:text-[12px]">
              <Paso n={1}>
                Ponga las papeletas de estudiantes en una <strong>bolsa</strong>. Al momento de responder,{" "}
                <strong>cada estudiante saca una</strong>.
              </Paso>
              <Paso n={2}>
                Entran a <strong>encuesta.escuelaecuador.cl</strong> y escriben el usuario y la contraseña de su papeleta.
              </Paso>
              <Paso n={3}>
                Responden solos. Usted puede <strong>ayudar a leer</strong> (cada frase tiene un botón con parlante que la
                lee en voz alta), pero <strong>no a elegir</strong>, y no mira las pantallas.
              </Paso>
              <Paso n={4}>
                Al final tocan <strong>«Depositar en la urna»</strong> y aparece el agradecimiento. Recién ahí terminó.
                Si alguien no alcanza, puede responder en su casa con la misma papeleta.
              </Paso>
              <Paso n={5}>
                <strong>Devuelva las sobrantes</strong> a la comisión.
              </Paso>
            </ol>
          </Bloque>
        </div>

        <Bloque titulo="Si algo falla">
          <dl className="grid gap-x-5 gap-y-1.5 text-[16px] md:grid-cols-[minmax(0,15rem)_1fr] print:grid-cols-[15rem_1fr] print:text-[12px] print:gap-y-0.5">
            {PROBLEMAS.map(([p, r]) => (
              <div key={p} className="contents">
                <dt className="font-bold">{p}</dt>
                <dd className="text-grafito print:text-tinta">{r}</dd>
              </div>
            ))}
          </dl>
        </Bloque>

        <div className="grid gap-4 md:grid-cols-2 print:grid-cols-2 print:gap-3">
          <Bloque titulo="Nunca">
            <ul className="list-disc pl-5 space-y-1 text-[16px] print:text-[12px] print:space-y-0.5 print:pl-3.5">
              <li>Anotar o fotografiar qué papeleta recibió cada persona.</li>
              <li>Responder por otra persona o sugerir respuestas.</li>
              <li>Pedir que le muestren las respuestas.</li>
            </ul>
          </Bloque>
          <Bloque titulo="Para motivar al curso">
            <p className="text-[16px] print:text-[12px]">
              En <strong>encuesta.escuelaecuador.cl/avance</strong> se ve cuántos han respondido por curso (solo números,
              nunca quién). Ante cualquier duda, hable con la comisión del PEI.
            </p>
          </Bloque>
        </div>
      </main>
    </div>
  );
}
