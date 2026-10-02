---
version: 1
slug: "src-app-encuesta-formulario-tsx"
primary_target: "src/app/encuesta/Formulario.tsx"
related_targets: ["src/app/page.tsx","src/app/gestion/(panel)/layout.tsx","src/app/avance/page.tsx"]
---

# Encuesta PEI 2027 — superficie del participante, panel y avance

Modo: Operate (completar una encuesta; seguir el avance; gestionar papeletas). Público: apoderados (celular, poca experiencia digital), estudiantes de 10 a 14 años (laboratorio), funcionarios, comisión. Restricciones: textos v9 congelados, contraste AA, texto ≥ 18 px en la encuesta, objetivos ≥ 48 px, tema claro (se responde de día, en celular, a veces al sol o bajo tubos fluorescentes del laboratorio). Obligatorio: insignia y verde escuela #92B01A.

## Direction contract

THESIS: Cada respuesta es un voto secreto. La encuesta se lee como una cédula impresa: opciones numeradas en filas separadas por filetes, se marca con una raya de lápiz y al final la papeleta se dobla y cae en la urna. Rechaza la plantilla de tarjetas blancas redondeadas, botones píldora y titulares azules sobre gris.

OWN-WORLD: papel de cédula blanco frío sobre un fondo gris papel; tinta negra para el texto; azul de timbre (#22357F) para la banda superior y los sellos; grafito para la raya; verde escuela solo en lo que se puede tocar o ya se eligió (con texto #1F2A05). Esquinas casi rectas (2–4 px), filetes de 1 px, línea de corte perforada bajo la banda. Archivo angosta en mayúsculas para rótulos impresos, Atkinson Hyperlegible Next para leer, Courier Prime para credenciales. Sellos rectangulares con borde doble para estados (VOTO SECRETO, PRUEBA, OBSERVADO).

STORY: la persona entiende al entrar que su papeleta es anónima porque el aspecto mismo es el de una votación; marca sin esfuerzo, ve su raya, y al enviar ve su papeleta entrar a la urna. La comisión lee el avance como un acta de mesa: cifras tabulares, filetes, sin adornos.

FIRST VIEWPORT: celular 390 px. Arriba, banda azul de timbre de 56 px con el escudo, «ENCUESTA PEI 2027» en Archivo angosta y Ayuda a la derecha; debajo, línea perforada. Luego el rótulo «PREGUNTA 7 DE 20 · IDENTIDAD DE LA ESCUELA» y la franja de etapas por sección a escala fija. La pregunta en Atkinson 26–28 px, negra. Opciones a todo el ancho de la hoja, cada fila con número en Archivo a la izquierda, texto, y el círculo para marcar a la derecha. Barra inferior fija con Anterior (texto) y Siguiente (bloque verde escuela).

FORM: Cédula y urna, candidato 1 de mi lista ordenada (elegido por el usuario como IMPECCABLE’S PICK); seed 0dd315e7. Gesto propio: la raya de lápiz que se dibuja en el círculo al marcar (trazo SVG, 160–200 ms, ease-out), y el doblez de la papeleta que cae en la urna al enviar; ambos se desactivan con prefers-reduced-motion. Raises aplicados: cifras tabulares estrictas en avance y panel; verde solo en lo tocable o elegido; franja de etapas fija por sección; jerarquía de resultados por tamaño de marca.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
