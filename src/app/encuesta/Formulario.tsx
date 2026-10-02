"use client";

import {
  ArrowLeft,
  ArrowRight,
  Check,
  PaperPlaneTilt,
  Smiley,
  SmileyMeh,
  SmileySad,
  SpeakerHigh,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { enviarEncuesta } from "../acciones";
import { ESCALAS } from "@/lib/encuestas/listas";
import {
  ENCUESTAS,
  EXCLUYENTES,
  OTRA,
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

type Props = { estamento: Estamento; curso: string | null };

export function Formulario({ estamento, curso }: Props) {
  const encuesta = ENCUESTAS[estamento];
  const esEstudiante = estamento === "E";
  const router = useRouter();
  const [respuestas, setRespuestas] = useState<Respuestas>({});
  const [indice, setIndice] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [enviando, iniciarEnvio] = useTransition();
  const enviado = useRef(false);
  const titulo = useRef<HTMLHeadingElement>(null);

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
      if (hayRespuestas && !enviado.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", aviso);
    return () => window.removeEventListener("beforeunload", aviso);
  }, [hayRespuestas]);

  // Al cambiar de pantalla: foco en el título (lectores de pantalla y teclado) y arriba.
  useEffect(() => {
    window.scrollTo({ top: 0 });
    titulo.current?.focus();
    window.speechSynthesis?.cancel();
  }, [indice]);

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

  function anterior() {
    setError(null);
    setIndice((i) => Math.max(i - 1, 0));
  }

  function enviar() {
    // Revisión completa antes de enviar; si falta algo, se vuelve a esa pantalla.
    for (let i = 1; i < pasos.length - 1; i++) {
      const e = validarPaso(pasos[i]);
      if (e) {
        setIndice(i);
        setError(e);
        return;
      }
    }
    iniciarEnvio(async () => {
      const r = await enviarEncuesta(respuestas);
      if (r.ok) {
        enviado.current = true;
        setRespuestas({});
        router.replace(`/gracias?e=${estamento}`);
      } else {
        setError(r.error);
      }
    });
  }

  const numeroPregunta =
    paso.tipo === "pregunta" || paso.tipo === "item"
      ? preguntasDe(encuesta).findIndex((q) => q.codigo === paso.pregunta.codigo) + 1
      : 0;
  const avance = indice / (pasos.length - 1);
  const minutosRestantes = Math.max(1, Math.ceil(encuesta.minutos * (1 - avance)));

  return (
    <div className={esEstudiante ? "estudiante" : ""}>
      {paso.tipo !== "intro" && (
        <div className="mb-4">
          <div className="flex justify-between text-sm font-semibold text-gris-texto">
            <span>
              {paso.tipo === "confirmar"
                ? "Último paso"
                : `Pregunta ${numeroPregunta} de ${totalPreguntas}`}
            </span>
            {paso.tipo !== "confirmar" && <span>Quedan unos {minutosRestantes} min</span>}
          </div>
          <div
            className="mt-1.5 h-3 rounded-full bg-borde overflow-hidden"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(avance * 100)}
            aria-label="Avance de la encuesta"
          >
            <div className="h-full bg-azul rounded-full transition-[width]" style={{ width: `${avance * 100}%` }} />
          </div>
        </div>
      )}

      <div className="rounded-[24px] bg-tarjeta border border-borde p-5 sm:p-7 shadow-sm">
        {paso.tipo === "intro" && (
          <Intro estamento={estamento} curso={curso} titulo={titulo} />
        )}

        {paso.tipo === "pregunta" && (
          <PantallaPregunta
            key={paso.pregunta.codigo}
            pregunta={paso.pregunta}
            seccion={paso.seccion}
            opciones={opcionesDe(paso.pregunta, respuestas, encuesta)}
            valor={respuestas[paso.pregunta.codigo]}
            onCambio={(v) => actualizar(paso.pregunta.codigo, v)}
            esEstudiante={esEstudiante}
            titulo={titulo}
          />
        )}

        {paso.tipo === "item" && (
          <PantallaItem
            paso={paso}
            valor={respuestas[paso.pregunta.codigo]?.items?.[paso.item.codigo]}
            titulo={titulo}
            onElegir={(v) => {
              const actual = respuestas[paso.pregunta.codigo]?.items ?? {};
              actualizar(paso.pregunta.codigo, { items: { ...actual, [paso.item.codigo]: v } });
              // Avanza solo a la siguiente frase para ahorrar toques.
              window.setTimeout(() => setIndice((i) => (i === indice ? i + 1 : i)), 250);
            }}
          />
        )}

        {paso.tipo === "confirmar" && (
          <div>
            <h2 ref={titulo} tabIndex={-1} className="titulo-encuesta text-2xl sm:text-3xl font-extrabold text-azul outline-none">
              {esEstudiante ? "¡Ya casi terminas!" : "Ya casi termina"}
            </h2>
            <p className="mt-3 text-lg">
              {esEstudiante
                ? "Cuando envíes, ya no podrás cambiar tus respuestas."
                : "Al enviar, sus respuestas se guardan de forma anónima y ya no podrá modificarlas."}
            </p>
            <p className="mt-2 text-base text-gris-texto">
              {esEstudiante
                ? "Si quieres revisar algo, usa el botón Anterior."
                : "Si quiere revisar algo, use el botón Anterior."}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="mt-5 rounded-2xl bg-error/10 text-error font-semibold px-4 py-3">
            {error}
          </p>
        )}
      </div>

      <nav className="mt-5 flex items-center gap-3" aria-label="Navegación de la encuesta">
        {indice > 0 && (
          <button
            type="button"
            onClick={anterior}
            disabled={enviando}
            className="inline-flex items-center gap-2 rounded-full border-2 border-grafito/30 bg-tarjeta px-5 py-3 min-h-14 font-bold"
          >
            <ArrowLeft size={22} weight="bold" aria-hidden />
            Anterior
          </button>
        )}
        <div className="ml-auto">
          {paso.tipo === "confirmar" ? (
            <button
              type="button"
              onClick={enviar}
              disabled={enviando}
              className="inline-flex items-center gap-2 rounded-full bg-verde-profundo text-white px-7 py-3 min-h-14 text-lg font-bold disabled:opacity-60"
            >
              <PaperPlaneTilt size={24} weight="bold" aria-hidden />
              {enviando ? "Enviando…" : "Enviar encuesta"}
            </button>
          ) : (
            <button
              type="button"
              onClick={siguiente}
              className="inline-flex items-center gap-2 rounded-full bg-verde-profundo text-white px-7 py-3 min-h-14 text-lg font-bold"
            >
              {paso.tipo === "intro" ? "Comenzar" : "Siguiente"}
              <ArrowRight size={24} weight="bold" aria-hidden />
            </button>
          )}
        </div>
      </nav>
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
  const esEstudiante = estamento === "E";
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-verde-profundo">
        {encuesta.titulo}
        {curso ? ` · ${curso}` : ""}
      </p>
      <h1 ref={titulo} tabIndex={-1} className="titulo-encuesta mt-1 text-3xl sm:text-4xl font-extrabold text-azul outline-none">
        Diseñando el futuro de nuestra escuela
      </h1>
      {encuesta.introduccion.map((t) => (
        <p key={t} className="mt-3 text-lg">
          {t}
        </p>
      ))}
      <div className="mt-5 rounded-2xl bg-verde/15 border border-verde/40 p-4 text-base">
        {esEstudiante ? (
          <p>
            Tus respuestas son secretas. Tu profesor, la dirección ni nadie podrá saber qué marcaste. Solo
            se verán los resultados de todo el curso juntos. No es una prueba y no tiene nota.
          </p>
        ) : (
          <p>
            La encuesta es anónima. Su credencial se entregó al azar y nadie sabe cuál recibió. El sistema
            registra que esta credencial ya participó, pero guarda sus respuestas por separado, sin ningún
            vínculo con ella. Nadie, ni la dirección ni la comisión, puede saber qué respondió usted. Los
            resultados se muestran solo en grupos de 5 o más personas.
          </p>
        )}
        <p className="mt-2">
          <a href="/anonimato" target="_blank" className="text-azul underline font-semibold">
            ¿Cómo protegemos tu anonimato?
          </a>{" "}
          ·{" "}
          <a href="/privacidad" target="_blank" className="text-azul underline font-semibold">
            Privacidad
          </a>
        </p>
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
      className="shrink-0 rounded-full bg-azul/10 text-azul p-2.5 min-h-11 min-w-11 grid place-items-center"
      aria-label="Leer en voz alta"
      title="Leer en voz alta"
    >
      <SpeakerHigh size={24} weight="bold" />
    </button>
  );
}

