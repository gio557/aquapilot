export default function GreenEcoLogo({ height = 44, textColor = "#2D2D2D" }) {
  const vw = 270, vh = 78;
  const w = height * vw / vh;
  return (
    <svg viewBox={`0 0 ${vw} ${vh}`} width={w} height={height} xmlns="http://www.w3.org/2000/svg">

      {/* ── Swoosh arc ── */}
      <path d="M 8,60 C 55,28 120,14 200,34"
        fill="none" stroke="#4DB848" strokeWidth="4.5" strokeLinecap="round"/>

      {/* ── Ladybug helper: body + dividing line + spots ── */}
      {[
        { cx:38, cy:48 },
        { cx:80, cy:30 },
        { cx:116, cy:22 },
      ].map(({ cx, cy }, i) => (
        <g key={i} transform={`translate(${cx},${cy})`}>
          {/* body */}
          <ellipse rx="8" ry="6.5" fill="#CC2020"/>
          {/* head */}
          <ellipse cx="0" cy="-8" rx="4.5" ry="3.5" fill="#111"/>
          {/* centre line */}
          <line y1="-2" y2="7" stroke="#111" strokeWidth="1.2"/>
          {/* spots */}
          <circle cx="-3.5" cy="0" r="1.5" fill="#111"/>
          <circle cx=" 3.5" cy="0" r="1.5" fill="#111"/>
          <circle cx="-3.5" cy="4.5" r="1.5" fill="#111"/>
          <circle cx=" 3.5" cy="4.5" r="1.5" fill="#111"/>
        </g>
      ))}

      {/* ── "green" in bold dark ── */}
      <text x="2" y="70"
        fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="37" fill={textColor}>green</text>

      {/* ── Water drop (replaces first 'e' in eco) ── */}
      {/* positioned to visually follow "green" (~106px wide at fs37) */}
      <g transform="translate(115,52)">
        <path d="M0,-22 C-16,-22 -18,-8 -18,3 C-18,13 -10,20 0,20 C10,20 18,13 18,3 C18,-8 16,-22 0,-22 Z"
          fill="#90CAF9"/>
        {/* white 'e' inside drop */}
        <text x="-7" y="9"
          fontFamily="'Arial Black','Arial',sans-serif"
          fontWeight="900" fontSize="18" fill="white">e</text>
      </g>

      {/* ── "co" in green ── */}
      <text x="134" y="70"
        fontFamily="'Arial Black','Arial',sans-serif"
        fontWeight="900" fontSize="37" fill="#4DB848">co</text>

      {/* ── WASTEWATER subtitle ── */}
      <text x="18" y="78"
        fontFamily="'Arial','Helvetica',sans-serif"
        fontWeight="700" fontSize="11" fill="#6B6B6B" letterSpacing="2.5">WASTEWATER</text>

    </svg>
  );
}
