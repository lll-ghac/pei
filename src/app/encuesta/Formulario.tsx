"use client";

import { ArrowLeft, ArrowRight, Smiley, SmileyMeh, SmileySad, SpeakerHigh } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { enviarEncuesta } from "../acciones";
import { Urna } from "@/components/Urna";
import { ESCALAS } from "@/lib/encuestas/listas";
import {
  ENCUESTAS,
  EXCLUYENTES,
  OTRA,
  MAX_ABIERTA,
  MAX_TEXTO,
  opcionesDe,
  preguntasDe,
  validarPregunta,
  type Estamento,
  type ItemEscala,
  type Opcion,
  type Pregunta,
  type Respuestas,
  type ValorRespuesta,
} from "@/lib/encuestas";

type Paso =
  | { tipo: "intro" }
  | { tipo: "pregunta"; pregunta: Pregunta; seccion: string }
  | { tipo: "item"; pregunta: Pregunta & { tipo: "escala" }; item: ItemEscala; grupo?: string; n: number; total: number; seccion: string }
  | { tipo: "confirmar" };

type Props = {
  estamento: Estamento;
  curso: string | null;
  /** Vista previa del panel: misma encuesta, pero no envía nada y permite saltar preguntas. */
  vistaPrevia?: boolean;
};

const DURACION_DOBLEZ = 430;

