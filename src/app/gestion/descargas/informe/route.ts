import { pendientes, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado, registrar } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { armarInforme } from "@/lib/informe";
import { informePdf } from "@/lib/informe-pdf";
import { huella } from "@/lib/sabana";

/** Informe final en PDF: el registro oficial. Cada descarga anota su huella en la bitácora. */
export async function GET() {
  const g = await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada && estado.modo !== "prueba") return new Response("La encuesta no está cerrada.", { status: 409 });
  const prueba = estado.modo === "prueba";
  await sincronizarTextos(prueba);
  if ((await pendientes(prueba)) > 0) return new Response("Aún hay textos por revisar en Panel → Abiertas.", { status: 409 });

  const inf = await armarInforme({ prueba, cerrada: estado.cerrada });
  const datos = await informePdf(inf, g.usuario);
  const codigo = huella(datos);
  const nombre = `informe-final${prueba ? "-PRUEBA" : ""}.pdf`;
  await registrar(g.usuario, "Informe final descargado", `${nombre} · A ${inf.n.A}, E ${inf.n.E}, F ${inf.n.F} · SHA-256 ${codigo}`);
  return new Response(datos as BodyInit, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
