export default function KpiNum({ val, unit, label, color, t, live }) {
  return (
    <div style={{textAlign:"center", padding:"6px 10px", position:"relative"}}>
      {live && (
        <span style={{
          position:"absolute", top:2, right:6,
          width:5, height:5, borderRadius:"50%",
          background:t.green, boxShadow:`0 0 6px ${t.green}`,
          animation:"blink 1.5s infinite",
        }}/>
      )}
      <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:20, fontWeight:700, color:color||t.accent, lineHeight:1.1, transition:"color 0.5s"}}>{val}</div>
      {unit && <div style={{fontSize:14, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace"}}>{unit}</div>}
      <div style={{fontSize:11, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>{label}</div>
    </div>
  );
}