function Encabezado({
  seccion,
  pregunta,
  extra,
  titulo,
  lectura,
}: {
  seccion: string;
  pregunta: Pregunta;
  extra?: string;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  lectura: string;
}) {
  return (
    <div>
      <p className="text-sm font-bold uppercase tracking-wide text-verde-profundo">{seccion}</p>
      {pregunta.cita && (
        <figure className="mt-3 rounded-2xl bg-fondo border-l-4 border-azul p-4">
          <figcaption className="text-base text-gris-texto">{pregunta.cita.antes}</figcaption>
          <blockquote className="mt-1 text-lg italic">«{pregunta.cita.texto}»</blockquote>
        </figure>
      )}
      <div className="mt-3 flex items-start gap-3">
        <h1 ref={titulo} tabIndex={-1} className="titulo-encuesta flex-1 text-2xl sm:text-3xl font-extrabold leading-snug outline-none">
          <span className="text-azul">{pregunta.numero}.</span> {pregunta.texto}
        </h1>
        <LeerEnVozAlta texto={lectura} />
      </div>
      {(pregunta.indicacion || extra) && (
        <p className="mt-1 text-base font-semibold text-gris-texto">
          {[pregunta.indicacion, extra].filter(Boolean).join(" · ")}
        </p>
      )}
    </div>
  );
}

