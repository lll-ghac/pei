import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { Estamento } from "./encuestas";
import { NOMBRE, type Bloque, type Informe, type Seccion } from "./informe";

/** PDF del informe final: el registro oficial. Dibuja el mismo modelo que la página del panel. */

const hex = (h: string) => rgb(parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255);
const C = {
  tinta: hex("#16181a"),
  grafito: hex("#3d4145"),
  gris: hex("#5c6166"),
  filete: hex("#c9ccc6"),
  timbre: hex("#22357f"),
  lacre: hex("#a3271f"),
  serie: { A: hex("#2a78d6"), E: hex("#eb6834"), F: hex("#1baf7a") } as Record<Estamento, RGB>,
};
const ANCHO = 595.28; // A4
const ALTO = 841.89;
const M = 48; // margen
const UTIL = ANCHO - 2 * M;

type Fuentes = { normal: PDFFont; negrita: PDFFont };

class Lienzo {
  doc: PDFDocument;
  f: Fuentes;
  page!: PDFPage;
  y = 0;
  prueba: boolean;
  /** Se repite en la página nueva cuando una tabla se corta. */
  alCortar: (() => void) | null = null;

  constructor(doc: PDFDocument, f: Fuentes, prueba: boolean) {
    this.doc = doc;
    this.f = f;
    this.prueba = prueba;
  }

  nuevaPagina() {
    this.page = this.doc.addPage([ANCHO, ALTO]);
    this.y = ALTO - M;
    if (this.prueba) {
      this.page.drawText("DATOS DE PRUEBA", { x: M, y: ALTO - 28, size: 8, font: this.f.negrita, color: C.lacre });
    }
  }

  espacio(h: number) {
    if (this.y - h < M + 18) {
      this.nuevaPagina();
      this.alCortar?.();
    }
  }

  /** Quita caracteres que la fuente estándar no puede dibujar. */
  limpio(s: string, font: PDFFont) {
    const permitidos = new Set(font.getCharacterSet());
    return [...s.replace(/[≥]/g, ">=").replace(/[→]/g, "->").replace(/[✓]/g, "v")].filter((ch) => permitidos.has(ch.codePointAt(0)!) || ch === " ").join("");
  }

  lineas(texto: string, font: PDFFont, size: number, ancho: number): string[] {
    const out: string[] = [];
    for (const parrafo of this.limpio(texto, font).split("\n")) {
      let linea = "";
      for (const palabra of parrafo.split(/\s+/)) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(prueba, size) <= ancho) linea = prueba;
        else {
          if (linea) out.push(linea);
          // Palabra más larga que la columna: se corta.
          let resto = palabra;
          while (font.widthOfTextAtSize(resto, size) > ancho && resto.length > 1) {
            let k = resto.length;
            while (k > 1 && font.widthOfTextAtSize(resto.slice(0, k), size) > ancho) k--;
            out.push(resto.slice(0, k));
            resto = resto.slice(k);
          }
          linea = resto;
        }
      }
      out.push(linea);
    }
    return out;
  }

  texto(s: string, o: { size?: number; font?: PDFFont; color?: RGB; x?: number; ancho?: number; interlinea?: number } = {}) {
    const size = o.size ?? 10;
    const font = o.font ?? this.f.normal;
    const alto = size * (o.interlinea ?? 1.35);
    for (const l of this.lineas(s, font, size, o.ancho ?? UTIL)) {
      this.espacio(alto);
      this.page.drawText(l, { x: o.x ?? M, y: this.y - size, size, font, color: o.color ?? C.tinta });
      this.y -= alto;
    }
  }

  barra(x: number, yMedio: number, ancho: number, valor: number, color: RGB) {
    this.page.drawLine({ start: { x, y: yMedio - 5 }, end: { x, y: yMedio + 5 }, thickness: 0.6, color: C.grafito });
    const w = Math.max(valor > 0 ? 1.5 : 0, (Math.min(100, valor) / 100) * ancho);
    if (w > 0) this.page.drawRectangle({ x, y: yMedio - 4, width: w, height: 8, color });
  }
}

