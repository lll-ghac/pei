import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Estamento } from "@/lib/encuestas";
import { registrar } from "@/lib/estado";
import { descargasPapeletas, exigirGestor } from "@/lib/gestion";
import { pdfPapeletas } from "@/lib/papeletas";

export async function GET(
  req: Request,
  ctx: RouteContext<"/gestion/papeletas/[lote]">,
) {
  const g = await exigirGestor("admin");
  const id = Number((await ctx.params).lote);
  const [fila] = await db
    .select({ lote: schema.lotes, curso: schema.cursos.nombre })
    .from(schema.lotes)
    .leftJoin(schema.cursos, eq(schema.cursos.codigo, schema.lotes.cursoCodigo))
    .where(eq(schema.lotes.id, id));
  if (!fila) return new Response("Lote no encontrado", { status: 404 });

  // Modo Oficial: una copia guardada del PDF permite responder con las papeletas que siguen sin usar.
  // Por eso la segunda descarga y las siguientes se piden a propósito («Reimprimir») y quedan marcadas.
  const previas = (await descargasPapeletas()).get(id) ?? 0;
  const reimpresion = new URL(req.url).searchParams.get("reimpresion") === "1";
  if (!fila.lote.prueba && previas > 0 && !reimpresion) {
    return new Response(
      `Este lote oficial ya se descargó ${previas} ${previas === 1 ? "vez" : "veces"}. Para volver a imprimirlo use «Reimprimir» en Panel → Credenciales; quedará en la bitácora.`,
      { status: 409, headers: { "Content-Type": "text/plain; charset=utf-8" } },
    );
  }

  // Solo las credenciales que aún sirven: las usadas o desactivadas no se reimprimen.
  const credenciales = await db
    .select({
      usuario: schema.credenciales.usuario,
      clave: schema.credenciales.clave,
      estado: schema.credenciales.estado,
    })
    .from(schema.credenciales)
    .where(eq(schema.credenciales.loteId, id))
    .orderBy(asc(schema.credenciales.usuario));

  const pdf = await pdfPapeletas({
    id,
    estamento: fila.lote.estamento as Estamento,
    curso: fila.curso,
    prueba: fila.lote.prueba,
    url: process.env.URL_PUBLICA ?? "encuesta.escuelaecuador.cl",
    credenciales: credenciales.filter((c) => c.estado === "sin_usar"),
  });
  await registrar(
    g.usuario,
    "PDF de papeletas descargado",
    previas > 0
      ? `Lote ${id} · reimpresión ${previas}${fila.lote.prueba ? "" : " (modo Oficial)"}`
      : `Lote ${id}`,
  );

  const nombre = `papeletas-lote${id}-${fila.lote.estamento}${fila.lote.prueba ? "-PRUEBA" : ""}.pdf`;
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
