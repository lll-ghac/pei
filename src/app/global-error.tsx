"use client";

/**
 * Último recurso si falla el diseño raíz: documento propio, sin las hojas de estilo de la app
 * (Next.js no las incluye aquí), en español y con la paleta escrita a mano.
 */
export default function ErrorGlobal({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="es-CL">
      <body style={{ margin: 0, background: "#eceeea", color: "#16181a", fontFamily: "'Segoe UI', Arial, sans-serif" }}>
        <title>Encuesta PEI 2027</title>
        <div style={{ background: "#22357f", color: "#fff", padding: "14px 20px", fontWeight: 700, letterSpacing: "0.06em" }}>
          ENCUESTA PEI 2027
        </div>
        <main style={{ maxWidth: 640, margin: "40px auto", background: "#fff", border: "1px solid #c9ccc6", padding: "32px 24px" }}>
          <h1 style={{ fontSize: 28, margin: 0 }}>No pudimos cargar la encuesta</h1>
          <p style={{ fontSize: 19, lineHeight: 1.5 }}>
            Puede ser un corte de internet o del servidor de la escuela. Si estaba respondiendo, sus respuestas no se
            han enviado todavía. Vuelva a intentar en un momento.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              background: "#92b01a",
              color: "#1f2a05",
              border: 0,
              borderRadius: 3,
              minHeight: 52,
              padding: "0 22px",
              fontSize: 18,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            Reintentar
          </button>
        </main>
      </body>
    </html>
  );
}
