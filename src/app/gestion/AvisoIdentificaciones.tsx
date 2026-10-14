import Link from "next/link";
import { revisadosConIdentificacion } from "@/lib/abiertas";

/**
 * Red de seguridad antes de descargar: textos ya revisados que todavía tienen posibles
 * identificaciones (marcas fuertes del detector). Solo avisa; la decisión es de la comisión.
 */
export async function AvisoIdentificaciones({
  prueba,
  cantidad,
}: {
  prueba: boolean;
  /** Si la página ya la calculó, no se vuelve a consultar. */
  cantidad?: number;
}) {
  const n = cantidad ?? (await revisadosConIdentificacion(prueba));
  if (!n) return null;
  return (
    <div
      role="status"
      className="border border-filete border-l-4 border-l-lacre bg-lacre-claro px-3 py-2 text-[16px] space-y-1 max-w-[85ch]"
    >
      <p className="font-bold text-lacre">
        {n === 1
          ? "1 texto revisado todavía tiene una posible identificación."
          : `${n} textos revisados todavía tienen posibles identificaciones.`}
      </p>
      <p>
        Un nombre, un cargo con su asignatura o curso, o un cargo que tiene una
        sola persona. Revíselos antes de descargar la sábana, los archivos o el
        PDF oficial: aparecen primero en{" "}
        <Link
          href="/gestion/abiertas?ver=revisados"
          className="text-timbre underline font-bold"
        >
          Abiertas → Revisados
        </Link>
        , con las marcas en color. Si están bien así, no hace falta cambiarlos.
      </p>
    </div>
  );
}
