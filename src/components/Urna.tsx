/** Urna de acrílico con papeletas dobladas (dibujo propio, SVG). */
export function Urna({ papeletas = 3, className = "" }: { papeletas?: number; className?: string }) {
  return (
    <svg viewBox="0 0 160 150" className={className} role="img" aria-label="Urna con papeletas dobladas">
      {/* papeletas dentro, vistas a través del acrílico */}
      {Array.from({ length: papeletas }).map((_, i) => (
        <g key={i} transform={`translate(${34 + i * 26} ${92 - (i % 2) * 8}) rotate(${[-14, 9, -4, 15][i % 4]})`}>
          <rect width="38" height="24" fill="#fff" stroke="#3d4145" strokeWidth="1.2" />
          <line x1="0" y1="12" x2="38" y2="12" stroke="#c9ccc6" strokeWidth="1" />
          <line x1="9" y1="4" x2="9" y2="10" stroke="#3d4145" strokeWidth="2" strokeLinecap="round" />
        </g>
      ))}
      {/* cuerpo de acrílico */}
      <path d="M20 46 H140 V138 H20 Z" fill="#22357f" fillOpacity="0.07" stroke="#22357f" strokeWidth="2" />
      {/* tapa con ranura */}
      <path d="M14 34 H146 V48 H14 Z" fill="#22357f" />
      <rect x="54" y="39" width="52" height="4" rx="1" fill="#eceeea" />
      {/* reflejo del acrílico */}
      <line x1="30" y1="58" x2="30" y2="126" stroke="#fff" strokeWidth="3" strokeOpacity="0.9" />
      {/* papeleta entrando por la ranura */}
      <g transform="translate(66 6)">
        <rect width="28" height="36" fill="#fff" stroke="#3d4145" strokeWidth="1.2" />
        <line x1="0" y1="18" x2="28" y2="18" stroke="#c9ccc6" strokeWidth="1" />
        <circle cx="20" cy="9" r="4.5" fill="#92b01a" stroke="#3d4145" strokeWidth="1" />
        <line x1="20" y1="3.5" x2="20" y2="14.5" stroke="#3d4145" strokeWidth="2" strokeLinecap="round" />
      </g>
    </svg>
  );
}
