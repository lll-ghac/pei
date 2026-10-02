import { ChatCircleText } from "@phosphor-icons/react/ssr";
import { agregarObservacion, cambiarObservacion } from "../../acciones";

export type Observacion = {
  id: number;
  pregunta: string;
  texto: string;
  creado: Date;
  resuelta: boolean;
  resueltaPor: string | null;
  autorId: number;
  autor: string;
};

const fecha = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: "America/Santiago",
});

/** Observaciones de una pregunta y formulario para agregar otra. */
export function Observaciones({
  lista,
  estamento,
  pregunta,
  gestor,
}: {
  lista: Observacion[];
  estamento: string;
  pregunta: string;
  gestor: { id: number; rol: string };
}) {
  const pendientes = lista.filter((o) => !o.resuelta).length;
  return (
    <div className="mt-3 rounded-[2px] bg-fondo border border-borde">
      {lista.length > 0 && (
        <ul className="divide-y divide-borde">
          {lista.map((o) => (
            <li key={o.id} className={`px-4 py-3 text-base ${o.resuelta ? "opacity-60" : ""}`}>
              <p className="text-sm text-gris-texto">
                <strong className="text-grafito">{o.autor}</strong> · {fecha.format(o.creado)}
                {o.resuelta && <> · resuelta por {o.resueltaPor}</>}
              </p>
              <p className={`mt-1 whitespace-pre-wrap ${o.resuelta ? "line-through" : ""}`}>{o.texto}</p>
              <div className="mt-1 flex gap-4 text-sm">
                {gestor.rol === "admin" && (
                  <form action={cambiarObservacion}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="accion" value={o.resuelta ? "reabrir" : "resolver"} />
                    <button type="submit" className="font-bold text-verde-profundo underline">
                      {o.resuelta ? "Reabrir" : "Marcar resuelta"}
                    </button>
                  </form>
                )}
                {(o.autorId === gestor.id || gestor.rol === "admin") && (
                  <form action={cambiarObservacion}>
                    <input type="hidden" name="id" value={o.id} />
                    <input type="hidden" name="accion" value="eliminar" />
                    <button type="submit" className="font-bold text-error underline">
                      Eliminar
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <details className="px-4 py-2">
        <summary className="cursor-pointer list-none inline-flex items-center gap-1.5 font-bold text-azul py-1">
          <ChatCircleText size={20} weight="bold" aria-hidden />
          Agregar observación
          {pendientes > 0 && (
            <span className="ml-1 sello text-lacre text-[12px]">{pendientes} pendiente{pendientes > 1 ? "s" : ""}</span>
          )}
        </summary>
        <form action={agregarObservacion} className="mt-2 mb-2 space-y-2">
          <input type="hidden" name="estamento" value={estamento} />
          <input type="hidden" name="pregunta" value={pregunta} />
          <textarea
            name="texto"
            required
            maxLength={2000}
            rows={3}
            placeholder="Ej.: «sellos» puede no entenderse; sugiero «lo que nos distingue». O: falta la opción…"
            aria-label={`Observación sobre ${pregunta}`}
            className="w-full rounded-[2px] border border-grafito bg-tarjeta px-3 py-2 text-base"
          />
          <button type="submit" className="boton boton-primario">
            Guardar observación
          </button>
        </form>
      </details>
    </div>
  );
}
