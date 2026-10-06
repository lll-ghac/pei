import Link from "next/link";
import { ENCUESTAS, preguntasDe, type Estamento } from "@/lib/encuestas";
import { ROLES, leerPersonal, listarTemas, listarTextos, marcarNombres, sincronizarTextos, type Marca, type Texto } from "@/lib/abiertas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { borrarPersonal, cambiarTema, confirmarRevisados, guardarPersonal, guardarTema } from "../../acciones";
import { NOMBRE } from "../resultados/Graficos";
import { EditorTexto } from "./EditorTexto";
import { Importar } from "./Importar";

export const metadata = { title: "Respuestas abiertas · Encuesta PEI 2027" };

const VISTAS = [
  { id: "marcados", texto: "Con posibles nombres" },
  { id: "sinmarcas", texto: "Sin marcas" },
  { id: "revisados", texto: "Revisados" },
  { id: "nopublicar", texto: "No publicar" },
] as const;

/** Etiqueta de la pregunta de un texto: abierta o «Otra» de una cerrada. */
function etiquetas() {
  const m = new Map<string, string>();
  for (const e of ["A", "E", "F"] as Estamento[]) {
    for (const p of preguntasDe(ENCUESTAS[e])) {
      m.set(p.codigo, p.tipo === "abierta" ? p.texto : `${p.texto} (texto de «Otra»)`);
    }
  }
  return m;
}

function Resaltado({ texto, marcas }: { texto: string; marcas: Marca[] }) {
  const partes: React.ReactNode[] = [];
  let i = 0;
  marcas.forEach((m, k) => {
    if (m.inicio > i) partes.push(texto.slice(i, m.inicio));
    partes.push(
      <mark key={k} className="bg-ocre-claro text-tinta border-b-2 border-lacre px-0.5" title={`Posible nombre (${m.motivo})`}>
        {texto.slice(m.inicio, m.fin)}
      </mark>,
    );
    i = m.fin;
  });
  partes.push(texto.slice(i));
  return <>{partes}</>;
}

function Cabeza({ t, etq }: { t: Texto; etq: Map<string, string> }) {
  return (
    <p className="text-[14px] text-grafito">
      <span className="rotulo text-timbre mr-1.5">{t.pregunta}</span>
      {NOMBRE[t.estamento]} · {etq.get(t.pregunta)}
    </p>
  );
}