function dibujarBloque(L: Lienzo, b: Bloque) {
  const { f } = L;
  const titulo = (t: string) => {
    L.espacio(40);
    L.texto(t, { font: f.negrita, size: 10.5 });
    L.y -= 2;
  };
  const origen = (t?: string) => {
    if (t) L.texto(t, { size: 8, color: C.gris });
  };

  switch (b.tipo) {
    case "parrafo":
      L.texto(b.texto, { size: 10 });
      break;
    case "nota":
      L.texto(b.texto, { size: 9, color: C.grafito });
      break;
    case "cifras": {
      const w = (UTIL - 16) / 3;
      L.espacio(58);
      b.items.forEach((it, i) => {
        const x = M + i * (w + 8);
        L.page.drawRectangle({ x, y: L.y - 52, width: w, height: 52, borderColor: C.filete, borderWidth: 0.8 });
        if (it.e) L.page.drawRectangle({ x: x + 8, y: L.y - 16, width: 6, height: 6, color: C.serie[it.e] });
        L.page.drawText(L.limpio(it.etiqueta.toUpperCase(), f.negrita), { x: x + (it.e ? 18 : 8), y: L.y - 16, size: 7.5, font: f.negrita, color: C.grafito });
        L.page.drawText(it.valor, { x: x + 8, y: L.y - 36, size: 18, font: f.negrita, color: C.tinta });
        if (it.detalle) L.page.drawText(L.limpio(it.detalle, f.normal), { x: x + 8, y: L.y - 47, size: 7.5, font: f.normal, color: C.grafito });
      });
      L.y -= 60;
      break;
    }
    case "barras": {
      titulo(b.titulo);
      const colTexto = UTIL * 0.46;
      const colBarra = UTIL * 0.4;
      for (const fila of b.filas) {
        const ls = L.lineas(fila.texto, f.normal, 9, colTexto - 8);
        const h = Math.max(14, ls.length * 11.5 + 3);
        L.espacio(h);
        ls.forEach((l, i) => L.page.drawText(l, { x: M, y: L.y - 10 - i * 11.5, size: 9, font: f.normal, color: C.tinta }));
        const yMedio = L.y - h / 2;
        L.barra(M + colTexto, yMedio, colBarra - 34, fila.pct, C.serie[b.e]);
        L.page.drawText(`${Math.round(fila.pct)}%`, { x: M + colTexto + colBarra - 28, y: yMedio - 3, size: 9, font: f.normal, color: C.tinta });
        const n = String(fila.conteo);
        L.page.drawText(n, { x: M + UTIL - f.normal.widthOfTextAtSize(n, 8.5), y: yMedio - 3, size: 8.5, font: f.normal, color: C.gris });
        L.page.drawLine({ start: { x: M, y: L.y - h }, end: { x: M + UTIL, y: L.y - h }, thickness: 0.4, color: C.filete });
        L.y -= h;
      }
      L.y -= 2;
      origen(b.origen);
      break;
    }
    case "comparativa": {
      titulo(b.titulo);
      const colTexto = UTIL * 0.34;
      const colE = (UTIL - colTexto) / b.estamentos.length;
      const cabecera = () => {
        L.espacio(14);
        L.page.drawText(L.limpio(b.encabezado.toUpperCase(), f.negrita), { x: M, y: L.y - 9, size: 7.5, font: f.negrita, color: C.grafito });
        b.estamentos.forEach((e, i) => {
          const x = M + colTexto + i * colE;
          L.page.drawRectangle({ x, y: L.y - 9, width: 6, height: 6, color: C.serie[e] });
          L.page.drawText(NOMBRE[e].toUpperCase(), { x: x + 9, y: L.y - 9, size: 7.5, font: f.negrita, color: C.grafito });
        });
        L.y -= 14;
      };
      cabecera();
      L.alCortar = cabecera;
      for (const fila of b.filas) {
        const ls = L.lineas(fila.texto, f.normal, 9, colTexto - 8);
        const h = Math.max(14, ls.length * 11.5 + 3);
        L.espacio(h);
        ls.forEach((l, i) => L.page.drawText(l, { x: M, y: L.y - 10 - i * 11.5, size: 9, font: f.normal, color: C.tinta }));
        const yMedio = L.y - h / 2;
        b.estamentos.forEach((e, i) => {
          const x = M + colTexto + i * colE;
          const v = fila.pct[e];
          if (v == null) L.page.drawText("Menos de 5", { x, y: yMedio - 3, size: 8, font: f.normal, color: C.gris });
          else {
            L.barra(x, yMedio, colE - 40, v, C.serie[e]);
            L.page.drawText(`${Math.round(v)}%`, { x: x + colE - 34, y: yMedio - 3, size: 9, font: f.normal, color: C.tinta });
          }
        });
        L.page.drawLine({ start: { x: M, y: L.y - h }, end: { x: M + UTIL, y: L.y - h }, thickness: 0.4, color: C.filete });
        L.y -= h;
      }
      L.alCortar = null;
      L.y -= 2;
      origen(b.origen);
      break;
    }
    case "tabla": {
      if (b.titulo) titulo(b.titulo);
      const k = b.columnas.length;
      // Anchos: columnas numéricas angostas; el resto según el largo de su contenido.
      const largo = b.columnas.map((c, i) =>
        b.numericas?.includes(i) ? 0 : Math.min(60, Math.max(c.length, ...b.filas.map((r) => (r[i] ?? "").length))),
      );
      const anchoNum = b.columnas.map((c, i) =>
        b.numericas?.includes(i)
          ? Math.max(
              30,
              Math.min(
                90,
                Math.max(
                  f.negrita.widthOfTextAtSize(L.limpio(c.toUpperCase(), f.negrita), 7),
                  ...b.filas.map((r) => f.normal.widthOfTextAtSize(L.limpio(r[i] ?? "", f.normal), 8.5)),
                ) + 10,
              ),
            )
          : 0,
      );
      const resto = UTIL - anchoNum.reduce((s, x) => s + x, 0);
      const totalLargo = largo.reduce((s, x) => s + x, 0) || 1;
      const anchos = b.columnas.map((_, i) => (b.numericas?.includes(i) ? anchoNum[i] : Math.max(40, (largo[i] / totalLargo) * resto)));
      const escala = UTIL / anchos.reduce((s, x) => s + x, 0);
      for (let i = 0; i < k; i++) anchos[i] *= escala;
      const xs = anchos.map((_, i) => M + anchos.slice(0, i).reduce((s, x) => s + x, 0));
      const size = k > 5 ? 8 : 8.5;
      const cabecera = () => {
        const ls = b.columnas.map((c, i) => L.lineas(c.toUpperCase(), f.negrita, 7, anchos[i] - 8));
        const h = Math.max(...ls.map((x) => x.length)) * 9 + 4;
        L.espacio(h + 12);
        ls.forEach((x, i) =>
          x.forEach((l, j) => {
            const w = f.negrita.widthOfTextAtSize(l, 7);
            const xx = b.numericas?.includes(i) ? xs[i] + anchos[i] - 3 - w : xs[i] + (i > 0 ? 6 : 0);
            L.page.drawText(l, { x: xx, y: L.y - 8 - j * 9, size: 7, font: f.negrita, color: C.grafito });
          }),
        );
        L.y -= h;
      };
      cabecera();
      L.alCortar = cabecera;
      for (const fila of b.filas) {
        const ls = fila.map((c, i) => L.lineas(c ?? "", f.normal, size, anchos[i] - 9));
        const h = Math.max(...ls.map((x) => x.length)) * (size + 2.5) + 4;
        L.espacio(h);
        L.page.drawLine({ start: { x: M, y: L.y }, end: { x: M + UTIL, y: L.y }, thickness: 0.4, color: C.filete });
        ls.forEach((x, i) =>
          x.forEach((l, j) => {
            const w = f.normal.widthOfTextAtSize(l, size);
            const xx = b.numericas?.includes(i) ? xs[i] + anchos[i] - 3 - w : xs[i] + (i > 0 ? 6 : 0);
            L.page.drawText(l, { x: xx, y: L.y - size - 2 - j * (size + 2.5), size, font: f.normal, color: C.tinta });
          }),
        );
        L.y -= h;
      }
      L.alCortar = null;
      L.y -= 2;
      origen(b.origen);
      break;
    }
    case "citas": {
      titulo(b.titulo);
      for (const c of b.citas) {
        const ls = L.lineas(`«${c.texto}»`, f.normal, 9.5, UTIL - 20);
        const h = ls.length * 12.5 + 20;
        L.espacio(h + 4);
        L.page.drawRectangle({ x: M, y: L.y - h, width: UTIL, height: h, borderColor: C.grafito, borderWidth: 0.7 });
        ls.forEach((l, i) => L.page.drawText(l, { x: M + 10, y: L.y - 14 - i * 12.5, size: 9.5, font: f.normal, color: C.tinta }));
        L.page.drawText(L.limpio(c.origen, f.normal), { x: M + 10, y: L.y - h + 6, size: 7.5, font: f.normal, color: C.gris });
        L.y -= h + 5;
      }
      break;
    }
  }
  L.y -= 10;
}

