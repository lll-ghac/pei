---
name: Encuesta PEI 2027
description: Cédula y urna. Una encuesta escolar anónima que se lee y se marca como una papeleta de votación impresa.
colors:
  papel: "#ffffff"
  fondo: "#eceeea"
  tinta: "#16181a"
  grafito: "#3d4145"
  gris-texto: "#5c6166"
  filete: "#c9ccc6"
  timbre: "#22357f"
  timbre-claro: "#e6e9f4"
  verde: "#92b01a"
  verde-hover: "#86a316"
  verde-oscuro: "#1f2a05"
  verde-tinta: "#4a5c0c"
  verde-claro: "#eef4d6"
  lacre: "#a3271f"
  lacre-claro: "#f7e4e2"
  ocre-claro: "#f4e7c2"
typography:
  display:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.012em"
  headline:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "28px"
    fontWeight: 700
    lineHeight: 1.22
    letterSpacing: "-0.012em"
  body:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  body-secondary:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "0.06em"
    fontVariation: "'wdth' 75"
  stamp:
    fontFamily: "Archivo, Arial Narrow, Arial, sans-serif"
    fontSize: "15px"
    fontWeight: 800
    lineHeight: 1.3
    letterSpacing: "0.08em"
    fontVariation: "'wdth' 75"
  credential:
    fontFamily: "Courier Prime, Courier New, monospace"
    fontSize: "24px"
    fontWeight: 700
    letterSpacing: "0.12em"
  button:
    fontFamily: "Atkinson Hyperlegible Next, Segoe UI, Arial, sans-serif"
    fontSize: "1.05rem"
    fontWeight: 700
rounded:
  mark: "1.5px"
  sm: "2px"
  md: "3px"
spacing:
  hairline: "1px"
  gutter-mobile: "20px"
  gutter-desktop: "32px"
  row-y: "14px"
  target-min: "48px"
  button-height: "52px"
  row-height: "60px"
components:
  button-primary:
    backgroundColor: "{colors.verde}"
    textColor: "{colors.verde-oscuro}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "12px 22px"
    height: "52px"
  button-primary-hover:
    backgroundColor: "{colors.verde-hover}"
    textColor: "{colors.verde-oscuro}"
  button-secondary:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "12px 22px"
    height: "52px"
  button-secondary-hover:
    backgroundColor: "{colors.fondo}"
    textColor: "{colors.tinta}"
  button-danger:
    backgroundColor: "{colors.lacre}"
    textColor: "{colors.papel}"
    rounded: "{rounded.md}"
    padding: "12px 22px"
    height: "52px"
  field:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    rounded: "{rounded.sm}"
    padding: "11px 14px"
  ballot-row:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.body}"
    padding: "14px 32px"
    height: "60px"
  ballot-row-selected:
    backgroundColor: "{colors.verde-claro}"
    textColor: "{colors.tinta}"
  stamp-band:
    backgroundColor: "{colors.timbre}"
    textColor: "{colors.papel}"
    typography: "{typography.label}"
    height: "56px"
  credential-box:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.credential}"
    padding: "6px 12px 8px"
  record-table-head:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.label}"
    padding: "10px 12px"
---

# Design System: Encuesta PEI 2027

## Overview

**Creative North Star: "Cédula y urna"**

Cada respuesta es un voto secreto, y la interfaz lo dice con su aspecto antes que con palabras. La encuesta es una hoja de papel blanco frío sobre una mesa gris papel: una banda azul de timbre arriba con el escudo, una línea de corte perforada debajo, opciones numeradas en filas separadas por filetes de 1 px y un círculo o un cuadrado a la derecha para marcar. Al elegir, una raya de lápiz grafito cruza la marca; al enviar, la papeleta se dobla y cae en la urna.

El sistema es impreso, plano y sobrio. Densidad de formulario oficial: filas a todo el ancho de la hoja, texto grande y muy legible (pensado para apoderados en celular, a veces al sol, y para estudiantes de 10 a 14 años en el laboratorio), cifras tabulares en todo el producto. El panel de la comisión se lee como un acta de mesa: tabla con encabezado en tinta, filetes y números alineados, sin adornos.

Rechazos confirmados: la plantilla de tarjetas blancas redondeadas con sombra, los botones píldora y los titulares azules sobre gris. Compromisos de marca que restringen lo visual: la insignia de la escuela (o el escudo E-79 recortado) siempre en la banda, y el verde escuela como único color de acción.

