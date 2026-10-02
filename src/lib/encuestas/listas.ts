// Listas de opciones comunes, con los códigos del Diccionario de datos v9.
// Las versiones de estudiantes usan la misma codificación con otra redacción.
import type { Opcion } from "./tipos";

const op = (codigo: string | number, texto: string): Opcion => ({
  codigo: String(codigo),
  texto,
});

export const CON_ADULTOS = [
  op(1, "Sí, podría decirlos"),
  op(2, "Más o menos"),
  op(3, "No"),
];

export const CON_ESTUDIANTES = [op(1, "Sí"), op(2, "Más o menos"), op(3, "No")];

export const VIG = [
  op(1, "Sí, tal como está"),
  op(2, "Sí, pero requiere ajustes"),
  op(3, "No, debería cambiar"),
  op(98, "No sé"),
];

export const PROP_ADULTOS = [
  op(1, "Formar buenas personas, con valores"),
  op(2, "Preparar académicamente para la enseñanza media y el futuro"),
  op(3, "Descubrir y desarrollar los talentos de cada estudiante"),
  op(4, "Ser un espacio seguro que acoge y contiene"),
  op(5, "Formar ciudadanos que aporten a su comunidad"),
  op(6, "Abrir oportunidades a niños y niñas de nuestro sector"),
];

// Mismo orden que el Word; los códigos siguen a PROP (2 = preparar, 1 = buenas personas).
export const PROP_ESTUDIANTES = [
  op(2, "Aprender mucho para mi futuro"),
  op(1, "Ser mejor persona"),
  op(3, "Descubrir lo que me gusta y en lo que soy bueno/a"),
  op(4, "Estar en un lugar seguro donde me cuidan"),
  op(5, "Aprender a convivir y ayudar a mi comunidad"),
  op(6, "Tener más oportunidades en la vida"),
];

export const PRIORIDADES_ADULTOS = [
  op("a", "Lograr buenos aprendizajes y preparar bien para la enseñanza media"),
  op("b", "Formar en valores: respeto, responsabilidad, honestidad"),
  op("c", "Desarrollar el gusto por la lectura"),
  op("d", "Enseñar a resolver conflictos con diálogo y buen trato"),
  op("e", "Cuidar la salud emocional y el bienestar de los estudiantes"),
  op("f", "Enseñar habilidades digitales y uso responsable de la tecnología"),
  op("g", "Promover el deporte y la vida saludable"),
  op("h", "Desarrollar el arte, la música y la cultura"),
  op("i", "Cuidar el medioambiente"),
  op("j", "Hacer participar activamente a las familias"),
  op("k", "Fortalecer el orgullo por la escuela y su historia"),
  op("l", "Aprender inglés desde los primeros años"),
  op("m", "Desarrollar el pensamiento crítico y la creatividad"),
  op("n", "Formar emprendimiento y liderazgo"),
  op("o", "Formar ciudadanos solidarios y comprometidos con su comunidad"),
];

export const PRIORIDADES_ESTUDIANTES = [
  op("a", "Aprender mucho y prepararme bien para la enseñanza media"),
  op("b", "Aprender a ser respetuoso, responsable y honesto"),
  op("c", "Que me guste leer"),
  op("d", "Aprender a solucionar peleas conversando"),
  op("e", "Sentirme bien y feliz en la escuela"),
  op("f", "Aprender a usar computadores y tecnología"),
  op("g", "Hacer deporte y cuidar mi salud"),
  op("h", "Hacer arte, música o teatro"),
  op("i", "Cuidar el medioambiente"),
  op("j", "Que mi familia participe en la escuela"),
  op("k", "Sentirme orgulloso de mi escuela"),
  op("l", "Aprender inglés"),
  op("m", "Pensar por mí mismo y tener ideas nuevas"),
  op("n", "Aprender a liderar y crear proyectos propios"),
  op("o", "Ser buen ciudadano y ayudar a mi comunidad"),
];

