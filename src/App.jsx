import { useState, useEffect, useRef } from "react";
import { DARK, LIGHT } from "./constants/theme";
import { STAGE_META, TIME_RANGES } from "./constants/stages";
import { DEFAULT_STAGE_CONFIG } from "./constants/stageConfig";
import { useSimulation } from "./hooks/useSimulation";
import GreenEcoLogo from "./components/GreenEcoLogo";
import StageCard from "./components/StageCard";
import StageDetailPopup from "./components/StageDetailPopup";
import ControlRoom from "./components/ControlRoom";
import Configurator from "./components/Configurator";
import NormativaPage from "./components/NormativaPage";
import ConfigurazionePage from "./components/ConfigurazionePage";
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
  const [darkMode, setDarkMode] = useState(false);
  const t = darkMode ? DARK : LIGHT;

  const { sim, setSim } = useSimulation();

  // Smoothed display values — EMA with alpha=0.10 so numbers drift gradually
  const ALPHA = 0.10;
  const smoothRef = useRef(null);
  const [display, setDisplay] = useState(null);

  useEffect(() => {
    if (!sim.output) return;
    setDisplay(prev => {
      const base = prev || { ...sim.output, O2: sim.O2, MLSS: sim.MLSS, blower: sim.blower, kw: sim.energy?.kw ?? 0 };
      const lerp = (a, b) => a + ALPHA * (b - a);
      return {
        COD:    lerp(base.COD,    sim.output.COD),
        BOD5:   lerp(base.BOD5,   sim.output.BOD5),
        TSS:    lerp(base.TSS,    sim.output.TSS),
        NH4:    lerp(base.NH4,    sim.output.NH4),
        pH:     lerp(base.pH,     sim.output.pH),
        T:      lerp(base.T,      sim.output.T),
        Q:      lerp(base.Q,      sim.output.Q),
        O2:     lerp(base.O2,     sim.O2),
        MLSS:   lerp(base.MLSS,   sim.MLSS),
        blower: lerp(base.blower, sim.blower),
        kw:     lerp(base.kw,     sim.energy?.kw ?? 0),
      };
    });
  }, [sim.output, sim.O2, sim.MLSS, sim.blower, sim.energy?.kw]);

  const d = display || { ...sim.output, O2: sim.O2, MLSS: sim.MLSS, blower: sim.blower, kw: sim.energy?.kw ?? 0 };

  const [stageConfig, setStageConfig] = useState(() => JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG)));

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
  const card = { background:t.surface, border:`2px solid ${t.border}`, borderRadius:12, boxShadow:t.cardShadow };

  const classifierCfgJson = JSON.stringify(stageConfig[1]?.classifier);
  useEffect(() => {
    const cfg = stageConfig[1]?.classifier;
    if (cfg) setSim(prev => ({ ...prev, classifierConfig: cfg }));
  }, [classifierCfgJson]);

  const grCfgJson = JSON.stringify(stageConfig[0]?.grigliatura);
  useEffect(() => {
    const cfg = stageConfig[0]?.grigliatura;
    if (cfg) setSim(prev => ({ ...prev, grigliaturaConfig: { ...prev.grigliaturaConfig, ...cfg } }));
  }, [grCfgJson]);

  const handleGrigliaturaReset = () => {
    setSim(prev => ({
      ...prev,
      grigliaturaState: {
        ...prev.grigliaturaState,
        fase: "STANDBY", sovraccarico: false, ostacolo_presente: false,
        timer_fase: 0, corrente_motore: 0,
        finecorsa_ritorno: true, finecorsa_partenza: false,
        allarmi: (prev.grigliaturaState?.allarmi || []).filter(a => a !== "ALM-02"),
      }
    }));
  };

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
        padding:"0 24px", height:76,
        display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center", gap:16,
      }}>
        {/* LEFT: nav buttons */}
        <div style={{display:"flex", gap:6}}>
          {[
            {id:"dashboard",      label:"DASHBOARD"},
            {id:"configurazione", label:"CONFIGURAZIONE"},
            {id:"normativa",      label:"NORMATIVA"},
          ].map(p => (
            <button key={p.id} onClick={() => setPage(p.id)}
              style={{padding:"7px 16px", borderRadius:7, cursor:"pointer",
                fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, letterSpacing:1,
                border:`1px solid ${page===p.id?t.accent:t.border}`,
                background:page===p.id?`${t.accent}18`:t.surface2,
                color:page===p.id?t.accent:t.textSec,
                transition:"all 0.15s"}}>
              {p.label}
            </button>
          ))}
        </div>

        {/* CENTER: AQUAPILOT + GreenEco logo */}
        <div style={{display:"flex", alignItems:"center", gap:14, justifyContent:"center"}}>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:900, fontSize:34, color:t.accent, letterSpacing:4, whiteSpace:"nowrap", lineHeight:1}}>
            AQUA<span style={{color:t.textSec}}>PILOT</span>
          </div>
          <div style={{display:"flex", alignItems:"center", gap:6}}>
            <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, letterSpacing:1}}>by</span>
            <GreenEcoLogo height={42} />
          </div>
        </div>

        {/* RIGHT: clock, status, controls */}
        <div style={{display:"flex", alignItems:"center", gap:12, justifyContent:"flex-end"}}>
          <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:t.textSec, letterSpacing:2}}>
            {clock.toLocaleTimeString("it-IT")}
          </div>

          <div style={{display:"flex", alignItems:"center", gap:7, padding:"5px 13px", borderRadius:7,
            background:sim.running?`${t.green}15`:`${t.orange}15`,
            border:`1px solid ${sim.running?t.green:t.orange}44`}}>
            <span style={{width:8, height:8, borderRadius:"50%", background:sim.running?t.green:t.orange,
              animation:sim.running?"blink 1.4s infinite":"none", flexShrink:0}}/>
            <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:sim.running?t.green:t.orange, letterSpacing:1}}>
              {sim.running?"SIM ATTIVA":"SIM PAUSA"}
            </span>
          </div>

          <button onClick={() => setShowAlarms(p => !p)}
            style={{position:"relative", padding:"6px 13px", borderRadius:7, cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:13, letterSpacing:1,
              border:`1px solid ${activeAlarms.length>0?t.red:t.border}`,
              background:activeAlarms.length>0?`${t.red}15`:t.surface2,
              color:activeAlarms.length>0?t.red:t.textSec,
              animation:critAlarms.length>0?"pulse 1.8s infinite":"none"}}>
            🔔 {activeAlarms.length}
          </button>

          <button onClick={() => setShowControlRoom(p => !p)}
            style={{padding:"6px 16px", borderRadius:7, cursor:"pointer",
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, letterSpacing:1,
              border:`1px solid ${t.accent}`, background:`${t.accent}18`, color:t.accent}}>
            🎛️ CONTROL ROOM
          </button>

          <button onClick={() => setDarkMode(p => !p)}
            style={{padding:"6px 12px", borderRadius:7, cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:16,
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
      ) : page === "configurazione" ? (
        <ConfigurazionePage t={t} config={stageConfig} onChange={setStageConfig}/>
      ) : (
        <main style={{padding:"12px 16px", display:"flex", flexDirection:"column", gap:12}}>

          {/* ── STAGES ROW ── */}
          <div style={{display:"flex", gap:8}}>
            {stages.map((s, i) => (
              <StageCard key={s.id} stage={s} index={i}
                stageOutput={sim.stageOutputs?.[i]} action={sim.stageActions?.[i]}
                eff={sim.stageEff?.[i]}
                autoEnabled={autoOn} t={t} onClick={() => setSelectedStage(i)}
                classifierState={i === 1 ? sim.sandClassifier : null}
                grigliaturaState={i === 0 ? sim.grigliaturaState : null}
                onGrigliaturaReset={i === 0 ? handleGrigliaturaReset : undefined}/>
            ))}
          </div>

          {/* ── MAIN ROW: left sidebar | trend | right panel ── */}
          <div style={{display:"grid", gridTemplateColumns:"195px 1fr 320px", gap:12, minHeight:300}}>

            {/* ── LEFT SIDEBAR ── */}
            <div style={{display:"flex", flexDirection:"column", gap:8}}>

              {/* PORTATA */}
              <div style={{...card, padding:"14px 16px"}}>
                <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:8}}>
                  ▸ PORTATA <span style={{width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block",marginLeft:4,boxShadow:`0 0 5px ${t.green}`,animation:"blink 1.5s infinite"}}/>
                </div>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:34, fontWeight:700, color:t.accent, lineHeight:1}}>
                  {Math.round(d.Q ?? sim.inlet?.Q ?? 0)}
                </div>
                <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginBottom:10}}>m³/h · Portata attuale</div>
                <div style={{borderTop:`1px solid ${t.border}`, paddingTop:8}}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:17, color:t.textSec}}>
                    {sim.qHistory?.length > 0
                      ? (sim.qHistory.reduce((a,b)=>a+b,0)/sim.qHistory.length).toFixed(3)
                      : "—"}
                  </div>
                  <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>m³/g · Medio mobile ({sim.qHistory?.length ?? 0} camp.)</div>
                </div>
              </div>

              {/* FANGHI */}
              <div style={{...card, padding:"14px 16px"}}>
                <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:8}}>
                  ▸ FANGHI <span style={{width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block",marginLeft:4,boxShadow:`0 0 5px ${t.green}`,animation:"blink 1.5s infinite"}}/>
                </div>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:34, fontWeight:700, color:t.purple, lineHeight:1}}>
                  {Math.round(d.MLSS ?? 0)}
                </div>
                <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginBottom:10}}>mg/L · MLSS biologico</div>
                <div style={{borderTop:`1px solid ${t.border}`, paddingTop:8}}>
                  <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:17,
                    color: d.blower > 80 ? t.red : d.blower > 60 ? t.orange : t.green}}>
                    {d.blower?.toFixed(0) ?? 0}%
                  </div>
                  <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>potenza · Soffianti</div>
                  <div style={{height:4, background:t.surface3, borderRadius:2, marginTop:6, overflow:"hidden"}}>
                    <div style={{height:"100%", width:`${d.blower??0}%`,
                      background: d.blower > 80 ? t.red : d.blower > 60 ? t.orange : t.green,
                      borderRadius:2, transition:"width 0.5s"}}/>
                  </div>
                </div>
              </div>

              {/* CONN. */}
              <div style={{...card, padding:"14px 16px", flex:1}}>
                <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:12}}>▸ CONN.</div>
                {[
                  {label:"Internet",   on:true},
                  {label:"PLC/SCADA",  on:true},
                  {label:"AI Engine",  on:true},
                  {label:"Simulatore", on:sim.running},
                ].map(c => (
                  <div key={c.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10}}>
                    <span style={{fontSize:15, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{c.label}</span>
                    <span style={{fontSize:13, padding:"3px 9px", borderRadius:4,
                      background:c.on?`${t.green}18`:`${t.red}18`,
                      color:c.on?t.green:t.red,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                      border:`1px solid ${c.on?t.green:t.red}33`}}>
                      <span style={{marginRight:3, fontSize:10}}>●</span>{c.on?"ON":"OFF"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── TREND LIVE ── */}
            <div style={{...card, padding:14, display:"flex", flexDirection:"column"}}>
              <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8, flexWrap:"wrap", gap:6}}>
                <div style={{display:"flex", alignItems:"center", gap:8}}>
                  <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ TREND LIVE</span>
                  <span style={{fontSize:11, padding:"2px 8px", borderRadius:3, background:`${t.green}18`, color:t.green, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, border:`1px solid ${t.green}44`}}>
                    <span style={{animation:"blink 1.2s infinite", marginRight:3}}>●</span>LIVE
                  </span>
                </div>
                <div style={{display:"flex", gap:4}}>
                  {TIME_RANGES.map(r => (
                    <button key={r} onClick={() => setTimeRange(r)}
                      style={{padding:"2px 7px", borderRadius:4, cursor:"pointer",
                        fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
                        border:`1px solid ${timeRange===r?t.accent:t.border}`,
                        background:timeRange===r?`${t.accent}18`:t.surface2,
                        color:timeRange===r?t.accent:t.textSec}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:8}}>
                {TREND_KEYS.map(tk => (
                  <button key={tk.key} onClick={() => setActiveTrends(prev =>
                    prev.includes(tk.key) ? prev.filter(k=>k!==tk.key) : [...prev, tk.key]
                  )}
                    style={{padding:"3px 9px", borderRadius:4, cursor:"pointer",
                      fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
                      border:`1px solid ${activeTrends.includes(tk.key)?tk.color:t.border}`,
                      background:activeTrends.includes(tk.key)?`${tk.color}18`:t.surface2,
                      color:activeTrends.includes(tk.key)?tk.color:t.textSec}}>
                    {tk.label}
                  </button>
                ))}
              </div>
              <div style={{flex:1, minHeight:200}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{top:4, right:4, bottom:0, left:-20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                    <XAxis dataKey="t" tick={{fill:t.textMuted, fontSize:11, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false}/>
                    <YAxis tick={{fill:t.textMuted, fontSize:11, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip t={t}/>}/>
                    {TREND_KEYS.filter(tk => activeTrends.includes(tk.key)).map(tk => (
                      <Line key={tk.key} type="monotone" dataKey={tk.key} stroke={tk.color}
                        strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ── RIGHT COLUMN: QUALITÀ + AI ── */}
            <div style={{display:"flex", flexDirection:"column", gap:8}}>

              {/* QUALITÀ USCITA */}
              <div style={{...card, padding:"14px 16px"}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                  <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ QUALITÀ USCITA</span>
                  <span style={{fontSize:11, padding:"2px 8px", borderRadius:3, background:`${t.green}18`, color:t.green, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, border:`1px solid ${t.green}44`}}>LIVE</span>
                </div>
                {[
                  {param:"COD",  v:d.COD,  unit:" mg/L", lim:125, warn:100},
                  {param:"BOD₅", v:d.BOD5, unit:" mg/L", lim:25,  warn:20},
                  {param:"TSS",  v:d.TSS,  unit:" mg/L", lim:35,  warn:28},
                  {param:"NH₄",  v:d.NH4,  unit:" mg/L", lim:8,   warn:6},
                  {param:"pH",   v:d.pH,   unit:"",      lim:null, warn:null, phCheck:true},
                  {param:"T°",   v:d.T,    unit:"°C",    lim:30,  warn:28},
                  {param:"O₂",   v:d.O2,   unit:" mg/L", lim:null, warn:null, o2Check:true},
                ].map(q => {
                  let ok, fuori;
                  if (q.phCheck) { ok = q.v >= 6.5 && q.v <= 8.5; fuori = q.v < 5.5 || q.v > 9.5; }
                  else if (q.o2Check) { ok = q.v >= 2; fuori = q.v < 1.5; }
                  else { ok = q.v < (q.warn ?? q.lim); fuori = q.lim != null && q.v >= q.lim; }
                  const c = fuori ? t.red : ok ? t.green : t.orange;
                  const badge = fuori ? "✗ FUORI" : ok ? "✓ OK" : "⚠ PRE";
                  return (
                    <div key={q.param} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${t.border}`}}>
                      <span style={{fontSize:16, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, color:t.text}}>{q.param}</span>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:c}}>
                          {q.v != null ? (Number.isInteger(q.v) ? q.v : q.v.toFixed(q.param==="pH"||q.param==="NH₄"||q.param==="O₂"?2:1)) : "—"}{q.unit}
                        </span>
                        <span style={{fontSize:12, padding:"2px 7px", borderRadius:3, background:`${c}18`, color:c, fontFamily:"'Share Tech Mono',monospace", border:`1px solid ${c}44`}}>
                          {badge}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* AI ADVISOR */}
              <AIPanel sim={sim} autoOn={autoOn} t={t}/>
            </div>
          </div>

          {/* ── BOTTOM ROW ── */}
          <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12}}>

            {/* CONSUMI ENERGETICI */}
            <div style={{...card, padding:"16px 18px"}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ CONSUMI ENERGETICI</span>
                <span style={{fontSize:11, padding:"2px 8px", borderRadius:3, background:`${t.green}18`, color:t.green, fontFamily:"'Share Tech Mono',monospace", border:`1px solid ${t.green}44`}}>LIVE</span>
              </div>
              {(sim.stageEnergy || []).map((kw, i) => {
                const total = (sim.stageEnergy||[]).reduce((a,b)=>a+b,0)||1;
                const pct = Math.round(kw/total*100);
                const stageName = stages[i]?.name ?? `ST-0${i+1}`;
                const barC = i===2 ? t.accent : i===3 ? t.orange : t.green;
                return (
                  <div key={i} style={{marginBottom:11}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                      <span style={{fontSize:14, color: i===2?t.accent:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:i===2?700:500}}>
                        ST-0{i+1} {stageName}
                      </span>
                      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:barC}}>{kw} kW ({pct}%)</span>
                    </div>
                    <div style={{height:5, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
                      <div style={{height:"100%", width:`${pct}%`, background:barC, borderRadius:3, transition:"width 0.5s"}}/>
                    </div>
                  </div>
                );
              })}
              <div style={{borderTop:`1px solid ${t.border}`, paddingTop:10, marginTop:6, display:"flex", gap:20}}>
                {[
                  {label:"kW", val:d.kw?.toFixed(1)??0, sub:"Totale impianto"},
                  {label:"kWh", val:`${sim.energy?.kwh??0}`, sub:"Sessione"},
                  {label:"Wh/m³", val: d.Q>0 ? (d.kw*1000/(d.Q||1)).toFixed(2) : "—", sub:"Specifico"},
                ].map(x => (
                  <div key={x.label}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:22, fontWeight:700, color:t.accent, lineHeight:1}}>{x.val}</div>
                    <div style={{fontSize:13, color:t.accent, fontFamily:"'Share Tech Mono',monospace", marginTop:3}}>{x.label}</div>
                    <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif"}}>{x.sub}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* STORICO ALLARMI */}
            <div style={{...card, padding:"16px 18px", display:"flex", flexDirection:"column"}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ STORICO ALLARMI</span>
                <span style={{fontSize:11, padding:"2px 8px", borderRadius:3,
                  background: activeAlarms.length===0 ? `${t.green}18` : `${t.red}18`,
                  color: activeAlarms.length===0 ? t.green : t.red,
                  fontFamily:"'Share Tech Mono',monospace", border:`1px solid ${activeAlarms.length===0?t.green:t.red}44`}}>
                  {activeAlarms.length===0 ? "NESSUN ATTIVO" : `${activeAlarms.length} ATTIVI`}
                </span>
              </div>
              <div style={{flex:1, overflowY:"auto", maxHeight:180}}>
                {(sim.alarms||[]).length === 0 ? (
                  <div style={{textAlign:"center", padding:"28px 0", color:t.green, fontFamily:"'Rajdhani',sans-serif", fontSize:15}}>
                    ✓ Nessun allarme registrato
                  </div>
                ) : (
                  (sim.alarms||[]).slice(0,8).map(a => (
                    <div key={a.id} style={{display:"flex", gap:8, alignItems:"flex-start", padding:"9px 0", borderBottom:`1px solid ${t.border}`}}>
                      <span style={{fontSize:14, color: a.sev==="ALTO"?t.red:t.orange, flexShrink:0, marginTop:1}}>
                        {a.sev==="ALTO"?"🔴":"🟡"}
                      </span>
                      <div style={{flex:1, minWidth:0}}>
                        <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color: a.sev==="ALTO"?t.red:t.orange, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis"}}>
                          {a.msg}
                        </div>
                        <div style={{fontSize:13, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>{a.time} · {a.causa}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* IMPIANTO */}
            <div style={{...card, padding:"16px 18px"}}>
              <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:14}}>▸ IMPIANTO</div>
              {[
                {label:"Portata Ingresso", val:`${Math.round(sim.inlet?.Q??0)} m³/h`, color:t.accent},
                {label:"COD ingresso",     val:`${Math.round(sim.inlet?.COD??0)} mg/L`, color:t.textSec},
                {label:"Soffianti",        val:`${d.blower?.toFixed(0)??0}%`,  color: d.blower>80?t.red:d.blower>60?t.orange:t.green},
                {label:"Coagulante",       val:`${sim.coagulant??0}%`, color:t.orange},
                {label:"Ric. fanghi",      val:`${sim.sludgeRecycle??0}%`, color:t.purple},
              ].map(x => (
                <div key={x.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}`}}>
                  <span style={{fontSize:15, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:500}}>{x.label}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:16, fontWeight:700, color:x.color}}>{x.val}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{borderTop:`1px solid ${t.border}`, paddingTop:10, textAlign:"center",
            fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:2}}>
            AQUAPILOT v1.0.0 — PHASE 1 SIMULATION MODULE — © 2025 PURELOGIC / GREENECO WASTEWATER
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
          stageConfig={stageConfig[selectedStage] ?? null}
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
              activeAlarms.map(([param, sev]) => {
                const detail = (sim.alarms||[]).find(a => a.msg?.includes(param));
                const alarm = detail || { sev, auto: false, time: "—", msg: `${param} — soglia superata`, causa: "—" };
                return <AlarmRow key={param} alarm={alarm} t={t}/>;
              })
            )}
          </div>
        </div>
      )}
    </>
  );
}
