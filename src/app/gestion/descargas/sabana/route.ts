import { pendientes, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado, registrar } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { armarSabana, huella, sabanaCsv, sabanaExcel, type Formato, type Valores, type Version } from "@/lib/sabana";

/** Sábana de datos: Excel o CSV (.zip), completa o para terceros, con códigos o etiquetas. */
export async function GET(req: Request) {
  const g = await exigirGestor();
  const estado = await leerEstado();
  if (!estado.cerrada && estado.modo !== "prueba") return new Response("La encuesta no está cerrada.", { status: 409 });
  const prueba = estado.modo === "prueba";
  await sincronizarTextos(prueba);
  if ((await pendientes(prueba)) > 0) return new Response("Aún hay textos por revisar en Panel → Abiertas.", { status: 409 });

  const q = new URL(req.url).searchParams;
  const version: Version = q.get("version") === "terceros" ? "terceros" : "completa";
  const valores: Valores = q.get("valores") === "etiquetas" ? "etiquetas" : "codigos";
  const formato: Formato = q.get("formato") === "csv" ? "csv" : "xlsx";

  const { hojas, conteo } = await armarSabana(version, valores);
  const datos = formato === "xlsx" ? await sabanaExcel(hojas) : sabanaCsv(hojas);
  const codigo = huella(datos);
  const nombre = `sabana-${version}-${valores}${prueba ? "-PRUEBA" : ""}.${formato === "xlsx" ? "xlsx" : "zip"}`;
  await registrar(
    g.usuario,
    "Sábana descargada",
    `${nombre} · A ${conteo.Apoderados}, E ${conteo.Estudiantes}, F ${conteo.Funcionarios}, abiertas ${conteo.Abiertas} · SHA-256 ${codigo}`,
  );
  return new Response(datos as BodyInit, {
    headers: {
      "Content-Type":
        formato === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : "application/zip",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}
