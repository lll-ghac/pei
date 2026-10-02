// Se ejecuta una vez al iniciar el servidor: aplica migraciones pendientes y
// carga los datos iniciales (cursos y estado en modo Prueba) si la base está vacía.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { prepararBase } = await import("./lib/preparar-base");
  await prepararBase();
}
