import Image from "next/image";
import Link from "next/link";
import { Ayuda } from "@/components/Ayuda";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { leerEstado } from "@/lib/estado";
import { FormularioIngreso } from "./FormularioIngreso";

export default async function Inicio() {
  const estado = await leerEstado();

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera ancho="medio" derecha={<Ayuda />} />

      <main className="mx-auto w-full max-w-5xl flex-1 sm:px-4 py-6 sm:py-10 grid gap-6 md:grid-cols-[1.05fr_1fr] md:gap-10 md:items-start">
        <section className="px-5 sm:px-0">
          <div className="flex items-center gap-4">
            <Image src="/insignia.png" alt="" width={84} height={75} priority />
            <p className="text-[16px] text-grafito leading-snug">
              Escuela República del Ecuador E‑79
              <br />
              Antofagasta
            </p>
          </div>
          <h1 className="titulo mt-6 text-[34px] sm:text-[44px]">Diseñando el futuro de nuestra escuela</h1>
          <p className="mt-4 max-w-[46ch]">
            Estamos actualizando el Proyecto Educativo (PEI) y queremos conocer su opinión. Toma entre 10 y 20
            minutos y se responde una sola vez con cada papeleta.
          </p>
          <div className="mt-6 flex items-start gap-4 border-t border-filete pt-5">
            <span className="sello text-timbre text-[14px] shrink-0">Voto secreto</span>
            <p className="text-[17px] text-grafito">
              Las papeletas se reparten al azar y no llevan nombre. Nadie puede saber qué respondió cada
              persona.{" "}
              <Link className="text-timbre underline font-bold" href="/anonimato">
                Cómo lo protegemos
              </Link>
            </p>
          </div>
        </section>

        <section className="bg-papel border-y sm:border border-filete" aria-labelledby="titulo-ingreso">
          <div className="border-b border-dashed border-grafito px-5 sm:px-7 py-4 flex items-baseline justify-between gap-3">
            <h2 id="titulo-ingreso" className="rotulo text-[18px]">
              Ingrese con su papeleta
            </h2>
            <span className="text-[14px] text-gris-texto">encuesta.escuelaecuador.cl</span>
          </div>
          <div className="px-5 sm:px-7 py-6">
            <p className="mb-4 text-[17px] text-grafito">
              Escriba el usuario y la contraseña tal como aparecen en su papeleta. Puede usar minúsculas.
            </p>
            <FormularioIngreso />
            <p className="mt-5 text-[16px] text-gris-texto">
              Su credencial solo sirve para contar cuántas personas han respondido por curso. No guarda su nombre.{" "}
              <Link className="text-timbre underline" href="/privacidad">
                Privacidad
              </Link>
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
