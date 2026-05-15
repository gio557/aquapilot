import { useState, useRef, useEffect } from "react";
import Gauge from "./Gauge";
import MechanicalWidget from "./MechanicalWidget";

const HOLD_MS = 2200;

function ClassifierBanner({ state, t }) {
  const color  = state.trafficLight === "red" ? t.red : state.trafficLight === "yellow" ? t.orange : t.green;
  const bgDim  = state.trafficLight === "red" ? t.redDim : state.trafficLight === "yellow" ? t.orangeDim : t.greenDim;
  const icon   = state.trafficLight === "red" ? "✗" : state.trafficLight === "yellow" ? "⚠" : "✓";
  const status = state.trafficLight === "red" ? "CRITICO" : state.trafficLight === "yellow" ? "ATTENZIONE" : "NORMALE";
  const sub    = state.trafficLight === "red"
    ? "Hopper saturo — svuotare"
    : state.trafficLight === "yellow"
      ? "Hopper in carico — monitorare"
      : "Hopper in condizioni regolari";
  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:8, padding:"4px 0"}}>
      <div style={{display:"flex", alignItems:"center", gap:8, padding:"10px 18px", borderRadius:10,
        background:bgDim, border:`2px solid ${color}55`, width:"100%", justifyContent:"center",
        transition:"background 0.6s, border-color 0.6s"}}>
        <span style={{fontSize:20, lineHeight:1}}>{icon}</span>
        <span style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color, letterSpacing:2, transition:"color 0.6s"}}>{status}</span>
      </div>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{sub}</span>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color, fontWeight:700, transition:"color 0.6s"}}>{state.currentDraw.toFixed(1)} A</span>
      </div>
    </div>
  );
}

function ClassifierMini({ state, t }) {
  if (!state) return null;
  if (state.mode === "timed") {
    const m = Math.floor(state.secondsRemaining / 60);
    const ss = state.secondsRemaining % 60;
    const cd = `${String(m).padStart(2,"0")}:${String(ss).padStart(2,"0")}`;
    const sc = state.isOn ? t.green : t.orange;
    return (
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
        padding:"5px 9px", background:t.surface2, borderRadius:6, border:`1px solid ${t.border}`}}>
        <div style={{display:"flex", alignItems:"center", gap:7}}>
          <span style={{fontSize:9, padding:"1px 6px", borderRadius:3, fontWeight:700,
            background:`${sc}22`, color:sc, fontFamily:"'Share Tech Mono',monospace",
            border:`1px solid ${sc}55`}}>
            {state.isOn ? "ON" : "OFF"}
          </span>
          <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:11, color:t.textMuted}}>Classificatore</span>
        </div>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textSec}}>{cd}</span>
      </div>
    );
  }
  const tlColor = state.trafficLight === "red" ? t.red : state.trafficLight === "yellow" ? t.orange : t.green;
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"5px 9px", background:t.surface2, borderRadius:6, border:`1px solid ${t.border}`}}>
      <div style={{display:"flex", alignItems:"center", gap:7}}>
        <span style={{fontSize:12, color:tlColor}}>●</span>
        <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:11, color:t.textMuted}}>Classificatore</span>
      </div>
      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:tlColor, fontWeight:700}}>
        {state.currentDraw.toFixed(1)} A
      </span>
    </div>
  );
}

export default function StageCard({ stage, index, t, action, autoEnabled, stageOutput, eff, classifierState, onClick }) {
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
  }, [action, autoEnabled]);

  const sc = stage.status === "ok" ? t.green : stage.status === "warn" ? t.orange : t.red;

  // Gauge color: for proximity-to-limit params, warn when ≥80% of limit
  let gaugeColor = t.green;
  if (stageOutput) {
    if (stageOutput.higherIsBetter) {
      const pct = stageOutput.value / stageOutput.target * 100;
      gaugeColor = pct >= 90 ? t.green : pct >= 65 ? t.orange : t.red;
    } else {
      const pct = stageOutput.value / stageOutput.target * 100;
      gaugeColor = pct >= 100 ? t.red : pct >= 80 ? t.orange : t.green;
    }
  }

  const sevRank = s => s === "ALTO" ? 2 : s === "MEDIO" ? 1 : 0;
  const gaugeRank = gaugeColor === t.red ? 2 : gaugeColor === t.orange ? 1 : 0;
  const clsRank = classifierState?.mode === "continuous"
    ? (classifierState.trafficLight === "red" ? 2 : classifierState.trafficLight === "yellow" ? 1 : 0)
    : 0;
  const rank = Math.max(sevRank(stable.sev), gaugeRank, clsRank);
  const bColor = rank === 2 ? t.red : rank === 1 ? t.orange : t.green;
  const bIcon  = stable.sev === "ALTO" ? "🔴" : stable.sev === "MEDIO" ? "🟡" : "🟢";

  const isEfficiency = stageOutput?.higherIsBetter;

  const glowShadow = `0 6px 24px ${bColor}55, 0 2px 8px ${bColor}33`;

  return (
    <div onClick={onClick} style={{
      background:t.surface,
      border:`2px solid ${bColor}`,
      borderTop:`4px solid ${bColor}`,
      borderRadius:12,
      padding:14, flex:"1 1 0", minWidth:0,
      cursor:"pointer",
      transition:"transform 0.15s, box-shadow 0.4s, border-color 0.4s",
      display:"flex", flexDirection:"column", gap:10,
      boxShadow:glowShadow,
    }}
      onMouseEnter={e => { e.currentTarget.style.transform="translateY(-2px)"; e.currentTarget.style.boxShadow=`0 10px 32px ${bColor}77, 0 4px 12px ${bColor}44`; }}
      onMouseLeave={e => { e.currentTarget.style.transform=""; e.currentTarget.style.boxShadow=glowShadow; }}
    >
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start"}}>
        <div>
          <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:10, color:t.textMuted, letterSpacing:1, marginBottom:2}}>ST-{String(index+1).padStart(2,"0")}</div>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:12, color:t.text, letterSpacing:1}}>{stage.name}</div>
          <div style={{fontSize:11, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", marginTop:1}}>{stage.sub}</div>
        </div>
        <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:sc, fontWeight:700, textAlign:"right"}}>
          {eff != null ? `${eff}%` : "—"}<div style={{fontSize:9, color:t.textMuted}}>EFF</div>
        </div>
      </div>

      {stageOutput && (
        <div style={{display:"flex", justifyContent:"center"}}>
          {classifierState?.mode === "continuous"
            ? <ClassifierBanner state={classifierState} t={t}/>
            : isEfficiency
              ? <MechanicalWidget stageOutput={stageOutput} t={t}/>
              : <Gauge stageOutput={stageOutput} t={t}/>
          }
        </div>
      )}

      {classifierState?.mode === "timed" && <ClassifierMini state={classifierState} t={t}/>}

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
