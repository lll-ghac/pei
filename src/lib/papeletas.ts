import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { Estamento } from "./encuestas";
import { ICONOS_ESTAMENTO } from "./iconos-pdf";

// MVP: carta, 10 papeletas por hoja (2 × 5), líneas de corte, sirve en blanco y negro.
const ANCHO = 612;
const ALTO = 792;
const MARGEN = 18;
const COLS = 2;
const FILAS = 5;
const CELDA_W = (ANCHO - 2 * MARGEN) / COLS;
const CELDA_H = (ALTO - 2 * MARGEN) / FILAS;

const NEGRO = rgb(0.13, 0.14, 0.16);
const GRIS = rgb(0.4, 0.4, 0.42);
const GRIS_CLARO = rgb(0.85, 0.85, 0.85);

const ETIQUETA: Record<Estamento, string> = {
  A: "APODERADO/A",
  E: "ESTUDIANTE",
  F: "FUNCIONARIO/A",
};

const MENSAJE: Record<Estamento, string> = {
  A: "Esta credencial no tiene su nombre. Sus respuestas son anónimas.",
  E: "Esta clave no tiene tu nombre. Nadie sabrá qué respondiste.",
  F: "Esta credencial no tiene su nombre. Sus respuestas son anónimas.",
};

export type DatosLote = {
  id: number;
  estamento: Estamento;
  curso: string | null;
  prueba: boolean;
  url: string;
  credenciales: { usuario: string; clave: string }[];
};

type Fuentes = { normal: PDFFont; negrita: PDFFont; mono: PDFFont };

function textoAjustado(page: PDFPage, texto: string, x: number, y: number, fuente: PDFFont, tam: number, maxAncho: number, color = NEGRO) {
  let t = tam;
  while (fuente.widthOfTextAtSize(texto, t) > maxAncho && t > 6) t -= 0.5;
  page.drawText(texto, { x, y, size: t, font: fuente, color });
  return fuente.widthOfTextAtSize(texto, t);
}

function icono(page: PDFPage, estamento: Estamento, x: number, y: number, tam: number) {
  // Las rutas SVG van en una grilla de 256 con el eje Y hacia abajo; pdf-lib lo invierte solo.
  page.drawSvgPath(ICONOS_ESTAMENTO[estamento], { x, y: y + tam, scale: tam / 256, color: NEGRO });
}

function papeleta(
  page: PDFPage,
  f: Fuentes,
  insignia: Awaited<ReturnType<PDFDocument["embedPng"]>>,
  lote: DatosLote,
  cred: { usuario: string; clave: string },
  x0: number,
  y0: number,
) {
  const pad = 10;
  const arriba = y0 + CELDA_H - pad;
  let y = arriba;

  if (lote.prueba) {
    page.drawRectangle({ x: x0 + 1, y: arriba - 5, width: CELDA_W - 2, height: 14, color: GRIS_CLARO });
    page.drawText("PRUEBA · NO SIRVE PARA LA ENCUESTA OFICIAL", {
      x: x0 + pad,
      y: arriba - 1,
      size: 7.5,
      font: f.negrita,
      color: NEGRO,
    });
    y -= 14;
  }

  // Insignia y título
  const altoInsignia = 36;
  const anchoInsignia = (insignia.width / insignia.height) * altoInsignia;
  page.drawImage(insignia, { x: x0 + pad, y: y - altoInsignia, width: anchoInsignia, height: altoInsignia });
  const xt = x0 + pad + anchoInsignia + 6;
  page.drawText("ENCUESTA PEI 2027", { x: xt, y: y - 11, size: 9, font: f.negrita, color: NEGRO });
  page.drawText("Escuela República del Ecuador", { x: xt, y: y - 21, size: 7, font: f.normal, color: GRIS });

  // Estamento grande con ícono, a la derecha
  const etiqueta = ETIQUETA[lote.estamento];
  const tamEt = 12.5;
  const anchoEt = f.negrita.widthOfTextAtSize(etiqueta, tamEt);
  const xDer = x0 + CELDA_W - pad;
  page.drawText(etiqueta, { x: xDer - anchoEt, y: y - 12, size: tamEt, font: f.negrita, color: NEGRO });
  icono(page, lote.estamento, xDer - anchoEt - 20, y - 15, 16);
  if (lote.curso) {
    const anchoCurso = f.negrita.widthOfTextAtSize(lote.curso, 9.5);
    page.drawText(lote.curso, { x: xDer - anchoCurso, y: y - 25, size: 9.5, font: f.negrita, color: NEGRO });
  }
  y -= altoInsignia + 10;

  // Dirección
  page.drawText("Ingresa en:", { x: x0 + pad, y, size: 8, font: f.normal, color: GRIS });
  textoAjustado(page, lote.url, x0 + pad + 44, y, f.negrita, 10, CELDA_W - 2 * pad - 44);
  y -= 8;

  // Usuario y contraseña
  const caja = (etq: string, valor: string, xx: number, ancho: number, tam: number) => {
    page.drawRectangle({ x: xx, y: y - 30, width: ancho, height: 28, borderColor: NEGRO, borderWidth: 1 });
    page.drawText(etq, { x: xx + 4, y: y - 9, size: 6.5, font: f.normal, color: GRIS });
    textoAjustado(page, valor, xx + 4, y - 25, f.mono, tam, ancho - 8);
  };
  const anchoUsuario = CELDA_W - 2 * pad - 92;
  caja("USUARIO", cred.usuario, x0 + pad, anchoUsuario, 13);
  caja("CONTRASEÑA", cred.clave.split("").join(" "), x0 + pad + anchoUsuario + 6, 86, 13);
  y -= 41;

  // Mensaje de anonimato e instrucción
  page.drawText(MENSAJE[lote.estamento], { x: x0 + pad, y, size: 7, font: f.normal, color: NEGRO, maxWidth: CELDA_W - 2 * pad });
  if (lote.estamento === "A") {
    page.drawText("Una sola encuesta por familia.", { x: x0 + pad, y: y - 9, size: 7.5, font: f.negrita, color: NEGRO });
  }
}