export const POR_ADULTOS = [
  op(1, "Porque hoy es una debilidad de la escuela y hay que mejorarla"),
  op(2, "Porque ya es una fortaleza que hay que cuidar y potenciar"),
  op(3, "Porque es clave para el futuro de los estudiantes"),
  op(4, "Porque es lo que más necesitan las familias de nuestro sector"),
  op(5, "Porque distinguiría a nuestra escuela de otras"),
  op(99, "Otra"),
];

// POR-E: mismos códigos que POR, sin el 4.
export const POR_ESTUDIANTES = [
  op(1, "Porque hoy falta en mi escuela"),
  op(2, "Porque ya es algo bueno de mi escuela y hay que cuidarlo"),
  op(3, "Porque me servirá para mi futuro"),
  op(5, "Porque haría a mi escuela especial"),
  op(99, "Otra"),
];

export const NEC = [
  op(1, "Más tiempo en el horario"),
  op(2, "Formación de los docentes"),
  op(3, "Recursos e infraestructura"),
  op(4, "Compromiso de las familias"),
  op(5, "Talleres y actividades"),
  op(6, "Alianzas con instituciones externas"),
  op(7, "Mejor organización y liderazgo"),
  op(98, "No sé"),
];

export const APO_A = [
  op(1, "Apoyando el estudio en casa"),
  op(2, "Asistiendo a reuniones y actividades"),
  op(3, "Participando en el centro de padres"),
  op(4, "Compartiendo mi oficio o experiencia"),
  op(5, "Colaborando en eventos"),
  op(96, "Por ahora no puedo"),
];

export const APO_F = [
  op(1, "Liderando un taller o proyecto"),
  op(2, "Formándome en el tema"),
  op(3, "Coordinando con otros docentes"),
  op(4, "Vinculándome con las familias"),
  op(96, "Por ahora no puedo"),
];

export const RED_ADULTOS = [
  op(1, "Centros de salud (CESFAM, salud mental)"),
  op(2, "Seguridad y protección de la infancia (Carabineros, PDI, Oficina Local de la Niñez)"),
  op(3, "Universidades, institutos y centros de formación técnica"),
  op(4, "Liceos y otros colegios (paso a la enseñanza media)"),
  op(5, "Empresas y fundaciones"),
  op(6, "Clubes deportivos y organizaciones culturales (museos, bibliotecas, centros culturales)"),
  op(7, "Organizaciones medioambientales"),
  op(8, "Juntas de vecinos y organizaciones del barrio"),
  op(98, "No sé"),
];

export const RED_ESTUDIANTES = [
  op(1, "El consultorio (charlas de salud y bienestar)"),
  op(2, "Carabineros o PDI (seguridad y cuidado)"),
  op(3, "Universidades (conocer carreras y laboratorios)"),
  op(4, "Liceos (conocer dónde podría estudiar la enseñanza media)"),
  op(5, "Empresas (conocer trabajos y oficios)"),
  op(6, "Clubes deportivos, museos o centros culturales"),
  op(7, "Grupos que cuidan el medioambiente"),
  op(8, "Vecinos y organizaciones del barrio"),
  op(98, "No sé"),
];

export const VAL_ADULTOS = [
  op(1, "Respeto"),
  op(2, "Responsabilidad"),
  op(3, "Honestidad"),
  op(4, "Solidaridad"),
  op(5, "Perseverancia (estudio y constancia)"),
  op(6, "Empatía"),
  op(7, "Tolerancia"),
  op(99, "Otro"),
];

export const VAL_ESTUDIANTES = [
  op(1, "Respeto"),
  op(2, "Responsabilidad"),
  op(3, "Honestidad"),
  op(4, "Ayudar a los demás"),
  op(5, "No rendirse (esfuerzo)"),
  op(6, "Ponerse en el lugar del otro"),
  op(7, "Aceptar a los demás como son"),
  op(99, "Otro"),
];

