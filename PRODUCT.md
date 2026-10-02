# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Apoderados** de los 25 cursos (prekínder a 8° básico y PIE Opción 4) de la Escuela República del Ecuador E-79, Antofagasta. Una encuesta por familia. Muchos responden desde el celular, en la reunión de apoderados o en la casa; parte de ellos tiene poca experiencia digital o dificultades de lectura.
- **Estudiantes de 5° a 8° básico** (10 a 14 años), normalmente en el laboratorio de computación, supervisados, a veces desde el celular en la casa.
- **Funcionarios** (~120: docentes, asistentes de la educación y equipo directivo), en consejo de profesores o desde su celular.
- **Comisión del PEI** (~8 personas) y **administración** (2 cuentas): siguen el avance, revisan las encuestas, generan papeletas y, al cierre, leen los resultados.
- **Comunidad**: ve la pantalla pública de avance (proyectada en la sala de profesores).

## Product Purpose

Aplicar una vez la encuesta de actualización del Proyecto Educativo Institucional (PEI) 2027 a los tres estamentos y entregar a la comisión los resultados sin conteo manual. Éxito: alta participación de familias, respuestas francas (sobre todo en gestión) y un informe que sirva de evidencia para redactar el nuevo PEI.

## Positioning

El anonimato es estructural, no una promesa: las credenciales se reparten al azar desde una bolsa, como papeletas de votación; el padrón (quién votó) y la urna (qué se respondió) están separados y la urna no guarda fecha, hora ni credencial. La plataforma es de la escuela y corre en su propio servidor.

## Operating Context

- Papeletas impresas en blanco y negro (10 por hoja carta), recortadas y sacadas de una bolsa; usuario y contraseña sin caracteres ambiguos.
- Encuesta de 10 a 20 minutos, una pregunta por pantalla, sin borrador guardado (laboratorio compartido).
- Modo Prueba (pilotos 8 y 9 de octubre de 2026) y modo Oficial; reinicio a cero entre ambos.
- Pantalla pública de avance proyectada; panel de gestión usado en computador.

## Capabilities and Constraints

- Textos de la encuesta v9 congelados (aprobados por la comisión el 2/10/2026); no se cambian sin la comisión.
- Next.js 16 + Tailwind 4, servidor LXC con 2 GB de RAM; celulares de gama baja.
- Sin fotos reales por ahora (la foto de la escuela con autorización está pendiente).
- Resultados solo en grupos de 5 o más; sin datos personales.

## Brand Commitments

- **Obligatorio:** la insignia de la escuela (`public/insignia.png`; el escudo E79 recortado en `public/escudo.png`) y el verde de la escuela `#92B01A` (sitio escuelaecuador.cl).
- Todo lo demás de la identidad anterior (azul y amarillo del MVP, Montserrat, Lilita One, tarjetas redondeadas, botones píldora) **no** es compromiso: Ger lo rechazó por verse "típico de IA" (2/10/2026).
- Voz cálida y cercana, en español de Chile; "usted" para adultos, "tú" para estudiantes.

## Evidence on Hand

- Insignia en PNG (252×224). Encuesta v9, diccionario de datos y MVP en la carpeta superior del proyecto.
- No hay fotos, testimonios ni cifras publicables: no inventarlos.

## Product Principles

1. Que responder sea fácil para un niño de 10 años y para un apoderado que casi no usa el celular.
2. Que el anonimato se vea y se entienda, no solo que exista.
3. Que se sienta de esta escuela y no de una plantilla.
4. La claridad gana a la expresión en cada pantalla de tarea.

## Accessibility & Inclusion

Contraste AA, texto mínimo 18 px en la encuesta, objetivos táctiles de 48 px o más, navegable con teclado, lectura en voz alta opcional, sin depender del color para comunicar estado, funciona en celulares de gama baja y pantallas pequeñas.
