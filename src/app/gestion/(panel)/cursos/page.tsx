import { db, schema } from "@/db";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { guardarCurso, guardarFuncionarios } from "../../acciones";

const campo = "w-20 rounded-lg border-2 border-borde bg-tarjeta px-2 py-1.5 text-base tabular-nums";

export default async function Cursos() {
  await exigirGestor("admin");
  const [cursos, estado] = await Promise.all([
    db.select().from(schema.cursos).orderBy(schema.cursos.orden),
    leerEstado(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-azul">Cursos y matrícula</h1>
        <p className="mt-1 text-base text-gris-texto">
          Sin nombres: solo la cantidad de estudiantes. Un curso con matrícula 0 queda inactivo. La columna
          «Papeletas apoderados» es el número que informa el profesor jefe (sin nombres); si se deja vacía, el
          avance usa la matrícula como base.
        </p>
      </div>

      <div className="overflow-x-auto rounded-[24px] bg-tarjeta border border-borde">
        <table className="w-full text-base">
          <thead>
            <tr className="text-left border-b border-borde">
              <th className="px-3 py-2">Curso</th>
              <th className="px-3 py-2">Prefijo</th>
              <th className="px-3 py-2">Responden</th>
              <th className="px-3 py-2" colSpan={2}>
                Matrícula · Papeletas apoderados
              </th>
            </tr>
          </thead>
          <tbody>
            {cursos.map((c) => (
              <tr key={c.codigo} className={`border-t border-borde ${c.activo ? "" : "opacity-60"}`}>
                <td className="px-3 py-2 font-bold whitespace-nowrap">{c.nombre}</td>
                <td className="px-3 py-2 font-mono">{c.codigo}-</td>
                <td className="px-3 py-2">{c.tieneEstudiantes ? "Apoderados y estudiantes" : "Apoderados"}</td>
                <td className="px-3 py-2" colSpan={2}>
                  <form action={guardarCurso} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="codigo" value={c.codigo} />
                    <input
                      name="matricula"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={c.matricula}
                      aria-label={`Matrícula de ${c.nombre}`}
                      className={campo}
                    />
                    <input
                      name="papeletas"
                      type="number"
                      min={0}
                      max={99}
                      defaultValue={c.papeletasApoderados ?? ""}
                      placeholder="—"
                      aria-label={`Papeletas de apoderados entregadas en ${c.nombre}`}
                      className={campo}
                    />
                    <button type="submit" className="rounded-full border-2 border-verde-profundo text-verde-profundo px-3 py-1 font-bold">
                      Guardar
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form action={guardarFuncionarios} className="rounded-[24px] bg-tarjeta border border-borde p-4 flex flex-wrap items-center gap-3">
        <label htmlFor="total" className="font-bold">
          Total de funcionarios (docentes, asistentes y equipo directivo)
        </label>
        <input id="total" name="total" type="number" min={0} max={500} defaultValue={estado.funcionariosTotal} className={campo} />
        <button type="submit" className="rounded-full border-2 border-verde-profundo text-verde-profundo px-3 py-1 font-bold">
          Guardar
        </button>
      </form>
    </div>
  );
}
