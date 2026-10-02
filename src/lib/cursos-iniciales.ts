// Los 25 cursos del MVP. La matrícula es aproximada (septiembre 2026) y se
// ajusta desde el panel del administrador.
type CursoInicial = {
  codigo: string;
  nombre: string;
  nivel: "parvularia" | "basica_1_4" | "basica_5_8" | "opcion4";
  matricula: number;
};

const basica = (n: number, letra: string, matricula: number): CursoInicial => ({
  codigo: `${n}${letra}`,
  nombre: `${n}° básico ${letra}`,
  nivel: n <= 4 ? "basica_1_4" : "basica_5_8",
  matricula,
});

const opcion4 = (n: number, letra: string, matricula: number): CursoInicial => ({
  codigo: `OP4-${n}${letra}`,
  nombre: `Opción 4 · ${n}° ${letra}`,
  nivel: "opcion4",
  matricula,
});

export const CURSOS_INICIALES: CursoInicial[] = [
  { codigo: "PKA", nombre: "Prekínder A", nivel: "parvularia", matricula: 20 },
  { codigo: "PKB", nombre: "Prekínder B", nivel: "parvularia", matricula: 20 },
  { codigo: "KA", nombre: "Kínder A", nivel: "parvularia", matricula: 21 },
  { codigo: "KB", nombre: "Kínder B", nivel: "parvularia", matricula: 22 },
  ...[1, 2, 3, 4].flatMap((n) => [basica(n, "A", 33), basica(n, "B", 33)]),
  basica(5, "A", 39),
  basica(5, "B", 39),
  basica(6, "A", 39),
  basica(6, "B", 38),
  basica(7, "A", 38),
  basica(7, "B", 38),
  basica(8, "A", 38),
  basica(8, "B", 38),
  opcion4(1, "A", 5),
  opcion4(2, "A", 5),
  opcion4(2, "B", 5),
  opcion4(3, "A", 5),
  opcion4(4, "A", 6),
];

export const FUNCIONARIOS_INICIALES = 120;
