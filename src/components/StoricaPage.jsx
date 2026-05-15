import { useState, useEffect, useMemo, useCallback } from "react";
import { loadHistory, loadInterventions } from "../simulation/learning";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine,
} from "recharts";

// ── helpers ───────────────────────────────────────────────────
const pad2 = n => String(n).padStart(2, "0");
const dateKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const fmtTime = d => `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
const fmtDate = d => `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
const fmtDateTime = d => `${fmtDate(d)}  ${fmtTime(d)}`;

const MONTHS_IT = ["Gennaio","Febbraio","Marzo","Aprile","Maggio","Giugno",
  "Luglio","Agosto","Settembre","Ottobre","Novembre","Dicembre"];
const WDAYS = ["L","M","M","G","V","S","D"];

const PARAM_COLORS = {
  COD:"#00CFFF", BOD5:"#00E599", TSS:"#FF9422",
  NH4:"#BB66FF", pH:"#FFD060", O2:"#FF3B5C",
};
const ALL_PARAMS = ["COD","BOD5","TSS","NH4","pH","O2"];

function groupByDate(history) {
  const m = {};
  history.forEach(s => {
    const k = dateKey(new Date(s.t));
    (m[k] = m[k] || []).push(s);
  });
  return m;
}

// ── Calendar ─────────────────────────────────────────────────
function CalendarWidget({ calMonth, onNav, byDate, selectedKey, onSelect, t }) {
  const year = calMonth.getFullYear();
  const mo   = calMonth.getMonth();
  const first = new Date(year, mo, 1);
  let startDow = first.getDay() - 1; if (startDow < 0) startDow = 6;
  const days = new Date(year, mo + 1, 0).getDate();
  const todayKey = dateKey(new Date());

  const cells = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  return (
    <div>
      {/* month nav */}
      <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:14}}>
        <button onClick={() => onNav(-1)}
          style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.textSec,
            width:34, height:34, borderRadius:7, cursor:"pointer", fontSize:18}}>‹</button>
        <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:17, color:t.text, letterSpacing:1}}>
          {MONTHS_IT[mo]} {year}
        </span>
        <button onClick={() => onNav(+1)}
          style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.textSec,
            width:34, height:34, borderRadius:7, cursor:"pointer", fontSize:18}}>›</button>
      </div>

      {/* day-of-week headers */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3, marginBottom:5}}>
        {WDAYS.map((d, i) => (
          <div key={i} style={{textAlign:"center", fontSize:12, color:t.textMuted,
            fontFamily:"'Share Tech Mono',monospace", padding:"2px 0"}}>{d}</div>
        ))}
      </div>

      {/* day cells */}
      <div style={{display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3}}>
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const k = `${year}-${pad2(mo + 1)}-${pad2(d)}`;
          const has = !!byDate[k];
          const sel = k === selectedKey;
          const isToday = k === todayKey;
          return (
            <button key={i} onClick={() => has && onSelect(k)}
              title={has ? `${(byDate[k] || []).length} snapshot` : "Nessun dato"}
              style={{
                padding:"8px 2px", borderRadius:7, textAlign:"center",
                border: isToday ? `1.5px solid ${t.accent}88` : "none",
                cursor: has ? "pointer" : "default",
                background: sel ? t.accent : has ? `${t.accent}22` : "transparent",
                color: sel ? "#fff" : has ? t.accent : t.textMuted,
                fontFamily:"'Share Tech Mono',monospace", fontSize:15, fontWeight:isToday?700:400,
                position:"relative",
              }}>
              {d}
              {has && !sel && (
                <span style={{position:"absolute", bottom:3, left:"50%", transform:"translateX(-50%)",
                  width:5, height:5, borderRadius:"50%", background:t.accent, display:"block"}} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Quality badge ─────────────────────────────────────────────
function QBadge({ v, lim, warn, phCheck, o2Check, t, unit, decimals=1 }) {
  let ok, fuori;
  if (phCheck)  { ok = v >= 6.5 && v <= 8.5; fuori = v < 5.5 || v > 9.5; }
  else if (o2Check) { ok = v >= 2; fuori = v < 1.5; }
  else { ok = v < (warn ?? lim); fuori = lim != null && v >= lim; }
  const c = fuori ? t.red : ok ? t.green : t.orange;
  const label = fuori ? "✗ FUORI" : ok ? "✓ OK" : "⚠ ATT";
  return (
    <span style={{display:"flex", alignItems:"center", gap:8}}>
      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:20, color:c, fontWeight:700}}>
        {v != null ? v.toFixed(decimals) : "—"}{unit ? " " + unit : ""}
      </span>
      <span style={{fontSize:12, padding:"2px 7px", borderRadius:4, background:`${c}18`,
        color:c, border:`1px solid ${c}44`, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
        {label}
      </span>
    </span>
  );
}

// ── Actuator bar row ──────────────────────────────────────────
function ActBar({ label, value, unit="%", t, colorFn }) {
  const c = colorFn ? colorFn(value) : t.accent;
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex", justifyContent:"space-between", marginBottom:5}}>
        <span style={{fontSize:16, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{label}</span>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:18, color:c, fontWeight:700}}>
          {value != null ? value + unit : "—"}
        </span>
      </div>
      <div style={{height:8, background:t.surface3, borderRadius:4, overflow:"hidden"}}>
        <div style={{height:"100%", width:`${Math.min(100, value ?? 0)}%`,
          background:c, borderRadius:4, transition:"width 0.4s"}} />
      </div>
    </div>
  );
}

// ── Custom tooltip ────────────────────────────────────────────
function ChartTooltip({ active, payload, label, t }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{background:t.surface2, border:`1px solid ${t.border}`, borderRadius:8,
      padding:"10px 14px", fontSize:13, fontFamily:"'Share Tech Mono',monospace", boxShadow:t.cardShadow}}>
      <div style={{color:t.textSec, marginBottom:6, fontSize:12}}>{label}</div>
      {payload.map(p => (
        <div key={p.dataKey} style={{color:p.color, marginBottom:3}}>
          {p.dataKey}: {typeof p.value === "number" ? p.value.toFixed(2) : p.value}
        </div>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────
export default function StoricaPage({ t }) {
  const [history,       setHistory]       = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [calMonth,      setCalMonth]      = useState(new Date());
  const [selectedKey,   setSelectedKey]   = useState(null);
  const [selectedIdx,   setSelectedIdx]   = useState(0);
  const [activeParams,  setActiveParams]  = useState(["COD", "TSS", "O2"]);

  useEffect(() => {
    setHistory(loadHistory());
    setInterventions(loadInterventions());
  }, []);

  const byDate = useMemo(() => groupByDate(history), [history]);

  const daySnaps = useMemo(() => {
    if (!selectedKey) return [];
    return (byDate[selectedKey] || []).slice().sort((a, b) => a.t - b.t);
  }, [byDate, selectedKey]);

  const snap = daySnaps[selectedIdx] ?? null;

  // auto-select most recent day on load
  useEffect(() => {
    if (history.length > 0 && !selectedKey) {
      const last = history[history.length - 1];
      const k = dateKey(new Date(last.t));
      setSelectedKey(k);
      setCalMonth(new Date(last.t));
    }
  }, [history]);

  // reset slider when day changes
  useEffect(() => {
    setSelectedIdx(daySnaps.length > 0 ? daySnaps.length - 1 : 0);
  }, [selectedKey]);

  const nearby = useMemo(() => {
    if (!snap) return [];
    const W = 30 * 60_000;
    return interventions.filter(i => Math.abs(i.t - snap.t) <= W).sort((a, b) => a.t - b.t);
  }, [snap, interventions]);

  const navMonth = useCallback(dir => {
    setCalMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + dir, 1));
  }, []);

  const handleSelectDate = useCallback(k => {
    setSelectedKey(k);
    setCalMonth(new Date(k));
  }, []);

  // keyboard navigation
  useEffect(() => {
    const handler = e => {
      if (e.key === "ArrowLeft" && selectedIdx > 0)
        setSelectedIdx(i => i - 1);
      else if (e.key === "ArrowRight" && selectedIdx < daySnaps.length - 1)
        setSelectedIdx(i => i + 1);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [selectedIdx, daySnaps.length]);

  const hasData = history.length > 0;
  const firstTs = hasData ? new Date(history[0].t) : null;
  const lastTs  = hasData ? new Date(history[history.length - 1].t) : null;
  const spanDays = hasData ? Math.ceil((lastTs - firstTs) / 86_400_000) + 1 : 0;

  const card  = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, boxShadow:t.cardShadow };
  const secHd = { fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, letterSpacing:2,
    color:t.textSec, textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:6 };

  // chart data: full day snapshots mapped to recharts-friendly format
  const chartData = useMemo(() => daySnaps.map(s => ({
    t: fmtTime(new Date(s.t)),
    COD: s.COD, BOD5: s.BOD5, TSS: s.TSS, NH4: s.NH4, pH: s.pH, O2: s.O2,
    _ts: s.t,
  })), [daySnaps]);

  const snapTimeStr = snap ? fmtTime(new Date(snap.t)) : null;

  // ── no data state ────────────────────────────────────────────
  if (!hasData) {
    return (
      <div style={{padding:"60px 32px", textAlign:"center"}}>
        <div style={{fontSize:64, marginBottom:20}}>⏳</div>
        <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:22, color:t.accent, letterSpacing:3, marginBottom:12}}>
          NESSUNO STORICO
        </div>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:17, color:t.textSec, maxWidth:500, margin:"0 auto", lineHeight:1.6}}>
          Il modulo di apprendimento non ha ancora registrato dati sufficienti.
          Avvia la simulazione e lasciala girare per qualche minuto — il primo
          snapshot viene salvato ogni 60 secondi simulati.
        </div>
        <div style={{marginTop:24, fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted}}>
          I dati vengono salvati in localStorage del browser.
        </div>
      </div>
    );
  }

  return (
    <div style={{padding:"14px 20px", display:"flex", flexDirection:"column", gap:14}}>

      {/* ── TOP INFO BAR ── */}
      <div style={{...card, padding:"12px 22px", display:"flex", alignItems:"center", gap:32, flexWrap:"wrap"}}>
        <div style={{display:"flex", alignItems:"center", gap:10}}>
          <span style={{fontSize:28}}>⏮</span>
          <div>
            <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:18, color:t.accent, letterSpacing:3, fontWeight:700}}>
              TIME MACHINE
            </div>
            <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, letterSpacing:1}}>
              STORICO IMPIANTO
            </div>
          </div>
        </div>
        <div style={{height:36, width:1, background:t.border}} />
        {[
          { label:"Campioni totali", val:history.length.toLocaleString("it-IT") },
          { label:"Giorni con dati",  val:spanDays },
          { label:"Primo dato",       val:firstTs ? fmtDateTime(firstTs) : "—" },
          { label:"Ultimo dato",      val:lastTs  ? fmtDateTime(lastTs)  : "—" },
        ].map(x => (
          <div key={x.label}>
            <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:17, color:t.text, fontWeight:700}}>{x.val}</div>
            <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:12, color:t.textMuted, letterSpacing:1}}>{x.label}</div>
          </div>
        ))}
        <div style={{marginLeft:"auto", fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:t.textMuted, letterSpacing:1}}>
          ← → tasti freccia per navigare
        </div>
      </div>

      {/* ── NAVIGATION ROW ── */}
      <div style={{display:"grid", gridTemplateColumns:"300px 1fr", gap:14}}>

        {/* Calendar */}
        <div style={{...card, padding:"20px 18px"}}>
          <div style={{...secHd}}><span style={{color:t.accent}}>▸</span>SELEZIONA GIORNO</div>
          <CalendarWidget
            calMonth={calMonth} onNav={navMonth} byDate={byDate}
            selectedKey={selectedKey} onSelect={handleSelectDate} t={t} />
          {selectedKey && (
            <div style={{marginTop:14, padding:"10px 12px", background:t.surface2, borderRadius:8, fontSize:14,
              fontFamily:"'Share Tech Mono',monospace", color:t.accent, letterSpacing:1}}>
              {(byDate[selectedKey]||[]).length} snapshot disponibili
            </div>
          )}
        </div>

        {/* Time slider + selected snapshot header */}
        <div style={{...card, padding:"20px 24px", display:"flex", flexDirection:"column", gap:16}}>
          <div style={{...secHd}}><span style={{color:t.accent}}>▸</span>SELEZIONA ORA</div>

          {daySnaps.length === 0 ? (
            <div style={{flex:1, display:"flex", alignItems:"center", justifyContent:"center",
              color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:15}}>
              Seleziona un giorno nel calendario
            </div>
          ) : (
            <>
              {/* large timestamp display */}
              <div style={{textAlign:"center", padding:"18px 0"}}>
                <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:42, color:t.accent,
                  letterSpacing:6, fontWeight:700, lineHeight:1}}>
                  {snap ? fmtTime(new Date(snap.t)) : "--:--"}
                </div>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:18, color:t.textSec,
                  marginTop:8, letterSpacing:3}}>
                  {selectedKey
                    ? `${selectedKey.split("-").reverse().join("/")}` : ""}
                </div>
                <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:t.textMuted,
                  marginTop:4, letterSpacing:1}}>
                  Snapshot {selectedIdx + 1} di {daySnaps.length}
                  {snap?.auto ? " · AUTO-CORREZIONE ATTIVA" : " · MODALITÀ MANUALE"}
                </div>
              </div>

              {/* slider */}
              <div style={{padding:"0 8px"}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:8,
                  fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted}}>
                  <span>{fmtTime(new Date(daySnaps[0].t))}</span>
                  <span style={{color:t.accent, fontSize:14}}>◂ trascina ▸</span>
                  <span>{fmtTime(new Date(daySnaps[daySnaps.length-1].t))}</span>
                </div>
                <input type="range"
                  min={0} max={daySnaps.length - 1} value={selectedIdx}
                  onChange={e => setSelectedIdx(Number(e.target.value))}
                  style={{width:"100%", accentColor:t.accent, height:8, cursor:"pointer"}} />
              </div>

              {/* mini sparklines for quick orientation */}
              <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:4}}>
                {ALL_PARAMS.map(p => (
                  <button key={p} onClick={() => setActiveParams(prev =>
                    prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p]
                  )} style={{
                    padding:"4px 11px", borderRadius:5, cursor:"pointer", fontSize:13,
                    fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                    border:`1px solid ${activeParams.includes(p) ? PARAM_COLORS[p] : t.border}`,
                    background:activeParams.includes(p) ? `${PARAM_COLORS[p]}22` : t.surface2,
                    color:activeParams.includes(p) ? PARAM_COLORS[p] : t.textSec,
                  }}>{p}</button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── DATA CARDS ── */}
      {snap && (
        <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14}}>

          {/* QUALITÀ USCITA */}
          <div style={{...card, padding:"20px 22px"}}>
            <div style={{...secHd}}><span style={{color:t.green}}>▸</span>QUALITÀ USCITA</div>
            {[
              { label:"COD",  v:snap.COD,  unit:"mg/L", lim:125, warn:100 },
              { label:"BOD5", v:snap.BOD5, unit:"mg/L", lim:25,  warn:20  },
              { label:"TSS",  v:snap.TSS,  unit:"mg/L", lim:35,  warn:28  },
              { label:"NH4",  v:snap.NH4,  unit:"mg/L", lim:8,   warn:6,  decimals:2 },
              { label:"pH",   v:snap.pH,   unit:"",     phCheck:true,      decimals:2 },
              { label:"O₂",   v:snap.O2,   unit:"mg/L", o2Check:true,      decimals:2 },
            ].map(q => (
              <div key={q.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0", borderBottom:`1px solid ${t.border}`}}>
                <span style={{fontSize:17, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:t.text, minWidth:52}}>
                  {q.label}
                </span>
                <QBadge {...q} t={t} />
              </div>
            ))}
          </div>

          {/* CONTROLLI ATTUATORI */}
          <div style={{...card, padding:"20px 22px"}}>
            <div style={{...secHd}}><span style={{color:t.orange}}>▸</span>CONTROLLI ATTUATORI</div>
            <ActBar label="Soffianti" value={snap.blower}
              t={t} colorFn={v => v > 80 ? t.red : v > 60 ? t.orange : t.green} />
            <ActBar label="Coagulante" value={snap.coagulant}
              t={t} colorFn={v => v > 70 ? t.orange : t.green} />
            <ActBar label="Ric. fanghi (RAS)" value={snap.ras}
              t={t} colorFn={() => t.purple} />
            <ActBar label="NaOH" value={snap.naoh}
              t={t} colorFn={v => v > 0 ? t.accent : t.textMuted} />
            <ActBar label="H₂SO₄" value={snap.h2so4}
              t={t} colorFn={v => v > 0 ? t.yellow : t.textMuted} />
          </div>

          {/* BIOMASSA + STATO SISTEMA */}
          <div style={{...card, padding:"20px 22px", display:"flex", flexDirection:"column", gap:14}}>
            <div>
              <div style={{...secHd}}><span style={{color:t.purple}}>▸</span>BIOMASSA</div>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:48, color:t.purple,
                fontWeight:700, lineHeight:1, marginBottom:4}}>
                {snap.MLSS != null ? Math.round(snap.MLSS) : "—"}
              </div>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:15, color:t.textMuted}}>mg/L · MLSS biologico</div>
              {snap.MLSS != null && (
                <div style={{marginTop:10, padding:"6px 12px", borderRadius:7, fontFamily:"'Share Tech Mono',monospace",
                  fontSize:13, letterSpacing:1,
                  background: snap.MLSS < 1800 || snap.MLSS > 5500 ? `${t.red}18` :
                               snap.MLSS < 2500 || snap.MLSS > 4000 ? `${t.orange}18` : `${t.green}18`,
                  color: snap.MLSS < 1800 || snap.MLSS > 5500 ? t.red :
                         snap.MLSS < 2500 || snap.MLSS > 4000 ? t.orange : t.green,
                  border:`1px solid ${ snap.MLSS < 1800 || snap.MLSS > 5500 ? t.red :
                    snap.MLSS < 2500 || snap.MLSS > 4000 ? t.orange : t.green}44`,
                }}>
                  {snap.MLSS < 1800 ? "MLSS CRITICO — bassa biomassa" :
                   snap.MLSS > 5500 ? "MLSS CRITICO — eccesso fanghi" :
                   snap.MLSS < 2500 ? "MLSS basso" :
                   snap.MLSS > 4000 ? "MLSS elevato" : "MLSS nella norma"}
                </div>
              )}
            </div>

            <div style={{borderTop:`1px solid ${t.border}`, paddingTop:14}}>
              <div style={{...secHd, marginBottom:10}}><span style={{color:t.accent}}>▸</span>STATO SISTEMA</div>
              <div style={{padding:"10px 14px", borderRadius:8, marginBottom:10,
                background: snap.auto ? `${t.green}18` : `${t.orange}18`,
                border:`1px solid ${snap.auto ? t.green : t.orange}44`}}>
                <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, letterSpacing:1,
                  color: snap.auto ? t.green : t.orange}}>
                  {snap.auto ? "🤖 AUTO-CORREZIONE ATTIVA" : "💡 MODALITÀ MANUALE"}
                </div>
              </div>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, lineHeight:2}}>
                Tick #{snap.tick ?? "—"}<br />
                Salvato: {fmtDateTime(new Date(snap.t))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TREND GIORNALIERO ── */}
      {snap && chartData.length > 1 && (
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
            <div style={{...secHd, marginBottom:0}}>
              <span style={{color:t.accent}}>▸</span>
              TREND GIORNALIERO — {selectedKey?.split("-").reverse().join("/")}
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, letterSpacing:1}}>
              {chartData.length} campioni · cursore ↕ puntatore corrente
            </div>
          </div>
          <div style={{height:260}}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{top:6, right:8, bottom:0, left:-14}}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="t"
                  tick={{fill:t.textMuted, fontSize:12, fontFamily:"'Share Tech Mono',monospace"}}
                  tickLine={false} axisLine={false} />
                <YAxis
                  tick={{fill:t.textMuted, fontSize:12, fontFamily:"'Share Tech Mono',monospace"}}
                  tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip t={t} />} />
                {snapTimeStr && (
                  <ReferenceLine x={snapTimeStr}
                    stroke={t.accent} strokeDasharray="4 3" strokeWidth={2}
                    label={{ value:"◂ ora", fill:t.accent, fontSize:12,
                      fontFamily:"'Share Tech Mono',monospace", position:"insideTopRight" }} />
                )}
                {ALL_PARAMS.filter(p => activeParams.includes(p)).map(p => (
                  <Line key={p} type="monotone" dataKey={p}
                    stroke={PARAM_COLORS[p]} strokeWidth={2}
                    dot={false} isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* ── INTERVENTI VICINI ── */}
      {snap && (
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}>
            <span style={{color:t.yellow}}>▸</span>
            INTERVENTI AUTO-CORREZIONE — ±30 min dal punto selezionato
            <span style={{fontSize:13, fontWeight:400, color:t.textMuted, marginLeft:8}}>
              ({nearby.length} trovati)
            </span>
          </div>
          {nearby.length === 0 ? (
            <div style={{padding:"20px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:15, textAlign:"center"}}>
              Nessun intervento registrato in questa finestra temporale
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:8}}>
              {nearby.map((it, idx) => {
                const c = it.outcome === "good" ? t.green : it.outcome === "bad" ? t.red : t.orange;
                const icon = it.outcome === "good" ? "✓" : it.outcome === "bad" ? "✗" : "~";
                return (
                  <div key={idx} style={{display:"grid", gridTemplateColumns:"auto 1fr auto auto", gap:16,
                    alignItems:"center", padding:"12px 16px", borderRadius:9,
                    background:t.surface2, border:`1px solid ${t.border}`}}>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, whiteSpace:"nowrap"}}>
                      {fmtTime(new Date(it.t))}
                    </span>
                    <div>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:t.text}}>
                        {it.control}
                      </span>
                      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, marginLeft:10}}>
                        {it.metricKey}: {it.before?.toFixed(2)} → {it.after?.toFixed(2)}
                        {" "}(target {it.target})
                      </span>
                    </div>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted}}>
                      Δctrl {it.deltaCtrl >= 0 ? "+" : ""}{it.deltaCtrl?.toFixed?.(1) ?? it.deltaCtrl}
                    </span>
                    <span style={{fontSize:13, padding:"3px 10px", borderRadius:5,
                      background:`${c}18`, color:c, border:`1px solid ${c}44`,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                      {icon} {it.outcome?.toUpperCase()}
                      {it.gainAfter != null ? ` · gain ${it.gainAfter.toFixed(2)}×` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}
