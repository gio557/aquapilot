import { useState, useEffect, useRef } from "react";
import { DARK, LIGHT } from "./constants/theme";
import { STAGE_META, TIME_RANGES } from "./constants/stages";
import { useSimulation } from "./hooks/useSimulation";
import StageCard from "./components/StageCard";
import StageDetailPopup from "./components/StageDetailPopup";
import ControlRoom from "./components/ControlRoom";
import Configurator from "./components/Configurator";
import NormativaPage from "./components/NormativaPage";
import AIPanel from "./components/AIPanel";
import KpiNum from "./components/ui/KpiNum";
import AlarmRow from "./components/ui/AlarmRow";
import QualRow from "./components/ui/QualRow";
import CustomTooltip from "./components/ui/CustomTooltip";
import Tag from "./components/ui/Tag";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const TREND_KEYS = [
  { key:"COD",  label:"COD",  unit:"mg/L", color:"#00CFFF" },
  { key:"BOD5", label:"BOD5", unit:"mg/L", color:"#00E599" },
  { key:"TSS",  label:"TSS",  unit:"mg/L", color:"#FF9422" },
  { key:"NH4",  label:"NH4",  unit:"mg/L", color:"#BB66FF" },
  { key:"pH",   label:"pH",   unit:"",     color:"#FFD060" },
  { key:"O2",   label:"O2",   unit:"mg/L", color:"#FF3B5C" },
];

