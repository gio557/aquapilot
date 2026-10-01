export default function MechanicalWidget({ stageOutput, t }) {
  const { value, target, label } = stageOutput;
  const pct    = Math.max(0, Math.min(100, Math.round(value / target * 100)));
  const color  = pct >= 90 ? t.green  : pct >= 65 ? t.orange  : t.red;
  const bgDim  = pct >= 90 ? t.greenDim : pct >= 65 ? t.orangeDim : t.redDim;
  const status = pct >= 90 ? "IN TARGET" : pct >= 65 ? "ATTENZIONE" : "FUORI TARGET";
  const icon   = pct >= 90 ? "✓" : pct >= 65 ? "⚠" : "✗";

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
            {Math.round(value)}%<span style={{color:t.textMuted, fontSize:11}}> / {target}% target</span>
          </span>
        </div>
        <div style={{height:6, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
          <div style={{height:"100%", width:`${Math.min(100, pct)}%`, background:color, borderRadius:3, transition:"width 0.6s ease, background 0.6s"}}/>
        </div>
      </div>
    </div>
  );
}
