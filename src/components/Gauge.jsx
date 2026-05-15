export default function Gauge({ stageOutput, t }) {
  const { value, target, unit, label } = stageOutput;
  const pct    = Math.max(0, Math.min(150, Math.round(value / target * 100)));
  const barPct = Math.min(100, pct);
  const color  = pct >= 100 ? t.red   : pct >= 80 ? t.orange : t.green;
  const bgDim  = pct >= 100 ? t.redDim : pct >= 80 ? t.orangeDim : t.greenDim;
  const status = pct >= 100 ? "FUORI LIMITE" : pct >= 80 ? "ATTENZIONE" : "NELLA NORMA";
  const icon   = pct >= 100 ? "✗" : pct >= 80 ? "⚠" : "✓";

  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:8, padding:"4px 0"}}>
      <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10,
        background:bgDim, border:`2px solid ${color}55`, width:"100%", justifyContent:"center",
        transition:"background 0.6s, border-color 0.6s"}}>
        <span style={{fontSize:20, lineHeight:1}}>{icon}</span>
        <span style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color, letterSpacing:2, transition:"color 0.6s"}}>{status}</span>
      </div>
      <div style={{width:"100%"}}>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
          <span style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{label}</span>
          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color, fontWeight:700, transition:"color 0.6s"}}>
            {+value.toFixed(1)}<span style={{color:t.textMuted, fontSize:11}}> / {target} {unit}</span>
          </span>
        </div>
        <div style={{height:6, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
          <div style={{height:"100%", width:`${barPct}%`, background:color, borderRadius:3, transition:"width 0.6s ease, background 0.6s"}}/>
        </div>
      </div>
    </div>
  );
}
