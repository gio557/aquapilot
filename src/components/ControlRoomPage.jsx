import { DARK, LIGHT } from "../constants/theme";
import { useControlMirror } from "../hooks/useControlChannel";
import SimSlider from "./ui/SimSlider";
import Tag from "./ui/Tag";
import { INIT_SIM } from "../simulation/engine";
import { EVENT_LIST, makeEvent } from "../constants/events";

// Reusable card wrapper for the control-room grid.
function Panel({ title, icon, t, children, span }) {
  return (
    <section style={{
      background:t.surface, border:`1px solid ${t.border}`, borderRadius:14,
      padding:"16px 18px", display:"flex", flexDirection:"column", gap:12,
      gridColumn: span ? `span ${span}` : undefined,
      boxShadow:t.cardShadow || "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      <div style={{display:"flex", alignItems:"center", gap:8, paddingBottom:10,
        borderBottom:`1px solid ${t.border}`}}>
        <span style={{fontSize:18}}>{icon}</span>
        <h2 style={{fontFamily:"'Orbitron',sans-serif", fontSize:13, color:t.accent,
          letterSpacing:1.5, fontWeight:700, margin:0}}>{title}</h2>
      </div>
      {children}
    </section>
  );
}

const subHd = (t) => ({ fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace",
  letterSpacing:1.5, textTransform:"uppercase", margin:"6px 0 10px" });