export const PER_ADULTOS = [
  op(1, "Lector/a habitual"),
  op(2, "Respetuoso/a y empático/a"),
  op(3, "Autónomo/a y responsable"),
  op(4, "Creativo/a"),
  op(5, "Con pensamiento crítico"),
  op(6, "Con buen nivel de inglés"),
  op(7, "Con habilidades digitales"),
  op(8, "Que resuelve conflictos dialogando"),
  op(9, "Bien preparado/a para la enseñanza media"),
  op(10, "Comprometido/a con su comunidad"),
  op(11, "Que cuida el medioambiente"),
  op(12, "Con hábitos de vida activa y saludable, que practica deporte"),
  op(13, "Perseverante y esforzado/a (estudio y constancia)"),
  op(14, "Que trabaja en equipo y colabora con otros"),
  op(15, "Con sensibilidad artística y cultural"),
  op(16, "Con buena autoestima y que maneja sus emociones"),
  op(17, "Con espíritu de liderazgo y emprendimiento"),
];

export const PER_ESTUDIANTES = [
  op(1, "Disfruta leer"),
  op(2, "Respeta a todos"),
  op(3, "Hace sus cosas solo/a y es responsable"),
  op(4, "Es creativo/a"),
  op(5, "Piensa por sí mismo/a y tiene ideas propias"),
  op(6, "Habla inglés"),
  op(7, "Sabe usar la tecnología"),
  op(8, "Soluciona los problemas conversando"),
  op(9, "Está bien preparado/a para la enseñanza media"),
  op(10, "Ayuda a su comunidad"),
  op(11, "Cuida la naturaleza"),
  op(12, "Practica deporte y cuida su salud"),
  op(13, "Se esfuerza y no se rinde"),
  op(14, "Trabaja en equipo con sus compañeros"),
  op(15, "Disfruta el arte, la música o el teatro"),
  op(16, "Se siente seguro/a de sí mismo/a y maneja sus emociones"),
  op(17, "Lidera y crea proyectos propios"),
];

export const DOC_ADULTOS = [
  op(1, "Es cercano/a y que escucha"),
  op(2, "Explica con paciencia hasta que todos entiendan"),
  op(3, "Es exigente, con altas expectativas"),
  op(4, "Hace clases motivadoras"),
  op(5, "Es justo/a y respetuoso/a"),
  op(6, "Se comunica bien con las familias"),
  op(7, "Apoya a quienes les cuesta"),
  op(8, "Es ejemplo de valores"),
];

export const DOC_ESTUDIANTES = [
  op(1, "Me escucha y es cercano/a"),
  op(2, "Explica con paciencia hasta que entiendo"),
  op(3, "Me exige porque cree que puedo"),
  op(4, "Hace clases entretenidas"),
  op(5, "Es justo/a y respetuoso/a con todos"),
  op(6, "Habla con mi familia"),
  op(7, "Me ayuda cuando me cuesta"),
  op(8, "Da el ejemplo"),
];

export const FAM = [
  op(1, "Acompaña el estudio en casa"),
  op(2, "Asiste a reuniones y citaciones"),
  op(3, "Se comunica con respeto con la escuela"),
  op(4, "Refuerza en casa los valores y normas"),
  op(5, "Cuida la asistencia y la puntualidad"),
  op(6, "Participa en actividades"),
  op(7, "Colabora con los profesores"),
  op(8, "Se preocupa del bienestar emocional de su hijo/a"),
];

export const ENF = [
  op(1, "Aprendizaje activo y por proyectos"),
  op(2, "Altas expectativas para todos"),
  op(3, "Atención a la diversidad (DUA)"),
  op(4, "Aprendizaje socioemocional"),
  op(5, "Formación integral (arte, deporte, cultura)"),
  op(6, "Uso pedagógico de la tecnología"),
  op(7, "Educación ambiental"),
  op(8, "Equidad de género"),
  op(9, "Vínculo con la familia y el territorio"),
];

export const ESCALAS = {
  ACU: [
    op(1, "Muy en desacuerdo"),
    op(2, "En desacuerdo"),
    op(3, "De acuerdo"),
    op(4, "Muy de acuerdo"),
    op(98, "No sé"),
  ],
  FRE: [op(1, "Nunca"), op(2, "A veces"), op(3, "Casi siempre"), op(4, "Siempre")],
} as const;

export { op };