function PantallaPregunta({
  pregunta,
  seccion,
  opciones,
  valor,
  onCambio,
  esEstudiante,
  titulo,
}: {
  pregunta: Pregunta;
  seccion: string;
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
        <Encabezado seccion={seccion} pregunta={pregunta} titulo={titulo} lectura={pregunta.texto} />
        <p className="mt-3 text-base text-gris-texto">
          {esEstudiante
            ? "No escribas nombres de personas."
            : "Por favor, no escriba nombres de personas. Si aparecen, se reemplazan antes de analizar."}
        </p>
        <textarea
          value={texto}
          maxLength={MAX_TEXTO}
          onChange={(e) => onCambio({ texto: e.target.value })}
          rows={5}
          aria-label={pregunta.texto}
          className="mt-3 w-full rounded-2xl border-2 border-borde bg-tarjeta p-4 text-lg focus:border-azul"
        />
        <p className="text-right text-sm text-gris-texto">
          {texto.length} / {MAX_TEXTO}
        </p>
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
            ? `Puedes elegir ${limite}. Quita una para cambiarla.`
            : `Puede elegir ${limite}. Quite una para cambiarla.`,
        );
        return;
      }
    }
    onCambio({ codigos: nuevos, texto: nuevos.includes(OTRA) ? valor?.texto : undefined });
  }

  return (
    <div>
      <Encabezado seccion={seccion} pregunta={pregunta} extra={extra} titulo={titulo} lectura={lectura} />
      <div className="mt-4 grid gap-2.5" role={multiple ? "group" : "radiogroup"} aria-label={pregunta.texto}>
        {opciones.map((o) => {
          const activo = elegidos.includes(o.codigo);
          const etiqueta = pregunta.tipo === "masImportante" || /^[a-o]$/.test(o.codigo) ? `${o.codigo}) ${o.texto}` : o.texto;
          return (
            <div key={o.codigo}>
              <button
                type="button"
                role={multiple ? "checkbox" : "radio"}
                aria-checked={activo}
                onClick={() => alternar(o.codigo)}
                className={`w-full text-left flex items-center gap-3 rounded-2xl border-2 px-4 py-3 min-h-14 text-lg transition-colors ${
                  activo
                    ? "border-verde-profundo bg-verde text-verde-oscuro font-bold"
                    : "border-borde bg-tarjeta hover:border-verde"
                }`}
              >
                <span
                  className={`shrink-0 grid place-items-center size-7 border-2 ${multiple ? "rounded-lg" : "rounded-full"} ${
                    activo ? "bg-verde-oscuro border-verde-oscuro text-white" : "border-grafito/40"
                  }`}
                  aria-hidden
                >
                  {activo && <Check size={18} weight="bold" />}
                </span>
                <span>{o.codigo === OTRA ? `${o.texto}:` : etiqueta}</span>
              </button>
              {o.codigo === OTRA && activo && (
                <input
                  autoFocus
                  value={valor?.texto ?? ""}
                  maxLength={MAX_TEXTO}
                  onChange={(e) => onCambio({ codigos: elegidos, texto: e.target.value })}
                  placeholder={esEstudiante ? "Escribe cuál" : "Escriba cuál"}
                  aria-label={`${o.texto}: escriba cuál`}
                  className="mt-2 w-full rounded-2xl border-2 border-borde bg-tarjeta px-4 py-3 text-lg focus:border-azul"
                />
              )}
            </div>
          );
        })}
      </div>
      {aviso && (
        <p role="status" className="mt-3 font-semibold text-azul">
          {aviso}
        </p>
      )}
    </div>
  );
}

