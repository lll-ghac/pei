import Image from "next/image";
import Link from "next/link";

type Props = {
  /** "insignia" en ingreso y papeleta; "escudo" (sin el lema) en las preguntas. */
  logo?: "insignia" | "escudo";
  /** Texto bajo el título de la banda (estado, sección, rol). */
  detalle?: React.ReactNode;
  derecha?: React.ReactNode;
  /** Ancho de la banda, igual al del contenido de la página para que todo quede alineado. */
  ancho?: "angosto" | "documento" | "medio" | "ancho";
};

const ANCHOS = { angosto: "max-w-2xl", documento: "max-w-3xl", medio: "max-w-5xl", ancho: "max-w-6xl" };

/** Banda de timbre: azul, con el escudo y la línea de corte perforada debajo. */
export function Cabecera({ logo = "escudo", detalle, derecha, ancho = "angosto" }: Props) {
  return (
    <header>
      <div className="bg-timbre text-white">
        <div
          className={`mx-auto flex items-center gap-3 px-4 py-2 min-h-14 ${ANCHOS[ancho]}`}
        >
          <Link href="/" className="flex items-center gap-3 min-w-0 no-underline">
            <span className="grid place-items-center size-10 shrink-0 rounded-[2px] bg-white">
              {logo === "insignia" ? (
                <Image src="/insignia.png" alt="Insignia de la Escuela República del Ecuador" width={36} height={32} priority />
              ) : (
                <Image src="/escudo.png" alt="Escudo de la Escuela República del Ecuador E-79" width={28} height={32} priority />
              )}
            </span>
            <span className="min-w-0 leading-tight">
              <span className="rotulo block text-[15px] text-white whitespace-nowrap">Encuesta PEI 2027</span>
              <span className="hidden sm:block text-[14px] text-white/80">
                {detalle ?? "Escuela República del Ecuador E‑79"}
              </span>
            </span>
          </Link>
          <div className="ml-auto flex items-center gap-1">{derecha}</div>
        </div>
      </div>
      <div className="perforado" aria-hidden />
    </header>
  );
}
