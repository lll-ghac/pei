import Link from "next/link";
import { Cabecera } from "@/components/Cabecera";
import { FranjaPrueba } from "@/components/FranjaPrueba";
import { leerEstado } from "@/lib/estado";
import { exigirGestor } from "@/lib/gestion";
import { salirGestion } from "../acciones";

export const metadata = { title: "Panel de gestión · Encuesta PEI 2027" };

export default async function LayoutPanel({ children }: LayoutProps<"/gestion">) {
  const g = await exigirGestor();
  const estado = await leerEstado();
  const enlaces = [
    { href: "/gestion", texto: "Avance" },
    { href: "/gestion/resultados", texto: "Resultados" },
    { href: "/gestion/informe", texto: "Informe" },
    { href: "/gestion/abiertas", texto: "Abiertas" },
    { href: "/gestion/descargas", texto: "Descargas" },
    { href: "/gestion/encuestas", texto: "Encuestas" },
    { href: "/gestion/credenciales", texto: "Credenciales" },
    ...(g.rol === "admin"
      ? [
          { href: "/gestion/cursos", texto: "Cursos" },
          { href: "/gestion/sistema", texto: "Sistema" },
        ]
      : []),
    { href: "/gestion/bitacora", texto: "Bitácora" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <FranjaPrueba visible={estado.modo === "prueba"} />
      <Cabecera
        ancho="ancho"
        detalle={`Panel · ${g.nombre} · ${g.rol === "admin" ? "Administración" : "Comisión"}`}
        derecha={
          <form action={salirGestion}>
            <button type="submit" className="rounded-[2px] px-3 min-h-12 font-bold text-white/85 hover:bg-white/10">
              Salir
            </button>
          </form>
        }
      />
      <nav className="bg-papel border-b border-filete" aria-label="Secciones del panel">
        <ul className="mx-auto max-w-6xl flex flex-wrap px-2 sm:px-4">
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link
                href={e.href}
                className="rotulo inline-block px-3 py-3.5 text-[15px] text-tinta no-underline hover:text-timbre hover:underline"
              >
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7">{children}</main>
    </div>
  );
}
