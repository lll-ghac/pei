import { createHash } from "node:crypto";
import { archivoAbiertas, pendientes, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado, registrar } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";

/** abiertas.csv: solo textos revisados (sin «no publicar»), sin credencial, curso, fecha ni hora. */
export async function GET() {
  const g = await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada) return new Response("La encuesta no está cerrada.", { status: 409 });
  const prueba = estado.modo === "prueba";
  await sincronizarTextos(prueba);
  if ((await pendientes(prueba)) > 0) return new Response("Aún hay textos por revisar.", { status: 409 });
  const { n, csv } = await archivoAbiertas(prueba);
  const huella = createHash("sha256").update(csv, "utf8").digest("hex");
  await registrar(g.usuario, "Abiertas exportadas", `${n} textos · SHA-256 ${huella}`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="abiertas${prueba ? "-PRUEBA" : ""}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
