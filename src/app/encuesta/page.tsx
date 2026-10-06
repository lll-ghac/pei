import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Ayuda } from "@/components/Ayuda";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { db, schema } from "@/db";
import type { Estamento } from "@/lib/encuestas";
import { leerContacto, leerEstado, puedeResponder } from "@/lib/estado";
import { leerParticipante } from "@/lib/sesion";
import { salir } from "../acciones";
import { Formulario } from "./Formulario";

export default async function PaginaEncuesta() {
  const id = await leerParticipante();
  if (!id) redirect("/");

  const [cred] = await db
    .select({
      estamento: schema.credenciales.estamento,
      estado: schema.credenciales.estado,
      prueba: schema.credenciales.prueba,
      curso: schema.cursos.nombre,
    })
    .from(schema.credenciales)
    .leftJoin(schema.cursos, eq(schema.cursos.codigo, schema.credenciales.cursoCodigo))
    .where(eq(schema.credenciales.id, id));

  const [estado, contacto] = await Promise.all([leerEstado(), leerContacto()]);
  if (!cred || cred.estado !== "sin_usar" || !puedeResponder(estado, cred.prueba)) redirect("/");

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera
        derecha={
          <>
            <Ayuda contacto={contacto} />
            <form action={salir}>
              <button type="submit" className="rounded-[2px] px-2 sm:px-3 min-h-12 font-bold text-white/85 hover:bg-white/10">
                Salir
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto w-full max-w-2xl flex-1 sm:px-4 py-5 sm:py-8">
        <Formulario estamento={cred.estamento as Estamento} curso={cred.estamento === "F" ? null : cred.curso} />
      </main>
    </div>
  );
}
