import { useState } from "react";
import { SENSOR_TYPES, DEFAULT_STAGE_CONFIG } from "../constants/stageConfig";
import { STAGE_META } from "../constants/stages";

const STAGE_COLORS = ["#00CFFF","#00E599","#BB66FF","#FF9422","#FFD060"];

function NumField({ label, value, unit, onChange, t }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:2}}>
      <div style={{fontSize:10, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{label}</div>
      <div style={{display:"flex", alignItems:"center", gap:4}}>
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value)||0)}
          style={{width:72, background:t.surface3, border:`1px solid ${t.border}`, borderRadius:5,
            color:t.text, padding:"4px 6px", fontFamily:"'Share Tech Mono',monospace", fontSize:12}}/>
        {unit && <span style={{fontSize:10, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{unit}</span>}
      </div>
    </div>
  );
}

export default function ConfigurazionePage({ t, config, onChange }) {
  const [expanded, setExpanded] = useState(0);
  const stages = STAGE_META;

  const toggleSensor = (si, sensorId) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : {
        ...sc,
        sensors: { ...sc.sensors, [sensorId]: { ...sc.sensors[sensorId], enabled: !sc.sensors[sensorId].enabled } }
      }
    ));
  };

  const updatePump = (si, pi, field, value) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : {
        ...sc,
        pumps: sc.pumps.map((p, j) => j !== pi ? p : { ...p, [field]: value })
      }
    ));
  };

  const addPump = (si) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : {
        ...sc,
        pumps: [...sc.pumps, {
          id: `p${Date.now()}`, name: "Nuova pompa", enabled: true,
          power_kw: 5.5, flow_m3h: 100, head_m: 10, rpm: 1450, vfd: false
        }]
      }
    ));
  };

  const removePump = (si, pi) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, pumps: sc.pumps.filter((_, j) => j !== pi) }
    ));
  };

  const updateClassifier = (si, field, value) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, classifier: { ...sc.classifier, [field]: value } }
    ));
  };

  const resetStage = (si) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG[i]))
    ));
  };

  return (
    <div style={{padding:"20px 24px 40px"}}>

      <div style={{marginBottom:24}}>
        <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:t.accent, letterSpacing:2, marginBottom:4}}>
          CONFIGURAZIONE IMPIANTO
        </div>
        <div style={{fontSize:14, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>
          Definisci la strumentazione installata per ogni stadio. I parametri dei sensori disabilitati
          non saranno visualizzati nella dashboard — verranno sostituiti da "N/D".
        </div>
      </div>

      {config.map((sc, si) => {
        const stage   = stages[si] || { name:`ST-0${si+1}`, sub:"" };
        const color   = STAGE_COLORS[si] || t.accent;
        const isOpen  = expanded === si;
        const sensorsEnabled = Object.values(sc.sensors).filter(s => s.enabled).length;
        const totalSensors   = Object.keys(sc.sensors).length;

        return (
          <div key={si} style={{marginBottom:12}}>
            {/* Accordion header */}
            <button onClick={() => setExpanded(isOpen ? null : si)}
              style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"12px 16px", background:t.surface, cursor:"pointer",
                border:`1px solid ${isOpen ? color : t.border}`,
                borderLeft:`4px solid ${color}`,
                borderRadius: isOpen ? "10px 10px 0 0" : "10px",
                transition:"border-color 0.2s"}}>
              <div style={{display:"flex", alignItems:"center", gap:12, minWidth:0, flex:1, overflow:"hidden"}}>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted, letterSpacing:1, flexShrink:0}}>
                  ST-0{si+1}
                </span>
                <div style={{textAlign:"left", minWidth:0, flexShrink:1}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{stage.name}</div>
                  <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{stage.sub}</div>
                </div>
                <div style={{display:"flex", gap:6, flexShrink:0}}>
                  <span style={{fontSize:10, padding:"2px 8px", borderRadius:4, background:`${color}18`,
                    color, border:`1px solid ${color}44`, fontFamily:"'Share Tech Mono',monospace"}}>
                    {sensorsEnabled}/{totalSensors} sensori
                  </span>
                  <span style={{fontSize:10, padding:"2px 8px", borderRadius:4, background:`${t.accent}18`,
                    color:t.accent, border:`1px solid ${t.accent}44`, fontFamily:"'Share Tech Mono',monospace"}}>
                    {sc.pumps.length} {sc.pumps.length === 1 ? "pompa" : "pompe"}
                  </span>
                </div>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                <button onClick={e => { e.stopPropagation(); resetStage(si); }}
                  style={{padding:"3px 10px", borderRadius:5, cursor:"pointer", fontSize:11,
                    fontFamily:"'Rajdhani',sans-serif", fontWeight:600,
                    border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
                  ↺ Default
                </button>
                <span style={{color:t.textMuted, fontSize:12, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s"}}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div style={{background:t.surface, border:`1px solid ${t.border}`, borderTop:"none",
                borderRadius:"0 0 10px 10px", padding:"16px 20px", display:"flex", flexDirection:"column", gap:20}}>

                {/* ── SENSORI ── */}
                <div>
                  <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                    letterSpacing:1, marginBottom:12}}>STRUMENTAZIONE INSTALLATA</div>
                  <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(220px,1fr))", gap:8}}>
                    {Object.entries(sc.sensors).map(([sensorId, sData]) => {
                      const meta = SENSOR_TYPES[sensorId] || { label: sensorId, unit:"", icon:"●" };
                      const on = sData.enabled;
                      return (
                        <div key={sensorId}
                          onClick={() => toggleSensor(si, sensorId)}
                          style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"10px 14px", borderRadius:8, cursor:"pointer",
                            background: on ? `${color}12` : t.surface2,
                            border: `1px solid ${on ? color+"66" : t.border}`,
                            transition:"all 0.2s"}}>
                          <div style={{display:"flex", alignItems:"center", gap:8}}>
                            <span style={{fontSize:14}}>{meta.icon}</span>
                            <div>
                              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                                color: on ? color : t.textSec}}>{meta.label}</div>
                              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:10,
                                color:t.textMuted}}>{meta.unit}</div>
                            </div>
                          </div>
                          <div style={{flexShrink:0, width:36, height:20, borderRadius:10, position:"relative",
                            background: on ? color : t.surface3,
                            border:`1px solid ${on ? color : t.border}`,
                            transition:"background 0.2s"}}>
                            <div style={{position:"absolute", top:2,
                              left: on ? 17 : 2,
                              width:14, height:14, borderRadius:"50%",
                              background:"#fff", transition:"left 0.2s",
                              boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── POMPE ── */}
                <div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12}}>
                    <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                      POMPE E MOTORI
                    </div>
                    <button onClick={() => addPump(si)}
                      style={{padding:"4px 12px", borderRadius:6, cursor:"pointer",
                        fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12,
                        border:`1px solid ${color}`, background:`${color}18`, color}}>
                      + Aggiungi pompa
                    </button>
                  </div>

                  {sc.pumps.length === 0 ? (
                    <div style={{padding:"14px", textAlign:"center", color:t.textMuted,
                      fontFamily:"'Rajdhani',sans-serif", fontSize:12,
                      background:t.surface2, borderRadius:8, border:`1px dashed ${t.border}`}}>
                      Nessuna pompa installata in questo stadio
                    </div>
                  ) : (
                    sc.pumps.map((pump, pi) => (
                      <div key={pump.id} style={{marginBottom:10, padding:"14px 16px", borderRadius:9,
                        background: pump.enabled ? `${t.accent}08` : t.surface2,
                        border:`1px solid ${pump.enabled ? t.accent+"44" : t.border}`}}>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:12, gap:8, minWidth:0}}>
                          <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, overflow:"hidden"}}>
                            {/* Enable toggle */}
                            <div onClick={() => updatePump(si, pi, "enabled", !pump.enabled)}
                              style={{flexShrink:0, width:36, height:20, borderRadius:10, cursor:"pointer",
                                position:"relative", background: pump.enabled ? t.green : t.surface3,
                                border:`1px solid ${pump.enabled ? t.green : t.border}`, transition:"background 0.2s"}}>
                              <div style={{position:"absolute", top:2, left: pump.enabled ? 17 : 2,
                                width:14, height:14, borderRadius:"50%", background:"#fff",
                                transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                            </div>
                            <input value={pump.name}
                              onChange={e => updatePump(si, pi, "name", e.target.value)}
                              style={{background:"transparent", border:"none", borderBottom:`1px solid ${t.border}`,
                                color:t.text, fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
                                fontSize:14, outline:"none", padding:"2px 4px", flex:1, minWidth:0}}/>
                          </div>
                          <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
                            {/* VFD toggle */}
                            <div onClick={() => updatePump(si, pi, "vfd", !pump.vfd)}
                              style={{padding:"3px 9px", borderRadius:5, cursor:"pointer", fontSize:10,
                                fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                                background: pump.vfd ? `${t.accent}22` : t.surface3,
                                border:`1px solid ${pump.vfd ? t.accent : t.border}`,
                                color: pump.vfd ? t.accent : t.textMuted}}>
                              INVERTER {pump.vfd ? "ON" : "OFF"}
                            </div>
                            <button onClick={() => removePump(si, pi)}
                              style={{padding:"3px 9px", borderRadius:5, cursor:"pointer",
                                fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:12,
                                border:`1px solid ${t.red}66`, background:`${t.red}12`, color:t.red}}>
                              Rimuovi
                            </button>
                          </div>
                        </div>
                        <div style={{display:"flex", gap:12, flexWrap:"wrap"}}>
                          <NumField label="Potenza" value={pump.power_kw} unit="kW"
                            onChange={v => updatePump(si, pi, "power_kw", v)} t={t}/>
                          <NumField label="Portata" value={pump.flow_m3h} unit="m³/h"
                            onChange={v => updatePump(si, pi, "flow_m3h", v)} t={t}/>
                          <NumField label="Prevalenza" value={pump.head_m} unit="m"
                            onChange={v => updatePump(si, pi, "head_m", v)} t={t}/>
                          <NumField label="Velocità" value={pump.rpm} unit="RPM"
                            onChange={v => updatePump(si, pi, "rpm", v)} t={t}/>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* ── CLASSIFICATORE SABBIE (only for stage 1) ── */}
                {si === 1 && sc.classifier && (
                  <div>
                    <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                      letterSpacing:1, marginBottom:12}}>MODALITÀ CLASSIFICATORE SABBIE</div>

                    <div style={{display:"flex", gap:8, marginBottom:16}}>
                      {[["timed","⏱  Temporizzato"],["continuous","⟳  Continuo"]].map(([m, label]) => (
                        <button key={m} onClick={() => updateClassifier(si, "mode", m)}
                          style={{flex:1, padding:"9px", borderRadius:8, cursor:"pointer",
                            fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                            border:`2px solid ${sc.classifier.mode === m ? color : t.border}`,
                            background: sc.classifier.mode === m ? `${color}18` : t.surface2,
                            color: sc.classifier.mode === m ? color : t.textSec}}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div style={{display:"flex", gap:16, flexWrap:"wrap", marginBottom:12}}>
                      {sc.classifier.mode === "timed" ? (
                        <>
                          <NumField label="Tempo ON" value={sc.classifier.timeOn} unit="min"
                            onChange={v => updateClassifier(si, "timeOn", Math.max(1, Math.round(v)))} t={t}/>
                          <NumField label="Tempo OFF" value={sc.classifier.timeOff} unit="min"
                            onChange={v => updateClassifier(si, "timeOff", Math.max(1, Math.round(v)))} t={t}/>
                          <NumField label="Soglia corrente" value={sc.classifier.currentThreshold} unit="A"
                            onChange={v => updateClassifier(si, "currentThreshold", Math.max(0.5, v))} t={t}/>
                        </>
                      ) : (
                        <>
                          <NumField label="Velocità rotazione" value={sc.classifier.speed} unit="%"
                            onChange={v => updateClassifier(si, "speed", Math.max(10, Math.min(100, Math.round(v))))} t={t}/>
                          <NumField label="Soglia corrente" value={sc.classifier.currentThreshold} unit="A"
                            onChange={v => updateClassifier(si, "currentThreshold", Math.max(0.5, v))} t={t}/>
                        </>
                      )}
                    </div>

                    <div style={{padding:"8px 12px", background:t.surface2, borderRadius:6,
                      border:`1px solid ${t.border}`, fontSize:12, color:t.textMuted,
                      fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5}}>
                      {sc.classifier.mode === "timed"
                        ? `Tramoggia attiva per ${sc.classifier.timeOn} min, poi ferma per ${sc.classifier.timeOff} min. La corrente assorbita durante il ciclo ON è un indicatore indiretto della concentrazione dello slurry estratto.`
                        : `Tramoggia in funzione continua al ${sc.classifier.speed}% della velocità nominale. La corrente dell'inverter indica la concentrazione del sedimento: superata la soglia di ${sc.classifier.currentThreshold} A il semaforo passa in rosso.`}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
