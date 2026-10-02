import type { FilaAvance } from "@/lib/gestion";

type Conteo = { usadas: number; base: number };

const pct = (c: Conteo) => (c.base > 0 ? Math.round((c.usadas / c.base) * 100) : 0);

/** Celda del acta: cifra tabular y una regla fina proporcional. */
function Celda({ c, fuerte }: { c: Conteo | null; fuerte?: boolean }) {
  if (!c) return <td className="px-3 py-2.5 text-gris-texto">—</td>;
  const p = pct(c);
  return (
    <td className="px-3 py-2.5">
      <div className="flex items-center gap-3">
        <span className={`w-[4.5rem] shrink-0 text-right ${fuerte ? "font-bold" : ""}`}>
          {c.usadas}
          <span className="text-gris-texto"> / {c.base}</span>
        </span>
        <span className="relative flex-1 min-w-12 h-[3px] bg-filete" aria-hidden>
          <span className="absolute inset-y-0 left-0 bg-grafito" style={{ width: `${Math.min(100, p)}%` }} />
        </span>
        <span className={`w-11 shrink-0 text-right ${fuerte ? "font-bold" : "text-grafito"}`}>{p}%</span>
      </div>
    </td>
  );
}

const NIVELES: Record<string, string> = {
  parvularia: "Educación Parvularia",
  basica_1_4: "1° a 4° básico",
  basica_5_8: "5° a 8° básico",
  opcion4: "PIE Opción 4",
};

function suma(cs: (Conteo | null)[]): Conteo {
  return cs.reduce<Conteo>((a, c) => (c ? { usadas: a.usadas + c.usadas, base: a.base + c.base } : a), {
    usadas: 0,
    base: 0,
  });
}

/** Participación por curso y estamento, como un acta de mesa: solo números, nunca respuestas. */
export function TablaAvance({ filas, funcionarios }: { filas: FilaAvance[]; funcionarios: Conteo }) {
  const totalA = suma(filas.map((f) => f.apoderados));
  const totalE = suma(filas.map((f) => f.estudiantes));

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto bg-papel border border-filete">
        <table className="w-full min-w-[40rem] text-[17px]">
          <caption className="sr-only">Respuestas por curso y estamento</caption>
          <thead>
            <tr className="bg-tinta text-papel text-left">
              <th scope="col" className="rotulo text-[14px] px-3 py-2.5 w-[28%]">
                Curso
              </th>
              <th scope="col" className="rotulo text-[14px] px-3 py-2.5">
                Apoderados
              </th>
              <th scope="col" className="rotulo text-[14px] px-3 py-2.5">
                Estudiantes
              </th>
            </tr>
          </thead>
          <tbody className="border-b-2 border-tinta">
            <tr>
              <th scope="row" className="px-3 py-3 text-left font-bold">
                Total escuela
              </th>
              <Celda c={totalA} fuerte />
              <Celda c={totalE} fuerte />
            </tr>
            <tr className="border-t border-filete">
              <th scope="row" className="px-3 py-3 text-left font-bold">
                Funcionarios
              </th>
              <Celda c={funcionarios} fuerte />
              <td className="px-3 py-3 text-gris-texto">—</td>
            </tr>
          </tbody>
          {Object.entries(NIVELES).map(([nivel, titulo]) => {
            const delNivel = filas.filter((f) => f.nivel === nivel);
            if (!delNivel.length) return null;
            return (
              <tbody key={nivel}>
                <tr className="border-t border-grafito">
                  <th colSpan={3} scope="colgroup" className="rotulo text-[13px] text-grafito text-left px-3 pt-3 pb-1">
                    {titulo}
                  </th>
                </tr>
                {delNivel.map((f) => (
                  <tr key={f.codigo} className="border-t border-filete">
                    <th scope="row" className="px-3 py-2.5 text-left font-normal whitespace-nowrap">
                      {f.nombre}
                    </th>
                    <Celda c={f.apoderados} />
                    <Celda c={f.estudiantes} />
                  </tr>
                ))}
              </tbody>
            );
          })}
        </table>
      </div>
      <p className="text-[15px] text-gris-texto max-w-[75ch]">
        Apoderados: familias que respondieron sobre papeletas entregadas (o la matrícula, si aún no se registran las
        papeletas). Estudiantes y funcionarios: respondieron sobre el total.
      </p>
    </div>
  );
}
