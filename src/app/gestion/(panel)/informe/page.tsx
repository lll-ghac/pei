import Link from "next/link";
import { VistaSeccion } from "@/components/InformeVista";
import { pendientes, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { armarInforme } from "@/lib/informe";
import { fechaCierre } from "@/lib/resultados";
import { cambiarPublicacion } from "../../acciones";
import { AvisoEnsayo, Ayuda } from "../../Ayuda";

export const metadata = { title: "Informe final · Encuesta PEI 2027" };

export default async function Informe() {
  const g = await exigirGestor();
  const estado = await leerEstado();
  const prueba = estado.modo === "prueba";

  if (!estado.cerrada && !prueba) {
    return (
      <div className="space-y-4 max-w-[70ch]">
        <h1 className="titulo text-[30px]">Informe final</h1>
        <p>
          El informe se arma cuando la administración cierra la encuesta.
          Mientras está abierta, el panel muestra solo la participación.
        </p>
      </div>
    );
  }

  await sincronizarTextos(prueba);
  const [faltan, inf, cierre] = await Promise.all([
    pendientes(prueba),
    armarInforme({ prueba, cerrada: estado.cerrada }),
    estado.cerrada ? fechaCierre() : null,
  ]);
  const fmtFecha = new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    dateStyle: "long",
    timeStyle: "short",
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="titulo text-[30px]">Informe final</h1>
        {prueba && (
          <span className="sello text-lacre text-[13px]">Datos de prueba</span>
        )}
        <Ayuda id="ayuda-informe" titulo="Cómo se usa el informe">
          <p>
            Es la base para redactar el PEI 2027. Tiene 13 secciones, cada una
            ligada a un componente del PEI, y 5 anexos. Cada cifra indica su
            pregunta de origen, el estamento y el número de respuestas (n). Los
            grupos con menos de 5 respuestas no se muestran.
          </p>
          <p>
            <strong>Esta página</strong> sirve para leer y copiar: seleccione un
            texto o una tabla y péguelo en el documento donde se redacta el PEI.
          </p>
          <p>
            <strong>El PDF</strong> es el registro oficial. Cada descarga queda
            en la bitácora con su huella SHA-256, para comprobar después que el
            archivo no cambió (Panel → Descargas → Verificar un archivo).
          </p>
          <p>
            El informe entrega datos, no conclusiones: la plataforma propone
            sellos candidatos con una regla fija, pero la decisión es de la
            comisión. Los datos completos están en la sábana (Panel →
            Descargas).
          </p>
        </Ayuda>
      </div>
      <p className="text-[14px] text-gris-texto -mt-3">
        {cierre ? `Encuesta cerrada el ${fmtFecha.format(cierre)}. ` : ""}
        Cálculo del {fmtFecha.format(inf.generado)}
      </p>
      {!estado.cerrada && <AvisoEnsayo />}

      <section
        className="bg-papel border border-filete p-5 space-y-3"
        aria-label="Descargar y publicar"
      >
        {faltan > 0 ? (
          <p className="text-[16px]">
            El PDF se habilita cuando no quedan textos por revisar en{" "}
            <Link
              href="/gestion/abiertas"
              className="text-timbre underline font-bold"
            >
              Abiertas
            </Link>{" "}
            (faltan {faltan}). Mientras tanto, la sección 10 muestra solo lo ya
            revisado.
          </p>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <a
              href="/gestion/descargas/informe"
              className="boton boton-primario no-underline"
            >
              Descargar el informe en PDF
            </a>
            <span className="text-[15px] text-grafito">
              Registro oficial, con huella SHA-256 en la bitácora.
            </span>
          </div>
        )}
        <div className="border-t border-filete pt-3 flex flex-wrap items-center gap-3">
          <p className="text-[16px]">
            Página pública de resultados:{" "}
            <strong>{estado.publicados ? "publicada" : "no publicada"}</strong>
            {estado.publicados && (
              <>
                {" "}
                ·{" "}
                <a
                  href="/resultados"
                  target="_blank"
                  className="text-timbre underline font-bold"
                >
                  Ver /resultados
                </a>
              </>
            )}
          </p>
          {g.rol === "admin" && (estado.cerrada || prueba) && faltan === 0 && (
            <form action={cambiarPublicacion}>
              <input
                type="hidden"
                name="accion"
                value={estado.publicados ? "retirar" : "publicar"}
              />
              <button
                type="submit"
                className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]"
              >
                {estado.publicados
                  ? "Retirar la página pública"
                  : "Publicar resultados para la comunidad"}
              </button>
            </form>
          )}
          <Ayuda id="ayuda-publica" titulo="La página pública de resultados">
            <p>
              Es una versión resumida del informe para toda la comunidad, en{" "}
              <code>encuesta.escuelaecuador.cl/resultados</code>, sin cuenta.
              Muestra participación, propósito, prioridades y sellos candidatos,
              valores, perfiles, temas de las respuestas abiertas, citas
              destacadas y redes.
            </p>
            <p>
              No muestra el diagnóstico interno (escalas de funcionarios y
              nudos), los cursos ni la bitácora. Las mismas reglas: nada con
              menos de 5 respuestas y solo textos revisados.
            </p>
            <p>
              Solo la administración la publica o la retira, y queda en la
              bitácora. En modo Prueba se puede publicar para ensayar; la página
              muestra «Datos de prueba».
            </p>
          </Ayuda>
        </div>
      </section>

      <nav
        aria-label="Contenido del informe"
        className="bg-papel border border-filete p-4"
      >
        <p className="rotulo text-[15px] mb-2">Contenido</p>
        <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 lg:grid-cols-3 text-[16px]">
          {[...inf.secciones, ...inf.anexos].map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-timbre underline">
                {/^[A-E]$/.test(s.numero) ? `Anexo ${s.numero}` : s.numero}.{" "}
                {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      {inf.secciones.map((s) => (
        <VistaSeccion key={s.id} s={s} />
      ))}

      <h2 className="titulo text-[26px] pt-2">Anexos</h2>
      {inf.anexos.map((s) => (
        <details
          key={s.id}
          id={s.id}
          className="bg-papel border border-filete group"
        >
          <summary className="cursor-pointer list-none px-5 py-4 titulo text-[22px] flex items-center gap-2">
            <span
              aria-hidden
              className="text-timbre text-[16px] group-open:rotate-90 transition-transform inline-block"
            >
              ▸
            </span>
            <span className="text-timbre">Anexo {s.numero}</span> {s.titulo}
          </summary>
          <div className="[&>section]:border-0 [&>section]:pt-0">
            <VistaSeccion
              s={{ ...s, id: `${s.id}-c`, titulo: "", numero: "" }}
              conAporte={false}
            />
          </div>
        </details>
      ))}
    </div>
  );
}
