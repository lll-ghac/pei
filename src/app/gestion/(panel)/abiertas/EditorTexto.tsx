"use client";

import { useRef, useState } from "react";
import { guardarTexto } from "../../acciones";

/**
 * Editor de un texto: reemplazar nombres por un rol general y guardarlo como revisado o «no publicar».
 * Como el original no se conserva, si el texto cambió se muestra cómo quedará y se pide confirmar.
 */
export function EditorTexto({
  id,
  texto,
  roles,
}: {
  id: string;
  texto: string;
  roles: string[];
}) {
  const [valor, setValor] = useState(texto);
  const [confirmando, setConfirmando] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);
  const cambio = valor.trim() !== texto.trim();

  function insertar(rol: string) {
    const el = area.current;
    if (!el) return;
    const { selectionStart: a, selectionEnd: b } = el;
    const nuevo = valor.slice(0, a) + rol + valor.slice(b);
    setValor(nuevo);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(a + rol.length, a + rol.length);
    });
  }

  /** El texto final, con los roles insertados resaltados. */
  const vistaFinal = valor.split(/(\[[^\]]+\])/g).map((parte, k) =>
    /^\[[^\]]+\]$/.test(parte) ? (
      <mark
        key={k}
        className="bg-verde-claro text-tinta border-b-2 border-verde-tinta px-0.5"
      >
        {parte}
      </mark>
    ) : (
      <span key={k}>{parte}</span>
    ),
  );

  return (
    <form action={guardarTexto} className="space-y-2">
      <input type="hidden" name="id" value={id} />
      {confirmando ? (
        <div
          className="border-2 border-tinta bg-papel p-3 space-y-2"
          role="group"
          aria-label="Confirmar el texto final"
        >
          <p className="rotulo text-[14px] text-grafito">
            Así quedará guardado (el original no se conserva)
          </p>
          <p className="text-[17px] leading-relaxed whitespace-pre-wrap">
            {vistaFinal}
          </p>
          <input type="hidden" name="texto" value={valor} />
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              name="accion"
              value="revisado"
              className="boton boton-primario !min-h-11 !py-1.5 text-[16px]"
            >
              Confirmar y guardar
            </button>
            <button
              type="button"
              onClick={() => setConfirmando(false)}
              className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]"
            >
              Volver a editar
            </button>
          </div>
        </div>
      ) : (
        <>
          <textarea
            ref={area}
            name="texto"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            rows={Math.min(8, Math.max(3, Math.ceil(valor.length / 70)))}
            maxLength={1000}
            aria-label="Texto revisado"
            className="campo text-[17px] leading-relaxed"
          />
          <div
            className="flex flex-wrap gap-1.5"
            aria-label="Reemplazar la selección por un rol"
          >
            <span className="self-center text-[14px] text-grafito mr-1">
              Seleccione el nombre y reemplácelo por:
            </span>
            {roles.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => insertar(r)}
                className="rounded-[2px] border border-grafito px-2 py-1 text-[14px] hover:bg-fondo"
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              name="accion"
              value="revisado"
              onClick={(e) => {
                // Si el texto cambió, primero se muestra cómo quedará.
                if (cambio) {
                  e.preventDefault();
                  setConfirmando(true);
                }
              }}
              className="boton boton-primario !min-h-11 !py-1.5 text-[16px]"
            >
              {cambio ? "Guardar como revisado…" : "Guardar como revisado"}
            </button>
            <button
              type="submit"
              name="accion"
              value="no_publicar"
              className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]"
            >
              No publicar
            </button>
          </div>
        </>
      )}
    </form>
  );
}
