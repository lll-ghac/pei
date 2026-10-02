/** Aviso de modo Prueba (encuesta, pantalla de avance y panel). */
export function FranjaPrueba({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div role="status" className="bg-ocre-claro text-tinta border-b border-filete">
      <p className="mx-auto max-w-6xl px-4 py-1.5 text-[15px] flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="sello text-lacre text-[13px]">Prueba</span>
        <span>Las respuestas de prueba se borran antes de la encuesta oficial.</span>
      </p>
    </div>
  );
}
