import { useState, useRef, useEffect } from "react";
import Gauge from "./Gauge";
import MechanicalWidget from "./MechanicalWidget";
import { dataSourceTag, resolveSource } from "../constants/dataSource";

const HOLD_MS = 2200;

// EMA smoothing for numeric readouts so they drift gradually instead of
// flickering on every 500ms tick of process noise (same idea as the dashboard
// KPIs). Non-finite values pass through untouched.
function useSmoothed(value, alpha = 0.15) {
  const ref = useRef(value);
  const [disp, setDisp] = useState(value);
  useEffect(() => {
    if (!Number.isFinite(value)) { ref.current = value; setDisp(value); return; }
    ref.current = Number.isFinite(ref.current) ? ref.current + alpha * (value - ref.current) : value;
    setDisp(ref.current);
  }, [value, alpha]);
  return disp;
}

function GrigliaturaBanner({ state, onReset, t }) {
  const PHASES = {
    STANDBY:           { label:"STANDBY",        icon:"✓", rank:0 },
    AVVIO_PRESSA:      { label:"AVVIO PRESSA",   icon:"⟳", rank:1 },
    PULIZIA_ATTIVA:    { label:"PULIZIA ATTIVA", icon:"⟳", rank:1 },
    POST_CICLO_PRESSA: { label:"POST CICLO",     icon:"✓", rank:0 },
    ALLARME_MOTORE:    { label:"ALLARME MOTORE", icon:"✗", rank:2 },
  };
  const ph = PHASES[state.fase] || { label:state.fase, icon:"●", rank:0 };
  const phRank = state.bypass_aperto ? Math.max(ph.rank, 1) : ph.rank;
  const color  = phRank === 2 ? t.red : phRank === 1 ? t.orange : t.green;
  const bgDim  = phRank === 2 ? t.redDim : phRank === 1 ? t.orangeDim : t.greenDim;
  const dhMax  = 0.60;
  const dhPct  = Math.min(100, (state.delta_h / dhMax) * 100);
  const dhColor= state.delta_h >= 0.35 ? t.red : state.delta_h >= 0.15 ? t.orange : t.green;
  return (
    <div style={{width:"100%", display:"flex", flexDirection:"column", gap:6, padding:"4px 0"}}>
      <div style={{display:"flex", alignItems:"center", gap:8, padding:"8px 14px", borderRadius:10,
        background:bgDim, border:`2px solid ${color}55`, justifyContent:"space-between",
        transition:"background 0.6s, border-color 0.6s"}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span style={{fontSize:16, lineHeight:1}}>{ph.icon}</span>
          <span style={{fontFamily:"'Orbitron',sans-serif", fontSize:12, fontWeight:900, color, letterSpacing:1, transition:"color 0.6s"}}>{ph.label}</span>
        </div>
        {state.fase === "ALLARME_MOTORE" && (
          <button onClick={e => { e.stopPropagation(); onReset?.(); }}
            style={{fontSize:9, padding:"2px 8px", borderRadius:3, cursor:"pointer",
              background:`${t.red}22`, color:t.red, border:`1px solid ${t.red}66`,
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, flexShrink:0}}>
            RESET
          </button>
        )}
      </div>
      <div>
        <div style={{display:"flex", justifyContent:"space-between", marginBottom:2}}>
          <span style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>ΔH livello</span>
          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:dhColor, fontWeight:700}}>
            {(+state.delta_h).toFixed(3)} m
          </span>
        </div>
        <div style={{height:4, background:t.surface3, borderRadius:2, overflow:"hidden"}}>
          <div style={{height:"100%", width:`${dhPct}%`, background:dhColor, borderRadius:2, transition:"width 0.6s ease"}}/>
        </div>
      </div>
      <div style={{display:"flex", gap:5, flexWrap:"wrap"}}>
        <span style={{fontSize:9, padding:"1px 6px", borderRadius:3,
          background:`${state.pressa_attiva ? t.green : t.surface3}22`,
          color:state.pressa_attiva ? t.green : t.textMuted,
          border:`1px solid ${state.pressa_attiva ? t.green+"55" : t.border}`,
          fontFamily:"'Share Tech Mono',monospace"}}>
          PRESSA {state.pressa_attiva ? "ON" : "OFF"}
        </span>
        {state.bypass_aperto && (
          <span style={{fontSize:9, padding:"1px 6px", borderRadius:3, background:`${t.orange}22`,
            color:t.orange, border:`1px solid ${t.orange}55`, fontFamily:"'Share Tech Mono',monospace"}}>
            BYPASS
          </span>
        )}
        {(state.fase === "PULIZIA_ATTIVA" || state.fase === "ALLARME_MOTORE") && state.corrente_motore > 0 && (
          <span style={{fontSize:9, padding:"1px 6px", borderRadius:3, background:`${t.accent}18`,
            color:t.accent, border:`1px solid ${t.accent}44`, fontFamily:"'Share Tech Mono',monospace"}}>
            {(+state.corrente_motore).toFixed(1)} A
          </span>
        )}
        {state.allarmi?.length > 0 && (
          <span style={{fontSize:9, padding:"1px 6px", borderRadius:3, background:`${t.red}22`,
            color:t.red, border:`1px solid ${t.red}55`, fontFamily:"'Share Tech Mono',monospace"}}>
            ALM
          </span>
        )}
      </div>
    </div>
  );
}

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