**Key Characteristics:**
- Papel blanco frío sobre fondo gris papel; tinta casi negra para leer.
- Azul de timbre para banda, sellos, enlaces informativos y foco.
- Verde escuela solo en lo que se puede tocar o ya se eligió.
- Esquinas casi rectas (2–3 px), filetes de 1 px, sin sombras de elevación.
- Tres voces tipográficas: lectura, rótulo impreso angosto y máquina de escribir.
- Dos únicos movimientos con significado: la raya de lápiz y el doblez de la papeleta.
- Solo tema claro.

## Colors

Una paleta de papelería electoral: papel, tinta, grafito, timbre azul y lacre rojo, con el verde de la escuela como única señal de acción.

### Primary
- **Verde Escuela** (`verde`): color obligatorio de la marca. Fondo del botón principal y de la selección de texto. Siempre con texto Verde Noche encima, nunca blanco. Su hover es un verde apenas más hondo (`verde-hover`).
- **Verde Noche** (`verde-oscuro`): texto sobre Verde Escuela.
- **Verde Tinta** (`verde-tinta`): el verde en versión legible sobre papel: contorno de la marca elegida, enlaces o textos verdes.
- **Verde Fila** (`verde-claro`): fondo de la fila elegida de la cédula y de su campo de detalle.

### Secondary
- **Azul de Timbre** (`timbre`): banda superior (y `theme-color` del navegador), sellos informativos (VOTO SECRETO, VISTA PREVIA), números de los pasos, enlaces informativos, etapa actual de la franja de avance, anillo de foco de 3 px y cursor de texto.
- **Timbre Lavado** (`timbre-claro`): hover de botones de icono sobre papel.

### Tertiary
- **Lacre** (`lacre`): sello de error u observado (FALTA, REVISE, PRUEBA, OBSERVADO), borde de avisos de error y botón de peligro.
- **Lacre Lavado** (`lacre-claro`): fondo de los avisos de error.
- **Ocre Pálido** (`ocre-claro`): estado pendiente o de prueba (franja de modo prueba, notas de indicación).

### Neutral
- **Papel** (`papel`): la hoja: superficie de la cédula, campos, botón secundario, tabla.
- **Mesa Gris Papel** (`fondo`): fondo de página, frío; también el color de los agujeros de la línea perforada.
- **Tinta** (`tinta`): texto principal y encabezado de tablas y recuadros.
- **Grafito** (`grafito`): la raya de lápiz, contornos de marcas y campos, borde del botón secundario, etapas ya completadas y texto secundario fuerte.
- **Gris Texto** (`gris-texto`): texto secundario (≥ 4,5:1 sobre papel y sobre fondo).
- **Filete** (`filete`): filetes de 1 px entre filas y bordes de la hoja; etapas pendientes.

Existen alias de compatibilidad para clases antiguas del panel: `azul` → timbre, `amarillo` → ocre-claro, `tarjeta` → papel, `borde` → filete, `error` → lacre, `verde-profundo` → verde-tinta. No se usan en pantallas nuevas.

### Named Rules
**The Verde Tocable Rule.** El verde escuela aparece solo en lo que se puede tocar (botón principal) o en lo que ya se eligió (fila marcada, contorno de la marca). Nunca en titulares, decoración ni fondos de sección.

**The Timbre Informa Rule.** El azul de timbre informa y certifica (banda, sellos, enlaces, foco); no es color de acción principal. La acción es verde, el estado es sello.

## Typography

**Display Font:** Atkinson Hyperlegible Next (con Segoe UI, Arial)
**Body Font:** Atkinson Hyperlegible Next (pesos 400 y 700)
**Label Font:** Archivo en ancho angosto (eje `wdth` al 75 %), con Arial Narrow
**Credential Font:** Courier Prime (con Courier New)

**Character:** Atkinson pone la lectura sin esfuerzo (baja visión, lectores iniciales); Archivo angosta en mayúsculas imita los rótulos impresos de una cédula; Courier Prime es la letra de máquina de la papeleta impresa, reservada a usuario y contraseña.

