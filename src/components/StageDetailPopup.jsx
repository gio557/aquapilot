import { useState, useRef, useEffect } from "react";
import Tag from "./ui/Tag";
import { PARAM_SENSOR_MAP, SENSOR_TYPES } from "../constants/stageConfig";

const HOLD_MS = 2200;
const ALPHA = 0.10;

function useSmoothedParams(params) {
  const [smooth, setSmooth] = useState(params);
  useEffect(() => {
    if (!params) return;
    setSmooth(prev => {
      if (!prev || prev.length !== params.length) return params;
      return params.map((p, i) => {
        const pv = prev[i];
        if (typeof p.value !== "number" || typeof pv?.value !== "number") return p;
        return { ...p, value: pv.value + ALPHA * (p.value - pv.value) };
      });
    });
  }, [params]);
  return smooth;
}

function useSmoothedOutput(stageOutput) {
  const [smooth, setSmooth] = useState(stageOutput);
  useEffect(() => {
    if (!stageOutput) return;
    setSmooth(prev => {
      if (!prev || typeof prev.value !== "number") return stageOutput;
      return { ...stageOutput, value: prev.value + ALPHA * (stageOutput.value - prev.value) };
    });
  }, [stageOutput]);
  return smooth;
}

function useSmoothedControls(controls) {
  const [smooth, setSmooth] = useState(controls);
  useEffect(() => {
    if (!controls) return;
    setSmooth(prev => {
      if (!prev || prev.length !== controls.length) return controls;
      return controls.map((c, i) => {
        const pc = prev[i];
        if (typeof c.value !== "number" || typeof pc?.value !== "number") return c;
        return { ...c, value: pc.value + ALPHA * (c.value - pc.value) };
      });
    });
  }, [controls]);
  return smooth;
}

function ParamRow({ label, value, unit, note, t }) {
  const isNum = typeof value === "number";
  const display = isNum
    ? (Math.abs(value) < 10 ? (Math.round(value * 100) / 100).toFixed(2) : Math.round(value * 10) / 10)
    : value;
  return (
    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"7px 0", borderBottom:`1px solid ${t.border}`}}>
      <div>
        <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:15, color:t.text}}>{label}</span>
        {note && <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:1}}>{note}</div>}
      </div>
      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:t.accent, fontWeight:700}}>
        {display}
        {unit && <span style={{fontSize:14, color:t.textMuted, marginLeft:3}}>{unit}</span>}
      </span>
    </div>
  );
}

