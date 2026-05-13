export default function QualRow({ param, value, limit, unit, minLimit, t, target }) {
  const ok = value < (target || limit) && (minLimit == null || value >= minLimit);
  const overLimit = value >= limit;
  const color = overLimit ? t.red : ok ? t.green : t.orange;
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${t.border}`}}>
      <span style={{fontSize:13, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, color:t.text}}>{param}</span>
      <div style={{display:"flex", alignItems:"center", gap:7}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color, transition:"color 0.5s"}}>{value}{unit}</span>
        <span style={{fontSize:11, padding:"2px 6px", borderRadius:4, background:`${color}20`, color, fontFamily:"'Share Tech Mono',monospace"}}>
          {overLimit ? "✗ FUORI" : ok ? "✓ OK" : "⚠ PRE"}
        </span>
      </div>
    </div>
  );
}
