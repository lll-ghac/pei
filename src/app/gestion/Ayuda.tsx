/** Botón «?» que abre una ventana de ayuda (popover nativo: funciona sin JavaScript propio y se cierra con Esc). */
export function Ayuda({ id, titulo, children }: { id: string; titulo: string; children: React.ReactNode }) {
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        aria-label={`Ayuda: ${titulo}`}
        title={`Ayuda: ${titulo}`}
        className="inline-grid place-items-center size-8 shrink-0 rounded-full border-2 border-timbre text-timbre text-[16px] font-bold align-middle hover:bg-fondo leading-none"
      >
        ?
      </button>
      <div
        id={id}
        popover="auto"
        role="dialog"
        aria-label={titulo}
        className="m-auto w-[min(36rem,calc(100vw-2rem))] max-h-[85vh] overflow-y-auto border border-tinta bg-papel p-5 text-[16px] leading-relaxed text-tinta normal-case font-normal backdrop:bg-tinta/30"
      >
        <h2 className="rotulo text-[18px] mb-3">{titulo}</h2>
        <div className="space-y-2.5">{children}</div>
        <button type="button" popoverTarget={id} popoverTargetAction="hide" className="boton boton-secundario !min-h-11 !py-1.5 text-[16px] mt-4">
          Entendido
        </button>
      </div>
    </>
  );
}

/** Aviso de que una sección se está usando con la encuesta abierta, solo posible en modo Prueba. */
export function AvisoEnsayo() {
  return (
    <p role="note" className="border border-lacre/50 bg-papel px-3 py-2 text-[16px] max-w-[85ch]">
      <strong className="text-lacre">Modo Prueba:</strong> esta sección se puede usar con la encuesta abierta para
      ensayar. En modo Oficial solo se abre después de cerrar la encuesta.
    </p>
  );
}