export default function StageDetailPopup({ stage, index, stageOutput, stageDetail, action, autoEnabled, stageConfig, t, onClose }) {
  const [stableAction, setStableAction] = useState(action);
  const pendingPopup = useRef(null);

  const smoothOutput   = useSmoothedOutput(stageOutput);
  const smoothParams   = useSmoothedParams(stageDetail?.params);
  const smoothControls = useSmoothedControls(stageDetail?.controls);

  useEffect(() => {
    const nextText = action ? action.text : null;
    const curText  = stableAction ? stableAction.text : null;
    if (nextText === curText) {
      if (pendingPopup.current) { clearTimeout(pendingPopup.current.timer); pendingPopup.current = null; }
      return;
    }
    if (pendingPopup.current && pendingPopup.current.text === nextText) return;
    if (pendingPopup.current) clearTimeout(pendingPopup.current.timer);
    const timer = setTimeout(() => { setStableAction(action); pendingPopup.current = null; }, HOLD_MS);
    pendingPopup.current = { text: nextText, timer };
  }, [action]);

  if (!stageDetail) return null;

  const sc = stage.status==="ok" ? t.green : stage.status==="warn" ? t.orange : t.red;
  const hib = smoothOutput?.higherIsBetter;
  const rawPct = smoothOutput && !hib ? Math.round(smoothOutput.value / smoothOutput.target * 100) : 0;
  const score = smoothOutput
    ? hib ? Math.max(0, Math.min(100, Math.round(smoothOutput.value / smoothOutput.target * 100))) : Math.min(100, rawPct)
    : 0;
  const scoreColor = hib
    ? score >= 90 ? t.green : score >= 65 ? t.orange : t.red
    : rawPct >= 100 ? t.red : rawPct >= 80 ? t.orange : t.green;
  const actColor = stableAction ? (stableAction.sev==="ALTO" ? t.red : stableAction.sev==="MEDIO" ? t.orange : t.green) : null;

  return (
    <div onClick={onClose} style={{position:"fixed", inset:0, zIndex:350, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)", display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div onClick={e => e.stopPropagation()} style={{background:t.surface, border:`1px solid ${t.border}`, borderTop:`4px solid ${scoreColor}`, borderRadius:16, width:520, maxWidth:"96vw", maxHeight:"88vh", overflowY:"auto", boxShadow:"0 12px 60px rgba(0,0,0,0.3)", display:"flex", flexDirection:"column"}}>

        {/* Header */}
        <div style={{padding:"16px 20px 12px", borderBottom:`1px solid ${t.border}`, position:"sticky", top:0, background:t.surface, zIndex:1}}>
          <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between"}}>
            <div style={{display:"flex", alignItems:"center", gap:12}}>
              <div style={{fontSize:26}}>{stageDetail.icon}</div>
              <div>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3}}>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted, letterSpacing:1}}>ST-{String(index+1).padStart(2,"0")}</span>
                  {autoEnabled && <Tag color={t.green}>AUTO</Tag>}
                  {stableAction && stableAction.sev!=="OK" && <Tag color={actColor}>{stableAction.sev}</Tag>}
                </div>
                <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:700, fontSize:16, color:t.text, letterSpacing:1}}>{stage.name}</div>
                <div style={{fontSize:16, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>{stage.sub}</div>
              </div>
            </div>
            <button onClick={onClose} style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text, width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, lineHeight:1, flexShrink:0}}>✕</button>
          </div>

          {smoothOutput && (
            <div style={{marginTop:12, padding:"10px 14px", background:t.surface2, borderRadius:8, display:"flex", alignItems:"center", gap:16}}>
              <div style={{textAlign:"center", minWidth:64}}>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:22, fontWeight:700, color:scoreColor}}>
                  {hib ? Math.round(smoothOutput.value)+"%" : rawPct+"%"}
                </div>
                <div style={{fontSize:14, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{hib?"RENDIMENTO":"% DEL LIMITE"}</div>
              </div>
              <div style={{flex:1}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                  <span style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>{smoothOutput.label}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:scoreColor}}>
                    {hib
                      ? `${Math.round(smoothOutput.value)}% su ${smoothOutput.target}% target`
                      : `${smoothOutput.value?.toFixed(1)} / ${smoothOutput.target} ${smoothOutput.unit} (${rawPct}% del limite)`}
                  </span>
                </div>
                <div style={{height:6, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
                  <div style={{height:"100%", width:`${Math.min(100,score)}%`, background:scoreColor, borderRadius:3, transition:"width 0.8s ease"}}/>
                </div>
              </div>
            </div>
          )}
        </div>

        <div style={{padding:"14px 20px 20px", display:"flex", flexDirection:"column", gap:16}}>

          <div style={{padding:"10px 14px", background:`${scoreColor}0D`, border:`1px solid ${scoreColor}30`, borderRadius:8}}>
            <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:4}}>FUNZIONE STADIO</div>
            <div style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5}}>{stageDetail.function}</div>
          </div>

          <div style={{
            padding:"10px 14px",
            background:stableAction?(stableAction.sev==="ALTO"?t.redDim:stableAction.sev==="MEDIO"?t.orangeDim:t.greenDim):t.greenDim,
            border:`1px solid ${stableAction?actColor:t.green}44`,
            borderLeft:`3px solid ${stableAction?actColor:t.green}`,
            borderRadius:"0 8px 8px 0",
            transition:"background 0.6s,border-color 0.6s",
            minHeight:54,
          }}>
            <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:4}}>
              {stableAction ? "AZIONE AUTOMATICA IN CORSO" : "STATO STADIO"}
            </div>
            <div style={{display:"flex", gap:7, alignItems:"flex-start"}}>
              <span style={{fontSize:11}}>{stableAction?(stableAction.sev==="ALTO"?"🔴":stableAction.sev==="MEDIO"?"🟡":"🟢"):"🟢"}</span>
              <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:stableAction?actColor:t.green, lineHeight:1.5, transition:"color 0.6s"}}>
                {stableAction ? stableAction.text : (autoEnabled ? "Nessuna correzione attiva — stadio stabile" : "⚠ Modalità manuale — monitorare parametri")}
              </span>
            </div>
          </div>

          <div>
            <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:8}}>PARAMETRI DI PROCESSO</div>
            {(smoothParams || stageDetail.params).map((p, i) => {
              const sensorId = PARAM_SENSOR_MAP[stage?.name]?.[p.label];
              if (sensorId != null && stageConfig?.sensors?.[sensorId]?.enabled !== true) return null;
              return <ParamRow key={i} {...p} t={t}/>;
            })}
          </div>

          {/* ── POMPE INSTALLATE ── */}
          {stageConfig?.pumps?.length > 0 && (
            <div>
              <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:8}}>POMPE INSTALLATE</div>
              <div style={{display:"flex", flexDirection:"column", gap:6}}>
                {stageConfig.pumps.map((pump, i) => (
                  <div key={pump.id} style={{padding:"8px 12px", borderRadius:7,
                    background: pump.enabled ? t.surface2 : `${t.surface2}66`,
                    border:`1px solid ${pump.enabled ? t.accent+"44" : t.border}`,
                    opacity: pump.enabled ? 1 : 0.5}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, color: pump.enabled ? t.text : t.textMuted}}>
                        {pump.name}
                      </span>
                      <div style={{display:"flex", gap:6}}>
                        {pump.vfd && <span style={{fontSize:9, padding:"1px 6px", borderRadius:3, background:`${t.accent}18`, color:t.accent, fontFamily:"'Share Tech Mono',monospace", border:`1px solid ${t.accent}44`}}>INVERTER</span>}
                        <span style={{fontSize:9, padding:"1px 6px", borderRadius:3,
                          background: pump.enabled ? `${t.green}18` : `${t.red}18`,
                          color: pump.enabled ? t.green : t.red,
                          fontFamily:"'Share Tech Mono',monospace",
                          border:`1px solid ${pump.enabled ? t.green : t.red}44`}}>
                          {pump.enabled ? "ATTIVA" : "DISATTIVATA"}
                        </span>
                      </div>
                    </div>
                    <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
                      {[
                        {l:"Potenza", v:`${pump.power_kw} kW`},
                        pump.flow_m3h > 0 && {l:"Portata", v:`${pump.flow_m3h} m³/h`},
                        pump.head_m > 0   && {l:"Prevalenza", v:`${pump.head_m} m`},
                        {l:"Velocità", v:`${pump.rpm} RPM`},
                      ].filter(Boolean).map(x => (
                        <div key={x.l}>
                          <span style={{fontSize:10, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{x.l}: </span>
                          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.accent}}>{x.v}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stageDetail.controls.length > 0 && (
            <div>
              <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:8}}>CONTROLLI ATTIVI</div>
              <div style={{display:"flex", gap:10, flexWrap:"wrap"}}>
                {(smoothControls || stageDetail.controls).map((c, i) => {
                  const pct = typeof c.value === "number" ? Math.round(c.value * 10) / 10 : c.value;
                  const barColor = pct > 80 ? t.red : pct > 60 ? t.orange : t.green;
                  return (
                    <div key={i} style={{flex:"1 1 140px", padding:"10px 14px", background:t.surface2, borderRadius:8, border:`1px solid ${t.border}`}}>
                      <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
                        <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:14, color:t.text}}>{c.label}</span>
                        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:barColor, fontWeight:700}}>{Number.isInteger(pct) ? pct : pct.toFixed(1)}{c.unit}</span>
                      </div>
                      <div style={{height:5, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
                        <div style={{height:"100%", width:`${pct}%`, background:barColor, borderRadius:3, transition:"width 0.4s ease"}}/>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <div style={{padding:"10px 14px", background:t.surface2, borderRadius:8, border:`1px solid ${t.border}`, display:"flex", gap:10, alignItems:"flex-start"}}>
            <span style={{fontSize:10, flexShrink:0}}>📋</span>
            <div>
              <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:3}}>NOTA OPERATIVA</div>
              <div style={{fontSize:14, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5}}>{stageDetail.note}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
