"use client";

import { Printer } from "@phosphor-icons/react";

export function Imprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="boton boton-secundario !min-h-11 !py-1.5 text-[16px] shrink-0 print:hidden">
      <Printer size={20} weight="bold" aria-hidden /> Imprimir
    </button>
  );
}
