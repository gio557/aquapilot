import { useState } from "react";
import { SENSOR_TYPES, DEFAULT_STAGE_CONFIG } from "../constants/stageConfig";
import { STAGE_META } from "../constants/stages";
import { QUALITY_PARAMS, SOURCE_OPTIONS, dataSourceTag } from "../constants/dataSource";
import NormativaPage from "./NormativaPage";

const CONFIG_TABS = [
  { id: "stadi",       label: "CONFIGURAZIONE STADI" },
  { id: "provenienza", label: "PROVENIENZA DATI" },
  { id: "normativa",   label: "NORMATIVA" },
];

const STAGE_COLORS = ["#00CFFF","#00E599","#BB66FF","#FF9422","#FFD060"];

// Pallino "i" che al passaggio del mouse mostra un fumetto con la spiegazione estesa.
function InfoDot({ text, t }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{position:"relative", display:"inline-flex"}}
      onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      <span style={{width:16, height:16, borderRadius:"50%", border:`1px solid ${t.accent}`,
        color:t.accent, fontSize:10, fontFamily:"'Share Tech Mono',monospace", fontWeight:700,
        display:"flex", alignItems:"center", justifyContent:"center", cursor:"help"}}>i</span>
      {show && (
        <span style={{position:"absolute", left:0, bottom:"calc(100% + 8px)",
          width:280, maxWidth:"70vw", background:t.surface, color:t.textSec, border:`1px solid ${t.accent}55`,
          borderRadius:"8px 8px 8px 0", padding:"10px 12px", fontSize:12.5, fontFamily:"'Rajdhani',sans-serif",
          fontWeight:500, lineHeight:1.45, boxShadow:t.cardShadow, zIndex:60, whiteSpace:"normal", textTransform:"none"}}>
          {text}
        </span>
      )}
    </span>
  );
}

function NumField({ label, value, unit, onChange, t }) {
  return (
    <div style={{display:"flex", flexDirection:"column", gap:3}}>
      <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{label}</div>
      <div style={{display:"flex", alignItems:"center", gap:5}}>
        <input type="number" value={value} onChange={e => onChange(parseFloat(e.target.value)||0)}
          style={{width:84, background:t.surface3, border:`1px solid ${t.border}`, borderRadius:5,
            color:t.text, padding:"5px 8px", fontFamily:"'Share Tech Mono',monospace", fontSize:14}}/>
        {unit && <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{unit}</span>}
      </div>
    </div>
  );
}

