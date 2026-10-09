import Link from "next/link";
import { exigirGestor } from "@/lib/gestion";
import { Imprimir } from "@/app/manual/profesores/Imprimir";

export const metadata = { title: "Manual de la comisión · Encuesta PEI 2027" };

/**
 * Manual de la comisión (MVP): ver avance, entregar reservas y desactivar sobrantes, exportar e
 * importar abiertas, descargar informe y sábana, verificar huellas. Explica la plataforma, no cómo
 * la comisión clasifica los textos (decisión de Ger, 6/10).
 */

const SECCIONES = [
  { id: "roles", titulo: "Quién hace qué" },
  { id: "antes", titulo: "Antes de aplicar" },
  { id: "durante", titulo: "Durante la aplicación" },
  { id: "cierre", titulo: "Al cerrar: respuestas abiertas" },
  { id: "resultados", titulo: "Resultados e informe" },
  { id: "descargas", titulo: "Sábana y huellas digitales" },
  { id: "anonimato", titulo: "Reglas de anonimato" },
  { id: "prueba", titulo: "Modo Prueba y modo Oficial" },
];

function Ir({ a, children }: { a: string; children: React.ReactNode }) {
  return (
    <Link
      href={a}
      className="text-timbre underline font-bold print:no-underline print:text-tinta"
    >
      {children}
    </Link>
  );
}

function Seccion({
  n,
  id,
  titulo,
  children,
}: {
  n: number;
  id: string;
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`t-${id}`}
      className="bg-papel border border-filete p-5 space-y-3 scroll-mt-4 break-inside-avoid-page print:border-0 print:p-0 print:pt-3"
    >
      <h2 id={`t-${id}`} className="titulo text-[24px] print:text-[18px]">
        <span className="text-timbre tabular-nums mr-2">{n}</span>
        {titulo}
      </h2>
      <div className="space-y-3 text-[17px] leading-relaxed max-w-[80ch] print:text-[11.5px] print:max-w-none print:space-y-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mt-1">
        {children}
      </div>
    </section>
  );
}

