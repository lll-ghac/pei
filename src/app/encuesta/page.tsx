import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Ayuda } from "@/components/Ayuda";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { db, schema } from "@/db";
import type { Estamento } from "@/lib/encuestas";
import { leerEstado, puedeResponder } from "@/lib/estado";
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

  const estado = await leerEstado();
  if (!cred || cred.estado !== "sin_usar" || !puedeResponder(estado, cred.prueba)) redirect("/");

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera
        logo="escudo"
        derecha={
          <>
            <Ayuda />
            <form action={salir}>
              <button type="submit" className="rounded-full px-3 py-1.5 min-h-11 font-bold text-gris-texto">
                Salir
              </button>
            </form>
          </>
        }
      />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">
        <Formulario estamento={cred.estamento as Estamento} curso={cred.estamento === "F" ? null : cred.curso} />
      </main>
    </div>
  );
}
