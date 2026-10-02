import { Cabecera } from "@/components/Cabecera";

export const metadata = { title: "Privacidad · Encuesta PEI 2027" };

export default function Privacidad() {
  return (
    <div className="flex-1 flex flex-col">
      <Cabecera />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        <article className="rounded-[24px] bg-tarjeta border border-borde p-6 sm:p-8 shadow-sm space-y-4">
          <h1 className="text-3xl font-extrabold text-azul">Privacidad</h1>
          <p>
            Esta encuesta es parte de la actualización del Proyecto Educativo Institucional (PEI) 2027 de la
            Escuela República del Ecuador E-79.
          </p>
          <h2 className="text-xl font-extrabold">Qué datos se guardan</h2>
          <p>Solo el curso, el estamento (apoderado, estudiante o funcionario) y las respuestas.</p>
          <h2 className="text-xl font-extrabold">Qué datos no se guardan</h2>
          <p>
            Nombres, RUT, correos, teléfonos, ni la fecha y hora en que se envió cada encuesta. Tampoco se
            guardan direcciones IP en los registros de la aplicación.
          </p>
          <h2 className="text-xl font-extrabold">Quién ve los resultados</h2>
          <p>
            La comisión del PEI, solo como resultados agrupados y en grupos de 5 o más personas. Después del
            cierre se publica una síntesis para toda la comunidad.
          </p>
          <h2 className="text-xl font-extrabold">Dónde se guardan y por cuánto tiempo</h2>
          <p>
            Los datos se guardan solo en el servidor de la escuela. El acceso pasa por Cloudflare, que protege y
            cifra la conexión. Al cerrar el proceso del PEI se conservan solo los resultados agrupados y se
            elimina el registro de credenciales.
          </p>
          <h2 className="text-xl font-extrabold">Estudiantes</h2>
          <p>
            Responden estudiantes de 5° a 8° básico, de forma voluntaria y anónima. Las familias reciben un
            comunicado previo sobre su participación.
          </p>
          <h2 className="text-xl font-extrabold">Consultas</h2>
          <p>Puede consultar a la comisión del PEI o a la dirección de la escuela.</p>
          <p className="text-base text-gris-texto">
            Este tratamiento de datos busca ser coherente con la Ley 21.719 de protección de datos personales.
          </p>
        </article>
      </main>
    </div>
  );
}
