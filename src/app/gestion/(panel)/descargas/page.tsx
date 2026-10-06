import { desc, ilike } from "drizzle-orm";
import { db, schema } from "@/db";
import { pendientes, sincronizarTextos } from "@/lib/abiertas";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { AvisoEnsayo, Ayuda } from "../../Ayuda";
import { Verificar } from "./Verificar";

export const metadata = { title: "Descargas · Encuesta PEI 2027" };

const fecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "short", timeStyle: "short" });

type Opcion = { valor: string; titulo: string; detalle: string };

function Grupo({ nombre, leyenda, opciones }: { nombre: string; leyenda: string; opciones: Opcion[] }) {
  return (
    <fieldset className="space-y-2">
      <legend className="font-bold text-[16px] mb-1.5">{leyenda}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {opciones.map((o, i) => (
          <label
            key={o.valor}
            className="flex gap-3 items-start border border-filete bg-papel px-3 py-2.5 cursor-pointer hover:border-grafito has-[:checked]:border-verde has-[:checked]:bg-verde-claro has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-timbre"
          >
            <input type="radio" name={nombre} value={o.valor} defaultChecked={i === 0} className="size-5 mt-0.5 accent-[#4a5c0c] shrink-0" />
            <span className="text-[16px]">
              <strong>{o.titulo}</strong>
              <br />
              <span className="text-grafito text-[15px]">{o.detalle}</span>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export default async function Descargas() {
  await exigirGestor();
  const estado = await leerEstado();
  const prueba = estado.modo === "prueba";
  const habilitada = estado.cerrada || prueba;
  let faltan = 0;
  if (habilitada) {
    await sincronizarTextos(prueba);
    faltan = await pendientes(prueba);
  }
  const recientes = await db
    .select()
    .from(schema.bitacora)
    .where(ilike(schema.bitacora.detalle, "%SHA-256%"))
    .orderBy(desc(schema.bitacora.id))
    .limit(8);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <h1 className="titulo text-[30px]">Descargas</h1>
        {prueba && <span className="sello text-lacre text-[13px]">Datos de prueba</span>}
      </div>
      {prueba && !estado.cerrada && <AvisoEnsayo />}

      <section className="bg-papel border border-filete p-5 space-y-4" aria-labelledby="titulo-sabana">
        <div className="flex items-center gap-3">
          <h2 id="titulo-sabana" className="rotulo text-[17px]">
            Sábana de datos
          </h2>
          <Ayuda id="ayuda-sabana" titulo="Qué es la sábana de datos">
            <p>
              Es una planilla con <strong>todas las respuestas</strong>, una fila por encuesta, para que cualquier
              persona pueda revisar o rehacer el análisis a mano, sin usar la plataforma. Toda cifra de los resultados
              se puede recalcular desde ella.
            </p>
            <p>
              Hojas: LÉEME (qué contiene, fecha de corte, filas por hoja), Apoderados, Estudiantes, Funcionarios,
              Abiertas (textos revisados con sus temas), Participación, Diccionario (qué significa cada columna) y
              Bitácora.
            </p>
            <p>
              <strong>Completa:</strong> para la comisión y la administración; todas las columnas.
            </p>
            <p>
              <strong>Para terceros:</strong> para quien pida revisar el proceso (apoderados, Consejo Escolar,
              supervisión). Los cursos con menos de 5 respuestas y los cursos PIE Opción 4 van agrupados por nivel, y la
              gestión de funcionarios (F7 y F8) va en una hoja aparte, cruzada solo con Docente/Asistente.
            </p>
            <p>
              <strong>Códigos</strong> sirven para calcular (sumar, promediar, filtrar); <strong>etiquetas</strong>{" "}
              muestran las respuestas en palabras, para leer.
            </p>
            <p>
              El <strong>CSV</strong> trae cada hoja como un archivo aparte dentro de un .zip, para Google Sheets,
              LibreOffice, R, SPSS o Jamovi.
            </p>
          </Ayuda>
        </div>

        {!habilitada ? (
          <p className="text-[16px] text-grafito">Se habilita al cerrar la encuesta.</p>
        ) : faltan > 0 ? (
          <p className="text-[16px] text-grafito">
            Se habilita cuando no quedan textos por revisar en Panel → Abiertas (faltan {faltan}).
          </p>
        ) : (
          <form method="get" action="/gestion/descargas/sabana" className="space-y-4">
            <Grupo
              nombre="version"
              leyenda="Versión"
              opciones={[
                { valor: "completa", titulo: "Completa", detalle: "Comisión y administración. Todas las columnas." },
                { valor: "terceros", titulo: "Para terceros", detalle: "Revisión externa. Cursos pequeños agrupados; F7 y F8 aparte." },
              ]}
            />
            <Grupo
              nombre="valores"
              leyenda="Valores"
              opciones={[
                { valor: "codigos", titulo: "Códigos", detalle: "Números, para calcular (A5_3 = 4)." },
                { valor: "etiquetas", titulo: "Etiquetas", detalle: "En palabras, para leer («De acuerdo»)." },
              ]}
            />
            <Grupo
              nombre="formato"
              leyenda="Formato"
              opciones={[
                { valor: "xlsx", titulo: "Excel (.xlsx)", detalle: "Un archivo con todas las hojas." },
                { valor: "csv", titulo: "CSV (.zip)", detalle: "Un CSV UTF-8 por hoja, separado por «;»." },
              ]}
            />
            <button type="submit" className="boton boton-primario">
              Descargar la sábana
            </button>
            <p className="text-[15px] text-grafito max-w-[80ch]">
              Cada descarga queda en la bitácora con su huella SHA-256. Guarde el original sin abrirlo ni volver a
              guardarlo y trabaje en una copia: Excel cambia la huella al guardar.
            </p>
          </form>
        )}
      </section>

      <section className="bg-papel border border-filete p-5 space-y-3" aria-labelledby="titulo-verificar">
        <div className="flex items-center gap-3">
          <h2 id="titulo-verificar" className="rotulo text-[17px]">
            Verificar un archivo
          </h2>
          <Ayuda id="ayuda-verificar" titulo="Cómo se verifica un archivo">
            <p>
              Cada archivo que entrega la plataforma (sábana, abiertas.csv, temas.csv) tiene una{" "}
              <strong>huella digital</strong>: un código de 64 caracteres calculado a partir de su contenido, que
              queda en la bitácora con la fecha y quién lo descargó.
            </p>
            <p>
              Si alguien le entrega un archivo, elíjalo aquí: el navegador calcula su huella (el archivo no se sube) y
              la plataforma la busca en la bitácora. Si coincide, el archivo es idéntico al original. Si no, fue
              modificado, o se abrió y se volvió a guardar.
            </p>
            <p>
              También se puede comprobar sin la plataforma: en Windows, <code>certutil -hashfile archivo SHA256</code>
              , y comparar con la bitácora.
            </p>
          </Ayuda>
        </div>
        <Verificar />
      </section>

      <section className="bg-papel border border-filete p-5 space-y-3" aria-labelledby="titulo-recientes">
        <h2 id="titulo-recientes" className="rotulo text-[17px]">
          Últimas descargas registradas
        </h2>
        {recientes.length === 0 ? (
          <p className="text-grafito">Todavía no hay descargas.</p>
        ) : (
          <ul className="divide-y divide-filete border-y border-filete">
            {recientes.map((r) => {
              const [detalle, codigo] = (r.detalle ?? "").split(" · SHA-256 ");
              return (
                <li key={r.id} className="py-2 text-[15px] grid gap-0.5">
                  <span>
                    <strong>{r.accion}</strong> · {fecha.format(r.fecha)} · {r.actor}
                  </span>
                  <span className="text-grafito">{detalle}</span>
                  <code className="text-[13px] break-all text-grafito">SHA-256 {codigo}</code>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