export default async function Abiertas(props: PageProps<"/gestion/abiertas">) {
  const g = await exigirGestor();
  const estado = await leerEstado();
  const q = await props.searchParams;
  const vista = VISTAS.find((v) => v.id === q.ver)?.id ?? "marcados";

  if (!estado.cerrada) {
    return (
      <div className="space-y-3 max-w-[70ch]">
        <h1 className="titulo text-[30px]">Respuestas abiertas</h1>
        <p>
          Las respuestas escritas se revisan después de cerrar la encuesta: primero se reemplazan los nombres de
          personas por un rol general y luego se exportan para su clasificación.
        </p>
      </div>
    );
  }

  const prueba = estado.modo === "prueba";
  await sincronizarTextos(prueba);
  const [textos, personal, temas] = await Promise.all([listarTextos(prueba), leerPersonal(), listarTemas()]);
  const etq = etiquetas();
  const conMarcas = textos.map((t) => ({ t, marcas: marcarNombres(t.texto, personal) }));
  const pendientes = conMarcas.filter((x) => x.t.estado === "pendiente");
  const marcados = pendientes.filter((x) => x.marcas.length > 0);
  const sinMarcas = pendientes.filter((x) => x.marcas.length === 0);
  const revisados = conMarcas.filter((x) => x.t.estado === "revisado");
  const noPublicar = conMarcas.filter((x) => x.t.estado === "no_publicar");
  const clasificados = textos.filter((t) => t.tema1).length;
  const nombreTema = Object.fromEntries(temas.map((t) => [t.codigo, t.nombre]));
  const cuenta: Record<string, number> = {
    marcados: marcados.length,
    sinmarcas: sinMarcas.length,
    revisados: revisados.length,
    nopublicar: noPublicar.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="titulo text-[30px]">Respuestas abiertas</h1>
        {prueba && <span className="sello text-lacre text-[13px]">Datos de prueba</span>}
        <p className="text-[16px] text-grafito">
          {textos.length} textos · <strong className="text-tinta">{pendientes.length} por revisar</strong>
        </p>
      </div>

      <p className="text-[16px] text-grafito max-w-[85ch]">
        Antes de exportar, cada texto se revisa: los nombres de personas se reemplazan por un rol general (por ejemplo
        [un docente]). Al guardar, el texto original se reemplaza y no se conserva. Si un texto relata una situación
        grave (maltrato, abuso, riesgo), márquelo «No publicar»: la administración lo deriva al encargado de
        convivencia por el canal formal, sin ningún dato de quien lo escribió.
      </p>

      <nav aria-label="Grupos de textos" className="border-b border-filete">
        <ul className="flex flex-wrap -mb-px">
          {VISTAS.map((v) => (
            <li key={v.id}>
              <Link
                href={`/gestion/abiertas?ver=${v.id}`}
                aria-current={vista === v.id ? "page" : undefined}
                className={`rotulo inline-block px-3 py-2.5 text-[15px] no-underline border-b-2 ${
                  vista === v.id ? "border-tinta text-tinta" : "border-transparent text-grafito hover:text-timbre"
                }`}
              >
                {v.texto} <span className="tabular-nums">({cuenta[v.id]})</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {vista === "marcados" && (
        <ul className="space-y-3">
          {marcados.length === 0 && <li className="text-grafito">No quedan textos con posibles nombres por revisar.</li>}
          {marcados.map(({ t, marcas }) => (
            <li key={t.id} className="bg-papel border border-filete p-4 space-y-2">
              <Cabeza t={t} etq={etq} />
              <p className="text-[17px] leading-relaxed">
                <Resaltado texto={t.texto} marcas={marcas} />
              </p>
              <EditorTexto id={t.id} texto={t.texto} roles={ROLES} />
            </li>
          ))}
        </ul>
      )}

      {vista === "sinmarcas" && (
        <form action={confirmarRevisados} className="space-y-3">
          {sinMarcas.length === 0 ? (
            <p className="text-grafito">No quedan textos sin marcas por revisar.</p>
          ) : (
            <>
              <p className="text-[16px] text-grafito">
                El sistema no encontró posibles nombres en estos textos. Léalos igual: si alguno tiene un nombre o un
                dato personal, ábralo en «Revisados» después de confirmar y corríjalo.
              </p>
              <ul className="bg-papel border border-filete divide-y divide-filete">
                {sinMarcas.slice(0, 100).map(({ t }) => (
                  <li key={t.id} className="p-3">
                    <input type="hidden" name="id" value={t.id} />
                    <Cabeza t={t} etq={etq} />
                    <p className="text-[17px]">{t.texto}</p>
                  </li>
                ))}
              </ul>
              <button type="submit" className="boton boton-primario">
                Leí estos {Math.min(100, sinMarcas.length)} textos: no tienen nombres
              </button>
              {sinMarcas.length > 100 && (
                <p className="text-[15px] text-grafito">Se muestran de a 100. Quedan {sinMarcas.length - 100} más.</p>
              )}
            </>
          )}
        </form>
      )}

      {(vista === "revisados" || vista === "nopublicar") && (
        <ul className="space-y-3">
          {(vista === "revisados" ? revisados : noPublicar).length === 0 && <li className="text-grafito">No hay textos en este grupo.</li>}
          {(vista === "revisados" ? revisados : noPublicar).map(({ t }) => (
            <li key={t.id} className="bg-papel border border-filete p-4 space-y-2">
              <Cabeza t={t} etq={etq} />
              <details>
                <summary className="cursor-pointer text-[17px] leading-relaxed list-none">
                  {t.texto} <span className="text-[14px] text-timbre underline ml-1">Corregir</span>
                </summary>
                <div className="mt-2">
                  <EditorTexto id={t.id} texto={t.texto} roles={ROLES} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <section className="bg-papel border border-filete p-5 space-y-4" aria-labelledby="titulo-exportar">
        <h2 id="titulo-exportar" className="rotulo text-[17px]">
          Exportar e importar
        </h2>
        {pendientes.length > 0 ? (
          <p className="text-[16px] text-grafito">
            La exportación se habilita cuando no quedan textos por revisar (faltan {pendientes.length}).
          </p>
        ) : (
          <>
            <p className="text-[16px] text-grafito max-w-[85ch]">
              El archivo trae solo los textos revisados, sin «No publicar», con un identificador propio (no permite
              cruzarlo con las respuestas), el estamento y la pregunta; sin credencial, curso, fecha ni hora. Cada
              descarga queda en la bitácora con su huella SHA-256.
            </p>
            <div className="flex flex-wrap gap-3">
              <a href="/gestion/descargas/abiertas" className="boton boton-primario no-underline">
                Descargar abiertas.csv ({revisados.length} textos)
              </a>
              <a href="/gestion/descargas/temas" className="boton boton-secundario no-underline">
                Descargar temas.csv
              </a>
            </div>
          </>
        )}
        <div className="border-t border-filete pt-4 space-y-2">
          <h3 className="font-bold">Cargar la clasificación</h3>
          <p className="text-[16px] text-grafito max-w-[85ch]">
            Columnas: <code>id_respuesta</code>, <code>tema_1</code>, <code>tema_2</code>, <code>tema_3</code>,{" "}
            <code>tema_nuevo_texto</code> (etiqueta breve cuando se usa T98) y <code>cita_destacada</code> (sí/no). Se
            aceptan solo temas activos. Cada carga reemplaza la anterior.{" "}
            {clasificados > 0 && <strong className="text-tinta">Hoy hay {clasificados} textos clasificados.</strong>}
          </p>
          <Importar temas={nombreTema} />
        </div>
      </section>

      <section className="bg-papel border border-filete p-5 space-y-3" aria-labelledby="titulo-temas">
        <h2 id="titulo-temas" className="rotulo text-[17px]">
          Temas ({temas.filter((t) => t.activo).length} activos)
        </h2>
        <ul className="divide-y divide-filete border-y border-filete">
          {temas.map((t) => (
            <li key={t.codigo} className={`py-2 grid gap-2 sm:grid-cols-[4rem_1fr_auto] items-start ${t.activo ? "" : "opacity-60"}`}>
              <span className="rotulo text-timbre text-[16px] pt-1">{t.codigo}</span>
              {g.rol === "admin" ? (
                <form action={guardarTema} className="grid gap-1.5 sm:grid-cols-[1fr_1.4fr_auto] items-center">
                  <input type="hidden" name="codigo" value={t.codigo} />
                  <input name="nombre" defaultValue={t.nombre} aria-label={`Nombre de ${t.codigo}`} className="campo !py-1.5 text-[16px]" />
                  <input name="descripcion" defaultValue={t.descripcion} aria-label={`Descripción de ${t.codigo}`} className="campo !py-1.5 text-[16px]" />
                  <button type="submit" className="text-[15px] font-bold text-timbre underline px-1">Guardar</button>
                </form>
              ) : (
                <p>
                  <strong>{t.nombre}</strong> <span className="text-grafito">· {t.descripcion}</span>
                </p>
              )}
              {g.rol === "admin" && !["T98", "T99"].includes(t.codigo) && (
                <form action={cambiarTema}>
                  <input type="hidden" name="codigo" value={t.codigo} />
                  <input type="hidden" name="accion" value={t.activo ? "desactivar" : "activar"} />
                  <button type="submit" className="text-[15px] text-grafito underline px-1 min-h-10">
                    {t.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {g.rol === "admin" && (
          <form action={guardarTema} className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] items-end">
            <label className="grid gap-1 font-bold text-[16px]">
              Tema nuevo
              <input name="nombre" required className="campo !py-1.5 text-[16px]" />
            </label>
            <label className="grid gap-1 font-bold text-[16px]">
              Descripción y ejemplos
              <input name="descripcion" className="campo !py-1.5 text-[16px]" />
            </label>
            <button type="submit" className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]">
              Agregar
            </button>
          </form>
        )}
        <p className="text-[15px] text-grafito">
          Un tema con textos asignados no se borra: se desactiva, para no perder la trazabilidad. Cada cambio queda en
          la bitácora.
        </p>
      </section>

      {g.rol === "admin" && (
        <section className="bg-papel border border-filete p-5 space-y-3" aria-labelledby="titulo-personal">
          <h2 id="titulo-personal" className="rotulo text-[17px]">
            Lista del personal ({personal.length})
          </h2>
          <p className="text-[16px] text-grafito max-w-[80ch]">
            Ayuda a marcar nombres que el sistema no reconocería solo. Un nombre por línea (por ejemplo «María
            González»). La lista no sale del servidor, no aparece en ningún archivo y se borra al cerrar el proceso.
          </p>
          <form action={guardarPersonal} className="space-y-2">
            <textarea name="nombres" rows={6} defaultValue={personal.join("\n")} className="campo text-[16px]" aria-label="Nombres del personal" />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="boton boton-primario !min-h-11 !py-1.5 text-[16px]">
                Guardar lista
              </button>
            </div>
          </form>
          {personal.length > 0 && (
            <form action={borrarPersonal}>
              <button type="submit" className="text-[15px] text-lacre underline">
                Borrar la lista del personal
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
