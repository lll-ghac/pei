import Image from "next/image";
import Link from "next/link";
import { Ayuda } from "@/components/Ayuda";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { leerContacto, leerEstado } from "@/lib/estado";
import { FormularioIngreso } from "./FormularioIngreso";

export default async function Inicio() {
  const [estado, contacto] = await Promise.all([leerEstado(), leerContacto()]);

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera ancho="medio" derecha={<Ayuda contacto={contacto} />} />

      {/*
        Celular: título breve, luego el formulario (se ve sin bajar) y después la explicación.
        Escritorio: título y explicación a la izquierda, formulario a la derecha.
      */}
      <main className="mx-auto w-full max-w-5xl flex-1 sm:px-4 py-5 sm:py-10 grid gap-5 md:grid-cols-[1.05fr_1fr] md:gap-x-10 md:gap-y-6 md:items-start">
        <div className="px-5 sm:px-0 md:col-start-1 md:row-start-1">
          <div className="hidden md:flex items-center gap-4 mb-6">
            <Image src="/insignia.png" alt="" width={84} height={75} priority />
            <p className="text-[16px] text-grafito leading-snug">
              Escuela República del Ecuador E‑79
              <br />
              Antofagasta
            </p>
          </div>
          <h1 className="titulo text-[28px] sm:text-[44px]">Diseñando el futuro de nuestra escuela</h1>
        </div>

        <section
          className="bg-papel border-y sm:border border-filete md:col-start-2 md:row-start-1 md:row-span-2"
          aria-labelledby="titulo-ingreso"
        >
          <div className="border-b border-dashed border-grafito px-5 sm:px-7 py-3.5 flex items-baseline justify-between gap-3">
            <h2 id="titulo-ingreso" className="rotulo text-[18px]">
              Ingrese con su papeleta
            </h2>
            <span className="hidden sm:inline text-[14px] text-gris-texto">encuesta.escuelaecuador.cl</span>
          </div>
          <div className="px-5 sm:px-7 py-5 sm:py-6">
            <p className="mb-4 text-[17px] text-grafito">
              <span className="md:hidden">Escriba lo que dice su papeleta.</span>
              <span className="hidden md:inline">
                Escriba el usuario y la contraseña tal como aparecen en su papeleta. Puede usar minúsculas.
              </span>
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

        <div className="px-5 sm:px-0 md:col-start-1 md:row-start-2">
          <p className="max-w-[46ch]">
            Estamos actualizando el Proyecto Educativo (PEI) y queremos conocer su opinión. Toma entre 10 y 20
            minutos y se responde una sola vez con cada papeleta.
          </p>
          <div className="mt-6 flex items-start gap-4 border-t border-filete pt-5">
            <span className="sello text-timbre text-[14px] shrink-0">Voto secreto</span>
            <p className="text-[17px] text-grafito">
              Las papeletas se reparten al azar y no llevan nombre. Nadie puede saber qué respondió cada persona.{" "}
              <Link className="text-timbre underline font-bold" href="/anonimato">
                Cómo lo protegemos
              </Link>
            </p>
          </div>
          <div className="mt-6 flex md:hidden items-center gap-3">
            <Image src="/insignia.png" alt="" width={56} height={50} />
            <p className="text-[16px] text-grafito leading-snug">Escuela República del Ecuador E‑79 · Antofagasta</p>
          </div>
        </div>
      </main>
    </div>
  );
}