export default async function ManualComision() {
  await exigirGestor();
  return (
    <div className="space-y-5 print:space-y-1">
      <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
        <div className="flex-1 min-w-[16rem]">
          <p className="rotulo text-timbre text-[14px]">
            Encuesta PEI 2027 · Escuela República del Ecuador E-79
          </p>
          <h1 className="titulo text-[30px] print:text-[24px]">
            Manual de la comisión
          </h1>
          <p className="text-[17px] mt-1 max-w-[75ch] print:text-[12px]">
            Cómo usar el panel en cada etapa. Los botones <strong>«?»</strong>{" "}
            de cada sección del panel explican el detalle en el mismo lugar.
            Para el profesor jefe hay un manual aparte, de una hoja:{" "}
            <Ir a="/manual/profesores">
              encuesta.escuelaecuador.cl/manual/profesores
            </Ir>
            .
          </p>
        </div>
        <div className="print:hidden">
          <Imprimir />
        </div>
      </div>

      <nav
        aria-label="Contenido del manual"
        className="bg-papel border border-filete p-4 print:hidden"
      >
        <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-2 text-[16px]">
          {SECCIONES.map((s, i) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-timbre underline">
                {i + 1}. {s.titulo}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <Seccion n={1} id="roles" titulo="Quién hace qué">
        <p>Hay dos tipos de cuenta en el panel:</p>
        <ul>
          <li>
            <strong>Comisión:</strong> ve el avance, los resultados y el
            informe; revisa las encuestas y deja observaciones; desactiva
            papeletas sobrantes; revisa los nombres en las respuestas abiertas,
            descarga los archivos y carga la clasificación; descarga la sábana y
            el informe; verifica archivos.
          </li>
          <li>
            <strong>Administración:</strong> todo lo anterior y además genera
            las papeletas, ajusta cursos y matrícula, anota cuántas papeletas de
            apoderados se entregaron, abre y cierra la encuesta, publica los
            resultados para la comunidad, edita la lista de temas y la del
            personal, y gestiona las cuentas.
          </li>
        </ul>
        <p>
          Cada persona tiene su propia cuenta. Cambie su contraseña en{" "}
          <Ir a="/gestion/cuenta">Mi cuenta</Ir>; si la olvida, la
          administración le asigna una nueva. Todo lo importante queda en la{" "}
          <Ir a="/gestion/bitacora">Bitácora</Ir>, con fecha y autor.
        </p>
      </Seccion>

      <Seccion n={2} id="antes" titulo="Antes de aplicar">
        <ol>
          <li>
            <strong>Revisar las encuestas</strong> en{" "}
            <Ir a="/gestion/encuestas">Encuestas</Ir>: la vista previa funciona
            igual que la real pero no guarda nada. Las observaciones por
            pregunta quedan anotadas para la administración.
          </li>
          <li>
            <strong>Papeletas:</strong> la administración las genera por lotes
            en <Ir a="/gestion/credenciales">Credenciales</Ir> (matrícula del
            curso + 10% de reserva) y descarga el PDF. Cada PDF parte con una
            portada para armar el sobre del curso.
          </li>
          <li>
            <strong>Entregar los sobres</strong> a cada profesor jefe junto con
            su manual. Las papeletas se reparten al azar y{" "}
            <strong>nadie anota cuál recibe cada persona</strong>.
          </li>
          <li>
            <strong>Funcionarios:</strong> en el consejo de profesores, cada
            persona saca una papeleta de una bolsa.
          </li>
        </ol>
      </Seccion>

      <Seccion n={3} id="durante" titulo="Durante la aplicación">
        <ul>
          <li>
            <strong>Avance</strong> (<Ir a="/gestion">inicio del panel</Ir>):
            cuántas papeletas se usaron por curso y estamento. No dice quién
            respondió ni quién falta, porque nadie sabe qué papeleta tiene cada
            persona. La misma información, sin cuenta, está en{" "}
            <Ir a="/avance">encuesta.escuelaecuador.cl/avance</Ir> para motivar
            a los cursos.
          </li>
          <li>
            <strong>Papeletas de apoderados entregadas:</strong> cada profesor
            jefe informa cuántas entregó (sin nombres). Páselo a la
            administración, que lo anota en Cursos: es la base del porcentaje
            del curso.
          </li>
          <li>
            <strong>Papeleta perdida:</strong> se entrega una de reserva del
            mismo curso. La perdida no se puede identificar ni anular, pero el
            riesgo es bajo. Si se acaban las reservas, la administración genera
            un lote nuevo del curso.
          </li>
          <li>
            <strong>Sobrantes devueltas:</strong> en{" "}
            <Ir a="/gestion/credenciales">Credenciales</Ir>, abra el lote del
            curso, marque las papeletas devueltas y toque «Desactivar las
            marcadas». Ya no sirven para responder.
          </li>
          <li>
            <strong>Ingresos fallidos:</strong> el inicio del panel muestra
            cuántos hubo en la última hora. Si el número se dispara, avise a la
            administración.
          </li>
        </ul>
      </Seccion>

      <Seccion n={4} id="cierre" titulo="Al cerrar: respuestas abiertas">
        <p>
          La administración cierra la encuesta en Sistema. Desde ese momento
          nadie más puede responder y se abren los resultados. Las respuestas
          escritas siguen estos pasos en <Ir a="/gestion/abiertas">Abiertas</Ir>
          , donde una guía marca en qué paso va:
        </p>
        <ol>
          <li>
            <strong>Revisar nombres.</strong> La plataforma marca en amarillo lo
            que podría ser un nombre. Seleccione el nombre y reemplácelo por un
            rol general ([un docente], [un estudiante]…), y guarde como
            revisado. Los textos sin marcas igual se leen y se confirman de a
            100. Si un texto relata una situación grave, márquelo «No publicar»:
            la administración lo deriva al encargado de convivencia por el canal
            formal. El texto original no se guarda.
          </li>
          <li>
            <strong>Descargar</strong> <code>abiertas.csv</code> y{" "}
            <code>temas.csv</code> (se habilita cuando no queda nada por
            revisar). Es un solo archivo para toda la comisión.
          </li>
          <li>
            <strong>Clasificar</strong> fuera de la plataforma, como la comisión
            lo haya acordado, agregando las columnas <code>tema_1</code>,{" "}
            <code>tema_2</code>, <code>tema_3</code>,{" "}
            <code>tema_nuevo_texto</code> y <code>cita_destacada</code>.
          </li>
          <li>
            <strong>Cargar el archivo clasificado.</strong> La plataforma lo
            revisa sin cambiar nada: si hay errores, los lista y no carga; si
            está bien, muestra un resumen por tema y pide confirmar. Cada carga
            reemplaza la anterior.
          </li>
        </ol>
      </Seccion>

      <Seccion n={5} id="resultados" titulo="Resultados e informe">
        <ul>
          <li>
            <strong>
              <Ir a="/gestion/resultados">Resultados</Ir>:
            </strong>{" "}
            vista rápida para explorar (resumen, prioridades, escalas, abiertas
            y cada estamento).
          </li>
          <li>
            <strong>
              <Ir a="/gestion/informe">Informe</Ir>:
            </strong>{" "}
            la base para redactar el PEI, con 13 secciones ligadas a los
            componentes del PEI y 5 anexos. Desde la página se copian textos y
            tablas al documento del PEI; el <strong>PDF</strong> es el registro
            oficial.
          </li>
          <li>
            El informe entrega <strong>datos, no conclusiones</strong>. Marca
            las <strong>prioridades convergentes</strong> (top 5 en al menos 2
            estamentos) y propone su lectura según por qué la eligieron:{" "}
            <strong>sello candidato</strong> (más de la mitad, fortaleza o «nos
            distinguiría»), <strong>objetivo de mejora</strong> (más de la
            mitad, debilidad) o <strong>a discutir</strong>. «Clave para el
            futuro» no inclina la lectura. Con pocas respuestas, casi todas las
            lecturas salen frágiles (⚠): es lo que dicen los datos. Puede que no
            aparezca ningún sello; eso también es un dato. La decisión es de la
            comisión.
          </li>
          <li>
            <strong>Página pública</strong> (<code>/resultados</code>): versión
            resumida para la comunidad. La publica la administración desde
            Informe cuando la comisión lo acuerde.
          </li>
        </ul>
      </Seccion>

      <Seccion n={6} id="descargas" titulo="Sábana y huellas digitales">
        <ul>
          <li>
            <strong>Sábana</strong> (<Ir a="/gestion/descargas">Descargas</Ir>):
            todas las respuestas en Excel o CSV, para revisar o rehacer
            cualquier cifra sin la plataforma. <strong>Completa</strong> para la
            comisión; <strong>para terceros</strong> (Consejo Escolar,
            apoderados, supervisión) con los cursos pequeños agrupados.
          </li>
          <li>
            <strong>Huella digital:</strong> cada archivo descargado (sábana,
            informe, abiertas, temas) deja en la bitácora un código SHA-256 con
            fecha y autor. En «Verificar un archivo» se elige un archivo y la
            plataforma dice si es idéntico al original.
          </li>
          <li>
            <strong>Regla:</strong> guarde el original sin abrirlo ni volver a
            guardarlo, y trabaje siempre en una copia. Excel cambia la huella al
            guardar, aunque no cambien los datos.
          </li>
        </ul>
      </Seccion>

      <Seccion
        n={7}
        id="anonimato"
        titulo="Reglas de anonimato que cuida la comisión"
      >
        <ul>
          <li>
            Nunca anotar, fotografiar ni preguntar qué papeleta recibió cada
            persona.
          </li>
          <li>
            No se informan grupos con menos de 5 respuestas (la plataforma ya
            los oculta).
          </li>
          <li>
            La gestión de funcionarios (preguntas F7 y F8) solo se mira en total
            o separada entre docentes y asistentes, nunca con otra
            característica.
          </li>
          <li>
            Ningún texto sale con nombres de personas; los «No publicar» no
            salen en ningún archivo ni resultado.
          </li>
          <li>
            Los resultados se abren solo después del cierre, para que nadie
            pueda deducir una respuesta comparando antes y después de un envío.
          </li>
        </ul>
      </Seccion>

      <Seccion n={8} id="prueba" titulo="Modo Prueba y modo Oficial">
        <p>
          En <strong>modo Prueba</strong> (franja amarilla arriba) solo
          funcionan las papeletas PRUEBA- y todo el panel se puede ensayar con
          la encuesta abierta, incluso Abiertas, el informe y las descargas, que
          salen marcados como «Datos de prueba». Antes de la aplicación real, la
          administración borra todo con el reinicio a cero y pasa a{" "}
          <strong>modo Oficial</strong>: desde ahí las respuestas son reales y
          el cierre es definitivo.
        </p>
      </Seccion>
    </div>
  );
}
