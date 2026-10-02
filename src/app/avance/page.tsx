import { AutoRefresco } from "@/components/AutoRefresco";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { TablaAvance } from "@/components/TablaAvance";
import { avance } from "@/lib/gestion";

export const metadata = { title: "Avance de la encuesta PEI 2027" };

/** Pantalla pública de avance: solo números por curso y estamento. */
export default async function Avance() {
  const { estado, filas, funcionarios } = await avance();
  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera ancho="ancho" detalle="Avance de la encuesta" />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7">
        <h1 className="titulo text-[30px]">¿Cuántos hemos respondido?</h1>
        <p className="mt-1 mb-5 text-gris-texto">
          Se actualiza sola cada 30 segundos. Aquí no se muestra ninguna respuesta.
        </p>
        <TablaAvance filas={filas} funcionarios={funcionarios} />
        <AutoRefresco segundos={30} />
      </main>
    </div>
  );
}
