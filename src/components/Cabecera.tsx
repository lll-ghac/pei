import Image from "next/image";
import Link from "next/link";

type Props = {
  /** "insignia" en ingreso y papeleta; "escudo" (sin el lema) en las preguntas. */
  logo?: "insignia" | "escudo";
  derecha?: React.ReactNode;
};

export function Cabecera({ logo = "insignia", derecha }: Props) {
  return (
    <header className="bg-tarjeta border-b border-borde">
      <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-2">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          {logo === "insignia" ? (
            <Image src="/insignia.png" alt="Insignia de la Escuela República del Ecuador" width={56} height={50} priority />
          ) : (
            <Image src="/escudo.png" alt="Escudo E-79" width={36} height={41} priority />
          )}
          <span className="leading-tight min-w-0">
            <span className="block text-sm font-bold text-azul truncate">Escuela República del Ecuador</span>
            <span className="block text-xs text-gris-texto">Encuesta PEI 2027</span>
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-2">{derecha}</div>
      </div>
    </header>
  );
}
