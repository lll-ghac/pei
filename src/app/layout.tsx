import type { Metadata, Viewport } from "next";
import { Lilita_One, Montserrat } from "next/font/google";
import "./globals.css";

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

const lilita = Lilita_One({
  variable: "--font-lilita",
  subsets: ["latin"],
  weight: "400",
});

export const metadata: Metadata = {
  title: "Encuesta PEI 2027 · Escuela República del Ecuador E-79",
  description: "Encuesta anónima para actualizar el Proyecto Educativo Institucional.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#92B01A",
};

// Todo se lee de la base en cada visita: nada se prerenderiza al compilar.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${montserrat.variable} ${lilita.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
