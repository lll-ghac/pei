import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible_Next, Courier_Prime } from "next/font/google";
import "./globals.css";

// Texto: Atkinson Hyperlegible Next, creada para leerse sin esfuerzo (baja visión, lectores iniciales).
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  weight: ["400", "700"],
});

// Rótulos impresos de la cédula: Archivo en ancho angosto.
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  axes: ["wdth"],
});

// Credenciales: la misma letra de máquina de la papeleta impresa.
const courier = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Encuesta PEI 2027 · Escuela República del Ecuador E-79",
  description: "Encuesta anónima para actualizar el Proyecto Educativo Institucional.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#22357F",
};

// Todo se lee de la base en cada visita: nada se prerenderiza al compilar.
export const dynamic = "force-dynamic";

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es-CL" className={`${atkinson.variable} ${archivo.variable} ${courier.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
