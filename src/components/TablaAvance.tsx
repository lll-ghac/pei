import type { FilaAvance } from "@/lib/gestion";

type Conteo = { usadas: number; base: number };

function Celda({ c }: { c: Conteo | null }) {
  if (!c) return <td className="px-3 py-2 text-center text-gris-texto">—</td>;
  const pct = c.base > 0 ? Math.round((c.usadas / c.base) * 100) : 0;
  return (
    <td className="px-3 py-2">
      <div className="flex items-center gap-3">
        <span className="w-20 shrink-0 font-bold tabular-nums">
          {c.usadas}/{c.base}
        </span>
        <span className="flex-1 min-w-16 h-3 rounded-full bg-borde overflow-hidden" aria-hidden>
          <span className="block h-full bg-azul rounded-full" style={{ width: `${Math.min(100, pct)}%` }} />
        </span>
        <span className="w-12 text-right tabular-nums text-gris-texto">{pct}%</span>
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
  return cs.reduce<Conteo>(
    (a, c) => (c ? { usadas: a.usadas + c.usadas, base: a.base + c.base } : a),
    { usadas: 0, base: 0 },
  );
}

/** Participación por curso y estamento: solo números, nunca respuestas. */
export function TablaAvance({ filas, funcionarios }: { filas: FilaAvance[]; funcionarios: Conteo }) {
  const totalA = suma(filas.map((f) => f.apoderados));
  const totalE = suma(filas.map((f) => f.estudiantes));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { t: "Apoderados", c: totalA },
          { t: "Estudiantes", c: totalE },
          { t: "Funcionarios", c: funcionarios },
        ].map(({ t, c }) => (
          <div key={t} className="rounded-[24px] bg-tarjeta border border-borde p-4">
            <p className="text-base font-bold text-gris-texto">{t}</p>
            <p className="text-3xl font-extrabold text-azul tabular-nums">
              {c.usadas}
              <span className="text-lg text-gris-texto font-bold"> / {c.base}</span>
            </p>
            <p className="text-base tabular-nums">{c.base ? Math.round((c.usadas / c.base) * 100) : 0}%</p>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-[24px] bg-tarjeta border border-borde">
        <table className="w-full text-base">
          <caption className="sr-only">Respuestas por curso y estamento</caption>
          <thead>
            <tr className="text-left border-b border-borde">
              <th scope="col" className="px-3 py-2">Curso</th>
              <th scope="col" className="px-3 py-2">Apoderados</th>
              <th scope="col" className="px-3 py-2">Estudiantes</th>
            </tr>
          </thead>
          {Object.entries(NIVELES).map(([nivel, titulo]) => {
            const delNivel = filas.filter((f) => f.nivel === nivel);
            if (!delNivel.length) return null;
            return (
              <tbody key={nivel}>
                <tr className="bg-fondo">
                  <th colSpan={3} scope="colgroup" className="px-3 py-1.5 text-left text-sm uppercase tracking-wide text-verde-profundo">
                    {titulo}
                  </th>
                </tr>
                {delNivel.map((f) => (
                  <tr key={f.codigo} className="border-t border-borde">
                    <th scope="row" className="px-3 py-2 text-left font-bold whitespace-nowrap">
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
      <p className="text-sm text-gris-texto">
        Apoderados: familias que respondieron / papeletas entregadas (o matrícula, si aún no se registran las
        papeletas). Estudiantes y funcionarios: respondieron / total.
      </p>
    </div>
  );
}
