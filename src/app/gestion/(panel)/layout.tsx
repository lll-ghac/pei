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
        derecha={
          <form action={salirGestion} className="flex items-center gap-2">
            <span className="hidden sm:inline text-sm text-gris-texto">
              {g.nombre} · {g.rol === "admin" ? "Administración" : "Comisión"}
            </span>
            <button type="submit" className="rounded-full border-2 border-borde px-3 py-1.5 font-bold text-base">
              Salir
            </button>
          </form>
        }
      />
      <nav className="bg-tarjeta border-b border-borde" aria-label="Secciones del panel">
        <ul className="mx-auto max-w-5xl flex flex-wrap gap-1 px-4">
          {enlaces.map((e) => (
            <li key={e.href}>
              <Link href={e.href} className="inline-block px-3 py-3 font-bold text-azul hover:underline">
                {e.texto}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
