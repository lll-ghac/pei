import { headers } from "next/headers";
import { enviarEncuesta } from "../../acciones";

/**
 * Depositar la encuesta en una dirección fija. Una acción de servidor cambia de identificador en cada
 * publicación: si alguien tenía la encuesta abierta durante una publicación, «Depositar» fallaba en bucle
 * (piloto de funcionarios, 9/10). Esta dirección no cambia entre versiones.
 */
export async function POST(req: Request) {
  // Misma protección de origen que las acciones de servidor: solo desde este sitio.
  const h = await headers();
  const origen = h.get("origin");
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (origen && host && new URL(origen).host !== host) {
    return Response.json({ ok: false, error: "Solicitud no válida." }, { status: 403 });
  }
  let cuerpo: { respuestas?: unknown; envioId?: unknown };
  try {
    cuerpo = await req.json();
  } catch {
    return Response.json({ ok: false, error: "Solicitud no válida." }, { status: 400 });
  }
  const r = await enviarEncuesta(cuerpo.respuestas, String(cuerpo.envioId ?? ""));
  return Response.json(r, { headers: { "Cache-Control": "no-store" } });
}
