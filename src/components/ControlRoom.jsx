import { useState } from "react";
import SimSlider from "./ui/SimSlider";
import Tag from "./ui/Tag";
import { INIT_SIM } from "../simulation/engine";

export default function ControlRoom({ sim, onSim, t, onClose }) {
  const [tab, setTab] = useState("impianto");
  const tabs = [
    {id:"impianto",    label:"IMPIANTO",    icon:"🔧"},
    {id:"ingresso",    label:"INGRESSO",    icon:"🌊"},
    {id:"simulazione", label:"SIMULAZIONE", icon:"⚙️"},
  ];
  const activeAlarms = Object.values(sim.alarmState || {}).filter(v => v !== "OK").length;

  return (
    <div style={{position:"fixed", right:0, top:0, bottom:0, width:360, zIndex:150, background:t.surface, borderLeft:`2px solid ${t.accent}44`, boxShadow:"-10px 0 50px rgba(0,0,0,0.2)", overflowY:"auto", display:"flex", flexDirection:"column"}}>

      <div style={{padding:"14px 18px", borderBottom:`1px solid ${t.border}`, background:t.surface2, position:"sticky", top:0, zIndex:2, flexShrink:0}}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, color:t.accent, letterSpacing:2}}>🎛️ CONTROL ROOM</div>
            <div style={{fontSize:16, color:t.textSec, fontFamily:"'Share Tech Mono',monospace", marginTop:2}}>
              {sim.running ? "● SIMULAZIONE ATTIVA" : "■ SIMULAZIONE PAUSA"} · {sim.speed}x · {sim.mode==="fast"?"FAST":"REALISTICO"}
            </div>
          </div>
          <button onClick={onClose} style={{background:t.surface3, border:`1px solid ${t.border}`, color:t.text, width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, lineHeight:1}}>✕</button>
        </div>
        <div style={{display:"flex", gap:8, alignItems:"center"}}>
          <button onClick={() => onSim(p => ({...p, running:!p.running}))}
            style={{background:sim.running?t.orangeDim:t.greenDim, border:`1px solid ${sim.running?t.orange:t.green}`, color:sim.running?t.orange:t.green, padding:"5px 14px", borderRadius:6, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer", flex:1}}>
            {sim.running ? "⏸ PAUSA" : "▶ AVVIA"}
          </button>
          <div style={{display:"flex", gap:6, flex:1}}>
            {[1,5,10].map(sp => (
              <button key={sp} onClick={() => onSim(p => ({...p, speed:sp}))}
                style={{flex:1, padding:"5px 0", borderRadius:6, cursor:"pointer", fontFamily:"'Share Tech Mono',monospace", fontSize:11, fontWeight:700, background:sim.speed===sp?`${t.accent}22`:t.surface3, border:`1px solid ${sim.speed===sp?t.accent:t.border}`, color:sim.speed===sp?t.accent:t.textSec}}>
                {sp}x
              </button>
            ))}
          </div>
        </div>
        <div style={{display:"flex", gap:8, marginTop:10}}>
          {[
            {l:"O₂",     v:`${sim.O2.toFixed(1)} mg/L`,    c:sim.O2<1.5?t.red:sim.O2<2?t.orange:t.green},
            {l:"MLSS",   v:`${Math.round(sim.MLSS)} mg/L`, c:t.accent},
            {l:"ALLARMI",v:activeAlarms,                   c:activeAlarms>0?t.red:t.green},
          ].map(x => (
            <div key={x.l} style={{flex:1, textAlign:"center", padding:"5px 4px", background:t.surface3, borderRadius:6, border:`1px solid ${x.c}33`}}>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, fontWeight:700, color:x.c}}>{x.v}</div>
              <div style={{fontSize:14, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:"flex", borderBottom:`1px solid ${t.border}`, flexShrink:0}}>
        {tabs.map(tb => (
          <button key={tb.id} onClick={() => setTab(tb.id)}
            style={{flex:1, padding:"8px 4px", background:tab===tb.id?t.surface:t.surface2, border:"none", borderBottom:tab===tb.id?`2px solid ${t.accent}`:"2px solid transparent", color:tab===tb.id?t.accent:t.textSec, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, letterSpacing:1}}>
            {tb.icon} {tb.label}
          </button>
        ))}
      </div>

      <div style={{padding:"16px 18px", flex:1}}>

        {tab==="impianto" && (
          <div>
            <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:14}}>CONTROLLI PROCESSO</div>
            <SimSlider label="Soffianti" sublabel="stadio biologico" value={sim.blower} min={0} max={100} unit="%" color={t.accent} t={t} onChange={v => onSim(p => ({...p, blower:v}))}/>
            <SimSlider label="Dosaggio Coagulante" sublabel="sedimentazione" value={sim.coagulant} min={0} max={100} unit="%" color={t.green} t={t} onChange={v => onSim(p => ({...p, coagulant:v}))}/>
            <SimSlider label="Ricircolo Fanghi" sublabel="RAS rapporto" value={sim.sludgeRecycle} min={0} max={100} unit="%" color={t.orange} t={t} onChange={v => onSim(p => ({...p, sludgeRecycle:v}))}/>

            <div style={{borderTop:`1px solid ${t.border}`, paddingTop:14, marginTop:4}}>
              <div style={{fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:14}}>CORREZIONE pH</div>
              <SimSlider label="Dosaggio NaOH" sublabel="alcalinizzante" value={sim.naoh} min={0} max={100} unit="%" color={t.green} t={t} onChange={v => onSim(p => ({...p, naoh:v, h2so4:v>0?0:p.h2so4}))}/>
              <SimSlider label="Dosaggio H₂SO₄" sublabel="acidificante" value={sim.h2so4} min={0} max={100} unit="%" color={t.red} t={t} onChange={v => onSim(p => ({...p, h2so4:v, naoh:v>0?0:p.naoh}))}/>
            </div>

            <div style={{borderTop:`1px solid ${t.border}`, paddingTop:14, marginTop:4}}>
              <div style={{fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:10}}>LETTURA CONO IMHOFF</div>
              <div style={{display:"flex", gap:8, alignItems:"center"}}>
                <input type="number" min="0" max="1000" placeholder="mL/L (30 min)"
                  value={sim.imhoff || ""}
                  onChange={e => onSim(p => ({...p, imhoff:e.target.value}))}
                  style={{flex:1, background:t.surface2, border:`1px solid ${t.border}`, borderRadius:6, color:t.text, padding:"8px 10px", fontFamily:"'Share Tech Mono',monospace", fontSize:11}}/>
                <span style={{fontSize:11, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>mL/L</span>
              </div>
              {sim.imhoff && (
                <div style={{marginTop:8, padding:"6px 10px", borderRadius:6,
                  background:parseFloat(sim.imhoff)>400?t.redDim:parseFloat(sim.imhoff)>250?t.orangeDim:t.greenDim,
                  border:`1px solid ${parseFloat(sim.imhoff)>400?t.red:parseFloat(sim.imhoff)>250?t.orange:t.green}44`,
                  fontFamily:"'Share Tech Mono',monospace", fontSize:11,
                  color:parseFloat(sim.imhoff)>400?t.red:parseFloat(sim.imhoff)>250?t.orange:t.green}}>
                  IVF: {sim.imhoff} mL/L {parseFloat(sim.imhoff)>400?"ELEVATO":parseFloat(sim.imhoff)>250?"MEDIO":"OTTIMALE"}
                  <div style={{fontSize:12, color:t.textMuted, marginTop:2}}>
                    {parseFloat(sim.imhoff)>400?"Ridurre ricircolo fanghi":parseFloat(sim.imhoff)>250?"Monitorare SVI":"Condizioni fanghi buone"}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {tab==="ingresso" && (
          <div>
            <div style={{padding:"8px 12px", background:t.orangeDim, border:`1px solid ${t.orange}44`, borderRadius:8, marginBottom:16, fontSize:12, color:t.orange, fontFamily:"'Rajdhani',sans-serif"}}>
              ⚡ Modalità demo: modifica le condizioni dell'acqua in ingresso per testare la risposta dell'impianto
            </div>
            <SimSlider label="Portata" value={sim.inlet.Q} min={300} max={2500} unit=" m³/h" color={t.accent} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, Q:v}}))}/>
            <SimSlider label="COD Ingresso" value={sim.inlet.COD} min={50} max={1200} unit=" mg/L" color={t.accent} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, COD:v}}))}/>
            <SimSlider label="BOD₅ Ingresso" value={sim.inlet.BOD5} min={30} max={600} unit=" mg/L" color={t.green} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, BOD5:v}}))}/>
            <SimSlider label="SST Ingresso" value={sim.inlet.TSS} min={30} max={800} unit=" mg/L" color={t.orange} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, TSS:v}}))}/>
            <SimSlider label="NH₄ Ingresso" value={sim.inlet.NH4} min={2} max={120} unit=" mg/L" color={t.purple} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, NH4:v}}))}/>
            <SimSlider label="pH Ingresso" value={sim.inlet.pH} min={4.0} max={11.0} step={0.1} unit="" color={t.textSec} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, pH:v}}))}/>
            <SimSlider label="Temperatura" value={sim.inlet.T} min={5} max={40} unit="°C" color={t.yellow} t={t} onChange={v => onSim(p => ({...p, inlet:{...p.inlet, T:v}}))}/>
            <button onClick={() => onSim(p => ({...p, inlet:INIT_SIM.inlet}))}
              style={{width:"100%", marginTop:8, padding:"8px", background:t.surface2, border:`1px solid ${t.border}`, color:t.textSec, borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:"pointer"}}>
              ↺ Ripristina valori default
            </button>
          </div>
        )}

        {tab==="simulazione" && (
          <div>
            <div style={{marginBottom:20}}>
              <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:12}}>MODALITÀ RISPOSTA IMPIANTO</div>
              {[
                {id:"fast",      label:"Risposta Rapida",     desc:"Ideale per demo — i parametri rispondono quasi istantaneamente ai controlli", icon:"⚡"},
                {id:"realistic", label:"Risposta Realistica", desc:"Costanti di tempo fisiche — O₂: τ=5min, COD: τ=30min, pH: τ=2min",           icon:"🔬"},
              ].map(m => (
                <div key={m.id} onClick={() => onSim(p => ({...p, mode:m.id}))}
                  style={{padding:"12px 14px", background:sim.mode===m.id?t.accentDim:t.surface2, border:`1px solid ${sim.mode===m.id?t.accent:t.border}`, borderRadius:9, marginBottom:8, cursor:"pointer"}}>
                  <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:4}}>
                    <span style={{fontSize:12}}>{m.icon}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, color:sim.mode===m.id?t.accent:t.text}}>{m.label}</span>
                    {sim.mode===m.id && <Tag color={t.accent}>ATTIVO</Tag>}
                  </div>
                  <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>{m.desc}</div>
                </div>
              ))}
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, marginBottom:12}}>VELOCITÀ SIMULAZIONE</div>
              {[
                {sp:1,  label:"1x — Tempo reale",   desc:"1 secondo simulato per secondo reale"},
                {sp:5,  label:"5x — Accelerata",     desc:"5 minuti simulati per secondo reale"},
                {sp:10, label:"10x — Alta velocità", desc:"10 minuti simulati per secondo reale"},
              ].map(m => (
                <div key={m.sp} onClick={() => onSim(p => ({...p, speed:m.sp}))}
                  style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"10px 12px", background:sim.speed===m.sp?t.accentDim:t.surface2, border:`1px solid ${sim.speed===m.sp?t.accent:t.border}`, borderRadius:8, marginBottom:6, cursor:"pointer"}}>
                  <div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:sim.speed===m.sp?t.accent:t.text}}>{m.label}</div>
                    <div style={{fontSize:14, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{m.desc}</div>
                  </div>
                  {sim.speed===m.sp && <Tag color={t.accent}>✓</Tag>}
                </div>
              ))}
            </div>

            <div style={{padding:"12px 14px", background:t.surface2, borderRadius:9, border:`1px solid ${t.border}`}}>
              <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", marginBottom:8}}>STATO MOTORE</div>
              {[
                {l:"Tick simulazione", v:sim.tick},
                {l:"O₂ disciolto",     v:`${sim.O2.toFixed(2)} mg/L`},
                {l:"MLSS",            v:`${Math.round(sim.MLSS)} mg/L`},
                {l:"Consumo attuale", v:`${sim.energy.kw} kW`},
                {l:"kWh totali",      v:`${sim.energy.kwh} kWh`},
              ].map(x => (
                <div key={x.l} style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
                  <span style={{fontSize:13, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>{x.l}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.accent}}>{x.v}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