export default function StageCard({ stage, index, t, action, autoEnabled, stageOutput, eff, classifierState, grigliaturaState, onGrigliaturaReset, referenceSensor, qualitySources, onClick }) {
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

  // Smooth the nervous numeric readouts (EFF %, gauge value, ΔH, motor current)
  const effSm = useSmoothed(eff);
  const valSm = useSmoothed(stageOutput?.value);
  const dhSm  = useSmoothed(grigliaturaState?.delta_h, 0.2);
  const grISm = useSmoothed(grigliaturaState?.corrente_motore, 0.2);
  const clsISm = useSmoothed(classifierState?.currentDraw, 0.2);
  const so = stageOutput ? { ...stageOutput, value: Number.isFinite(valSm) ? valSm : stageOutput.value } : stageOutput;
  const grState = grigliaturaState
    ? { ...grigliaturaState, delta_h: Number.isFinite(dhSm) ? dhSm : grigliaturaState.delta_h,
        corrente_motore: Number.isFinite(grISm) ? grISm : grigliaturaState.corrente_motore }
    : grigliaturaState;
  const clsState = classifierState
    ? { ...classifierState, currentDraw: Number.isFinite(clsISm) ? clsISm : classifierState.currentDraw }
    : classifierState;

  // Gauge color: for proximity-to-limit params, warn when ≥80% of limit
  let gaugeColor = t.green;
  if (so) {
    if (so.higherIsBetter) {
      const pct = so.value / so.target * 100;
      gaugeColor = pct >= 90 ? t.green : pct >= 65 ? t.orange : t.red;
    } else {
      const pct = so.value / so.target * 100;
      gaugeColor = pct >= 100 ? t.red : pct >= 80 ? t.orange : t.green;
    }
  }

  const sevRank = s => s === "ALTO" ? 2 : s === "MEDIO" ? 1 : 0;
  const gaugeRank = gaugeColor === t.red ? 2 : gaugeColor === t.orange ? 1 : 0;
  const clsRank = classifierState?.mode === "continuous"
    ? (classifierState.trafficLight === "red" ? 2 : classifierState.trafficLight === "yellow" ? 1 : 0)
    : 0;
  const grRank = grigliaturaState
    ? (grigliaturaState.fase === "ALLARME_MOTORE" ? 2 : grigliaturaState.bypass_aperto ? 1 : 0)
    : 0;
  const rank = Math.max(sevRank(stable.sev), gaugeRank, clsRank, grRank);
  const bColor = rank === 2 ? t.red : rank === 1 ? t.orange : t.green;

  // Status message: a mechanical/process condition (grigliatura motor alarm or
  // bypass) takes priority over the auto-correction status — otherwise the card
  // would show "stadio stabile" while the screen is actually in motor alarm.
  let statusText = stable.text;
  let statusSev  = stable.sev;
  if (grigliaturaState?.fase === "ALLARME_MOTORE") {
    statusText = "⛔ Motore in sovraccarico — stadio bloccato. Premere RESET dopo aver rimosso l'ostruzione.";
    statusSev  = "ALTO";
  } else if (grigliaturaState?.bypass_aperto) {
    statusText = "⚠ ΔH elevato — bypass aperto. Griglia intasata, ciclo di pulizia in corso.";
    statusSev  = "MEDIO";
  }
  const bIcon = statusSev === "ALTO" ? "🔴" : statusSev === "MEDIO" ? "🟡" : "🟢";

  const isEfficiency = so?.higherIsBetter;

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
          {Number.isFinite(effSm) ? `${Math.round(effSm)}%` : "—"}<div style={{fontSize:9, color:t.textMuted}}>EFF</div>
        </div>
      </div>

      {stageOutput && (
        <div style={{display:"flex", justifyContent:"center"}}>
          {grState
            ? <GrigliaturaBanner state={grState} onReset={onGrigliaturaReset} t={t}/>
            : clsState?.mode === "continuous"
              ? <ClassifierBanner state={clsState} t={t}/>
              : isEfficiency
                ? <MechanicalWidget stageOutput={so} t={t}/>
                : <Gauge stageOutput={so} t={t}/>
          }
        </div>
      )}

      {/* Fonte del valore principale (sensore / stimato) — solo per i gauge scalari */}
      {so && !grState && clsState?.mode !== "continuous" && (() => {
        const tag = dataSourceTag(resolveSource(qualitySources, { sensorId: referenceSensor, label: so.label, unit: so.unit }));
        const isSensor = tag.kind === "sensor";
        return (
          <div title={tag.note} style={{display:"flex", justifyContent:"center", alignItems:"center", gap:3, marginTop:-2,
            fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, textTransform:"uppercase",
            color: isSensor ? t.accent : t.textMuted}}>
            <span style={{fontSize:9}}>{tag.icon}</span>{tag.word}
          </div>
        );
      })()}

      {clsState?.mode === "timed" && <ClassifierMini state={clsState} t={t}/>}

      <div style={{
        padding:"7px 10px", borderRadius:7,
        background:statusSev==="ALTO"?t.redDim:statusSev==="MEDIO"?t.orangeDim:t.greenDim,
        border:`1px solid ${bColor}33`, borderLeft:`3px solid ${bColor}`,
        transition:"background 0.6s,border-color 0.6s",
      }}>
        <div style={{display:"flex", gap:5, alignItems:"flex-start"}}>
          <span style={{fontSize:11, flexShrink:0}}>{bIcon}</span>
          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:bColor, lineHeight:1.4, display:"-webkit-box", WebkitLineClamp:3, WebkitBoxOrient:"vertical", overflow:"hidden", transition:"color 0.6s"}}>{statusText}</span>
        </div>
      </div>
      <div style={{textAlign:"center", marginTop:6, fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", opacity:0.65}}>↗ dettagli stadio</div>
    </div>
  );
}
