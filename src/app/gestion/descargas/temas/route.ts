import { archivoTemas } from "@/lib/abiertas";
import { exigirGestor } from "@/lib/gestion";

/** temas.csv: la lista vigente de temas activos. */
export async function GET() {
  await exigirGestor();
  return new Response(await archivoTemas(), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="temas.csv"',
      "Cache-Control": "no-store",
    },
  });
}