function lineasDeCorte(page: PDFPage) {
  const opciones = { thickness: 0.5, color: GRIS, dashArray: [3, 3] };
  for (let c = 0; c <= COLS; c++) {
    const x = MARGEN + c * CELDA_W;
    page.drawLine({ start: { x, y: MARGEN }, end: { x, y: ALTO - MARGEN }, ...opciones });
  }
  for (let r = 0; r <= FILAS; r++) {
    const y = MARGEN + r * CELDA_H;
    page.drawLine({ start: { x: MARGEN, y }, end: { x: ANCHO - MARGEN, y }, ...opciones });
  }
}

function portada(page: PDFPage, f: Fuentes, lote: DatosLote) {
  let y = ALTO - 90;
  const linea = (t: string, tam = 13, fuente = f.normal, sep = 22) => {
    page.drawText(t, { x: 72, y, size: tam, font: fuente, color: NEGRO, maxWidth: ANCHO - 144 });
    y -= sep;
  };
  linea("Encuesta PEI 2027 · Papeletas de acceso", 20, f.negrita, 36);
  if (lote.prueba) linea("PRUEBA · solo para los pilotos, no sirven en la encuesta oficial", 13, f.negrita, 30);
  linea(`Curso: ${lote.curso ?? "Funcionarios (sin curso)"}`, 15, f.negrita);
  linea(`Estamento: ${ETIQUETA[lote.estamento]}`, 15, f.negrita);
  linea(`Cantidad de papeletas: ${lote.credenciales.length}`, 15, f.negrita);
  linea(`Lote N° ${lote.id}`, 12, f.normal, 40);

  const instrucciones: Record<Estamento, string[]> = {
    A: [
      "1. Antes de repartir, pregunte en el curso quién tiene un hermano/a menor en la escuela:",
      "   esos estudiantes no reciben papeleta (su familia la recibe por el menor).",
      "2. Mezcle las papeletas y póngalas en las libretas sin anotar cuál va en cada una.",
      "3. Informe a la comisión solo cuántas papeletas entregó (sin nombres).",
      "4. Devuelva las sobrantes a la comisión para desactivarlas.",
    ],
    E: [
      "1. Ponga las papeletas en una bolsa; cada estudiante saca una al azar.",
      "2. Nadie anota qué papeleta sacó cada estudiante.",
      "3. Si responde en casa, se lleva la papeleta que sacó.",
      "4. Devuelva las sobrantes a la comisión para desactivarlas.",
    ],
    F: [
      "1. Ponga las papeletas en una bolsa; cada persona saca una al azar.",
      "2. Nadie anota qué papeleta sacó cada persona.",
      "3. Devuelva las sobrantes a la comisión para desactivarlas.",
    ],
  };
  linea("Instrucciones", 14, f.negrita, 24);
  for (const t of instrucciones[lote.estamento]) linea(t, 11.5, f.normal, 19);
  y -= 16;
  linea("Esta portada no contiene credenciales. Corte por las líneas punteadas.", 10.5, f.normal);
}

export async function pdfPapeletas(lote: DatosLote): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Papeletas lote ${lote.id}`);
  doc.setCreator("Encuesta PEI 2027");
  const fuentes: Fuentes = {
    normal: await doc.embedFont(StandardFonts.Helvetica),
    negrita: await doc.embedFont(StandardFonts.HelveticaBold),
    mono: await doc.embedFont(StandardFonts.CourierBold),
  };
  const insignia = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "insignia.png")));

  portada(doc.addPage([ANCHO, ALTO]), fuentes, lote);

  const porHoja = COLS * FILAS;
  for (let i = 0; i < lote.credenciales.length; i += porHoja) {
    const page = doc.addPage([ANCHO, ALTO]);
    lineasDeCorte(page);
    lote.credenciales.slice(i, i + porHoja).forEach((cred, j) => {
      const col = j % COLS;
      const fila = Math.floor(j / COLS);
      const x = MARGEN + col * CELDA_W;
      const y = ALTO - MARGEN - (fila + 1) * CELDA_H;
      papeleta(page, fuentes, insignia, lote, cred, x, y);
    });
  }
  return doc.save();
}
