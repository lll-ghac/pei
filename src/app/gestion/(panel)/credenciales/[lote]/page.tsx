import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { NOMBRE_ESTAMENTO, type Estamento } from "@/lib/encuestas";
import { exigirGestor } from "@/lib/gestion";
import { desactivarSobrantes } from "../../../acciones";

const COLORES: Record<string, { clase: string; texto: string }> = {
  usada: { clase: "bg-verde/30 border-verde-profundo", texto: "Usada" },
  sin_usar: { clase: "bg-error/10 border-error", texto: "Sin usar" },
  desactivada: { clase: "bg-borde/60 border-gris-texto text-gris-texto", texto: "Desactivada" },
};

/** Vista de un lote: solo el estado de cada credencial, nunca la hora ni las respuestas. */
export default async function VistaLote(props: PageProps<"/gestion/credenciales/[lote]">) {
  await exigirGestor();
  const id = Number((await props.params).lote);
  const [lote] = await db
    .select({ lote: schema.lotes, curso: schema.cursos.nombre })
    .from(schema.lotes)
    .leftJoin(schema.cursos, eq(schema.cursos.codigo, schema.lotes.cursoCodigo))
    .where(eq(schema.lotes.id, id));
  if (!lote) notFound();

  const creds = await db
    .select({ id: schema.credenciales.id, usuario: schema.credenciales.usuario, estado: schema.credenciales.estado })
    .from(schema.credenciales)
    .where(eq(schema.credenciales.loteId, id))
    .orderBy(asc(schema.credenciales.usuario));
  const n = (e: string) => creds.filter((c) => c.estado === e).length;

  return (
    <div className="space-y-5">
      <Link href="/gestion/credenciales" className="text-azul underline font-bold">
        ← Volver a credenciales
      </Link>
      <h1 className="text-3xl font-extrabold text-azul">
        Lote {id} · {NOMBRE_ESTAMENTO[lote.lote.estamento as Estamento]}
        {lote.curso ? ` · ${lote.curso}` : ""}
        {lote.lote.prueba && <span className="ml-2 align-middle rounded-full bg-amarillo px-2 py-0.5 text-base">PRUEBA</span>}
      </h1>
      <p className="text-lg">
        <strong>{n("usada")}</strong> usadas · <strong>{n("sin_usar")}</strong> sin usar ·{" "}
        <strong>{n("desactivada")}</strong> desactivadas
      </p>
      <p className="rounded-xl bg-azul/8 px-3 py-2 text-base">
        Esta vista muestra cuántas credenciales se usaron. Nadie sabe qué credencial recibió cada persona, así
        que no permite saber quién falta por responder. Sirve para contar y para desactivar las papeletas
        sobrantes que se devuelven.
      </p>

      <form action={desactivarSobrantes} className="space-y-3">
        <input type="hidden" name="lote" value={id} />
        <ul className="grid gap-2 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
          {creds.map((c) => {
            const color = COLORES[c.estado];
            return (
              <li key={c.id}>
                <label className={`flex items-center gap-2 rounded-xl border-2 px-3 py-2 ${color.clase}`}>
                  {c.estado === "sin_usar" && (
                    <input type="checkbox" name="credencial" value={c.id} className="size-5" aria-label={`Marcar ${c.usuario} como sobrante`} />
                  )}
                  <span className="font-mono font-bold">{c.usuario}</span>
                  <span className="ml-auto text-sm">{color.texto}</span>
                </label>
              </li>
            );
          })}
        </ul>
        {n("sin_usar") > 0 && (
          <button type="submit" className="rounded-full bg-grafito text-white px-5 py-2.5 font-bold">
            Desactivar las marcadas (papeletas sobrantes devueltas)
          </button>
        )}
      </form>
    </div>
  );
}
