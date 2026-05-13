import { useState, useRef, useEffect } from "react";
import Gauge from "./Gauge";
import MechanicalWidget from "./MechanicalWidget";

const HOLD_MS = 2200;

export default function StageCard({ stage, index, t, action, autoEnabled, stageOutput, onClick }) {
  const IDLE = [
    "Nessuna correzione attiva — stadio stabile",
    "Nessuna correzione attiva — stadio stabile",
    autoEnabled ? "Aerazione e fanghi sotto controllo" : "Verificare O2 e MLSS manualmente",
    autoEnabled ? "Dosaggio coagulante ottimizzato"   : "Verificare TSS e dosaggio coagulante",
    autoEnabled ? "Qualità uscita nei parametri"      : "Verificare pH e parametri di scarico",
  ];

  const buildMsg = (act) => act
    ? { text: act.text, sev: act.sev }
    : { text: autoEnabled ? IDLE[Math.min(index, IDLE.length-1)] : "⚠ Modalità manuale — monitorare", sev: "OK" };

  const [stable, setStable] = useState(() => buildMsg(action));
  const pendingRef = useRef(null);

  useEffect(() => {
    const nextText = action ? action.text : null;
    const curText  = stable ? stable.text : null;
    if (nextText === curText) {
      if (pendingRef.current) { clearTimeout(pendingRef.current.timer); pendingRef.current = null; }
      return;
    }
    if (pendingRef.current && pendingRef.current.text === nextText) return;
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    const timer = setTimeout(() => { setStable(buildMsg(action)); pendingRef.current = null; }, HOLD_MS);
    pendingRef.current = { text: nextText, timer };
  });

  const sc = stage.status === "ok" ? t.green : stage.status === "warn" ? t.orange : t.red;
  const bColor = stable.sev === "ALTO" ? t.red : stable.sev === "MEDIO" ? t.orange : t.green;
  const bIcon  = stable.sev === "ALTO" ? "🔴" : stable.sev === "MEDIO" ? "🟡" : "🟢";

  const isEfficiency = stageOutput?.higherIsBetter;

  return (
    <div onClick={onClick} style={{
      background:t.surface, border:`1px solid ${t.border}`,
      borderTop:`3px solid ${sc}`, borderRadius:12,
      padding:14, flex:"1 1 0", minWidth:0,
      cursor:"pointer", transition:"transform 0.15s,box-shadow 0.15s",
      display:"flex", flexDirection:"column", gap:10,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 6px 24px ${sc}22`; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=""; }}
    >
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:t.textMuted, letterSpacing:1, marginBottom:2}}>ST-{String(index+1).padStart(2,"0")}</div>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:12, color:t.text, letterSpacing:1}}>{stage.name}</div>
          <div style={{fontSize:11, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", marginTop:1}}>{stage.sub}</div>
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:sc, fontWeight:700, textAlign:"right"}}>
          {stage.eff}%<div style={{fontSize:9, color:t.textMuted}}>EFF</div>
        </div>
      </div>

      {stageOutput && (
        <div style={{display:"flex", justifyContent:"center"}}>
          {isEfficiency
            ? <MechanicalWidget stageOutput={stageOutput} t={t}/>
            : <Gauge stageOutput={stageOutput} t={t}/>
          }
        </div>
      )}

      <div style={{
        padding:"7px 10px", borderRadius:7,
        background:stable.sev==="ALTO"?t.redDim:stable.sev==="MEDIO"?t.orangeDim:t.greenDim,
        border:`1px solid ${bColor}33`, borderLeft:`3px solid ${bColor}`,
        transition:"background 0.6s,border-color 0.6s",
      }}>
        <div style={{display:"flex", gap:5, alignItems:"flex-start"}}>
          <span style={{fontSize:11, flexShrink:0}}>{bIcon}</span>
          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:bColor, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden", transition:"color 0.6s"}}>{stable.text}</span>
        </div>
      </div>
      <div style={{textAlign:"center", marginTop:6, fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", opacity:0.65}}>↗ dettagli stadio</div>
    </div>
  );
}