### Hierarchy
- **Display** (700, 30 px en celular / 36 px en escritorio, 1,22, −0,012em, `text-wrap: balance`): título de la portada de la encuesta.
- **Headline** (700, 24 px en celular / 28 px en escritorio, 1,22): el texto de cada pregunta; también el título de la confirmación (28–32 px) y del agradecimiento.
- **Body** (400, 19 px, 1,5, cifras tabulares): texto de las opciones y párrafos; párrafos largos a un máximo de 62ch. La opción elegida pasa a 700.
- **Body secundario** (400, 18 px): indicaciones, contadores, avisos. Es el piso del texto de la encuesta.
- **Label** (Archivo angosta 700, 13–20 px, mayúsculas, 0,06em): números de opción (18 px), «PREGUNTA N DE M» (17 px), nombre de la banda (15 px), encabezados de tabla (14 px), rótulos de credencial (13 px), número de pregunta grande (32 px, azul timbre).
- **Stamp** (Archivo angosta 800, 12–15 px, mayúsculas, 0,08em): texto de los sellos.
- **Credential** (Courier Prime 700, 24 px, mayúsculas, 0,12em): lo que se escribe en las casillas de ingreso.

### Named Rules
**The Dieciocho Rule.** Todo texto que la persona lee al responder mide 18 px o más; el cuerpo base es 19 px. Solo los textos de la banda, las tablas del panel y los rótulos impresos bajan de ahí.

**The Cifra Tabular Rule.** Los números siempre van en cifras tabulares (activadas en `body`), para que el avance y el panel se lean como un acta.

## Layout

Columna única centrada, con la banda de timbre al mismo ancho que el contenido de su página para que todo quede alineado: angosto (`max-w-2xl`, encuesta), documento (`max-w-3xl`), medio (`max-w-5xl`) y ancho (`max-w-6xl`, panel). En celular la hoja ocupa todo el ancho con bordes solo arriba y abajo; desde `sm` (640 px) recupera el borde completo. Márgenes internos de la hoja: 20 px en celular, 32 px en escritorio.

Las opciones son filas a todo el ancho de la hoja en una grilla de tres columnas: número (36 px, o 44 px si lleva icono), texto, y marca (32 px), con 12 px entre columnas, 14 px de alto interno y 60 px de alto mínimo. Sobre la hoja va el avance: «PREGUNTA N DE M» con el tiempo restante a la derecha y una franja de etapas a escala fija, un segmento de 5 px por sección (grafito = hecha, timbre = actual, filete = pendiente), con el nombre de cada sección debajo solo en escritorio y la sección actual en una línea propia en celular.

En celular la barra de navegación (Anterior en bloque secundario, Siguiente en bloque verde) queda fija abajo sobre papel con un filete superior; en escritorio vuelve al flujo bajo la hoja.

**The Cuarenta y Ocho Rule.** Todo lo que se toca mide al menos 48 px de alto; botones de bloque 52 px, filas 60 px.

## Elevation & Depth

Sistema plano. La profundidad se expresa con capas de papel (hoja blanca sobre mesa gris), filetes de 1 px y bandas de tinta o timbre, nunca con sombras. La única excepción es el canto inferior del botón principal, una sombra interior que lo hace leer como bloque impreso, no como objeto flotante. El diálogo de ayuda no se eleva: se separa con un velo de tinta al 55 % y un borde grafito.

### Shadow Vocabulary
- **Canto del bloque** (`box-shadow: inset 0 -2px 0 rgb(31 42 5 / 0.25)`): solo en el botón principal.

### Named Rules
**The Hoja Plana Rule.** Nada flota. Si algo necesita separarse, recibe un filete, una banda o un cambio de papel, no una sombra.

## Shapes

Esquinas casi rectas: 3 px en botones de bloque y en el diálogo, 2 px en campos, casillas de escudo y botones de icono, 1,5 px en el cuadrado de la marca múltiple. Bordes de 1 px (filete para separar, grafito para contornear lo que se completa, tinta para la casilla de credencial); 2 px solo para el cierre de una tabla y la línea punteada de firma. Siluetas propias del mundo: la línea de corte perforada (círculos de 4,8 px cada 14 px, del color de la mesa, bajo la banda), el sello rectangular de borde doble (borde de 1,5 px más contorno de 1 px separado 2 px) y la urna dibujada con su ranura.

## Components

### Buttons
Bloques casi rectos, firmes, que se comprimen un poco al presionar.
- **Shape:** esquinas casi rectas (3 px), alto mínimo 52 px, 700.
- **Primary:** verde escuela con texto verde noche y canto inferior interior. Es la única acción principal por pantalla (Siguiente, Enviar, Ingresar).
- **Hover / Focus:** hover solo con puntero fino (verde más hondo; el secundario pasa a fondo gris papel). Al presionar `scale(0.97)` en 140 ms. Foco: anillo azul timbre de 3 px separado 2 px. Deshabilitado: opacidad 0,55.
- **Secondary:** papel con borde grafito de 1 px y texto tinta (Anterior, Volver).
- **Danger:** lacre con texto blanco, solo para acciones destructivas del panel.
- **Texto:** acciones menores como «Saltar» son enlaces subrayados en azul timbre, 700, de 48 px de alto.