export default function ConfigurazionePage({ t, config, onChange, dosageMax, onDosageMax, stages: stagesProp, stageTypes, onAddStage, onRemoveStage, norms, setNorms, normativaSets, qualitySources = {}, onQualitySources, ac, onAC }) {
  const [activeTab, setActiveTab] = useState("stadi");
  const [expanded, setExpanded] = useState(null);
  const [showAddPopup, setShowAddPopup] = useState(false);
  const stages = stagesProp || STAGE_META;

  const availableTypes = (stageTypes || []).filter(st => !stages.some(s => s.name === st.name));

  const toggleSensor = (si, sensorId) => {
    onChange(prev => prev.map((sc, i) => {
      if (i !== si) return sc;
      const current = sc.sensors?.[sensorId];
      const newEnabled = current ? !current.enabled : true;
      return {
        ...sc,
        sensors: { ...sc.sensors, [sensorId]: { ...(current || {}), enabled: newEnabled } },
        referenceSensor: !newEnabled && sc.referenceSensor === sensorId ? null : sc.referenceSensor,
      };
    }));
  };

  const setReferenceSensor = (si, sensorId) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, referenceSensor: sc.referenceSensor === sensorId ? null : sensorId }
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

  const updateGrigliatura = (si, field, value) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, grigliatura: { ...sc.grigliatura, [field]: value } }
    ));
  };

  const resetStage = (si) => {
    if (!DEFAULT_STAGE_CONFIG[si]) return;
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG[i]))
    ));
  };

  const TabBar = ({ padded }) => (
    <div style={padded
      ? {padding:"14px 24px 0", borderBottom:`1px solid ${t.border}`, background:t.surface, display:"flex", gap:8}
      : {display:"flex", gap:8, marginBottom:24, borderBottom:`1px solid ${t.border}`, paddingBottom:0}}>
      {CONFIG_TABS.map(tab => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
          style={{padding:"9px 20px", borderRadius:"7px 7px 0 0", cursor:"pointer",
            fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, letterSpacing:1,
            border:`1px solid ${activeTab===tab.id?t.accent:t.border}`,
            borderBottom: activeTab===tab.id ? `1px solid ${t.surface}` : `1px solid ${t.border}`,
            background: activeTab===tab.id ? t.surface : t.surface2,
            color: activeTab===tab.id ? t.accent : t.textSec,
            marginBottom: activeTab===tab.id ? -1 : 0,
            transition:"all 0.15s"}}>
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (activeTab === "normativa") {
    return (
      <div>
        <TabBar padded />
        <NormativaPage t={t} ac={ac} onAC={onAC} norms={norms} setNorms={setNorms} normativaSets={normativaSets} />
      </div>
    );
  }

  if (activeTab === "provenienza") {
    const setSrc = (key, kind) => onQualitySources?.(prev => ({ ...prev, [key]: kind }));
    return (
      <div>
        <TabBar padded />
        <div style={{padding:"20px 24px 40px", maxWidth:680}}>
          <div style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5, marginBottom:18}}>
            Definisci, per ogni parametro di <b>qualità in uscita</b>, come viene ottenuto il dato in impianto.
            L'etichetta scelta compare accanto al valore nel cruscotto, nello storico e nei dettagli.
            <div style={{display:"flex", gap:16, marginTop:10, flexWrap:"wrap", fontFamily:"'Share Tech Mono',monospace", fontSize:11}}>
              {SOURCE_OPTIONS.map(o => {
                const tag = dataSourceTag(o.kind);
                return <span key={o.kind} style={{display:"inline-flex", alignItems:"center", gap:4, color:t.textMuted}}>
                  <span>{tag.icon}</span>{tag.word} — {o.kind==="sensor" ? "sonda diretta" : o.kind==="analyzer" ? "strumento analitico / laboratorio" : "stima o valore derivato"}
                </span>;
              })}
            </div>
          </div>
          {QUALITY_PARAMS.map(p => {
            const cur = qualitySources[p.key] ?? "calc";
            const tag = dataSourceTag(cur);
            return (
              <div key={p.key} style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"11px 0", borderBottom:`1px solid ${t.border}`, gap:12}}>
                <div style={{display:"flex", flexDirection:"column", gap:3, minWidth:0}}>
                  <div style={{display:"flex", alignItems:"center", gap:8}}>
                    <span style={{fontSize:16, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:t.text}}>{p.label}</span>
                    <InfoDot text={p.desc} t={t}/>
                    <span title={tag.note} style={{display:"inline-flex", alignItems:"center", gap:4, fontSize:10,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, textTransform:"uppercase",
                      color: tag.kind==="sensor" ? t.accent : t.textMuted}}>
                      <span style={{fontSize:10}}>{tag.icon}</span>{tag.word}
                    </span>
                  </div>
                  <span style={{fontSize:12.5, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{p.name}</span>
                </div>
                <div style={{display:"flex", gap:5}}>
                  {SOURCE_OPTIONS.map(o => {
                    const on = cur === o.kind;
                    return (
                      <button key={o.kind} onClick={() => setSrc(p.key, o.kind)}
                        style={{padding:"5px 12px", borderRadius:6, cursor:"pointer",
                          fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:600, letterSpacing:0.5,
                          border:`${on ? 2 : 1}px solid ${on ? t.accent : t.border}`,
                          background: on ? `${t.accent}18` : t.surface2,
                          color: on ? t.accent : t.textSec}}>
                        {dataSourceTag(o.kind).icon} {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 24px 40px"}}>

      {/* ── TAB BAR ── */}
      <TabBar />

      {config.map((sc, si) => {
        const stage   = stages[si] || { name:`ST-0${si+1}`, sub:"" };
        const color   = STAGE_COLORS[si] || t.accent;
        const isOpen  = expanded === si;
        const sensorsEnabled = Object.values(sc.sensors || {}).filter(s => s.enabled).length;
        const totalSensors   = Object.keys(SENSOR_TYPES).length;
        const refMeta = sc.referenceSensor ? SENSOR_TYPES[sc.referenceSensor] : null;

        return (
          <div key={si} style={{marginBottom:12}}>
            {/* Accordion header */}
            <button onClick={() => setExpanded(isOpen ? null : si)}
              style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between",
                padding:"14px 18px", background:t.surface, cursor:"pointer",
                border:`1px solid ${isOpen ? color : t.border}`,
                borderLeft:`4px solid ${color}`,
                borderRadius: isOpen ? "10px 10px 0 0" : "10px",
                transition:"border-color 0.2s"}}>
              <div style={{display:"flex", alignItems:"center", gap:14, minWidth:0, flex:1, overflow:"hidden"}}>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, letterSpacing:1, flexShrink:0}}>
                  ST-0{si+1}
                </span>
                <div style={{textAlign:"left", minWidth:0, flexShrink:1}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:t.text, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{stage.name}</div>
                  <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>{stage.sub}</div>
                </div>
                <div style={{display:"flex", gap:6, flexShrink:0, flexWrap:"wrap"}}>
                  <span style={{fontSize:12, padding:"2px 10px", borderRadius:4, background:`${color}18`,
                    color, border:`1px solid ${color}44`, fontFamily:"'Share Tech Mono',monospace"}}>
                    {sensorsEnabled}/{totalSensors} sensori
                  </span>
                  <span style={{fontSize:12, padding:"2px 10px", borderRadius:4, background:`${t.accent}18`,
                    color:t.accent, border:`1px solid ${t.accent}44`, fontFamily:"'Share Tech Mono',monospace"}}>
                    {sc.pumps.length} {sc.pumps.length === 1 ? "pompa" : "pompe"}
                  </span>
                  {refMeta && (
                    <span style={{fontSize:12, padding:"2px 10px", borderRadius:4, background:`#FFD06018`,
                      color:"#FFD060", border:`1px solid #FFD06044`, fontFamily:"'Share Tech Mono',monospace"}}>
                      ★ {refMeta.label}
                    </span>
                  )}
                </div>
              </div>
              <div style={{display:"flex", alignItems:"center", gap:8}}>
                {DEFAULT_STAGE_CONFIG[si] && (
                  <button onClick={e => { e.stopPropagation(); resetStage(si); }}
                    style={{padding:"4px 12px", borderRadius:5, cursor:"pointer", fontSize:13,
                      fontFamily:"'Rajdhani',sans-serif", fontWeight:600,
                      border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
                    ↺ Default
                  </button>
                )}
                {onRemoveStage && (
                  <button onClick={e => { e.stopPropagation(); onRemoveStage(si); }}
                    style={{padding:"4px 10px", borderRadius:5, cursor:"pointer", fontSize:14,
                      fontFamily:"'Rajdhani',sans-serif", fontWeight:700, lineHeight:1,
                      border:`1px solid ${t.red}66`, background:`${t.red}12`, color:t.red}}>
                    ×
                  </button>
                )}
                <span style={{color:t.textMuted, fontSize:14, transform:isOpen?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s"}}>▼</span>
              </div>
            </button>

            {isOpen && (
              <div style={{background:t.surface, border:`1px solid ${t.border}`, borderTop:"none",
                borderRadius:"0 0 10px 10px", padding:"20px 24px", display:"flex", flexDirection:"column", gap:24}}>

                {/* ── SENSORI ── */}
                <div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                      STRUMENTAZIONE INSTALLATA
                    </div>
                    <div style={{fontSize:12, color:"#FFD060", fontFamily:"'Rajdhani',sans-serif"}}>
                      ★ = riferimento dashboard
                    </div>
                  </div>
                  <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:10}}>
                    {Object.entries(SENSOR_TYPES).map(([sensorId, meta]) => {
                      const on  = sc.sensors?.[sensorId]?.enabled ?? false;
                      const isRef = sc.referenceSensor === sensorId;
                      return (
                        <div key={sensorId}
                          onClick={() => toggleSensor(si, sensorId)}
                          style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                            padding:"11px 14px", borderRadius:8, cursor:"pointer",
                            background: on ? (isRef ? `#FFD06014` : `${color}12`) : t.surface2,
                            border: `1px solid ${on ? (isRef ? "#FFD06088" : color+"66") : t.border}`,
                            transition:"all 0.2s"}}>
                          <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0}}>
                            <span style={{fontSize:16}}>{meta.icon}</span>
                            <div style={{flex:1, minWidth:0}}>
                              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14,
                                color: on ? (isRef ? "#FFD060" : color) : t.textSec,
                                whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                                {meta.label}
                              </div>
                              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                                color:t.textMuted}}>{meta.unit}</div>
                            </div>
                          </div>
                          <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
                            {on && (
                              <button
                                onClick={e => { e.stopPropagation(); setReferenceSensor(si, sensorId); }}
                                title="Imposta come riferimento dashboard"
                                style={{padding:"3px 8px", borderRadius:5, cursor:"pointer", fontSize:13,
                                  lineHeight:1, fontWeight:700,
                                  border:`1px solid ${isRef ? "#FFD060" : t.border}`,
                                  background: isRef ? "#FFD06022" : t.surface3,
                                  color: isRef ? "#FFD060" : t.textMuted,
                                  transition:"all 0.2s"}}>
                                ★
                              </button>
                            )}
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
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* ── POMPE ── */}
                <div>
                  <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                      POMPE E MOTORI
                    </div>
                    <button onClick={() => addPump(si)}
                      style={{padding:"5px 14px", borderRadius:6, cursor:"pointer",
                        fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                        border:`1px solid ${color}`, background:`${color}18`, color}}>
                      + Aggiungi pompa
                    </button>
                  </div>

                  {sc.pumps.length === 0 ? (
                    <div style={{padding:"16px", textAlign:"center", color:t.textMuted,
                      fontFamily:"'Rajdhani',sans-serif", fontSize:14,
                      background:t.surface2, borderRadius:8, border:`1px dashed ${t.border}`}}>
                      Nessuna pompa installata in questo stadio
                    </div>
                  ) : (
                    sc.pumps.map((pump, pi) => (
                      <div key={pump.id} style={{marginBottom:10, padding:"14px 16px", borderRadius:9,
                        background: pump.enabled ? `${t.accent}08` : t.surface2,
                        border:`1px solid ${pump.enabled ? t.accent+"44" : t.border}`}}>
                        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14, gap:8, minWidth:0}}>
                          <div style={{display:"flex", alignItems:"center", gap:10, flex:1, minWidth:0, overflow:"hidden"}}>
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
                                fontSize:15, outline:"none", padding:"2px 4px", flex:1, minWidth:0}}/>
                          </div>
                          <div style={{display:"flex", alignItems:"center", gap:8, flexShrink:0}}>
                            <div onClick={() => updatePump(si, pi, "vfd", !pump.vfd)}
                              style={{padding:"4px 10px", borderRadius:5, cursor:"pointer", fontSize:12,
                                fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                                background: pump.vfd ? `${t.accent}22` : t.surface3,
                                border:`1px solid ${pump.vfd ? t.accent : t.border}`,
                                color: pump.vfd ? t.accent : t.textMuted}}>
                              INVERTER {pump.vfd ? "ON" : "OFF"}
                            </div>
                            <button onClick={() => removePump(si, pi)}
                              style={{padding:"4px 10px", borderRadius:5, cursor:"pointer",
                                fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13,
                                border:`1px solid ${t.red}66`, background:`${t.red}12`, color:t.red}}>
                              Rimuovi
                            </button>
                          </div>
                        </div>
                        <div style={{display:"flex", gap:14, flexWrap:"wrap"}}>
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

                {/* ── GRIGLIATURA (only for stage 0) ── */}
                {si === 0 && sc.grigliatura && (
                  <div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                      letterSpacing:1, marginBottom:14}}>PARAMETRI CICLO GRIGLIATURA</div>

                    <div style={{display:"flex", gap:18, flexWrap:"wrap", marginBottom:14}}>
                      <NumField label="ΔH avvio pulizia" value={sc.grigliatura.DH_AVVIO_PULIZIA} unit="m"
                        onChange={v => updateGrigliatura(si, "DH_AVVIO_PULIZIA", Math.max(0.01, Math.min(sc.grigliatura.DH_GUARDIA_ALTA-0.01, v)))} t={t}/>
                      <NumField label="ΔH stop pulizia" value={sc.grigliatura.DH_STOP_PULIZIA} unit="m"
                        onChange={v => updateGrigliatura(si, "DH_STOP_PULIZIA", Math.max(0.01, Math.min(sc.grigliatura.DH_AVVIO_PULIZIA-0.01, v)))} t={t}/>
                      <NumField label="ΔH guardia alta" value={sc.grigliatura.DH_GUARDIA_ALTA} unit="m"
                        onChange={v => updateGrigliatura(si, "DH_GUARDIA_ALTA", Math.max(sc.grigliatura.DH_AVVIO_PULIZIA+0.01, v))} t={t}/>
                      <NumField label="Timer backup" value={sc.grigliatura.TIMER_BACKUP_INTERVALLO} unit="s"
                        onChange={v => updateGrigliatura(si, "TIMER_BACKUP_INTERVALLO", Math.max(60, Math.round(v)))} t={t}/>
                      <NumField label="Durata min. ciclo" value={sc.grigliatura.DURATA_MINIMA_CICLO} unit="s"
                        onChange={v => updateGrigliatura(si, "DURATA_MINIMA_CICLO", Math.max(10, Math.round(v)))} t={t}/>
                      <NumField label="Corrente nominale" value={sc.grigliatura.CORRENTE_NOMINALE} unit="A"
                        onChange={v => updateGrigliatura(si, "CORRENTE_NOMINALE", Math.max(1, v))} t={t}/>
                      <NumField label="Soglia sovraccarico" value={sc.grigliatura.CORRENTE_SOVRACCARICO} unit="A"
                        onChange={v => updateGrigliatura(si, "CORRENTE_SOVRACCARICO", Math.max(sc.grigliatura.CORRENTE_NOMINALE+1, v))} t={t}/>
                    </div>

                    <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                      padding:"12px 16px", background:t.surface2, borderRadius:8, border:`1px solid ${t.border}`, marginBottom:10}}>
                      <div>
                        <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, color:t.text}}>Bypass automatico</div>
                        <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>
                          Apre la valvola bypass se ΔH supera la soglia guardia alta ({sc.grigliatura.DH_GUARDIA_ALTA} m)
                        </div>
                      </div>
                      <div onClick={() => updateGrigliatura(si, "BYPASS_AUTO", !sc.grigliatura.BYPASS_AUTO)}
                        style={{flexShrink:0, width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative",
                          background: sc.grigliatura.BYPASS_AUTO ? t.green : t.surface3,
                          border:`1px solid ${sc.grigliatura.BYPASS_AUTO ? t.green : t.border}`,
                          transition:"background 0.2s"}}>
                        <div style={{position:"absolute", top:3,
                          left: sc.grigliatura.BYPASS_AUTO ? 21 : 3,
                          width:16, height:16, borderRadius:"50%", background:"#fff",
                          transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                      </div>
                    </div>

                    <div style={{padding:"10px 14px", background:t.surface2, borderRadius:6,
                      border:`1px solid ${t.border}`, fontSize:13, color:t.textMuted,
                      fontFamily:"'Rajdhani',sans-serif", lineHeight:1.6}}>
                      {`Ciclo pulizia: avvio a ΔH>${sc.grigliatura.DH_AVVIO_PULIZIA} m, stop a ΔH<${sc.grigliatura.DH_STOP_PULIZIA} m. Bypass ${sc.grigliatura.BYPASS_AUTO?"automatico":"manuale"} oltre ${sc.grigliatura.DH_GUARDIA_ALTA} m. Timer backup: ${sc.grigliatura.TIMER_BACKUP_INTERVALLO} s. Soglia sovraccarico motore: ${sc.grigliatura.CORRENTE_SOVRACCARICO} A.`}
                    </div>
                  </div>
                )}

                {/* ── CLASSIFICATORE SABBIE (only for stage 1) ── */}
                {si === 1 && sc.classifier && (
                  <div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                      letterSpacing:1, marginBottom:14}}>MODALITÀ CLASSIFICATORE SABBIE</div>

                    <div style={{display:"flex", gap:8, marginBottom:18}}>
                      {[["timed","⏱  Temporizzato"],["continuous","⟳  Continuo"]].map(([m, label]) => (
                        <button key={m} onClick={() => updateClassifier(si, "mode", m)}
                          style={{flex:1, padding:"10px", borderRadius:8, cursor:"pointer",
                            fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15,
                            border:`2px solid ${sc.classifier.mode === m ? color : t.border}`,
                            background: sc.classifier.mode === m ? `${color}18` : t.surface2,
                            color: sc.classifier.mode === m ? color : t.textSec}}>
                          {label}
                        </button>
                      ))}
                    </div>

                    <div style={{display:"flex", gap:18, flexWrap:"wrap", marginBottom:14}}>
                      {sc.classifier.mode === "timed" ? (
                        <>
                          <NumField label="Tempo ON" value={sc.classifier.timeOn} unit="min"
                            onChange={v => updateClassifier(si, "timeOn", Math.max(1, Math.round(v)))} t={t}/>
                          <NumField label="Tempo OFF" value={sc.classifier.timeOff} unit="min"
                            onChange={v => updateClassifier(si, "timeOff", Math.max(1, Math.round(v)))} t={t}/>
                        </>
                      ) : (
                        <NumField label="Velocità rotazione" value={sc.classifier.speed} unit="%"
                          onChange={v => updateClassifier(si, "speed", Math.max(10, Math.min(100, Math.round(v))))} t={t}/>
                      )}
                      <NumField label="🟡 Soglia gialla" value={sc.classifier.thresholdWarn ?? 3.0} unit="A"
                        onChange={v => updateClassifier(si, "thresholdWarn", Math.max(0.5, v))} t={t}/>
                      <NumField label="🔴 Soglia rossa" value={sc.classifier.thresholdAlarm ?? 4.2} unit="A"
                        onChange={v => updateClassifier(si, "thresholdAlarm", Math.max(0.5, v))} t={t}/>
                    </div>

                    <div style={{padding:"10px 14px", background:t.surface2, borderRadius:6,
                      border:`1px solid ${t.border}`, fontSize:13, color:t.textMuted,
                      fontFamily:"'Rajdhani',sans-serif", lineHeight:1.6}}>
                      {sc.classifier.mode === "timed"
                        ? `Tramoggia attiva per ${sc.classifier.timeOn} min, poi ferma per ${sc.classifier.timeOff} min. La corrente nel ciclo ON indica la concentrazione dello slurry estratto — soglia 🟡 ${sc.classifier.thresholdWarn ?? 3.0} A / 🔴 ${sc.classifier.thresholdAlarm ?? 4.2} A.`
                        : `Tramoggia in continuo al ${sc.classifier.speed}% della velocità nominale. Semaforo: 🟢 < ${sc.classifier.thresholdWarn ?? 3.0} A — 🟡 ${sc.classifier.thresholdWarn ?? 3.0}÷${sc.classifier.thresholdAlarm ?? 4.2} A — 🔴 > ${sc.classifier.thresholdAlarm ?? 4.2} A.`}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        );
      })}

      {/* ── AGGIUNGI STADIO ── */}
      {onAddStage && (
        <div style={{display:"flex", justifyContent:"center", marginTop:4, marginBottom:8}}>
          <button onClick={() => setShowAddPopup(true)}
            style={{padding:"10px 32px", borderRadius:8, cursor:"pointer",
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, letterSpacing:1,
              border:`2px dashed ${t.accent}66`, background:`${t.accent}10`, color:t.accent,
              transition:"all 0.2s"}}>
            + Aggiungi stadio
          </button>
        </div>
      )}

      {/* ── POPUP AGGIUNGI STADIO ── */}
      {showAddPopup && (
        <div style={{position:"fixed", inset:0, zIndex:200, display:"flex", alignItems:"center", justifyContent:"center",
          background:"rgba(0,0,0,0.55)", backdropFilter:"blur(3px)"}}
          onClick={() => setShowAddPopup(false)}>
          <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:14,
            padding:"24px 28px", minWidth:340, maxWidth:480, width:"90%",
            boxShadow:"0 8px 40px rgba(0,0,0,0.5)", maxHeight:"80vh", display:"flex", flexDirection:"column"}}
            onClick={e => e.stopPropagation()}>
            <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:16,
              color:t.accent, letterSpacing:2, marginBottom:6}}>AGGIUNGI STADIO</div>
            <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginBottom:18}}>
              Seleziona il tipo di stadio da aggiungere alla configurazione
            </div>
            <div style={{overflowY:"auto", flex:1, display:"flex", flexDirection:"column", gap:8}}>
              {availableTypes.length === 0 ? (
                <div style={{padding:"20px", textAlign:"center", color:t.textMuted,
                  fontFamily:"'Rajdhani',sans-serif", fontSize:14}}>
                  Tutti gli stadi disponibili sono già presenti nella configurazione
                </div>
              ) : availableTypes.map((st, i) => (
                <button key={i} onClick={() => { onAddStage(st); setShowAddPopup(false); }}
                  style={{display:"flex", flexDirection:"column", alignItems:"flex-start",
                    padding:"12px 16px", borderRadius:9, cursor:"pointer", textAlign:"left",
                    border:`1px solid ${t.border}`, background:t.surface2, width:"100%",
                    transition:"all 0.15s"}}>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15,
                    color:t.text}}>{st.name}</div>
                  <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                    marginTop:2}}>{st.sub}</div>
                </button>
              ))}
            </div>
            <div style={{marginTop:18, display:"flex", justifyContent:"flex-end"}}>
              <button onClick={() => setShowAddPopup(false)}
                style={{padding:"8px 20px", borderRadius:7, cursor:"pointer",
                  fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:14,
                  border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── DOSAGGI MASSIMI ── */}
      {dosageMax && onDosageMax && (
        <div style={{marginTop:28, background:t.surface, border:`1px solid ${t.border}`,
          borderRadius:10, overflow:"hidden"}}>
          <div style={{padding:"14px 18px", background:t.surface2, borderBottom:`1px solid ${t.border}`,
            display:"flex", justifyContent:"space-between", alignItems:"center"}}>
            <div>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16,
                color:t.text, letterSpacing:1}}>⚗️ PORTATE MASSIME INSTALLATE</div>
              <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>
                Capacità nominale dei sistemi di dosaggio — definisce il riferimento per le percentuali
              </div>
            </div>
          </div>
          <div style={{padding:"20px 24px", display:"grid", gridTemplateColumns:"1fr 1fr", gap:20}}>
            {[
              { key:"blower",        label:"Soffianti",            unit:"kW",  desc:"Potenza elettrica massima installata" },
              { key:"coagulant",     label:"Coagulante",           unit:"L/h", desc:"Portata massima pompa dosatrice" },
              { key:"naoh",          label:"NaOH (alcalinizzante)", unit:"L/h", desc:"Portata massima pompa dosatrice" },
              { key:"h2so4",         label:"H₂SO₄ (acidificante)", unit:"L/h", desc:"Portata massima pompa dosatrice" },
              { key:"sludgeRecycle", label:"Ricircolo fanghi (RAS)",unit:"m³/h",desc:"Portata volumetrica massima RAS" },
            ].map(({ key, label, unit, desc }) => (
              <div key={key}>
                <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:600,
                  color:t.text, marginBottom:2}}>{label}</div>
                <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                  marginBottom:8}}>{desc}</div>
                <div style={{display:"flex", alignItems:"center", gap:10}}>
                  <input type="number" min={1} step={1}
                    value={dosageMax[key] ?? 100}
                    onChange={e => {
                      const v = Math.max(1, Number(e.target.value));
                      onDosageMax(prev => ({ ...prev, [key]: v }));
                    }}
                    style={{width:100, padding:"7px 10px", borderRadius:6, fontSize:15,
                      fontFamily:"'Share Tech Mono',monospace", textAlign:"right",
                      border:`1px solid ${t.border}`, background:t.surface2, color:t.text}} />
                  <span style={{fontSize:14, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                    fontWeight:600}}>{unit}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
