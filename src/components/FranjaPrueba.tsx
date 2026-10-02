/** Franja visible en modo Prueba (encuesta, pantalla de avance y panel). */
export function FranjaPrueba({ visible }: { visible: boolean }) {
  if (!visible) return null;
  return (
    <div
      role="status"
      className="bg-amarillo text-grafito text-center text-sm font-extrabold tracking-wide py-1.5 px-4"
    >
      MODO PRUEBA · Las respuestas de prueba se borran antes de la encuesta oficial
    </div>
  );
}