function dibujarSeccion(L: Lienzo, s: Seccion, indice: { titulo: string; pagina: number }[]) {
  L.espacio(90);
  indice.push({ titulo: `${s.numero}. ${s.titulo}`, pagina: L.doc.getPageCount() });
  L.page.drawLine({ start: { x: M, y: L.y }, end: { x: M + UTIL, y: L.y }, thickness: 1.5, color: C.timbre });
  L.y -= 8;
  L.texto(`${s.numero}  ${s.titulo}`, { font: L.f.negrita, size: 15, color: C.timbre });
  const meta = [s.preguntas && `Preguntas: ${s.preguntas}`, s.aporta && `Aporta al PEI: ${s.aporta}`].filter(Boolean).join(" · ");
  if (meta) L.texto(meta, { size: 8.5, color: C.grafito });
  L.y -= 8;
  for (const b of s.bloques) dibujarBloque(L, b);
  L.y -= 8;
}

export async function informePdf(inf: Informe, autor: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Informe final · Encuesta PEI 2027${inf.prueba ? " (DATOS DE PRUEBA)" : ""}`);
  doc.setAuthor("Escuela República del Ecuador E-79");
  doc.setCreator("Plataforma Encuesta PEI 2027");
  doc.setCreationDate(inf.generado);
  doc.setModificationDate(inf.generado);
  const f: Fuentes = { normal: await doc.embedFont(StandardFonts.Helvetica), negrita: await doc.embedFont(StandardFonts.HelveticaBold) };
  const L = new Lienzo(doc, f, inf.prueba);
  const fecha = new Intl.DateTimeFormat("es-CL", { timeZone: "America/Santiago", dateStyle: "long", timeStyle: "short" }).format(inf.generado);

  // Portada
  L.nuevaPagina();
  try {
    const png = await doc.embedPng(await readFile(path.join(process.cwd(), "public", "insignia.png")));
    const w = 120;
    L.page.drawImage(png, { x: M, y: ALTO - M - (w * png.height) / png.width, width: w, height: (w * png.height) / png.width });
    L.y -= (w * png.height) / png.width + 30;
  } catch {
    L.y -= 20;
  }
  L.texto("Escuela República del Ecuador E-79", { size: 12, color: C.grafito });
  L.y -= 4;
  L.texto("Informe final", { font: f.negrita, size: 30, color: C.timbre });
  L.texto("Encuesta para el Proyecto Educativo Institucional (PEI) 2027", { size: 15 });
  L.y -= 18;
  if (inf.prueba) {
    L.texto("DATOS DE PRUEBA. Este informe es un ensayo; no son respuestas reales.", { font: f.negrita, size: 12, color: C.lacre });
    L.y -= 8;
  } else if (!inf.cerrada) {
    L.texto("Borrador: la encuesta aún no está cerrada.", { font: f.negrita, size: 12, color: C.lacre });
    L.y -= 8;
  }
  L.texto(`Generado el ${fecha} por ${autor}.`, { size: 10, color: C.grafito });
  L.texto(`Respuestas: ${(["A", "E", "F"] as Estamento[]).map((e) => `${NOMBRE[e]} ${inf.n[e]}`).join(" · ")}.`, { size: 10, color: C.grafito });
  L.y -= 14;
  L.texto(
    "Este informe entrega datos, no conclusiones: cada cifra indica su pregunta de origen, el estamento y el número de respuestas (n). No se muestran grupos con menos de 5 respuestas. La interpretación y la redacción del PEI son de la comisión.",
    { size: 10 },
  );
  L.y -= 8;
  L.texto(
    "La huella digital (SHA-256) de este archivo quedó anotada en la bitácora del panel. Para comprobar que es el original: Panel → Descargas → Verificar un archivo, o certutil -hashfile archivo SHA256 en Windows.",
    { size: 9, color: C.grafito },
  );
  const paginaIndice = doc.getPageCount();
  L.nuevaPagina(); // índice: se completa al final

  const indice: { titulo: string; pagina: number }[] = [];
  L.nuevaPagina();
  for (const s of inf.secciones) dibujarSeccion(L, s, indice);
  for (const s of inf.anexos) {
    L.nuevaPagina();
    dibujarSeccion(L, { ...s, numero: `Anexo ${s.numero}` }, indice);
  }

  // Índice
  const pIndice = doc.getPage(paginaIndice);
  let y = ALTO - M - 20;
  pIndice.drawText("Contenido", { x: M, y, size: 18, font: f.negrita, color: C.timbre });
  y -= 30;
  for (const it of indice) {
    const t = L.limpio(it.titulo, f.normal);
    pIndice.drawText(t, { x: M, y, size: 10.5, font: f.normal, color: C.tinta });
    const n = String(it.pagina);
    pIndice.drawText(n, { x: M + UTIL - f.normal.widthOfTextAtSize(n, 10.5), y, size: 10.5, font: f.normal, color: C.tinta });
    y -= 17;
  }

  // Pie de página
  const total = doc.getPageCount();
  doc.getPages().forEach((p, i) => {
    if (i === 0) return;
    const pie = `Encuesta PEI 2027 · Informe final${inf.prueba ? " · DATOS DE PRUEBA" : ""} · página ${i + 1} de ${total}`;
    p.drawText(pie, { x: M, y: 26, size: 7.5, font: f.normal, color: C.gris });
  });

  return doc.save();
}