export default function App() {
  const [darkMode, setDarkMode] = useState(true);
  const t = darkMode ? DARK : LIGHT;

  const { sim, setSim } = useSimulation();

  const [page, setPage] = useState("dashboard");
  const [showControlRoom, setShowControlRoom] = useState(false);
  const [showConfigurator, setShowConfigurator] = useState(false);
  const [showAlarms, setShowAlarms] = useState(false);
  const [selectedStage, setSelectedStage] = useState(null);
  const [timeRange, setTimeRange] = useState("1h");
  const [activeTrends, setActiveTrends] = useState(["COD","O2"]);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeAlarms = Object.entries(sim.alarmState || {}).filter(([,v]) => v !== "OK");
  const critAlarms   = activeAlarms.filter(([,v]) => v === "ALTO");

  const trendData = (() => {
    const pts = { "15m":15, "1h":60, "6h":72, "24h":96 }[timeRange] || 60;
    return (sim.trend || []).slice(-pts);
  })();

  const stages = sim.stages || STAGE_META;

  const handleAddStage = (type) => {
    setSim(prev => ({
      ...prev,
      stages: [...(prev.stages || STAGE_META), { id: Date.now(), name: type, sub: "Stadio personalizzato", status:"ok" }]
    }));
  };

  const handleRemoveStage = (id) => {
    setSim(prev => ({
      ...prev,
      stages: (prev.stages || STAGE_META).filter(s => s.id !== id)
    }));
  };

  const autoOn = sim.autoCorrect?.enabled ?? false;

  const selectedStageData = selectedStage != null ? {
    stage:       stages[selectedStage],
    index:       selectedStage,
    stageOutput: sim.stageOutputs?.[selectedStage] ?? null,
    stageDetail: sim.stageDetails?.[selectedStage] ?? null,
    action:      sim.stageActions?.[selectedStage] ?? null,
  } : null;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Rajdhani:wght@400;500;600;700&family=Share+Tech+Mono&family=Orbitron:wght@700;900&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { height:100%; }
        body { background:${t.bg}; color:${t.text}; font-family:'Rajdhani',sans-serif; transition:background 0.3s,color 0.3s; }
        ::-webkit-scrollbar { width:5px; height:5px; }
        ::-webkit-scrollbar-track { background:transparent; }
        ::-webkit-scrollbar-thumb { background:${t.border}; border-radius:3px; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:0.2} }
        @keyframes pulse { 0%,100%{box-shadow:0 0 0 0 rgba(255,59,92,0.4)} 50%{box-shadow:0 0 0 8px rgba(255,59,92,0)} }
        select { appearance:none; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:t.surface, borderBottom:`1px solid ${t.border}`,
        padding:"0 20px", height:54,
        display:"flex", alignItems:"center", justifyContent:"space-between",
        gap:12,
      }}>
        <div style={{display:"flex", alignItems:"center", gap:16}}>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:18, color:t.accent, letterSpacing:3, whiteSpace:"nowrap"}}>
            AQUA<span style={{color:t.textSec}}>PILOT</span>
          </div>
          <div style={{width:1, height:28, background:t.border}}/>
          <div style={{display:"flex", gap:4}}>
            {[
              {id:"dashboard", label:"DASHBOARD"},
              {id:"normativa", label:"NORMATIVA"},
            ].map(p => (
              <button key={p.id} onClick={() => setPage(p.id)}
                style={{padding:"4px 12px", borderRadius:6, cursor:"pointer",
                  fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, letterSpacing:1,
                  border:`1px solid ${page===p.id?t.accent:t.border}`,
                  background:page===p.id?`${t.accent}18`:t.surface2,
                  color:page===p.id?t.accent:t.textSec}}>
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textSec, letterSpacing:1}}>
            {clock.toLocaleTimeString("it-IT")}
          </div>

          <div style={{display:"flex", alignItems:"center", gap:6, padding:"3px 10px", borderRadius:6,
            background:sim.running?`${t.green}15`:`${t.orange}15`,
            border:`1px solid ${sim.running?t.green:t.orange}44`}}>
            <span style={{width:7, height:7, borderRadius:"50%", background:sim.running?t.green:t.orange,
              animation:sim.running?"blink 1.4s infinite":"none"}}/>
            <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:sim.running?t.green:t.orange, letterSpacing:1}}>
              {sim.running?"SIM ATTIVA":"SIM PAUSA"}
            </span>
          </div>

          <button onClick={() => setShowAlarms(p => !p)}
            style={{position:"relative", padding:"4px 10px", borderRadius:6, cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
              border:`1px solid ${activeAlarms.length>0?t.red:t.border}`,
              background:activeAlarms.length>0?`${t.red}15`:t.surface2,
              color:activeAlarms.length>0?t.red:t.textSec,
              animation:critAlarms.length>0?"pulse 1.8s infinite":"none"}}>
            🔔 {activeAlarms.length}
          </button>

          <button onClick={() => setShowControlRoom(p => !p)}
            style={{padding:"4px 12px", borderRadius:6, cursor:"pointer",
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, letterSpacing:1,
              border:`1px solid ${t.accent}`, background:`${t.accent}18`, color:t.accent}}>
            🎛️ CONTROL ROOM
          </button>

          <button onClick={() => setDarkMode(p => !p)}
            style={{padding:"4px 10px", borderRadius:6, cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:13,
              border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec}}>
            {darkMode ? "☀" : "🌙"}
          </button>
        </div>
      </header>

      {/* ── ALARM BANNER ── */}
      {critAlarms.length > 0 && (
        <div style={{background:`${t.red}18`, borderBottom:`2px solid ${t.red}44`, padding:"6px 20px",
          display:"flex", alignItems:"center", gap:10, fontSize:12, color:t.red,
          fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
          <span style={{animation:"blink 0.6s infinite"}}>⚠</span>
          ALLARME CRITICO: {critAlarms.map(([p]) => p).join(" · ")}
        </div>
      )}

      {/* ── PAGES ── */}
      {page === "normativa" ? (
        <NormativaPage t={t} ac={sim.autoCorrect || {enabled:false}} onAC={setSim}/>
      ) : (
        <main style={{padding:"16px 20px", display:"flex", flexDirection:"column", gap:14}}>

          {/* ── STAGES ROW ── */}
          <div style={{display:"flex", gap:10, overflowX:"auto", paddingBottom:2}}>
            {stages.map((s, i) => (
              <StageCard
                key={s.id}
                stage={s}
                index={i}
                stageOutput={sim.stageOutputs?.[i]}
                action={sim.stageActions?.[i]}
                autoEnabled={autoOn}
                t={t}
                onClick={() => setSelectedStage(i)}
              />
            ))}
            <button onClick={() => setShowConfigurator(true)}
              style={{flexShrink:0, width:48, borderRadius:12, cursor:"pointer",
                border:`2px dashed ${t.border}`, background:"transparent",
                color:t.textMuted, fontSize:20, display:"flex", alignItems:"center", justifyContent:"center"}}>
              +
            </button>
          </div>

          {/* ── MIDDLE ROW ── */}
          <div style={{display:"grid", gridTemplateColumns:"220px 1fr 320px", gap:14, minHeight:280}}>

            {/* KPI sidebar */}
            <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:14, display:"flex", flexDirection:"column", gap:10}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2, textTransform:"uppercase", color:t.textSec, marginBottom:2}}>
                USCITA IMPIANTO
              </div>
              {[
                {label:"COD",  val:sim.output?.COD?.toFixed(1),  unit:"mg/L", color: sim.output?.COD > 125 ? t.red : sim.output?.COD > 100 ? t.orange : t.green},
                {label:"BOD5", val:sim.output?.BOD5?.toFixed(1), unit:"mg/L", color: sim.output?.BOD5 > 25  ? t.red : sim.output?.BOD5 > 20  ? t.orange : t.green},
                {label:"TSS",  val:sim.output?.TSS?.toFixed(1),  unit:"mg/L", color: sim.output?.TSS > 35   ? t.red : sim.output?.TSS > 28   ? t.orange : t.green},
                {label:"NH4",  val:sim.output?.NH4?.toFixed(2),  unit:"mg/L", color: sim.output?.NH4 > 8    ? t.red : sim.output?.NH4 > 6    ? t.orange : t.green},
                {label:"pH",   val:sim.output?.pH?.toFixed(2),   unit:"",     color: sim.output?.pH < 6.5 || sim.output?.pH > 8.5 ? t.red : t.green},
                {label:"O2",   val:sim.O2?.toFixed(2),           unit:"mg/L", color: sim.O2 < 1.5 ? t.red : sim.O2 < 2 ? t.orange : t.green},
              ].map(k => (
                <KpiNum key={k.label} label={k.label} val={k.val} unit={k.unit} color={k.color} t={t} live/>
              ))}
            </div>

            {/* Trend chart */}
            <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:14, display:"flex", flexDirection:"column"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2, textTransform:"uppercase", color:t.textSec}}>
                  TREND PARAMETRI
                </div>
                <div style={{display:"flex", gap:6, flexWrap:"wrap"}}>
                  {TIME_RANGES.map(r => (
                    <button key={r} onClick={() => setTimeRange(r)}
                      style={{padding:"2px 8px", borderRadius:4, cursor:"pointer",
                        fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:1,
                        border:`1px solid ${timeRange===r?t.accent:t.border}`,
                        background:timeRange===r?`${t.accent}18`:t.surface2,
                        color:timeRange===r?t.accent:t.textSec}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex", gap:6, flexWrap:"wrap", marginBottom:8}}>
                {TREND_KEYS.map(tk => (
                  <button key={tk.key} onClick={() => setActiveTrends(prev =>
                    prev.includes(tk.key) ? prev.filter(k=>k!==tk.key) : [...prev, tk.key]
                  )}
                    style={{padding:"2px 8px", borderRadius:4, cursor:"pointer",
                      fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:1,
                      border:`1px solid ${activeTrends.includes(tk.key)?tk.color:t.border}`,
                      background:activeTrends.includes(tk.key)?`${tk.color}18`:t.surface2,
                      color:activeTrends.includes(tk.key)?tk.color:t.textSec}}>
                    {tk.label}
                  </button>
                ))}
              </div>
              <div style={{flex:1, minHeight:180}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{top:4, right:4, bottom:0, left:-20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                    <XAxis dataKey="t" tick={{fill:t.textMuted, fontSize:9, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:t.textMuted, fontSize:9, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip t={t}/>}/>
                    {TREND_KEYS.filter(tk => activeTrends.includes(tk.key)).map(tk => (
                      <Line key={tk.key} type="monotone" dataKey={tk.key} stroke={tk.color}
                        strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quality + AI panel */}
            <div style={{display:"flex", flexDirection:"column", gap:10}}>
              <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:14}}>
                <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2, textTransform:"uppercase", color:t.textSec, marginBottom:8}}>
                  QUALITÀ USCITA
                </div>
                {[
                  {label:"COD",  value:sim.output?.COD,  unit:"mg/L", lim:125, hi:false},
                  {label:"BOD5", value:sim.output?.BOD5, unit:"mg/L", lim:25,  hi:false},
                  {label:"TSS",  value:sim.output?.TSS,  unit:"mg/L", lim:35,  hi:false},
                  {label:"NH4",  value:sim.output?.NH4,  unit:"mg/L", lim:8,   hi:false},
                ].map(q => <QualRow key={q.label} {...q} t={t}/>)}
              </div>
              <AIPanel sim={sim} autoOn={autoOn} t={t}/>
            </div>
          </div>

          {/* ── ENERGY ROW ── */}
          <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(160px,1fr))", gap:10}}>
            {[
              {label:"Consumo Attuale", value:`${sim.energy?.kw ?? 0} kW`,  color:t.accent},
              {label:"Energia Totale",  value:`${sim.energy?.kwh ?? 0} kWh`, color:t.green},
              {label:"Soffianti",       value:`${sim.blower ?? 0}%`,          color:t.orange},
              {label:"Coagulante",      value:`${sim.coagulant ?? 0}%`,       color:t.purple},
              {label:"Ricircolo Fanghi",value:`${sim.sludgeRecycle ?? 0}%`,   color:t.yellow},
              {label:"MLSS",            value:`${Math.round(sim.MLSS ?? 0)} mg/L`, color:t.accent},
            ].map(e => (
              <div key={e.label} style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:10, padding:"10px 14px"}}>
                <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginBottom:3}}>{e.label}</div>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:16, fontWeight:700, color:e.color}}>{e.value}</div>
              </div>
            ))}
          </div>

        </main>
      )}

      {/* ── OVERLAYS ── */}

      {showControlRoom && (
        <ControlRoom sim={sim} onSim={setSim} t={t} onClose={() => setShowControlRoom(false)}/>
      )}

      {showConfigurator && (
        <Configurator
          stages={stages}
          onAdd={handleAddStage}
          onRemove={handleRemoveStage}
          onClose={() => setShowConfigurator(false)}
          t={t}
        />
      )}

      {selectedStageData && (
        <StageDetailPopup
          {...selectedStageData}
          autoEnabled={autoOn}
          t={t}
          onClose={() => setSelectedStage(null)}
        />
      )}

      {showAlarms && (
        <div onClick={() => setShowAlarms(false)}
          style={{position:"fixed", inset:0, zIndex:200, background:"rgba(0,0,0,0.5)", backdropFilter:"blur(4px)",
            display:"flex", alignItems:"flex-start", justifyContent:"flex-end", paddingTop:60, paddingRight:20}}>
          <div onClick={e => e.stopPropagation()}
            style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:12, padding:20,
              width:360, maxWidth:"95vw", maxHeight:"70vh", overflowY:"auto",
              boxShadow:"0 12px 60px rgba(0,0,0,0.3)"}}>
            <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14}}>
              <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:14, color:t.accent, letterSpacing:2}}>🔔 ALLARMI</div>
              <button onClick={() => setShowAlarms(false)}
                style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text,
                  width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12}}>✕</button>
            </div>
            {activeAlarms.length === 0 ? (
              <div style={{padding:"20px 0", textAlign:"center", color:t.green, fontFamily:"'Rajdhani',sans-serif", fontSize:14}}>
                ✓ Nessun allarme attivo
              </div>
            ) : (
              activeAlarms.map(([param, sev]) => (
                <AlarmRow key={param} param={param} sev={sev} t={t}/>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