### Inputs / Fields
- **Style:** papel, borde grafito de 1 px, esquinas de 2 px, 1,05 rem (19 px en la respuesta abierta), con contador alineado a la derecha.
- **Focus:** anillo azul timbre de 3 px pegado al borde.
- **Error:** aviso con borde lacre, fondo lacre lavado y sello FALTA o REVISE; el campo no cambia de color.

### Navigation
Banda de timbre de 56 px con el escudo (en ingreso y papeleta, la insignia completa) sobre una casilla blanca de 40 px y esquinas de 2 px, «ENCUESTA PEI 2027» en rótulo blanco de 15 px y un detalle de 14 px en blanco al 80 % (oculto en celular). A la derecha, Ayuda como texto blanco con hover blanco al 10 %. Debajo, siempre, la línea perforada.

### Fila de cédula (componente firma)
Una opción numerada a todo el ancho, separada por filetes. Número en rótulo gris (tinta al elegir), texto en cuerpo 19 px (700 al elegir), marca a la derecha: círculo para una opción, cuadrado para varias, siempre relleno blanco y contorno grafito de 1,6. Al elegir, la fila pasa a verde fila, el contorno a verde tinta de 2,2 y una raya de lápiz grafito (3,6 de grosor, extremos redondos, algo irregular y pasada del contorno) se dibuja en 190 ms con salida suave `cubic-bezier(0.23, 1, 0.32, 1)`. Hover: fondo gris papel al 70 %.

### Sello
Rectángulo de borde doble en `currentColor`, rótulo 800 en mayúsculas: azul timbre para lo que informa (VOTO SECRETO, VISTA PREVIA), lacre para lo que observa o falla (FALTA, REVISE, PRUEBA).

### Casilla de credencial
Recuadro de papel con borde tinta de 1 px, rótulo grafito de 13 px arriba y el valor en Courier Prime 24 px mayúsculas; el foco enciende un contorno azul timbre de 3 px en toda la casilla.

### Acta de avance
Tabla sobre papel con borde filete: encabezado en banda de tinta con rótulos de 14 px en papel, filas con filetes, cierre de 2 px en tinta, cifras «n / base» alineadas a la derecha y una barra de 3 px grafito sobre filete por celda.

### Urna y doblez
Ilustración vectorial de la urna (contorno y tapa azul timbre, papeletas blancas con filete y una marca verde rayada). Al enviar, la hoja se dobla hacia atrás y baja a la urna en 420 ms con `cubic-bezier(0.77, 0, 0.175, 1)`. Con `prefers-reduced-motion` la raya aparece ya dibujada, el doblez se reemplaza por un desvanecido de 200 ms y los botones no se comprimen.

## Do's and Don'ts

### Do:
- **Do** reservar el verde escuela (#92B01A) para el botón principal y lo ya elegido, siempre con texto verde noche.
- **Do** separar con filetes de 1 px y capas de papel; esquinas de 2–3 px.
- **Do** mantener el texto de la encuesta en 18 px o más y todo objetivo táctil en 48 px o más.
- **Do** marcar la elección con la raya de lápiz grafito sobre un círculo (una opción) o un cuadrado (varias) blancos.
- **Do** expresar estados con sellos de borde doble (timbre para informar, lacre para observar).
- **Do** mostrar la insignia o el escudo en la banda de timbre, con la línea perforada debajo.
- **Do** limitar el movimiento a la raya (≈190 ms) y al doblez (≈420 ms), ambos atenuados con `prefers-reduced-motion`.

### Don't:
- **Don't** usar tarjetas redondeadas con sombra, botones píldora ni titulares azules sobre gris.
- **Don't** poner sombras fuera del canto interior del botón principal.
- **Don't** poner rótulos de antetítulo (eyebrows) sobre los títulos.
- **Don't** usar verde escuela en titulares, decoración o fondos de sección, ni texto blanco sobre él.
- **Don't** agregar tema oscuro: el producto es solo claro.
- **Don't** usar Courier Prime fuera de las credenciales ni los alias antiguos (`azul`, `tarjeta`, `borde`…) en pantallas nuevas.
