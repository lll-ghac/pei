import { AutoRefresco } from "@/components/AutoRefresco";
import { TablaAvance } from "@/components/TablaAvance";
import { avance } from "@/lib/gestion";
import { fallidosUltimaHora, papeletasBloqueadas } from "@/lib/limite";

export default async function PanelInicio(props: PageProps<"/gestion">) {
  const { error } = await props.searchParams;
  const { estado, filas, funcionarios } = await avance();
  const fallidos = fallidosUltimaHora();
  const bloqueadas = papeletasBloqueadas();

  return (
    <div className="space-y-5">
      {error === "permiso" && (
        <p
          role="alert"
          className="rounded-[2px] bg-error/10 text-error font-semibold px-3 py-2"
        >
          Esa sección es solo para administración.
        </p>
      )}
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="titulo text-[30px]">Avance</h1>
        <p className="text-base">
          Modo{" "}
          <strong>{estado.modo === "prueba" ? "Prueba" : "Oficial"}</strong>
          {estado.modo === "oficial" && (
            <>
              {" "}
              · periodo{" "}
              <strong>{estado.abierta ? "abierto" : "cerrado"}</strong>
            </>
          )}
        </p>
        <p
          className={`text-base ${fallidos > 30 ? "text-error font-bold" : "text-gris-texto"}`}
        >
          Ingresos fallidos en la última hora: {fallidos}
          {fallidos > 30 &&
            " · revise si hay intentos de adivinar credenciales"}
        </p>
        <p
          className={`text-base ${bloqueadas >= 10 ? "text-error font-bold" : "text-gris-texto"}`}
          title="Papeletas con 5 intentos fallidos desde una misma conexión: quedan bloqueadas 15 minutos solo para esa conexión"
        >
          Papeletas bloqueadas ahora: {bloqueadas}
          {bloqueadas >= 10 &&
            " · posible intento de bloquear papeletas: avise a la administración"}
        </p>
      </div>
      <p className="rounded-[2px] bg-timbre-claro px-3 py-2 text-base">
        Esta vista muestra cuántas credenciales se usaron por curso. Nadie sabe
        qué credencial recibió cada persona. Los resultados se abren cuando se
        cierra la encuesta.
      </p>
      <TablaAvance filas={filas} funcionarios={funcionarios} />
      <AutoRefresco segundos={60} />
    </div>
  );
}
