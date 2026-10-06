import { createHash } from "node:crypto";
import { archivoTemas, listarTemas } from "@/lib/abiertas";
import { registrar } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";

/** temas.csv: la lista vigente de temas activos. */
export async function GET() {
  const g = await exigirGestor();
  const csv = await archivoTemas();
  const activos = (await listarTemas()).filter((t) => t.activo).length;
  const huella = createHash("sha256").update(csv, "utf8").digest("hex");
  await registrar(g.usuario, "Temas exportados", `temas.csv · ${activos} temas · SHA-256 ${huella}`);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="temas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
