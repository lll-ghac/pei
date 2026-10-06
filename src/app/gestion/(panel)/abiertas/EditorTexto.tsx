"use client";

import { useRef, useState } from "react";
import { guardarTexto } from "../../acciones";

/** Editor de un texto: reemplazar nombres por un rol genérico y guardarlo como revisado o «no publicar». */
export function EditorTexto({ id, texto, roles }: { id: string; texto: string; roles: string[] }) {
  const [valor, setValor] = useState(texto);
  const area = useRef<HTMLTextAreaElement>(null);

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

  return (
    <form action={guardarTexto} className="space-y-2">
      <input type="hidden" name="id" value={id} />
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
      <div className="flex flex-wrap gap-1.5" aria-label="Reemplazar la selección por un rol">
        <span className="self-center text-[14px] text-grafito mr-1">Seleccione el nombre y reemplácelo por:</span>
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
        <button type="submit" name="accion" value="revisado" className="boton boton-primario !min-h-11 !py-1.5 text-[16px]">
          Guardar como revisado
        </button>
        <button type="submit" name="accion" value="no_publicar" className="boton boton-secundario !min-h-11 !py-1.5 text-[16px]">
          No publicar
        </button>
      </div>
    </form>
  );
}
