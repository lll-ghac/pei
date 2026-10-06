"use client";

import { useState } from "react";
import { verificarHuella, type Aviso } from "../../acciones";

/** Calcula la huella SHA-256 en el navegador (el archivo no sale del equipo) y la busca en la bitácora. */
export function Verificar() {
  const [aviso, setAviso] = useState<Aviso>({});
  const [ocupado, setOcupado] = useState(false);

  async function revisar(archivo: File | undefined) {
    if (!archivo) return;
    setOcupado(true);
    setAviso({});
    try {
      const resumen = await crypto.subtle.digest("SHA-256", await archivo.arrayBuffer());
      const h = Array.from(new Uint8Array(resumen), (b) => b.toString(16).padStart(2, "0")).join("");
      setAviso(await verificarHuella(h));
    } catch {
      setAviso({ error: "No se pudo leer el archivo. Intente de nuevo." });
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="space-y-3">
      <label className="grid gap-1 font-bold text-[16px] max-w-xl">
        Archivo a verificar (PDF, Excel, CSV o .zip)
        <input
          type="file"
          onChange={(e) => revisar(e.currentTarget.files?.[0])}
          disabled={ocupado}
          className="text-[16px] font-normal"
        />
      </label>
      {ocupado && <p className="text-grafito">Calculando la huella…</p>}
      {aviso.ok && (
        <p role="status" className="border border-verde-tinta bg-verde-claro text-verde-oscuro font-bold px-3 py-2 text-[16px]">
          {aviso.ok}
        </p>
      )}
      {aviso.error && (
        <p role="alert" className="border border-lacre bg-lacre-claro text-lacre px-3 py-2 text-[16px] break-words">
          {aviso.error}
        </p>
      )}
    </div>
  );
}
