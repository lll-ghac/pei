"use client";

import { useState } from "react";

type Curso = { codigo: string; nombre: string; matricula: number; tieneEstudiantes: boolean };

const campo = "w-full min-w-0 rounded-[2px] border border-grafito bg-tarjeta px-3 py-2.5 text-base";
const etiqueta = "grid gap-1 min-w-0 font-bold text-base";

/** Campos del formulario de lotes: el curso depende del estamento elegido. */
export function CamposLote({ cursos, tipoInicial }: { cursos: Curso[]; tipoInicial: "prueba" | "oficial" }) {
  const [estamento, setEstamento] = useState("A");
  const visibles = estamento === "E" ? cursos.filter((c) => c.tieneEstudiantes) : cursos;
  const [curso, setCurso] = useState(cursos[0]?.codigo ?? "");
  const seleccionado = visibles.find((c) => c.codigo === curso) ?? visibles[0];
  const sugerida = seleccionado ? Math.ceil(seleccionado.matricula * 1.1) : 10;

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.6fr_0.7fr]">
      <label className={etiqueta}>
        Tipo
        <select name="tipo" defaultValue={tipoInicial} className={campo}>
          <option value="prueba">Prueba (PRUEBA-)</option>
          <option value="oficial">Oficial</option>
        </select>
      </label>
      <label className={etiqueta}>
        Estamento
        <select name="estamento" value={estamento} onChange={(e) => setEstamento(e.target.value)} className={campo}>
          <option value="A">Apoderados</option>
          <option value="E">Estudiantes (5° a 8°)</option>
          <option value="F">Funcionarios</option>
        </select>
      </label>
      <label className={etiqueta}>
        Curso
        <select
          name="curso"
          value={seleccionado?.codigo ?? ""}
          onChange={(e) => setCurso(e.target.value)}
          disabled={estamento === "F"}
          className={`${campo} disabled:opacity-50`}
        >
          {estamento === "F" ? (
            <option value="">No aplica a funcionarios</option>
          ) : (
            visibles.map((c) => (
              <option key={c.codigo} value={c.codigo}>
                {c.nombre} (matrícula {c.matricula})
              </option>
            ))
          )}
        </select>
      </label>
      <label className={etiqueta}>
        Cantidad
        <input
          key={`${estamento}-${seleccionado?.codigo}`}
          name="cantidad"
          type="number"
          min={1}
          max={300}
          defaultValue={estamento === "F" ? 10 : sugerida}
          className={campo}
          required
        />
      </label>
    </div>
  );
}