const CARITAS = [SmileySad, SmileyMeh, Smiley, Smiley];

function PantallaItem({
  paso,
  valor,
  titulo,
  onElegir,
}: {
  paso: Extract<Paso, { tipo: "item" }>;
  valor: string | undefined;
  titulo: React.RefObject<HTMLHeadingElement | null>;
  onElegir: (v: string) => void;
}) {
  const escala = ESCALAS[paso.pregunta.escala];
  const conCaritas = paso.pregunta.escala === "FRE";
  const lectura = [paso.item.texto, ...escala.map((o) => o.texto)].join(". ");
  return (
    <div>
      <Encabezado
        seccion={paso.grupo ? `${paso.seccion} · ${paso.grupo}` : paso.seccion}
        pregunta={paso.pregunta}
        extra={`Frase ${paso.n} de ${paso.total}`}
        titulo={titulo}
        lectura={lectura}
      />
      <p className="mt-5 rounded-2xl bg-azul/8 border-2 border-azul/30 px-4 py-4 text-xl font-bold">
        «{paso.item.texto}»
      </p>
      <div
        className={`mt-4 grid gap-2.5 ${conCaritas ? "grid-cols-2 sm:grid-cols-4" : ""}`}
        role="radiogroup"
        aria-label={paso.item.texto}
      >
        {escala.map((o, i) => {
          const activo = valor === o.codigo;
          const Carita = CARITAS[i];
          if (conCaritas) {
            return (
              <button
                key={o.codigo}
                type="button"
                role="radio"
                aria-checked={activo}
                onClick={() => onElegir(o.codigo)}
                className={`flex flex-col items-center gap-1 rounded-2xl border-2 px-2 py-3 min-h-24 text-lg font-bold ${
                  activo ? "border-verde-profundo bg-verde text-verde-oscuro" : "border-borde bg-tarjeta"
                }`}
              >
                <Carita size={44} weight={i === 3 ? "fill" : "regular"} className={activo ? "" : "text-azul"} aria-hidden />
                {o.texto}
              </button>
            );
          }
          const esNoSe = o.codigo === "98";
          return (
            <button
              key={o.codigo}
              type="button"
              role="radio"
              aria-checked={activo}
              onClick={() => onElegir(o.codigo)}
              className={`w-full text-left flex items-center gap-3 rounded-2xl border-2 px-4 py-3 min-h-14 text-lg ${
                activo
                  ? "border-verde-profundo bg-verde text-verde-oscuro font-bold"
                  : esNoSe
                    ? "border-dashed border-borde bg-fondo text-gris-texto"
                    : "border-borde bg-tarjeta"
              }`}
            >
              <span
                className={`shrink-0 grid place-items-center size-7 rounded-full border-2 ${
                  activo ? "bg-verde-oscuro border-verde-oscuro text-white" : "border-grafito/40"
                }`}
                aria-hidden
              >
                {activo && <Check size={18} weight="bold" />}
              </span>
              {o.texto}
            </button>
          );
        })}
      </div>
    </div>
  );
}