export default function ControlRoomPage() {
  const { sim, darkMode, onSim, connected } = useControlMirror();
  const t = darkMode ? DARK : LIGHT;

  const fontImport = (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');
      *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
      html, body, #root { height:100%; }
      body { background:${t.bg}; color:${t.text}; font-family:'Rajdhani',sans-serif; }
      ::-webkit-scrollbar { width:8px; height:8px; }
      ::-webkit-scrollbar-track { background:transparent; }
      ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:4px; }
    `}</style>
  );

  if (!sim) {
    return (
      <div style={{minHeight:"100vh", background:t.bg, display:"flex", alignItems:"center",
        justifyContent:"center", flexDirection:"column", gap:12}}>
        {fontImport}
        <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:20, color:t.accent, letterSpacing:3}}>
          🎛️ CONTROL ROOM
        </div>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:t.textSec}}>
          {connected ? "Sincronizzazione…" : "In attesa della scheda principale di AquaPilot…"}
        </div>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, maxWidth:380, textAlign:"center", lineHeight:1.5}}>
          Tieni aperta la scheda principale di AquaPilot: la simulazione gira lì e
          questa Control Room la comanda in tempo reale.
        </div>
      </div>
    );
  }

  const activeEvents = Array.isArray(sim.events) ? sim.events : [];
  const triggerEvent = (type) => onSim(p => {
    const ev = makeEvent(type);
    if (!ev) return p;
    return { ...p, events: [...(p.events || []).filter(e => e.type !== type), ev] };
  });
  const stopEvent = (id)  => onSim(p => ({ ...p, events: (p.events || []).filter(e => e.id !== id) }));
  const stopAllEvents = () => onSim(p => ({ ...p, events: [] }));
  const activeAlarms = Object.values(sim.alarmState || {}).filter(v => v !== "OK").length;

  const kpis = [
    {l:"O₂",      v:`${sim.O2.toFixed(1)}`, u:"mg/L", c:sim.O2<1.5?t.red:sim.O2<2?t.orange:t.green},
    {l:"MLSS",    v:`${Math.round(sim.MLSS)}`, u:"mg/L", c:t.accent},
    {l:"CONSUMO", v:`${sim.energy?.kw ?? 0}`, u:"kW", c:t.purple},
    {l:"ALLARMI", v:`${activeAlarms}`, u:"", c:activeAlarms>0?t.red:t.green},
  ];

  return (
    <div style={{minHeight:"100vh", background:t.bg, color:t.text}}>
      {fontImport}

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <header style={{position:"sticky", top:0, zIndex:10, background:t.surface,
        borderBottom:`1px solid ${t.border}`, padding:"12px 24px",
        display:"flex", alignItems:"center", gap:24, flexWrap:"wrap",
        boxShadow:"0 2px 12px rgba(0,0,0,0.08)"}}>

        <div style={{display:"flex", flexDirection:"column"}}>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:19, color:t.accent, letterSpacing:3, fontWeight:900}}>
            🎛️ CONTROL ROOM
          </div>
          <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:t.textSec, marginTop:2}}>
            {sim.running ? "● SIMULAZIONE ATTIVA" : "■ IN PAUSA"} · {sim.speed}× · {sim.mode==="fast"?"RAPIDA":"REALISTICA"}
          </div>
        </div>

        {/* Run + speed */}
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <button onClick={() => onSim(p => ({...p, running:!p.running}))}
            style={{background:sim.running?t.orangeDim:t.greenDim, border:`1px solid ${sim.running?t.orange:t.green}`,
              color:sim.running?t.orange:t.green, padding:"7px 18px", borderRadius:7,
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:1}}>
            {sim.running ? "⏸ PAUSA" : "▶ AVVIA"}
          </button>
          <div style={{display:"flex", gap:5}}>
            {[1,5,10].map(sp => (
              <button key={sp} onClick={() => onSim(p => ({...p, speed:sp}))}
                style={{padding:"7px 12px", borderRadius:7, cursor:"pointer", fontFamily:"'Share Tech Mono',monospace",
                  fontSize:12, fontWeight:700, background:sim.speed===sp?`${t.accent}22`:t.surface2,
                  border:`1px solid ${sim.speed===sp?t.accent:t.border}`, color:sim.speed===sp?t.accent:t.textSec}}>
                {sp}×
              </button>
            ))}
          </div>
        </div>

        {/* KPI chips */}
        <div style={{display:"flex", gap:10, marginLeft:"auto", flexWrap:"wrap"}}>
          {kpis.map(x => (
            <div key={x.l} style={{minWidth:88, textAlign:"center", padding:"6px 12px",
              background:t.surface2, borderRadius:8, border:`1px solid ${x.c}44`}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:17, fontWeight:700, color:x.c, lineHeight:1.1}}>
                {x.v}<span style={{fontSize:10, color:t.textMuted, marginLeft:3}}>{x.u}</span>
              </div>
              <div style={{fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>{x.l}</div>
            </div>
          ))}
        </div>
      </header>

      {/* ── GRID ───────────────────────────────────────────────────────────── */}
      <div style={{padding:24, display:"grid", gap:18,
        gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))", alignItems:"start",
        maxWidth:1500, margin:"0 auto"}}>

        {/* CONTROLLI PROCESSO */}
        <Panel title="CONTROLLI PROCESSO" icon="🔧" t={t}>
          <SimSlider label="Soffianti" sublabel="stadio biologico" value={sim.blower} min={0} max={100} unit="%" color={t.accent} t={t} onChange={v => onSim(p => ({...p, blower:v}))}/>
          <SimSlider label="Dosaggio Coagulante" sublabel="sedimentazione" value={sim.coagulant} min={0} max={100} unit="%" color={t.green} t={t} onChange={v => onSim(p => ({...p, coagulant:v}))}/>
          <SimSlider label="Ricircolo Fanghi" sublabel="RAS rapporto" value={sim.sludgeRecycle} min={0} max={100} unit="%" color={t.orange} t={t} onChange={v => onSim(p => ({...p, sludgeRecycle:v}))}/>
          <SimSlider label="Setpoint MLSS" sublabel="target biomassa biologico" value={sim.MLSSsp ?? 3200} min={1000} max={6000} step={50} unit=" mg/L" color={t.purple} t={t} onChange={v => onSim(p => ({...p, MLSSsp:v}))}/>

          <div style={{borderTop:`1px solid ${t.border}`, paddingTop:12, marginTop:2}}>
            <div style={subHd(t)}>Correzione pH</div>
            <SimSlider label="Dosaggio NaOH" sublabel="alcalinizzante" value={sim.naoh} min={0} max={100} unit="%" color={t.green} t={t} onChange={v => onSim(p => ({...p, naoh:v, h2so4:v>0?0:p.h2so4}))}/>
            <SimSlider label="Dosaggio H₂SO₄" sublabel="acidificante" value={sim.h2so4} min={0} max={100} unit="%" color={t.red} t={t} onChange={v => onSim(p => ({...p, h2so4:v, naoh:v>0?0:p.naoh}))}/>
          </div>

          <div style={{borderTop:`1px solid ${t.border}`, paddingTop:12, marginTop:2}}>
            <div style={subHd(t)}>Lettura cono Imhoff</div>
            <div style={{display:"flex", gap:8, alignItems:"center"}}>
              <input type="number" min="0" max="1000" placeholder="mL/L (30 min)"
                value={sim.imhoff || ""}
                onChange={e => onSim(p => ({...p, imhoff:e.target.value}))}
                style={{flex:1, background:t.surface2, border:`1px solid ${t.border}`, borderRadius:7, color:t.text, padding:"9px 11px", fontFamily:"'Share Tech Mono',monospace", fontSize:12}}/>
              <span style={{fontSize:12, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>mL/L</span>
            </div>
            {sim.imhoff && (
              <div style={{marginTop:8, padding:"7px 11px", borderRadius:7,
                background:parseFloat(sim.imhoff)>400?t.redDim:parseFloat(sim.imhoff)>250?t.orangeDim:t.greenDim,
                border:`1px solid ${parseFloat(sim.imhoff)>400?t.red:parseFloat(sim.imhoff)>250?t.orange:t.green}44`,
                fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                color:parseFloat(sim.imhoff)>400?t.red:parseFloat(sim.imhoff)>250?t.orange:t.green}}>
                IVF: {sim.imhoff} mL/L — {parseFloat(sim.imhoff)>400?"ELEVATO":parseFloat(sim.imhoff)>250?"MEDIO":"OTTIMALE"}
                <div style={{fontSize:11, color:t.textMuted, marginTop:2}}>
                  {parseFloat(sim.imhoff)>400?"Ridurre ricircolo fanghi":parseFloat(sim.imhoff)>250?"Monitorare SVI":"Condizioni fanghi buone"}
                </div>
              </div>
            )}
          </div>
        </Panel>

        {/* ACQUA IN INGRESSO */}
        <Panel title="ACQUA IN INGRESSO" icon="🌊" t={t}>
          <div style={{padding:"8px 12px", background:t.orangeDim, border:`1px solid ${t.orange}44`, borderRadius:8, fontSize:12, color:t.orange, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>
            ⚡ Modifica le condizioni del refluo in ingresso per testare la risposta dell'impianto.
          </div>
          <SimSlider label="Portata" value={sim.inlet.Q} min={300} max={2500} unit=" m³/h" color={t.accent} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, Q:v}}))}/>
          <SimSlider label="COD Ingresso" value={sim.inlet.COD} min={50} max={1200} unit=" mg/L" color={t.accent} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, COD:v}}))}/>
          <SimSlider label="BOD₅ Ingresso" value={sim.inlet.BOD5} min={30} max={600} unit=" mg/L" color={t.green} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, BOD5:v}}))}/>
          <SimSlider label="SST Ingresso" value={sim.inlet.TSS} min={30} max={800} unit=" mg/L" color={t.orange} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, TSS:v}}))}/>
          <SimSlider label="NH₄ Ingresso" value={sim.inlet.NH4} min={2} max={120} unit=" mg/L" color={t.purple} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, NH4:v}}))}/>
          <SimSlider label="pH Ingresso" value={sim.inlet.pH} min={4.0} max={11.0} step={0.1} unit="" color={t.textSec} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, pH:v}}))}/>
          <SimSlider label="Temperatura" value={sim.inlet.T} min={5} max={40} unit="°C" color={t.yellow} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, T:v}}))}/>
          <button onClick={() => onSim(p => ({...p, inlet:INIT_SIM.inlet}))}
            style={{width:"100%", marginTop:4, padding:"9px", background:t.surface2, border:`1px solid ${t.border}`, color:t.textSec, borderRadius:8, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:"pointer"}}>
            ↺ Ripristina valori default
          </button>
        </Panel>

        {/* SCENARI / EVENTI */}
        <Panel title="SCENARI / EVENTI" icon="🎬" t={t}>
          <div style={{padding:"8px 12px", background:t.accentDim, border:`1px solid ${t.accent}44`, borderRadius:8, fontSize:12, color:t.accent, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>
            🎬 Attiva uno scenario per testare la reazione dell'impianto. Allarmi e auto-correzione rispondono in tempo reale.
          </div>

          {activeEvents.length > 0 && (
            <button onClick={stopAllEvents}
              style={{width:"100%", padding:"9px", background:t.redDim, border:`1px solid ${t.red}66`, color:t.red, borderRadius:8, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:1}}>
              ⏹ INTERROMPI TUTTI ({activeEvents.length})
            </button>
          )}

          {EVENT_LIST.map(def => {
            const active = activeEvents.find(e => e.type === def.type);
            const pct = active && active.duration ? Math.max(0, Math.round(active.remaining / active.duration * 100)) : 0;
            const secs = active && active.remaining != null ? Math.ceil(active.remaining * 0.5) : null;
            return (
              <div key={def.type} style={{padding:"12px 14px", background:active?`${def.color}14`:t.surface2, border:`1px solid ${active?def.color:t.border}`, borderRadius:10, transition:"all 0.15s"}}>
                <div style={{display:"flex", alignItems:"flex-start", gap:10}}>
                  <span style={{fontSize:22, lineHeight:1, marginTop:1}}>{def.icon}</span>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3}}>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:active?def.color:t.text}}>{def.label}</span>
                      {active && <Tag color={def.color}>ATTIVO</Tag>}
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>{def.desc}</div>
                  </div>
                </div>

                {active ? (
                  <div style={{marginTop:10}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                      <span style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace"}}>tempo residuo</span>
                      <span style={{fontSize:12, color:def.color, fontFamily:"'Share Tech Mono',monospace", fontWeight:700}}>~{secs}s</span>
                    </div>
                    <div style={{height:5, background:t.surface3, borderRadius:3, overflow:"hidden", marginBottom:8}}>
                      <div style={{height:"100%", width:`${pct}%`, background:def.color, borderRadius:3, transition:"width 0.4s linear"}}/>
                    </div>
                    <div style={{display:"flex", gap:8}}>
                      <button onClick={() => triggerEvent(def.type)}
                        style={{flex:1, padding:"6px", background:t.surface3, border:`1px solid ${t.border}`, color:t.textSec, borderRadius:6, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:12, cursor:"pointer"}}>
                        ↻ Riavvia
                      </button>
                      <button onClick={() => stopEvent(active.id)}
                        style={{flex:1, padding:"6px", background:t.redDim, border:`1px solid ${t.red}66`, color:t.red, borderRadius:6, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer"}}>
                        ⏹ Interrompi
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => triggerEvent(def.type)}
                    style={{width:"100%", marginTop:10, padding:"7px", background:`${def.color}1a`, border:`1px solid ${def.color}66`, color:def.color, borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, cursor:"pointer", letterSpacing:1}}>
                    ▶ ATTIVA SCENARIO
                  </button>
                )}
              </div>
            );
          })}
        </Panel>

        {/* SIMULAZIONE & MOTORE */}
        <Panel title="SIMULAZIONE" icon="⚙️" t={t}>
          <div>
            <div style={subHd(t)}>Modalità risposta impianto</div>
            {[
              {id:"fast",      label:"Risposta Rapida",     desc:"Ideale per demo — i parametri rispondono quasi istantaneamente", icon:"⚡"},
              {id:"realistic", label:"Risposta Realistica", desc:"Costanti di tempo fisiche — O₂: τ=5min, COD: τ=30min, pH: τ=2min", icon:"🔬"},
            ].map(m => (
              <div key={m.id} onClick={() => onSim(p => ({...p, mode:m.id}))}
                style={{padding:"11px 13px", background:sim.mode===m.id?t.accentDim:t.surface2, border:`1px solid ${sim.mode===m.id?t.accent:t.border}`, borderRadius:9, marginBottom:8, cursor:"pointer"}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:3}}>
                  <span style={{fontSize:13}}>{m.icon}</span>
                  <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, color:sim.mode===m.id?t.accent:t.text}}>{m.label}</span>
                  {sim.mode===m.id && <Tag color={t.accent}>ATTIVO</Tag>}
                </div>
                <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>{m.desc}</div>
              </div>
            ))}
          </div>

          <div>
            <div style={subHd(t)}>Velocità simulazione</div>
            {[
              {sp:1,  label:"1× — Tempo reale",   desc:"1 secondo simulato per secondo reale"},
              {sp:5,  label:"5× — Accelerata",     desc:"5 minuti simulati per secondo reale"},
              {sp:10, label:"10× — Alta velocità", desc:"10 minuti simulati per secondo reale"},
            ].map(m => (
              <div key={m.sp} onClick={() => onSim(p => ({...p, speed:m.sp}))}
                style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:sim.speed===m.sp?t.accentDim:t.surface2, border:`1px solid ${sim.speed===m.sp?t.accent:t.border}`, borderRadius:8, marginBottom:6, cursor:"pointer"}}>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13, color:sim.speed===m.sp?t.accent:t.text}}>{m.label}</div>
                  <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{m.desc}</div>
                </div>
                {sim.speed===m.sp && <Tag color={t.accent}>✓</Tag>}
              </div>
            ))}
          </div>

          <div style={{padding:"12px 14px", background:t.surface2, borderRadius:9, border:`1px solid ${t.border}`}}>
            <div style={subHd(t)}>Stato motore</div>
            {[
              {l:"Tick simulazione", v:sim.tick},
              {l:"O₂ disciolto",     v:`${sim.O2.toFixed(2)} mg/L`},
              {l:"MLSS",             v:`${Math.round(sim.MLSS)} mg/L`},
              {l:"Consumo attuale",  v:`${sim.energy?.kw ?? 0} kW`},
              {l:"kWh totali",       v:`${sim.energy?.kwh ?? 0} kWh`},
            ].map(x => (
              <div key={x.l} style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
                <span style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>{x.l}</span>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.accent}}>{x.v}</span>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
