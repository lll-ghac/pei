import Link from "next/link";
import { ENCUESTAS, preguntasDe, type Estamento } from "@/lib/encuestas";
import {
  CARGOS_INICIALES,
  ROLES,
  leerCargos,
  leerPersonal,
  listarTemas,
  listarTextos,
  marcarNombres,
  sincronizarTextos,
  type Marca,
  type Texto,
} from "@/lib/abiertas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import {
  borrarPersonal,
  cambiarTema,
  confirmarRevisados,
  guardarCargos,
  guardarPersonal,
  guardarTema,
} from "../../acciones";
import { AvisoEnsayo, Ayuda } from "../../Ayuda";
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
      m.set(
        p.codigo,
        p.tipo === "abierta" ? p.texto : `${p.texto} (texto de «Otra»)`,
      );
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
      <mark
        key={k}
        className={
          m.tipo === "identificacion"
            ? "bg-lacre-claro text-tinta border-b-2 border-dashed border-lacre px-0.5"
            : "bg-ocre-claro text-tinta border-b-2 border-lacre px-0.5"
        }
        title={`${m.tipo === "identificacion" ? "Posible identificación" : "Posible nombre"} (${MOTIVO[m.motivo] ?? m.motivo})`}
      >
        {texto.slice(m.inicio, m.fin)}
      </mark>,
    );
    i = m.fin;
  });
  partes.push(texto.slice(i));
  return <>{partes}</>;
}

const MOTIVO: Record<string, string> = {
  tratamiento: "tratamiento + nombre",
  personal: "está en la lista del personal",
  mayúscula: "mayúscula a mitad de oración",
  "cargo + asignatura": "posible identificación: cargo + asignatura",
  "cargo + curso": "posible identificación: cargo + curso",
  "cargo + lugar": "posible identificación: cargo + lugar",
  "cargo único": "posible identificación: cargo que tiene una sola persona",
};

/** Por qué el sistema marcó cada palabra, a la vista (no solo al pasar el mouse). */
function Motivos({ texto, marcas }: { texto: string; marcas: Marca[] }) {
  return (
    <p className="text-[14px] text-grafito">
      Marcado:{" "}
      {marcas.map((m, k) => (
        <span key={k}>
          {k > 0 && " · "}«{texto.slice(m.inicio, m.fin)}» (
          {MOTIVO[m.motivo] ?? m.motivo})
        </span>
      ))}
    </p>
  );
}

const PASOS = [
  {
    titulo: "Revisar nombres",
    texto:
      "En esta página. Cada texto se lee y, si nombra a alguien, el nombre se cambia por un rol general.",
  },
  {
    titulo: "Descargar los archivos",
    texto:
      "abiertas.csv (los textos revisados) y temas.csv (la lista de temas). Se habilita cuando no quedan textos por revisar.",
  },
  {
    titulo: "Clasificar fuera de la plataforma",
    texto:
      "La comisión trabaja el archivo a su manera y le agrega las columnas de temas.",
  },
  {
    titulo: "Cargar la clasificación",
    texto:
      "Se sube el archivo trabajado. La plataforma lo revisa, muestra un resumen y pide confirmar.",
  },
  {
    titulo: "Ver los resultados",
    texto:
      "Panel → Resultados → Abiertas: temas por estamento y citas destacadas.",
  },
];

