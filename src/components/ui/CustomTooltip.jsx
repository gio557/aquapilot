export default function CustomTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:8, padding:"10px 14px", fontFamily:"'Rajdhani',sans-serif", fontSize:11}}>
      <div style={{color:t.textSec, marginBottom:6, fontFamily:"'Share Tech Mono',monospace", fontSize:14}}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{display:"flex", gap:8, color:p.color, marginBottom:2}}>
          <span style={{fontWeight:700}}>{p.name}</span>
          <span style={{fontFamily:"'Share Tech Mono',monospace"}}>{p.value}</span>
        </div>
      ))}
    </div>
  );
}