export function Formulario({ estamento, curso, vistaPrevia = false }: Props) {
  const encuesta = ENCUESTAS[estamento];
  const esEstudiante = estamento === "E";
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  const [doblando, setDoblando] = useState(false);
  const [finVistaPrevia, setFinVistaPrevia] = useState(false);
  const enviado = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);
  const avisoError = useRef<HTMLDivElement>(null);

  const pasos = useMemo<Paso[]>(() => {
    const lista: Paso[] = [{ tipo: "intro" }];
    for (const s of encuesta.secciones) {
      for (const p of s.preguntas) {
        if (p.tipo === "escala") {
          const items = p.grupos.flatMap((g) => g.items.map((item) => ({ item, grupo: g.titulo })));
          items.forEach(({ item, grupo }, i) =>
            lista.push({ tipo: "item", pregunta: p, item, grupo, n: i + 1, total: items.length, seccion: s.titulo }),
          );
        } else {
          lista.push({ tipo: "pregunta", pregunta: p, seccion: s.titulo });
        }
      }
    }
    lista.push({ tipo: "confirmar" });
    return lista;
  }, [encuesta]);

  const totalPreguntas = preguntasDe(encuesta).length;
  const paso = pasos[indice];
  const hayRespuestas = Object.keys(respuestas).length > 0;

  // Aviso del navegador antes de cerrar o recargar con respuestas sin enviar.
  useEffect(() => {
    const aviso = (e: BeforeUnloadEvent) => {
      if (hayRespuestas && !enviado.current && !vistaPrevia) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [hayRespuestas, vistaPrevia]);

  // Al cambiar de pantalla: foco en el título (lectores de pantalla y teclado) y arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    titulo.current?.focus();
    window.speechSynthesis?.cancel();
  }, [indice]);

  // Un aviso de error siempre queda a la vista (en celular, la barra inferior lo taparía).
  useEffect(() => {
    if (error) avisoError.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [error]);

  function actualizar(codigo: string, valor: ValorRespuesta) {
    setError(null);
    setRespuestas((prev) => {
      const nuevo = { ...prev, [codigo]: valor };
      // Si cambian las 3 prioridades, "la más importante" debe seguir estando entre ellas.
      for (const p of preguntasDe(encuesta)) {
        if (p.tipo === "masImportante" && p.de === codigo) {
          const elegida = nuevo[p.codigo]?.codigos?.[0];
          if (elegida && !valor.codigos?.includes(elegida)) delete nuevo[p.codigo];
        }
      }
      return nuevo;
    });
  }

  function validarPaso(p: Paso): string | null {
    if (p.tipo === "pregunta") return validarPregunta(p.pregunta, respuestas[p.pregunta.codigo], respuestas, encuesta);
    if (p.tipo === "item") {
      return respuestas[p.pregunta.codigo]?.items?.[p.item.codigo]
        ? null
        : esEstudiante
          ? "Elige una opción para seguir."
          : "Elija una opción para seguir.";
    }
    return null;
  }

  function siguiente() {
    const e = validarPaso(paso);
    if (e) {
      setError(e);
      return;
    }
    setError(null);
    setIndice((i) => Math.min(i + 1, pasos.length - 1));
  }

  function saltar() {
    setError(null);
    setIndice((i) => Math.min(i + 1, pasos.length - 1));
  }

  function reiniciarVistaPrevia() {
    setRespuestas({});
    setError(null);
    setDoblando(false);
    setFinVistaPrevia(false);
    setIndice(0);
  }

  function anterior() {
    setError(null);
    setIndice((i) => Math.max(i - 1, 0));
  }

  function depositar() {
    if (!vistaPrevia) {
      // Revisión completa antes de enviar; si falta algo, se vuelve a esa pantalla.
      for (let i = 1; i < pasos.length - 1; i++) {
        const e = validarPaso(pasos[i]);
        if (e) {
          setIndice(i);
          setError(e);
          return;
        }
      }
    }
    // La papeleta se dobla y baja a la urna; luego se envía.
    setDoblando(true);
    window.setTimeout(() => {
      if (vistaPrevia) {
        setFinVistaPrevia(true);
        return;
      }
      iniciarEnvio(async () => {
        const r = await enviarEncuesta(respuestas);
        if (r.ok) {
          enviado.current = true;
          setRespuestas({});
          router.replace(`/gracias?e=${estamento}`);
        } else {
          setDoblando(false);
          setError(r.error);
        }
      });
    }, DURACION_DOBLEZ);
  }

  const numeroPregunta =
    paso.tipo === "pregunta" || paso.tipo === "item"
      ? preguntasDe(encuesta).findIndex((q) => q.codigo === paso.pregunta.codigo) + 1
      : 0;
  const seccionActual = paso.tipo === "pregunta" || paso.tipo === "item" ? paso.seccion : null;
  const avance = indice / (pasos.length - 1);
  const minutosRestantes = Math.max(1, Math.ceil(encuesta.minutos * (1 - avance)));

  if (finVistaPrevia) {
    return (
      <div className="bg-papel border-y sm:border border-filete px-5 py-8 sm:px-8 text-center">
        <Urna className="mx-auto w-40" papeletas={3} />
        <h1 ref={titulo} tabIndex={-1} className="titulo mt-4 text-[28px] outline-none">
          {encuesta.despedida}
        </h1>
        <p className="mt-3">Fin de la vista previa. Aquí la persona vería la pantalla de agradecimiento.</p>
        <p className="mt-1 text-gris-texto">No se guardó ninguna respuesta.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reiniciarVistaPrevia} className="boton boton-primario">
            Volver a empezar
          </button>
          <Link href="/gestion/encuestas" className="boton boton-secundario no-underline">
            Volver al panel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      {vistaPrevia && (
        <p role="note" className="mx-4 sm:mx-0 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[16px] text-timbre">
          <span className="sello text-[12px]">Vista previa</span>
          Nada se guarda. «Saltar» avanza sin responder.
        </p>
      )}

      {paso.tipo !== "intro" && (
        <Avance
          encuestaSecciones={encuesta.secciones.map((s) => s.titulo)}
          seccionActual={seccionActual}
          numero={numeroPregunta}
          total={totalPreguntas}
          confirmar={paso.tipo === "confirmar"}
          minutos={minutosRestantes}
          avance={avance}
        />
      )}

      {error && (
        <div
          ref={avisoError}
          role="alert"
          className="mx-4 sm:mx-0 mb-3 flex items-start gap-3 border border-lacre bg-lacre-claro px-4 py-3 scroll-mt-4"
        >
          <span className="sello text-lacre text-[12px] mt-0.5 shrink-0">Falta</span>
          <span className="text-tinta">{error}</span>
        </div>
      )}

      <article
        className={`bg-papel border-y sm:border border-filete ${doblando ? "papeleta-doblandose" : ""}`}
        aria-busy={doblando || enviando}
      >
        {paso.tipo === "intro" && <Intro estamento={estamento} curso={curso} titulo={titulo} />}

        {paso.tipo === "pregunta" && (
          <PantallaPregunta
            key={paso.pregunta.codigo}
            pregunta={paso.pregunta}
            opciones={opcionesDe(paso.pregunta, respuestas, encuesta)}
            valor={respuestas[paso.pregunta.codigo]}
            onCambio={(v) => actualizar(paso.pregunta.codigo, v)}
            esEstudiante={esEstudiante}
            titulo={titulo}
          />
        )}

        {paso.tipo === "item" && (
          <PantallaItem
            key={`${paso.pregunta.codigo}-${paso.item.codigo}`}
            paso={paso}
            valor={respuestas[paso.pregunta.codigo]?.items?.[paso.item.codigo]}
            esEstudiante={esEstudiante}
            titulo={titulo}
            onElegir={(v) => {
              const actual = respuestas[paso.pregunta.codigo]?.items ?? {};
              actualizar(paso.pregunta.codigo, { items: { ...actual, [paso.item.codigo]: v } });
              // Avanza solo a la siguiente frase, después de ver la raya.
              window.setTimeout(() => setIndice((i) => (i === indice ? i + 1 : i)), 320);
            }}
          />
        )}

        {paso.tipo === "confirmar" && (
          <div className="px-5 py-7 sm:px-8 sm:py-9">
            <div className="flex flex-col-reverse sm:flex-row sm:items-center gap-6">
              <div className="flex-1">
                <h1 ref={titulo} tabIndex={-1} className="titulo text-[28px] sm:text-[32px] outline-none">
                  {esEstudiante ? "Tu papeleta está lista" : "Su papeleta está lista"}
                </h1>
                <p className="mt-3">
                  {esEstudiante
                    ? "Cuando la deposites en la urna, ya no podrás cambiar tus respuestas."
                    : "Al depositarla en la urna, sus respuestas se guardan de forma anónima y ya no podrá modificarlas."}
                </p>
                <p className="mt-2 text-gris-texto">
                  {esEstudiante ? "Si quieres revisar algo, usa Anterior." : "Si quiere revisar algo, use Anterior."}
                </p>
                <p className="mt-6 border-t-2 border-dashed border-grafito pt-1.5 text-[18px] text-grafito" aria-hidden>
                  doblar aquí
                </p>
              </div>
              <Urna className="w-40 sm:w-44 shrink-0 self-center" papeletas={2} />
            </div>
          </div>
        )}

      </article>

      <nav
        className="sticky bottom-0 z-10 mt-4 bg-papel border-t border-filete sm:static sm:bg-transparent sm:border-0"
        aria-label="Navegación de la encuesta"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center gap-2 sm:gap-3 px-4 py-3 sm:px-0">
          {indice > 0 && (
            <button type="button" onClick={anterior} disabled={enviando || doblando} className="boton boton-secundario !px-3.5 shrink-0">
              <ArrowLeft size={20} weight="bold" aria-hidden />
              Anterior
            </button>
          )}
          {vistaPrevia && paso.tipo !== "confirmar" && paso.tipo !== "intro" && (
            <button type="button" onClick={saltar} className="ml-auto shrink-0 font-bold text-timbre underline px-1.5 min-h-12">
              Saltar
            </button>
          )}
          {paso.tipo === "confirmar" ? (
            <button
              type="button"
              onClick={depositar}
              disabled={enviando || doblando}
              className={`boton boton-primario flex-1 min-w-0 sm:flex-none ${vistaPrevia ? "" : "ml-auto"}`}
            >
              {enviando || doblando ? "Depositando…" : vistaPrevia ? "Depositar (prueba)" : "Depositar en la urna"}
            </button>
          ) : (
            <button
              type="button"
              onClick={siguiente}
              className={`boton boton-primario flex-1 min-w-0 sm:flex-none sm:min-w-44 ${vistaPrevia ? "" : "ml-auto"}`}
            >
              {paso.tipo === "intro" ? "Comenzar" : "Siguiente"}
              <ArrowRight size={20} weight="bold" aria-hidden />
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}

/** Estado del recorrido: número de pregunta, minutos y la franja de etapas por sección. */
function Avance({
  encuestaSecciones,
  seccionActual,
  numero,
  total,
  confirmar,
  minutos,
  avance,
}: {
  encuestaSecciones: string[];
  seccionActual: string | null;
  numero: number;
  total: number;
  confirmar: boolean;
  minutos: number;
  avance: number;
}) {
  const actual = confirmar ? encuestaSecciones.length : encuestaSecciones.indexOf(seccionActual ?? "");
  return (
    <div className="px-4 sm:px-0 mb-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="rotulo text-[17px] text-tinta">
          {confirmar ? "Última página" : `Pregunta ${numero} de ${total}`}
        </p>
        {!confirmar && <p className="text-[18px] text-gris-texto">Quedan unos {minutos} min</p>}
      </div>
      <ol
        className="mt-2 grid gap-1"
        style={{ gridTemplateColumns: `repeat(${encuestaSecciones.length}, minmax(0, 1fr))` }}
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(avance * 100)}
        aria-label="Avance de la encuesta por secciones"
      >
        {encuestaSecciones.map((s, i) => (
          <li key={s} className="min-w-0">
            <span
              className={`block h-[5px] ${i < actual ? "bg-grafito" : i === actual ? "bg-timbre" : "bg-filete"}`}
              aria-hidden
            />
            <span
              className={`mt-1 hidden sm:block text-[15px] leading-tight ${i === actual ? "text-tinta font-bold" : "text-gris-texto"}`}
            >
              {s}
            </span>
          </li>
        ))}
      </ol>
      {seccionActual && <p className="mt-1 sm:hidden text-[18px] text-grafito">{seccionActual}</p>}
    </div>
  );
}

function Intro({
  estamento,
  curso,
  titulo,
}: {
  estamento: Estamento;
  curso: string | null;
  titulo: React.RefObject<HTMLHeadingElement | null>;
}) {
  const encuesta = ENCUESTAS[estamento];
  const tu = estamento === "E";
  const pasos = tu
    ? ["Lee cada pregunta y marca tu respuesta.", "Puedes volver atrás y cambiarla antes de terminar.", "Al final, tu papeleta se dobla y cae en la urna."]
    : ["Lea cada pregunta y marque su respuesta.", "Puede volver atrás y cambiarla antes de terminar.", "Al final, su papeleta se dobla y cae en la urna."];
  return (
    <div className="px-5 py-7 sm:px-8 sm:py-9">
      <h1 ref={titulo} tabIndex={-1} className="titulo text-[30px] sm:text-[36px] outline-none">
        Diseñando el futuro de nuestra escuela
      </h1>
      <p className="mt-2 text-grafito">
        {encuesta.titulo}
        {curso ? ` · ${curso}` : ""}
      </p>
      <div className="mt-5 space-y-3 max-w-[62ch]">
        {encuesta.introduccion.map((t) => (
          <p key={t}>{t}</p>
        ))}
      </div>

      <section className="mt-7 border border-grafito" aria-labelledby="como-responder">
        <h2 id="como-responder" className="rotulo text-[15px] bg-tinta text-papel px-4 py-2">
          {tu ? "Cómo se responde" : "Cómo se responde"}
        </h2>
        <ol className="divide-y divide-filete">
          {pasos.map((t, i) => (
            <li key={t} className="flex gap-4 px-4 py-3">
              <span className="rotulo text-[20px] text-timbre w-5 shrink-0">{i + 1}</span>
              <span>{t}</span>
            </li>
          ))}
        </ol>
      </section>

      <div className="mt-6 flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-5">
        <span className="sello text-timbre text-[15px] self-start shrink-0">Voto secreto</span>
        <div className="text-[18px] text-grafito">
          {tu ? (
            <p>
              Tus respuestas son secretas. Tu profesor, la dirección ni nadie podrá saber qué marcaste. Solo se
              verán los resultados de todo el curso juntos. No es una prueba y no tiene nota.
            </p>
          ) : (
            <p>
              La encuesta es anónima. Su credencial se entregó al azar y nadie sabe cuál recibió. El sistema
              registra que esta credencial ya participó, pero guarda sus respuestas por separado, sin ningún
              vínculo con ella. Nadie, ni la dirección ni la comisión, puede saber qué respondió usted. Los
              resultados se muestran solo en grupos de 5 o más personas.
            </p>
          )}
          <p className="mt-2 flex flex-wrap gap-x-4">
            <a href="/anonimato" target="_blank" className="text-timbre underline font-bold">
              Cómo protegemos el anonimato
            </a>
            <a href="/privacidad" target="_blank" className="text-timbre underline font-bold">
              Privacidad
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function LeerEnVozAlta({ texto }: { texto: string }) {
  const [voz, setVoz] = useState<SpeechSynthesisVoice | null>(null);
  useEffect(() => {
    const synth = window.speechSynthesis;
    if (!synth) return;
    const buscar = () => {
      const voces = synth.getVoices();
      setVoz(voces.find((v) => v.lang === "es-CL") ?? voces.find((v) => v.lang.startsWith("es")) ?? null);
    };
    buscar();
    synth.addEventListener("voiceschanged", buscar);
    return () => synth.removeEventListener("voiceschanged", buscar);
  }, []);
  // Si el equipo no tiene una voz en español, el botón no aparece (MVP).
  if (!voz) return null;
  return (
    <button
      type="button"
      onClick={() => {
        const synth = window.speechSynthesis;
        synth.cancel();
        const u = new SpeechSynthesisUtterance(texto);
        u.voice = voz;
        u.lang = voz.lang;
        u.rate = 0.95;
        synth.speak(u);
      }}
      className="shrink-0 grid place-items-center min-h-12 min-w-12 rounded-[2px] border border-filete text-timbre hover:bg-timbre-claro"
      aria-label="Leer en voz alta"
      title="Leer en voz alta"
    >
      <SpeakerHigh size={22} weight="bold" />
    </button>
  );
}

function Encabezado({
  pregunta,
  extra,
  titulo,
  lectura,
}: {
  pregunta: Pregunta;
  extra?: string;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  lectura: string;
}) {
  return (
    <div className="px-5 pt-6 pb-5 sm:px-8 sm:pt-8">
      {pregunta.cita && (
        <figure className="mb-5 border border-filete bg-fondo/60 px-4 py-3">
          <figcaption className="text-[18px] text-grafito">{pregunta.cita.antes}</figcaption>
          <blockquote className="mt-1 text-[18px] italic">«{pregunta.cita.texto}»</blockquote>
        </figure>
      )}
      {/* Columna del número a 3rem: caben los números de dos dígitos (10 a 21) sin pegarse al texto. */}
      <div className="grid grid-cols-[3rem_1fr_auto] items-start gap-x-3">
        <span className="rotulo text-[32px] leading-none text-timbre pt-0.5" aria-hidden>
          {pregunta.numero}
        </span>
        <h1 ref={titulo} tabIndex={-1} className="titulo text-[24px] sm:text-[28px] outline-none">
          <span className="sr-only">Pregunta {pregunta.numero}. </span>
          {pregunta.texto}
        </h1>
        <LeerEnVozAlta texto={lectura} />
        {(pregunta.indicacion || extra) && (
          <p className="col-start-2 col-span-2 mt-2 text-[18px] text-grafito">
            {pregunta.indicacion}
            {pregunta.indicacion && extra && <span className="text-filete"> · </span>}
            {extra && <strong className="text-tinta">{extra}</strong>}
          </p>
        )}
      </div>
    </div>
  );
}

/** Marca de la cédula: círculo (una opción) o cuadrado (varias), con la raya de lápiz al elegir. */
function Marca({ activa, multiple }: { activa: boolean; multiple: boolean }) {
  return (
    <svg viewBox="0 0 32 32" className="size-8 shrink-0" aria-hidden>
      {multiple ? (
        <rect
          x="6"
          y="6"
          width="20"
          height="20"
          rx="1.5"
          fill="#fff"
          stroke={activa ? "var(--color-verde-tinta)" : "var(--color-grafito)"}
          strokeWidth={activa ? 2.2 : 1.6}
        />
      ) : (
        <circle
          cx="16"
          cy="16"
          r="10"
          fill="#fff"
          stroke={activa ? "var(--color-verde-tinta)" : "var(--color-grafito)"}
          strokeWidth={activa ? 2.2 : 1.6}
        />
      )}
      {activa && (
        // Raya de lápiz grafito: gruesa, algo irregular y pasada del contorno, como un voto real.
        <path
          className="raya"
          d="M17.4 1.6 C16.2 8.5 17.1 14.2 16.1 20.4 C15.6 24.3 15.9 27.6 14.9 30.6"
          fill="none"
          stroke="#3d4145"
          strokeWidth="3.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}

function Fila({
  numero,
  icono,
  texto,
  activa,
  multiple,
  tenue,
  onClick,
}: {
  numero: string;
  icono?: React.ReactNode;
  texto: React.ReactNode;
  activa: boolean;
  multiple: boolean;
  tenue?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role={multiple ? "checkbox" : "radio"}
      aria-checked={activa}
      onClick={onClick}
      className={`w-full text-left grid ${icono ? "grid-cols-[2.75rem_1fr_2rem]" : "grid-cols-[2.25rem_1fr_2rem]"} items-center gap-3 px-5 sm:px-8 py-3.5 min-h-[3.75rem] transition-colors duration-150 ${
        activa ? "bg-verde-claro" : "bg-papel hover:bg-fondo/70"
      }`}
    >
      <span className={`rotulo text-[18px] ${icono ? "text-timbre" : activa ? "text-tinta" : "text-gris-texto"}`} aria-hidden>
        {icono ?? numero}
      </span>
      <span className={`${activa ? "font-bold" : ""} ${tenue && !activa ? "text-grafito" : ""}`}>{texto}</span>
      <Marca activa={activa} multiple={multiple} />
    </button>
  );
}

function PantallaPregunta({
  pregunta,
  opciones,
  valor,
  onCambio,
  esEstudiante,
  titulo,
}: {
  pregunta: Pregunta;
  opciones: Opcion[];
  valor: ValorRespuesta | undefined;
  onCambio: (v: ValorRespuesta) => void;
  esEstudiante: boolean;
  titulo: React.RefObject<HTMLHeadingElement | null>;
}) {
  const [aviso, setAviso] = useState<string | null>(null);
  const lectura = [
    pregunta.cita ? `${pregunta.cita.antes} ${pregunta.cita.texto}.` : "",
    pregunta.texto,
    ...opciones.map((o) => o.texto),
  ].join(". ");

  if (pregunta.tipo === "abierta") {
    const texto = valor?.texto ?? "";
    return (
      <div>
        <Encabezado pregunta={pregunta} titulo={titulo} lectura={pregunta.texto} />
        <div className="px-5 pb-7 sm:px-8">
          <p className="text-[18px] text-grafito">
            {esEstudiante
              ? "No escribas nombres de personas."
              : "Por favor, no escriba nombres de personas. Si aparecen, se reemplazan antes de analizar."}
          </p>
          <textarea
            value={texto}
            maxLength={MAX_ABIERTA}
            onChange={(e) => onCambio({ texto: e.target.value })}
            rows={6}
            aria-label={pregunta.texto}
            className="campo mt-3 text-[19px] leading-relaxed"
            style={{
              backgroundImage: "linear-gradient(transparent calc(1.625em - 1px), var(--color-filete) 1px)",
              backgroundSize: "100% 1.625em",
              backgroundAttachment: "local",
            }}
          />
          <p className="mt-1 text-right text-[18px] text-gris-texto">
            {texto.length} / {MAX_ABIERTA}
          </p>
        </div>
      </div>
    );
  }

  const elegidos = valor?.codigos ?? [];
  const multiple = pregunta.tipo === "multiple" || pregunta.tipo === "exacta";
  const limite = pregunta.tipo === "multiple" ? pregunta.max : pregunta.tipo === "exacta" ? pregunta.n : 1;
  const extra =
    pregunta.tipo === "exacta"
      ? `${esEstudiante ? "Llevas" : "Lleva"} ${elegidos.length} de ${pregunta.n}`
      : pregunta.tipo === "multiple"
        ? `${esEstudiante ? "Llevas" : "Lleva"} ${elegidos.length}`
        : undefined;

  function alternar(codigo: string) {
    setAviso(null);
    if (!multiple) {
      onCambio({ codigos: [codigo], texto: codigo === OTRA ? valor?.texto : undefined });
      return;
    }
    let nuevos: string[];
    if (elegidos.includes(codigo)) {
      nuevos = elegidos.filter((c) => c !== codigo);
    } else if (EXCLUYENTES.includes(codigo)) {
      nuevos = [codigo];
    } else {
      nuevos = [...elegidos.filter((c) => !EXCLUYENTES.includes(c)), codigo];
      if (nuevos.length > limite) {
        setAviso(
          esEstudiante
            ? `Ya marcaste ${limite}; desmarca una para cambiar.`
            : `Ya marcó ${limite}; desmarque una para cambiar.`,
        );
        return;
      }
    }
    onCambio({ codigos: nuevos, texto: nuevos.includes(OTRA) ? valor?.texto : undefined });
  }

  return (
    <div>
      <Encabezado pregunta={pregunta} extra={extra} titulo={titulo} lectura={lectura} />
      {pregunta.tipo === "masImportante" && opciones.length === 0 && (
        <p className="mx-5 sm:mx-8 mb-5 border border-filete bg-ocre-claro px-4 py-3 text-[18px]">
          Aquí aparecen solo las 3 prioridades marcadas en la pregunta anterior. Vuelva atrás y marque 3 para ver las
          opciones.
        </p>
      )}
      <div className="border-t border-filete divide-y divide-filete" role={multiple ? "group" : "radiogroup"} aria-label={pregunta.texto}>
        {opciones.map((o, i) => {
          const sinNumero = opciones.some((x) => /^\d/.test(x.texto));
          const activa = elegidos.includes(o.codigo);
          const letra = /^[a-o]$/.test(o.codigo);
          return (
            <div key={o.codigo}>
              <Fila
                numero={letra ? o.codigo : sinNumero ? "" : String(i + 1)}
                texto={o.codigo === OTRA ? `${o.texto}:` : o.texto}
                activa={activa}
                multiple={multiple}
                tenue={EXCLUYENTES.includes(o.codigo)}
                onClick={() => alternar(o.codigo)}
              />
              {o.codigo === OTRA && activa && (
                <div className="bg-verde-claro px-5 sm:px-8 pb-4 pl-[4.75rem] sm:pl-[5.75rem]">
                  <input
                    autoFocus
                    value={valor?.texto ?? ""}
                    maxLength={MAX_TEXTO}
                    onChange={(e) => onCambio({ codigos: elegidos, texto: e.target.value })}
                    placeholder={esEstudiante ? "Escribe cuál" : "Escriba cuál"}
                    aria-label={`${o.texto}: escriba cuál`}
                    className="campo"
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
      {/* Fijo justo sobre la barra inferior en celular: si quedara al final de la lista, la barra lo taparía. */}
      <p
        role="status"
        aria-live="polite"
        className={aviso ? "sticky bottom-[4.75rem] z-20 sm:static flex items-center gap-3 bg-tinta text-papel px-5 sm:px-8 py-3 text-[18px] font-bold" : "sr-only"}
      >
        {aviso && (
          <>
            <span className="sello text-[12px] text-papel shrink-0">Máximo</span>
            {aviso}
          </>
        )}
      </p>
    </div>
  );
}

const CARITAS = [SmileySad, SmileyMeh, Smiley, Smiley];

function PantallaItem({
  paso,
  valor,
  esEstudiante,
  titulo,
  onElegir,
}: {
  paso: Extract<Paso, { tipo: "item" }>;
  valor: string | undefined;
  esEstudiante: boolean;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  onElegir: (v: string) => void;
}) {
  const escala = ESCALAS[paso.pregunta.escala];
  const conCaritas = esEstudiante && paso.pregunta.escala === "FRE";
  const lectura = [paso.item.texto, ...escala.map((o) => o.texto)].join(". ");
  return (
    <div>
      <Encabezado pregunta={paso.pregunta} titulo={titulo} lectura={lectura} />
      <div className="mx-5 sm:mx-8 mb-5 border border-grafito">
        <p className="px-4 pt-3.5 pb-2 text-[22px] font-bold leading-snug">«{paso.item.texto}»</p>
        <p className="px-4 pb-3 text-[18px] text-grafito">
          Frase {paso.n} de {paso.total}
          {paso.grupo ? ` · ${paso.grupo}` : ""}
        </p>
      </div>
      <div className="border-t border-filete divide-y divide-filete" role="radiogroup" aria-label={paso.item.texto}>
        {escala.map((o, i) => {
          const Carita = CARITAS[i];
          return (
            <Fila
              key={o.codigo}
              numero={String(i + 1)}
              icono={conCaritas ? <Carita size={40} weight={i === 3 ? "fill" : "regular"} /> : undefined}
              texto={o.texto}
              activa={valor === o.codigo}
              multiple={false}
              tenue={o.codigo === "98"}
              onClick={() => onElegir(o.codigo)}
            />
          );
        })}
      </div>
    </div>
  );
}
