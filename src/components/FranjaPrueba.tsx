/** Aviso de modo Prueba (encuesta, pantalla de avance y panel). */
export function FranjaPrueba({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    // En pantallas muy bajas, mientras se responde una frase de escala, deja el espacio a las opciones.
    <div role="status" className="franja-prueba bg-ocre-claro text-tinta border-b border-filete">
      <p className="mx-auto max-w-6xl px-4 py-1 text-[15px] flex items-center gap-x-3">
        <span className="sello text-lacre text-[12px] shrink-0">Prueba</span>
        <span className="sm:hidden">Se borra antes de la encuesta oficial.</span>
        <span className="hidden sm:inline">Las respuestas de prueba se borran antes de la encuesta oficial.</span>
      </p>
    </div>
  );
}
