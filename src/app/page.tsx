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
    <div className="fondo-formas flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera derecha={<Ayuda />} />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 grid gap-8 md:grid-cols-[1fr_1fr] md:items-start">
        <section className="text-center md:text-left">
          <Image
            src="/insignia.png"
            alt=""
            width={126}
            height={112}
            className="mx-auto md:mx-0"
            priority
          />
          <h1 className="mt-4 text-3xl sm:text-4xl font-extrabold text-azul leading-tight">
            Diseñando el futuro de nuestra escuela
          </h1>
          <p className="mt-3 text-lg">
            Estamos actualizando el Proyecto Educativo (PEI) y queremos conocer tu opinión.
          </p>
          <ul className="mt-4 space-y-1 text-base text-left inline-block">
            <li>
              <strong>Dura</strong> entre 10 y 20 minutos.
            </li>
            <li>
              <strong>Es anónima:</strong> tu papeleta no tiene tu nombre.
            </li>
            <li>
              <strong>Se responde una sola vez</strong> con cada papeleta.
            </li>
          </ul>
        </section>

        <section className="rounded-[24px] bg-tarjeta border border-borde p-5 sm:p-7 shadow-sm">
          <h2 className="text-2xl font-extrabold">Ingresa con tu papeleta</h2>
          <p className="mt-1 mb-5 text-base text-gris-texto">
            Escribe el usuario y la contraseña tal como aparecen en tu papeleta.
          </p>
          <FormularioIngreso />
          <p className="mt-5 text-base text-gris-texto">
            Su credencial solo sirve para contar cuántas personas han respondido por curso. No guarda su
            nombre.
          </p>
          <p className="mt-3 text-base">
            <Link className="text-azul underline font-semibold" href="/anonimato">
              ¿Cómo protegemos tu anonimato?
            </Link>{" "}
            ·{" "}
            <Link className="text-azul underline font-semibold" href="/privacidad">
              Privacidad
            </Link>
          </p>
        </section>
      </main>
    </div>
  );
}
