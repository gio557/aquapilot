import { useState } from "react";
import { SENSOR_TYPES, DEFAULT_STAGE_CONFIG, PUMP_CATALOG, DOSING_PUMP_SPEC, makePump } from "../constants/stageConfig";
import { PC } from "../constants/processConstants";
import { pumpKey, pumpMaintH } from "../simulation/pumpHours";
import { newConsumabile, mergeDefaults } from "../simulation/consumabili";
import { STAGE_META } from "../constants/stages";
import { QUALITY_PARAMS, STAGE_SIGNALS, SOURCE_OPTIONS, dataSourceTag } from "../constants/dataSource";
import NormativaPage from "./NormativaPage";

const CONFIG_TABS = [
  { id: "stadi",       label: "CONFIGURAZIONE STADI" },
  { id: "provenienza", label: "SEGNALI" },
  { id: "normativa",   label: "NORMATIVA" },
  { id: "consumabili", label: "CONSUMABILI" },
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

export default function ConfigurazionePage({ t, config, onChange, dosageMax, onDosageMax, stages: stagesProp, stageTypes, onAddStage, onRemoveStage, norms, setNorms, normativaSets, qualitySources = {}, onQualitySources, pumpHours = {}, onResetPumpHours, ac, onAC, consumabili = [], onConsumabili, consumabiliSensors = {}, onToggleSensor }) {
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

  // Add a pump chosen from the catalog dropdown. `value` is either a process
  // pump key ("soffianti", ...) or a dosing-pump token "dose:<productId>".
  const addPumpFromCatalog = (si, value) => {
    if (!value) return;
    let p;
    if (value.startsWith("dose:")) {
      const pid = value.slice(5);
      const prod = consumabili.find(c => c.id === pid);
      p = makePump({ name: `Pompa dosaggio ${prod ? prod.nome : ""}`.trim(),
        ...DOSING_PUMP_SPEC, isDosatrice: true, productId: pid });
    } else {
      const tpl = PUMP_CATALOG.find(c => c.key === value);
      if (!tpl) return;
      p = makePump({ name: tpl.name, power_kw: tpl.power_kw, flow_m3h: tpl.flow_m3h,
        head_m: tpl.head_m, rpm: tpl.rpm, vfd: !!tpl.vfd });
    }
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, pumps: [...sc.pumps, p] }
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

  const updateOsmosi = (si, field, value) => {
    onChange(prev => prev.map((sc, i) =>
      i !== si ? sc : { ...sc, osmosi: { ...sc.osmosi, [field]: value } }
    ));
  };

  // Restore the RO membrane / CIP thresholds to the PC.RO defaults by dropping
  // the per-stage overrides — the engine then falls back to the constants.
  const resetOsmosiDefaults = (si) => {
    onChange(prev => prev.map((sc, i) => {
      if (i !== si) return sc;
      const { osmosi, ...rest } = sc;   // eslint-disable-line no-unused-vars
      return rest;
    }));
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
            boxShadow: activeTab===tab.id
              ? `0 0 10px ${t.accent}55, 0 0 22px ${t.accent}28, 0 -2px 8px ${t.accent}22`
              : "none",
            transform: activeTab===tab.id ? "translateY(-2px)" : "none",
            transition:"all 0.18s"}}>
          {tab.label}
        </button>
      ))}
    </div>
  );

  if (activeTab === "normativa") {
    return (
      <div>
        {TabBar({padded:true})}
        <NormativaPage t={t} ac={ac} onAC={onAC} norms={norms} setNorms={setNorms} normativaSets={normativaSets} />
      </div>
    );
  }

  if (activeTab === "consumabili") {
    const updateC = (id, field, value) =>
      onConsumabili?.(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    const removeC = (id) =>
      onConsumabili?.(prev => prev.filter(c => c.id !== id));
    const addC = () =>
      onConsumabili?.(prev => [...prev, newConsumabile()]);
    const addDefaults = () =>
      onConsumabili?.(prev => mergeDefaults(prev));

    const TextField = ({ label, value, onChange: onCh, placeholder }) => (
      <div style={{display:"flex", flexDirection:"column", gap:3, flex:1, minWidth:180}}>
        <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{label}</div>
        <input type="text" value={value || ""} placeholder={placeholder || ""}
          onChange={e => onCh(e.target.value)}
          style={{background:t.surface3, border:`1px solid ${t.border}`, borderRadius:5,
            color:t.text, padding:"6px 9px", fontFamily:"'Rajdhani',sans-serif", fontSize:14, outline:"none",
            width:"100%", boxSizing:"border-box"}}/>
      </div>
    );

    return (
      <div>
        {TabBar({padded:true})}
        <div style={{padding:"24px 24px 40px"}}>
          <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:20}}>
            <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:13, color:t.accent, letterSpacing:1.5}}>
              GESTIONE CONSUMABILI
            </div>
            <div style={{display:"flex", gap:8}}>
              <button onClick={addDefaults}
                style={{padding:"7px 16px", borderRadius:7, cursor:"pointer",
                  fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, letterSpacing:0.5,
                  border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
                ↻ Aggiungi predefiniti mancanti
              </button>
              <button onClick={addC}
                style={{padding:"7px 18px", borderRadius:7, cursor:"pointer",
                  fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, letterSpacing:0.5,
                  border:`1px solid ${t.accent}`, background:`${t.accent}18`, color:t.accent}}>
                + Aggiungi prodotto
              </button>
            </div>
          </div>

          {consumabili.length === 0 ? (
            <div style={{padding:"28px", textAlign:"center", color:t.textMuted,
              fontFamily:"'Rajdhani',sans-serif", fontSize:14, background:t.surface2,
              borderRadius:10, border:`1px dashed ${t.border}`}}>
              Nessun prodotto configurato. Aggiungi un prodotto per iniziare.
            </div>
          ) : consumabili.map(c => {
            const sens = consumabiliSensors[c.id] || {};
            const hasAlert = sens.riordino || sens.vuoto;
            const borderColor = sens.vuoto ? t.red : sens.riordino ? t.orange : t.border;
            return (
              <div key={c.id} style={{marginBottom:16, padding:"18px 20px", borderRadius:11,
                background:t.surface2, border:`1px solid ${hasAlert ? borderColor : t.border}`}}>

                {/* ── HEADER CISTERNA ── */}
                <div style={{display:"flex", alignItems:"center", gap:10, marginBottom:16}}>
                  <span style={{fontSize:20}}>🧴</span>
                  <input type="text" value={c.nome}
                    onChange={e => updateC(c.id, "nome", e.target.value)}
                    style={{flex:1, background:"transparent", border:"none",
                      borderBottom:`1px solid ${t.border}`, color:t.text,
                      fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:17,
                      outline:"none", padding:"2px 4px"}}/>
                  {sens.vuoto && (
                    <span style={{fontSize:11, padding:"3px 9px", borderRadius:4, fontWeight:700,
                      background:`${t.red}1a`, border:`1px solid ${t.red}66`, color:t.red,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5}}>⚠ VUOTO</span>
                  )}
                  {!sens.vuoto && sens.riordino && (
                    <span style={{fontSize:11, padding:"3px 9px", borderRadius:4, fontWeight:700,
                      background:`${t.orange}1a`, border:`1px solid ${t.orange}66`, color:t.orange,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5}}>↓ RIORDINO</span>
                  )}
                  <button onClick={() => removeC(c.id)}
                    style={{padding:"4px 12px", borderRadius:5, cursor:"pointer",
                      fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13,
                      border:`1px solid ${t.red}66`, background:`${t.red}12`, color:t.red}}>
                    Rimuovi
                  </button>
                </div>

                {/* ── NOTA SOSTANZA + STADI TIPICI ── */}
                {(c.note || (c.stadiTipici && c.stadiTipici.length > 0)) && (
                  <div style={{marginBottom:14, marginTop:-6}}>
                    {c.note && (
                      <div style={{fontSize:12.5, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                        fontStyle:"italic", marginBottom:7}}>{c.note}</div>
                    )}
                    {c.stadiTipici && c.stadiTipici.length > 0 && (
                      <div style={{display:"flex", gap:6, flexWrap:"wrap", alignItems:"center"}}>
                        <span style={{fontSize:10.5, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                          letterSpacing:0.5, marginRight:2}}>STADI TIPICI</span>
                        {c.stadiTipici.map(s => (
                          <span key={s} style={{fontSize:11, padding:"2px 8px", borderRadius:4,
                            background:`${t.accent}14`, border:`1px solid ${t.accent}33`, color:t.accent,
                            fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{s}</span>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* ── DATI FORNITORE ── */}
                <div style={{display:"flex", gap:12, flexWrap:"wrap", marginBottom:14}}>
                  <TextField label="Fornitore" value={c.fornitore}
                    onChange={v => updateC(c.id, "fornitore", v)} placeholder="Nome fornitore"/>
                  <TextField label="Email fornitore" value={c.emailFornitore}
                    onChange={v => updateC(c.id, "emailFornitore", v)} placeholder="ordini@fornitore.it"/>
                  <TextField label="Email responsabile" value={c.emailResponsabile}
                    onChange={v => updateC(c.id, "emailResponsabile", v)} placeholder="resp@impianto.it"/>
                </div>

                {/* ── SENSORI LIVELLO ── */}
                <div style={{borderTop:`1px solid ${t.border}`, paddingTop:14, marginBottom:14}}>
                  <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                    letterSpacing:1, marginBottom:10}}>SENSORI LIVELLO CISTERNA</div>
                  <div style={{display:"flex", gap:16, flexWrap:"wrap"}}>
                    {/* Sensore riordino */}
                    <div style={{flex:1, minWidth:200, padding:"12px 14px", borderRadius:8,
                      background:t.surface3, border:`1px solid ${sens.riordino ? t.orange+"66" : t.border}`}}>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                        <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                          color: sens.riordino ? t.orange : t.text}}>↓ Sensore riordino</span>
                        <div onClick={() => onToggleSensor?.(c.id, "riordino")}
                          style={{width:36, height:20, borderRadius:10, cursor:"pointer", position:"relative",
                            background: sens.riordino ? t.orange : t.surface2,
                            border:`1px solid ${sens.riordino ? t.orange : t.border}`, transition:"background 0.2s"}}>
                          <div style={{position:"absolute", top:2, left: sens.riordino ? 17 : 2,
                            width:14, height:14, borderRadius:"50%", background:"#fff",
                            transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                        </div>
                      </div>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <input type="number" value={c.livelloRiordino_mm}
                          onChange={e => updateC(c.id, "livelloRiordino_mm", Math.max(0, parseInt(e.target.value)||0))}
                          style={{width:80, background:t.surface, border:`1px solid ${t.border}`,
                            borderRadius:5, color:t.text, padding:"5px 8px",
                            fontFamily:"'Share Tech Mono',monospace", fontSize:14}}/>
                        <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>mm</span>
                        <span style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                          marginLeft:4}}>quota galleggiante</span>
                      </div>
                    </div>

                    {/* Sensore vuoto */}
                    <div style={{flex:1, minWidth:200, padding:"12px 14px", borderRadius:8,
                      background:t.surface3, border:`1px solid ${sens.vuoto ? t.red+"66" : t.border}`}}>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:8}}>
                        <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                          color: sens.vuoto ? t.red : t.text}}>⚠ Sensore vuoto</span>
                        <div onClick={() => onToggleSensor?.(c.id, "vuoto")}
                          style={{width:36, height:20, borderRadius:10, cursor:"pointer", position:"relative",
                            background: sens.vuoto ? t.red : t.surface2,
                            border:`1px solid ${sens.vuoto ? t.red : t.border}`, transition:"background 0.2s"}}>
                          <div style={{position:"absolute", top:2, left: sens.vuoto ? 17 : 2,
                            width:14, height:14, borderRadius:"50%", background:"#fff",
                            transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                        </div>
                      </div>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <input type="number" value={c.livelloVuoto_mm}
                          onChange={e => updateC(c.id, "livelloVuoto_mm", Math.max(0, parseInt(e.target.value)||0))}
                          style={{width:80, background:t.surface, border:`1px solid ${t.border}`,
                            borderRadius:5, color:t.text, padding:"5px 8px",
                            fontFamily:"'Share Tech Mono',monospace", fontSize:14}}/>
                        <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>mm</span>
                        <span style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                          marginLeft:4}}>quota galleggiante</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── OPZIONI EMAIL ── */}
                <div style={{borderTop:`1px solid ${t.border}`, paddingTop:14}}>
                  <div style={{display:"flex", alignItems:"center", gap:10}}>
                    <div onClick={() => updateC(c.id, "autoEmailFornitore", !c.autoEmailFornitore)}
                      style={{width:36, height:20, borderRadius:10, cursor:"pointer", position:"relative",
                        flexShrink:0,
                        background: c.autoEmailFornitore ? t.green : t.surface3,
                        border:`1px solid ${c.autoEmailFornitore ? t.green : t.border}`, transition:"background 0.2s"}}>
                      <div style={{position:"absolute", top:2, left: c.autoEmailFornitore ? 17 : 2,
                        width:14, height:14, borderRadius:"50%", background:"#fff",
                        transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                    </div>
                    <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13.5, color:t.text, fontWeight:600}}>
                      Invio automatico ordine di riordino al fornitore
                    </span>
                    <InfoDot text="Quando il sensore di riordino si attiva, viene proposto l'invio di una mail di riordino al fornitore. Con il server edge sarà completamente automatico senza intervento dell'operatore." t={t}/>
                  </div>
                  {c.autoEmailFornitore && !c.emailFornitore && (
                    <div style={{fontSize:11.5, color:t.orange, fontFamily:"'Rajdhani',sans-serif", marginTop:6}}>
                      ⚠ Configura l'email del fornitore qui sopra per abilitare questa funzione.
                    </div>
                  )}
                </div>

              </div>
            );
          })}

          {/* ── POMPE DOSATRICI COLLEGATE (riepilogo) ── */}
          {consumabili.length > 0 && (() => {
            const linked = [];
            stages.forEach((st, si) => {
              (config[si]?.pumps ?? []).forEach(p => {
                if (!p.isDosatrice || !p.productId) return;
                const prod = consumabili.find(c => c.id === p.productId);
                linked.push({ stageName: st.name, pumpName: p.name, prodNome: prod?.nome || p.productId });
              });
            });
            if (linked.length === 0) return (
              <div style={{marginTop:24, padding:"14px 16px", borderRadius:8, background:t.surface2,
                border:`1px dashed ${t.border}`, fontFamily:"'Rajdhani',sans-serif", fontSize:13,
                color:t.textMuted}}>
                Nessuna pompa dosatrice collegata. Vai in "Configurazione Stadi" e, dal menu
                "+ Aggiungi pompa", scegli una pompa dosatrice per il prodotto desiderato.
              </div>
            );
            return (
              <div style={{marginTop:24}}>
                <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
                  letterSpacing:1, marginBottom:10}}>POMPE DOSATRICI COLLEGATE</div>
                <div style={{display:"flex", flexDirection:"column", gap:6}}>
                  {linked.map((l, i) => (
                    <div key={i} style={{display:"flex", alignItems:"center", gap:12, padding:"9px 14px",
                      borderRadius:7, background:t.surface2, border:`1px solid ${t.border}`}}>
                      <span style={{fontSize:15}}>⚙️</span>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14,
                        color:t.text, flex:1}}>{l.pumpName}</span>
                      <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{l.stageName}</span>
                      <span style={{fontSize:11, padding:"2px 9px", borderRadius:4,
                        background:`${t.orange}18`, border:`1px solid ${t.orange}44`,
                        color:t.orange, fontFamily:"'Share Tech Mono',monospace"}}>→ {l.prodNome}</span>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
        </div>
      </div>
    );
  }

  if (activeTab === "provenienza") {
    const setSrc = (key, kind) => onQualitySources?.(prev => ({ ...prev, [key]: kind }));
    const SrcRow = (p) => {
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
                    color: on ? t.accent : t.textSec,
                    boxShadow: on ? `0 0 10px ${t.accent}55, 0 0 22px ${t.accent}28, 0 -2px 8px ${t.accent}22, 0 4px 8px #00000055` : "none",
                    transform: on ? "translateY(-2px)" : "none",
                    transition:"all 0.18s"}}>
                  {dataSourceTag(o.kind).icon} {o.label}
                </button>
              );
            })}
          </div>
        </div>
      );
    };
    const groupHd = { fontSize:12, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1.5,
      color:t.textMuted, textTransform:"uppercase", margin:"22px 0 6px" };
    return (
      <div>
        {TabBar({padded:true})}
        <div style={{padding:"20px 24px 40px", maxWidth:680}}>
          <div style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5, marginBottom:8}}>
            Definisci, per ogni segnale, come viene ottenuto il dato in impianto.
            L'etichetta scelta compare accanto al valore nel cruscotto, nello storico e nei dettagli di stadio.
            <div style={{display:"flex", gap:16, marginTop:10, flexWrap:"wrap", fontFamily:"'Share Tech Mono',monospace", fontSize:11}}>
              {SOURCE_OPTIONS.map(o => {
                const tag = dataSourceTag(o.kind);
                return <span key={o.kind} style={{display:"inline-flex", alignItems:"center", gap:4, color:t.textMuted}}>
                  <span>{tag.icon}</span>{tag.word} — {o.kind==="sensor" ? "sonda diretta" : o.kind==="analyzer" ? "strumento analitico / laboratorio" : "stima o valore derivato"}
                </span>;
              })}
            </div>
          </div>
          <div style={groupHd}>▸ Parametri di qualità in uscita</div>
          {QUALITY_PARAMS.map(SrcRow)}
          <div style={groupHd}>▸ Segnali di stadio</div>
          {STAGE_SIGNALS.map(SrcRow)}
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"20px 24px 40px"}}>

      {/* ── TAB BAR ── */}
      {TabBar({})}

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
                    <select value=""
                      onChange={e => { addPumpFromCatalog(si, e.target.value); e.target.value = ""; }}
                      style={{padding:"6px 12px", borderRadius:6, cursor:"pointer",
                        fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                        border:`1px solid ${color}`, background:`${color}18`, color, outline:"none"}}>
                      <option value="">+ Aggiungi pompa…</option>
                      <optgroup label="Pompe di processo">
                        {PUMP_CATALOG.map(c => (
                          <option key={c.key} value={c.key}>{c.name}</option>
                        ))}
                      </optgroup>
                      {consumabili.length > 0 && (
                        <optgroup label="Pompe dosatrici">
                          {consumabili.map(prod => (
                            <option key={prod.id} value={`dose:${prod.id}`}>
                              Pompa dosaggio {prod.nome}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </select>
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
                            {pump.isDosatrice && (
                              <div style={{padding:"4px 10px", borderRadius:5, fontSize:12,
                                fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                                background:`${t.orange}22`, border:`1px solid ${t.orange}`, color:t.orange}}>
                                DOSATRICE
                              </div>
                            )}
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

                        {/* ── PRODOTTO DOSATO (solo per pompe dosatrici) ── */}
                        {pump.isDosatrice && (
                          <div style={{marginTop:12, paddingTop:12, borderTop:`1px solid ${t.border}`}}>
                            <div style={{fontSize:12, color:t.orange, fontFamily:"'Share Tech Mono',monospace",
                              letterSpacing:1, marginBottom:8}}>PRODOTTO DOSATO</div>
                            <select
                              value={pump.productId || ""}
                              onChange={e => updatePump(si, pi, "productId", e.target.value || null)}
                              style={{width:"100%", background:t.surface3, border:`1px solid ${t.orange}66`,
                                borderRadius:6, color:t.text, padding:"7px 10px",
                                fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:14,
                                cursor:"pointer", outline:"none"}}>
                              <option value="">— nessun prodotto selezionato —</option>
                              {consumabili.map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ))}
                            </select>
                            {!pump.productId && (
                              <div style={{fontSize:11.5, color:t.orange, fontFamily:"'Rajdhani',sans-serif",
                                marginTop:5, opacity:0.8}}>
                                Seleziona il prodotto dalla cisterna collegata a questa pompa.
                              </div>
                            )}
                            {pump.productId && (() => {
                              const prod = consumabili.find(c => c.id === pump.productId);
                              const sens = consumabiliSensors[pump.productId] || {};
                              return prod ? (
                                <div style={{marginTop:8, display:"flex", gap:8, flexWrap:"wrap"}}>
                                  {sens.riordino && (
                                    <span style={{fontSize:11, padding:"2px 8px", borderRadius:4,
                                      background:`${t.orange}1a`, border:`1px solid ${t.orange}55`,
                                      color:t.orange, fontFamily:"'Share Tech Mono',monospace"}}>
                                      ↓ RIORDINO
                                    </span>
                                  )}
                                  {sens.vuoto && (
                                    <span style={{fontSize:11, padding:"2px 8px", borderRadius:4,
                                      background:`${t.red}1a`, border:`1px solid ${t.red}55`,
                                      color:t.red, fontFamily:"'Share Tech Mono',monospace"}}>
                                      ⚠ VUOTO
                                    </span>
                                  )}
                                  {!sens.riordino && !sens.vuoto && (
                                    <span style={{fontSize:11, padding:"2px 8px", borderRadius:4,
                                      background:`${t.green}14`, border:`1px solid ${t.green}44`,
                                      color:t.green, fontFamily:"'Share Tech Mono',monospace"}}>
                                      ✓ LIVELLO OK
                                    </span>
                                  )}
                                </div>
                              ) : null;
                            })()}
                          </div>
                        )}

                        {/* ── MANUTENZIONE PROGRAMMATA (contatore ore + soglia) ── */}
                        {(() => {
                          const hrs = pumpHours?.[pumpKey(stage.name, pump.id)] || 0;
                          const thr = pumpMaintH(pump);
                          const due = thr > 0 && hrs >= thr;
                          const pct = thr > 0 ? Math.min(100, (hrs / thr) * 100) : 0;
                          const barColor = due ? t.red : pct >= 80 ? t.orange : t.green;
                          return (
                            <div style={{marginTop:14, paddingTop:14, borderTop:`1px solid ${t.border}`}}>
                              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10}}>
                                <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                                  MANUTENZIONE PROGRAMMATA
                                </span>
                                {thr > 0 && (
                                  <span style={{fontSize:11, padding:"2px 9px", borderRadius:4, fontFamily:"'Share Tech Mono',monospace",
                                    background: due ? `${t.red}1a` : `${t.green}14`, color: due ? t.red : t.green,
                                    border:`1px solid ${(due ? t.red : t.green)}55`}}>
                                    {due ? "⚠ DA EFFETTUARE" : "✓ OK"}
                                  </span>
                                )}
                              </div>
                              <div style={{display:"flex", gap:18, flexWrap:"wrap", alignItems:"flex-end"}}>
                                <div style={{display:"flex", flexDirection:"column", gap:3}}>
                                  <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>Ore di funzionamento</div>
                                  <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:15, color: due ? t.red : t.text, fontWeight:700}}>
                                    {hrs.toFixed(1)} <span style={{fontSize:12, color:t.textMuted}}>h</span>
                                  </div>
                                </div>
                                <NumField label="Soglia manutenzione" value={thr} unit="h"
                                  onChange={v => updatePump(si, pi, "maintH", Math.max(0, Math.round(v)))} t={t}/>
                                <button onClick={() => onResetPumpHours?.(stage.name, pump.id)}
                                  style={{padding:"7px 14px", borderRadius:6, cursor:"pointer",
                                    fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                                    border:`1px solid ${t.green}66`, background:`${t.green}14`, color:t.green}}>
                                  ✓ Manutenzione effettuata
                                </button>
                              </div>
                              {thr > 0 ? (
                                <div style={{marginTop:10}}>
                                  <div style={{height:5, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
                                    <div style={{height:"100%", width:`${pct}%`, background:barColor, borderRadius:3, transition:"width 0.5s ease"}}/>
                                  </div>
                                  <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:4}}>
                                    {hrs.toFixed(1)} / {thr} h ({Math.round(pct)}%) — {due ? "soglia superata: pianificare l'intervento." : `mancano ${Math.max(0, thr - hrs).toFixed(1)} h alla manutenzione.`}
                                  </div>
                                </div>
                              ) : (
                                <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:8}}>
                                  Imposta una soglia di ore &gt; 0 per attivare la notifica di manutenzione programmata.
                                </div>
                              )}
                            </div>
                          );
                        })()}
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

                {/* ── OSMOSI INVERSA: soglie membrana & lavaggio CIP ── */}
                {stage.name === "Osmosi Inversa" && (() => {
                  const ro = sc.osmosi || {};
                  const g  = (f) => ro[f] ?? PC.RO[f];
                  const dpTrip = (g("DP_CLEAN") * (1 + g("DP_TRIGGER"))).toFixed(2);
                  const isCustom = Object.keys(ro).length > 0;
                  return (
                    <div>
                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
                        <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                          SOGLIE MEMBRANA &amp; LAVAGGIO CIP {isCustom && <span style={{color}}>· personalizzate</span>}
                        </div>
                        <button onClick={() => resetOsmosiDefaults(si)}
                          style={{padding:"4px 12px", borderRadius:5, cursor:"pointer", fontSize:13,
                            fontFamily:"'Rajdhani',sans-serif", fontWeight:600,
                            border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
                          ↺ Ripristino default
                        </button>
                      </div>

                      <div style={{display:"flex", gap:18, flexWrap:"wrap", marginBottom:14}}>
                        <NumField label="Press. alimentazione" value={g("FEED_PRESSURE")} unit="bar"
                          onChange={v => updateOsmosi(si, "FEED_PRESSURE", Math.max(2, Math.min(80, v)))} t={t}/>
                        <NumField label="ΔP membrana pulita" value={g("DP_CLEAN")} unit="bar"
                          onChange={v => updateOsmosi(si, "DP_CLEAN", Math.max(0.1, Math.min(3, v)))} t={t}/>
                        <NumField label="Salita ΔP avvio CIP" value={Math.round(g("DP_TRIGGER")*100)} unit="%"
                          onChange={v => updateOsmosi(si, "DP_TRIGGER", Math.max(0.05, Math.min(1, v/100)))} t={t}/>
                        <NumField label="Flusso min. avvio CIP" value={g("FLUX_TRIGGER")} unit="%"
                          onChange={v => updateOsmosi(si, "FLUX_TRIGGER", Math.max(50, Math.min(99, Math.round(v))))} t={t}/>
                        <NumField label="Recupero permeato" value={g("RECOVERY")} unit="%"
                          onChange={v => updateOsmosi(si, "RECOVERY", Math.max(30, Math.min(95, Math.round(v))))} t={t}/>
                      </div>

                      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"12px 16px", background:t.surface2, borderRadius:8, border:`1px solid ${t.border}`, marginBottom:10}}>
                        <div>
                          <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, color:t.text}}>Avvio CIP automatico</div>
                          <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>
                            Avvia il lavaggio al superamento delle soglie. Se disattivo, il CIP parte solo dal pulsante manuale sulla tessera.
                          </div>
                        </div>
                        <div onClick={() => updateOsmosi(si, "CIP_AUTO", !g("CIP_AUTO"))}
                          style={{flexShrink:0, width:44, height:24, borderRadius:12, cursor:"pointer", position:"relative",
                            background: g("CIP_AUTO") ? t.green : t.surface3,
                            border:`1px solid ${g("CIP_AUTO") ? t.green : t.border}`, transition:"background 0.2s"}}>
                          <div style={{position:"absolute", top:3, left: g("CIP_AUTO") ? 21 : 3,
                            width:16, height:16, borderRadius:"50%", background:"#fff",
                            transition:"left 0.2s", boxShadow:"0 1px 3px rgba(0,0,0,0.3)"}}/>
                        </div>
                      </div>

                      <div style={{padding:"10px 14px", background:t.surface2, borderRadius:6,
                        border:`1px solid ${t.border}`, fontSize:13, color:t.textMuted,
                        fontFamily:"'Rajdhani',sans-serif", lineHeight:1.6}}>
                        {`Lavaggio CIP ${g("CIP_AUTO") ? "automatico" : "solo manuale"}: avvio a ΔP > ${dpTrip} bar (pulita ${g("DP_CLEAN")} bar, +${Math.round(g("DP_TRIGGER")*100)}%) o flusso normalizzato < ${g("FLUX_TRIGGER")}%. Pressione alimentazione ${g("FEED_PRESSURE")} bar, recupero permeato ${g("RECOVERY")}%. Le membrane spiralate non si contro-lavano: la pulizia avviene per via chimica (Cleaning-In-Place).`}
                      </div>
                    </div>
                  );
                })()}

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