/** Guía del proceso, con el paso en que se está. */
function Guia({ paso, abierta }: { paso: number; abierta: boolean }) {
  return (
    <details
      open={abierta}
      className="bg-papel border border-filete p-4 max-w-[85ch] group"
    >
      <summary className="cursor-pointer rotulo text-[17px] list-none flex items-center gap-2">
        <span
          aria-hidden
          className="text-timbre group-open:rotate-90 transition-transform inline-block"
        >
          ▸
        </span>
        Cómo se trabaja esta sección (5 pasos)
      </summary>
      <ol className="mt-3 space-y-2.5">
        {PASOS.map((p, i) => {
          const n = i + 1;
          const actual = n === paso;
          const hecho = n < paso;
          return (
            <li
              key={n}
              className={`grid grid-cols-[2rem_1fr] gap-2 ${hecho ? "text-grafito" : ""}`}
            >
              <span
                aria-hidden
                className={`size-7 grid place-items-center rounded-full text-[15px] font-bold border-2 ${
                  actual
                    ? "bg-tinta border-tinta text-papel"
                    : hecho
                      ? "border-verde-tinta text-verde-oscuro"
                      : "border-grafito text-grafito"
                }`}
              >
                {hecho ? "✓" : n}
              </span>
              <span className="text-[16px]">
                <strong className="text-tinta">
                  {n}. {p.titulo}
                </strong>
                {actual && (
                  <span className="sello text-timbre text-[12px] ml-2">
                    Usted está aquí
                  </span>
                )}
                {hecho && <span className="sr-only"> (listo)</span>}
                <br />
                {p.texto}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="text-[15px] text-grafito mt-3">
        Los botones{" "}
        <span className="inline-grid place-items-center size-6 rounded-full border-2 border-timbre text-timbre text-[13px] font-bold">
          ?
        </span>{" "}
        explican cada parte.
      </p>
    </details>
  );
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

  if (!estado.cerrada && estado.modo !== "prueba") {
    return (
      <div className="space-y-3 max-w-[70ch]">
        <h1 className="titulo text-[30px]">Respuestas abiertas</h1>
        <p>
          Las respuestas escritas se revisan después de cerrar la encuesta:
          primero se reemplazan los nombres de personas por un rol general y
          luego se exportan para su clasificación.
        </p>
      </div>
    );
  }

  const prueba = estado.modo === "prueba";
  await sincronizarTextos(prueba);
  const [textos, personal, temas, cargos] = await Promise.all([
    listarTextos(prueba),
    leerPersonal(),
    listarTemas(),
    leerCargos(),
  ]);
  const etq = etiquetas();
  const conMarcas = textos.map((t) => ({
    t,
    marcas: marcarNombres(t.texto, personal, cargos),
  }));
  const pendientes = conMarcas.filter((x) => x.t.estado === "pendiente");
  const marcados = pendientes.filter((x) => x.marcas.length > 0);
  const sinMarcas = pendientes.filter((x) => x.marcas.length === 0);
  const revisados = conMarcas.filter((x) => x.t.estado === "revisado");
  const noPublicar = conMarcas.filter((x) => x.t.estado === "no_publicar");
  const clasificados = textos.filter((t) => t.tema1).length;
  const nombreTema = Object.fromEntries(temas.map((t) => [t.codigo, t.nombre]));
  const paso =
    pendientes.length > 0 || textos.length === 0
      ? 1
      : clasificados === 0
        ? 2
        : 5;
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
        {prueba && (
          <span className="sello text-lacre text-[13px]">Datos de prueba</span>
        )}
        <p className="text-[16px] text-grafito">
          {textos.length} textos ·{" "}
          <strong className="text-tinta">
            {pendientes.length} por revisar
          </strong>
        </p>
      </div>

      {!estado.cerrada && <AvisoEnsayo />}
      {textos.length === 0 && (
        <p className="text-[16px] max-w-[85ch]">
          Aún no hay respuestas escritas.
          {prueba &&
            g.rol === "admin" &&
            " Para ensayar, agregue respuestas de prueba en Panel → Sistema."}
        </p>
      )}

      <Guia paso={paso} abierta={clasificados === 0} />

      <div className="flex items-start gap-3 max-w-[85ch]">
        <p className="text-[16px] text-grafito">
          <strong className="text-tinta">Paso 1.</strong> Los nombres de
          personas se reemplazan por un rol general (por ejemplo [docente]). Al
          guardar, el texto original se reemplaza y no se conserva. Si un texto
          relata una situación grave, márquelo «No publicar».
        </p>
        <Ayuda id="ayuda-revision" titulo="Cómo se revisan los nombres">
          <p>
            Al abrir esta página, la plataforma lee cada texto y marca lo que
            podría identificar a alguien:
          </p>
          <p>
            <mark className="bg-ocre-claro text-tinta border-b-2 border-lacre px-0.5">
              En amarillo
            </mark>
            , posibles <strong>nombres</strong>:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              <strong>Tratamiento + nombre:</strong> tía, tío, profe, profesora,
              señora, don, miss, directora, inspector y otras, seguidas de una
              palabra con mayúscula («la tía Carmen»).
            </li>
            <li>
              <strong>Lista del personal:</strong> cualquier nombre o apellido
              de la lista (al final de esta página), aunque venga en minúscula o
              sin tilde. Los apellidos que también son palabras comunes
              («Salas», «Campos», «Paredes») solo se marcan con mayúscula a
              mitad de oración.
            </li>
            <li>
              <strong>Mayúscula a mitad de oración:</strong> una palabra con
              mayúscula que no inicia oración, línea ni lista («un compañero,
              Matías, …»).
            </li>
          </ul>
          <p>
            <mark className="bg-lacre-claro text-tinta border-b-2 border-dashed border-lacre px-0.5">
              En rosado
            </mark>
            , posibles <strong>identificaciones sin nombre</strong>, que en una
            escuela chica también dicen quién es:
          </p>
          <ul className="list-disc pl-5 space-y-1">
            <li>
              Un cargo con su asignatura, curso o lugar: «la profe de lenguaje»,
              «la profesora de 5° A», «el inspector del patio». Un curso solo
              («la silla rota de 5° A») no se marca.
            </li>
            <li>
              Un cargo que tiene una sola persona: «la directora», «la jefa de
              UTP». Muchas veces la mención es legítima («la directora debería
              escuchar más»): decida si se deja o se cambia por un rol. La lista
              de cargos está al final de esta página.
            </li>
          </ul>
          <p>
            Es una ayuda, no un filtro perfecto: puede marcar de más (una calle,
            un ramo) y se le pueden pasar nombres en minúscula, apodos o datos
            como un teléfono. Por eso <strong>todos los textos se leen</strong>,
            también los que no tienen marcas.
          </p>
          <p>
            <strong>Para corregir:</strong> dentro del cuadro de texto,
            seleccione el nombre (con el mouse o el dedo) y toque el rol que
            corresponde: reemplaza lo seleccionado. También puede escribir
            directamente. Los roles no dicen género ([docente], [asistente]…):
            en una escuela chica el género puede identificar. Al tocar «Guardar
            como revisado», si cambió el texto, la plataforma muestra cómo
            quedará y pide confirmar, porque el original no se guarda.
          </p>
          <p>
            <strong>No publicar:</strong> para textos que relatan una situación
            grave (maltrato, abuso, riesgo) o que no se pueden dejar anónimos.
            No salen en ningún archivo ni resultado; la administración los
            deriva al encargado de convivencia por el canal formal, sin ningún
            dato de quien escribió.
          </p>
        </Ayuda>
      </div>

      <div className="flex items-end gap-2">
        <nav
          aria-label="Grupos de textos"
          className="border-b border-filete grow"
        >
          <ul className="flex flex-wrap -mb-px">
            {VISTAS.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/gestion/abiertas?ver=${v.id}`}
                  aria-current={vista === v.id ? "page" : undefined}
                  className={`rotulo inline-block px-3 py-2.5 text-[15px] no-underline border-b-2 ${
                    vista === v.id
                      ? "border-tinta text-tinta"
                      : "border-transparent text-grafito hover:text-timbre"
                  }`}
                >
                  {v.texto}{" "}
                  <span className="tabular-nums">({cuenta[v.id]})</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <Ayuda id="ayuda-pestanas" titulo="Qué hay en cada pestaña">
          <ul className="list-disc pl-5 space-y-1.5">
            <li>
              <strong>Con posibles nombres:</strong> textos donde la plataforma
              marcó algo. Se ven de a uno, para corregirlos o guardarlos tal
              cual.
            </li>
            <li>
              <strong>Sin marcas:</strong> textos donde no encontró nada. Se
              leen en una lista y se confirman de a 100 con un botón. Si alguno
              tiene un nombre, se corrige después en «Revisados».
            </li>
            <li>
              <strong>Revisados:</strong> listos para descargar. Toque
              «Corregir» para cambiar uno.
            </li>
            <li>
              <strong>No publicar:</strong> quedan fuera de todo. Con «Corregir»
              se pueden devolver a «Revisados».
            </li>
          </ul>
          <p>
            Cuando las dos primeras pestañas quedan en cero, se habilita la
            descarga.
          </p>
        </Ayuda>
      </div>

      {vista === "marcados" && (
        <ul className="space-y-3">
          {marcados.length === 0 && (
            <li className="text-grafito">
              No quedan textos con posibles nombres por revisar.
            </li>
          )}
          {marcados.map(({ t, marcas }) => (
            <li
              key={t.id}
              className="bg-papel border border-filete p-4 space-y-2"
            >
              <Cabeza t={t} etq={etq} />
              <p className="text-[17px] leading-relaxed">
                <Resaltado texto={t.texto} marcas={marcas} />
              </p>
              <Motivos texto={t.texto} marcas={marcas} />
              <EditorTexto id={t.id} texto={t.texto} roles={ROLES} />
            </li>
          ))}
        </ul>
      )}

      {vista === "sinmarcas" && (
        <form action={confirmarRevisados} className="space-y-3">
          {sinMarcas.length === 0 ? (
            <p className="text-grafito">
              No quedan textos sin marcas por revisar.
            </p>
          ) : (
            <>
              <p className="text-[16px] text-grafito">
                El sistema no encontró posibles nombres en estos textos. Léalos
                igual: si alguno tiene un nombre o un dato personal, ábralo en
                «Revisados» después de confirmar y corríjalo.
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
                Leí estos {Math.min(100, sinMarcas.length)} textos: no tienen
                nombres
              </button>
              {sinMarcas.length > 100 && (
                <p className="text-[15px] text-grafito">
                  Se muestran de a 100. Quedan {sinMarcas.length - 100} más.
                </p>
              )}
            </>
          )}
        </form>
      )}

      {(vista === "revisados" || vista === "nopublicar") && (
        <ul className="space-y-3">
          {(vista === "revisados" ? revisados : noPublicar).length === 0 && (
            <li className="text-grafito">No hay textos en este grupo.</li>
          )}
          {(vista === "revisados" ? revisados : noPublicar).map(({ t }) => (
            <li
              key={t.id}
              className="bg-papel border border-filete p-4 space-y-2"
            >
              <Cabeza t={t} etq={etq} />
              <details>
                <summary className="cursor-pointer text-[17px] leading-relaxed list-none">
                  {t.texto}{" "}
                  <span className="text-[14px] text-timbre underline ml-1">
                    Corregir
                  </span>
                </summary>
                <div className="mt-2">
                  <EditorTexto id={t.id} texto={t.texto} roles={ROLES} />
                </div>
              </details>
            </li>
          ))}
        </ul>
      )}

      <section
        className="bg-papel border border-filete p-5 space-y-4"
        aria-labelledby="titulo-exportar"
      >
        <div className="flex items-center gap-3">
          <h2 id="titulo-exportar" className="rotulo text-[17px]">
            Pasos 2 a 4 · Descargar y cargar
          </h2>
          <Ayuda id="ayuda-archivos" titulo="Los archivos, paso a paso">
            <p>
              <strong>abiertas.csv</strong> tiene una fila por texto y 4
              columnas: <code>id_respuesta</code>, <code>estamento</code> (A, E
              o F), <code>pregunta</code> y <code>texto</code>. Es un solo
              archivo para toda la comisión y se abre en Excel o Google Sheets.
            </p>
            <p>
              <strong>temas.csv</strong> trae los temas activos con su código
              (T01, T02…) y su descripción.
            </p>
            <p>
              <strong>Para devolverlo</strong>, al mismo archivo se le agregan
              estas columnas, con el nombre exacto en la primera fila:
            </p>
            <ul className="list-disc pl-5 space-y-1">
              <li>
                <code>tema_1</code>: código del tema principal (sin él, el texto
                queda sin clasificar)
              </li>
              <li>
                <code>tema_2</code>, <code>tema_3</code>: otros temas, si los
                hay (pueden ir vacíos)
              </li>
              <li>
                <code>tema_nuevo_texto</code>: etiqueta breve, solo cuando se
                usa T98
              </li>
              <li>
                <code>cita_destacada</code>: «sí» o «no»
              </li>
            </ul>
            <p>
              Las demás columnas pueden quedar o quitarse: la plataforma
              reconoce cada fila por <code>id_respuesta</code>. Guarde como CSV
              (en Excel: «CSV UTF-8»).
            </p>
            <p>
              <strong>Al cargar:</strong> primero se revisa el archivo sin
              cambiar nada. Si hay errores (un código que no existe, un T98 sin
              etiqueta, una fila repetida) se listan y no se carga nada. Si está
              bien, se muestra el resumen por tema y solo al confirmar se
              guarda. Cada carga reemplaza la anterior, así que se puede
              corregir y volver a subir.
            </p>
          </Ayuda>
        </div>
        {pendientes.length > 0 ? (
          <p className="text-[16px] text-grafito">
            La exportación se habilita cuando no quedan textos por revisar
            (faltan {pendientes.length}).
          </p>
        ) : (
          <>
            <p className="text-[16px] text-grafito max-w-[85ch]">
              El archivo trae solo los textos revisados, sin «No publicar», con
              un identificador propio (no permite cruzarlo con las respuestas),
              el estamento y la pregunta; sin credencial, curso, fecha ni hora.
              Cada descarga queda en la bitácora con su huella SHA-256.
            </p>
            <div className="flex flex-wrap gap-3">
              <a
                href="/gestion/descargas/abiertas"
                className="boton boton-primario no-underline"
              >
                Descargar abiertas.csv ({revisados.length} textos)
              </a>
              <a
                href="/gestion/descargas/temas"
                className="boton boton-secundario no-underline"
              >
                Descargar temas.csv
              </a>
            </div>
          </>
        )}
        <div className="border-t border-filete pt-4 space-y-2">
          <h3 className="font-bold">Paso 4 · Cargar la clasificación</h3>
          <p className="text-[16px] text-grafito max-w-[85ch]">
            Columnas: <code>id_respuesta</code>, <code>tema_1</code>,{" "}
            <code>tema_2</code>, <code>tema_3</code>,{" "}
            <code>tema_nuevo_texto</code> (etiqueta breve cuando se usa T98) y{" "}
            <code>cita_destacada</code> (sí/no). Se aceptan solo temas activos.
            Cada carga reemplaza la anterior.{" "}
            {clasificados > 0 && (
              <strong className="text-tinta">
                Hoy hay {clasificados} textos clasificados.
              </strong>
            )}
          </p>
          <Importar temas={nombreTema} />
        </div>
      </section>

      <section
        className="bg-papel border border-filete p-5 space-y-3"
        aria-labelledby="titulo-temas"
      >
        <div className="flex items-center gap-3">
          <h2 id="titulo-temas" className="rotulo text-[17px]">
            Temas ({temas.filter((t) => t.activo).length} activos)
          </h2>
          <Ayuda id="ayuda-temas" titulo="La lista de temas">
            <p>
              Son los códigos que se pueden usar en <code>tema_1</code>,{" "}
              <code>tema_2</code> y <code>tema_3</code>. Se descarga como
              temas.csv.
            </p>
            <p>
              <strong>T98</strong> es para un tema que no está en la lista: se
              escribe una etiqueta breve en <code>tema_nuevo_texto</code>.{" "}
              <strong>T99</strong> es para textos sin un tema clasificable.
              Estos dos no se pueden desactivar.
            </p>
            <p>
              La administración puede cambiar nombres y descripciones, agregar
              temas (reciben el código siguiente) o desactivar los que no se
              usen. Un tema desactivado no se acepta en una carga nueva.
            </p>
          </Ayuda>
        </div>
        <ul className="divide-y divide-filete border-y border-filete">
          {temas.map((t) => (
            <li
              key={t.codigo}
              className={`py-2 grid gap-2 sm:grid-cols-[4rem_1fr_auto] items-start ${t.activo ? "" : "opacity-60"}`}
            >
              <span className="rotulo text-timbre text-[16px] pt-1">
                {t.codigo}
              </span>
              {g.rol === "admin" ? (
                <form
                  action={guardarTema}
                  className="grid gap-1.5 sm:grid-cols-[1fr_1.4fr_auto] items-center"
                >
                  <input type="hidden" name="codigo" value={t.codigo} />
                  <input
                    name="nombre"
                    defaultValue={t.nombre}
                    aria-label={`Nombre de ${t.codigo}`}
                    className="campo !py-1.5 text-[16px]"
                  />
                  <input
                    name="descripcion"
                    defaultValue={t.descripcion}
                    aria-label={`Descripción de ${t.codigo}`}
                    className="campo !py-1.5 text-[16px]"
                  />
                  <button
                    type="submit"
                    className="text-[15px] font-bold text-timbre underline px-1"
                  >
                    Guardar
                  </button>
                </form>
              ) : (
                <p>
                  <strong>{t.nombre}</strong>{" "}
                  <span className="text-grafito">· {t.descripcion}</span>
                </p>
              )}
              {g.rol === "admin" && !["T98", "T99"].includes(t.codigo) && (
                <form action={cambiarTema}>
                  <input type="hidden" name="codigo" value={t.codigo} />
                  <input
                    type="hidden"
                    name="accion"
                    value={t.activo ? "desactivar" : "activar"}
                  />
                  <button
                    type="submit"
                    className="text-[15px] text-grafito underline px-1 min-h-10"
                  >
                    {t.activo ? "Desactivar" : "Reactivar"}
                  </button>
                </form>
              )}
            </li>
          ))}
        </ul>
        {g.rol === "admin" && (
          <form
            action={guardarTema}
            className="grid gap-2 sm:grid-cols-[1fr_1.4fr_auto] items-end"
          >
            <label className="grid gap-1 font-bold text-[16px]">
              Tema nuevo
              <input
                name="nombre"
                required
                className="campo !py-1.5 text-[16px]"
              />
            </label>
            <label className="grid gap-1 font-bold text-[16px]">
              Descripción y ejemplos
              <input name="descripcion" className="campo !py-1.5 text-[16px]" />
            </label>
            <button
              type="submit"
              className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]"
            >
              Agregar
            </button>
          </form>
        )}
        <p className="text-[15px] text-grafito">
          Un tema con textos asignados no se borra: se desactiva, para no perder
          la trazabilidad. Cada cambio queda en la bitácora.
        </p>
      </section>

      {g.rol === "admin" && (
        <section
          className="bg-papel border border-filete p-5 space-y-3"
          aria-labelledby="titulo-cargos"
        >
          <div className="flex items-center gap-3">
            <h2 id="titulo-cargos" className="rotulo text-[17px]">
              Cargos únicos ({cargos.length})
            </h2>
            <Ayuda id="ayuda-cargos" titulo="Para qué sirve la lista de cargos">
              <p>
                Son los cargos que tiene una sola persona en la escuela:
                nombrarlos ya identifica a alguien. Se marcan en rosado como
                «posible identificación» en cualquier texto, sin importar
                mayúsculas ni tildes.
              </p>
              <p>
                Escriba un cargo por línea, como lo diría la comunidad (por
                ejemplo «jefa de UTP» o «encargada de convivencia»), en
                masculino y femenino si corresponde. «Volver a la lista inicial»
                deja la lista sugerida.
              </p>
            </Ayuda>
          </div>
          <form action={guardarCargos} className="space-y-2">
            <textarea
              name="cargos"
              rows={6}
              defaultValue={cargos.join("\n")}
              className="campo text-[16px]"
              aria-label="Cargos únicos, uno por línea"
            />
            <div className="flex flex-wrap gap-3 items-center">
              <button
                type="submit"
                className="boton boton-primario !min-h-11 !py-1.5 text-[16px]"
              >
                Guardar cargos
              </button>
              {cargos.join("|") !== CARGOS_INICIALES.join("|") && (
                <button
                  type="submit"
                  name="accion"
                  value="restablecer"
                  className="text-[15px] text-timbre underline"
                >
                  Volver a la lista inicial
                </button>
              )}
            </div>
          </form>
        </section>
      )}

      {g.rol === "admin" && (
        <section
          className="bg-papel border border-filete p-5 space-y-3"
          aria-labelledby="titulo-personal"
        >
          <div className="flex items-center gap-3">
            <h2 id="titulo-personal" className="rotulo text-[17px]">
              Lista del personal ({personal.length})
            </h2>
            <Ayuda
              id="ayuda-personal"
              titulo="Para qué sirve la lista del personal"
            >
              <p>
                Ayuda a la marca automática: cualquier nombre o apellido de esta
                lista se marca en los textos, aunque esté en minúscula, sin
                tilde o sin «tía» o «profe» delante («le dije a gonzalez»).
              </p>
              <p>
                Escriba un nombre por línea, por ejemplo «María González». Se
                usan las palabras de 3 letras o más. Conviene incluir a
                docentes, asistentes y directivos, y también apodos conocidos.
              </p>
              <p>
                La lista solo vive en el servidor: no aparece en ningún archivo
                ni en los resultados. Al terminar el proceso se borra con el
                botón de abajo.
              </p>
            </Ayuda>
          </div>
          <p className="text-[16px] text-grafito max-w-[80ch]">
            Ayuda a marcar nombres que el sistema no reconocería solo. Un nombre
            por línea (por ejemplo «María González»). La lista no sale del
            servidor, no aparece en ningún archivo y se borra al cerrar el
            proceso.
          </p>
          <form action={guardarPersonal} className="space-y-2">
            <textarea
              name="nombres"
              rows={6}
              defaultValue={personal.join("\n")}
              className="campo text-[16px]"
              aria-label="Nombres del personal"
            />
            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="boton boton-primario !min-h-11 !py-1.5 text-[16px]"
              >
                Guardar lista
              </button>
            </div>
          </form>
          {personal.length > 0 && (
            <form action={borrarPersonal}>
              <button
                type="submit"
                className="text-[15px] text-lacre underline"
              >
                Borrar la lista del personal
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
