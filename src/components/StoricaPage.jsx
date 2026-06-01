import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { loadHistory, loadInterventions } from "../simulation/learning";
import { STAGE_META } from "../constants/stages";
import { STAGE_TREND_DEFS } from "../constants/stageTrend";
import { QUALITY_LIMITS as QL, MLSS_LIMITS } from "../constants/limits";
import { dataSource, dataSourceTag } from "../constants/dataSource";
import AnomalyDot from "./ui/AnomalyDot";
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

const CONTROL_LABELS = {
  blower:        "Soffianti",
  coagulant:     "Coagulante",
  sludgeRecycle: "Ricircolo fanghi",
  pH:            "Correzione pH",
  naoh:          "Dosaggio NaOH",
  h2so4:         "Dosaggio H₂SO₄",
};
const OUTCOME_LABELS = { good:"BUONO", bad:"INEFFICACE", neutral:"NEUTRO" };

// ── Dual-handle slider ────────────────────────────────────────
function DualSlider({ count, left, right, onLeft, onRight, t }) {
  const trackRef = useRef(null);
  const dragging  = useRef(null); // "left" | "right"

  const pct = i => count > 1 ? i / (count - 1) * 100 : 0;

  const valueFromClientX = x => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = Math.max(0, Math.min(1, (x - rect.left) / rect.width));
    return Math.round(ratio * (count - 1));
  };

  const onMove = useCallback(e => {
    if (!dragging.current) return;
    const x = e.touches ? e.touches[0].clientX : e.clientX;
    const v = valueFromClientX(x);
    if (dragging.current === "left")  onLeft(Math.min(v, right));
    else                              onRight(Math.max(v, left));
  }, [left, right, onLeft, onRight]);

  const onUp = useCallback(() => { dragging.current = null; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    window.addEventListener("touchmove", onMove, { passive:true });
    window.addEventListener("touchend",  onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend",  onUp);
    };
  }, [onMove, onUp]);

  const startDrag = (handle, e) => { e.preventDefault(); dragging.current = handle; };

  const handleStyle = (color) => ({
    position:"absolute", top:"50%", transform:"translate(-50%,-50%)",
    width:22, height:22, borderRadius:"50%", background:color,
    border:"2.5px solid #fff", boxShadow:"0 2px 8px rgba(0,0,0,0.35)",
    cursor:"grab", zIndex:2, touchAction:"none",
  });

  return (
    <div ref={trackRef} style={{position:"relative", height:30, userSelect:"none"}}
      onClick={e => {
        const v = valueFromClientX(e.clientX);
        const dl = Math.abs(v - left), dr = Math.abs(v - right);
        if (dl <= dr) onLeft(Math.min(v, right));
        else          onRight(Math.max(v, left));
      }}>
      {/* background track */}
      <div style={{position:"absolute", top:"50%", left:0, right:0,
        height:6, background:t.surface3, borderRadius:3, transform:"translateY(-50%)", pointerEvents:"none"}}>
        {/* filled window */}
        <div style={{position:"absolute", top:0, bottom:0, borderRadius:3,
          left:`${pct(left)}%`, width:`${pct(right) - pct(left)}%`, background:t.accent}} />
      </div>
      {/* left handle */}
      <div style={{...handleStyle(t.green), left:`${pct(left)}%`}}
        onMouseDown={e => startDrag("left",  e)}
        onTouchStart={e => startDrag("left",  e)} />
      {/* right handle */}
      <div style={{...handleStyle(t.accent), left:`${pct(right)}%`}}
        onMouseDown={e => startDrag("right", e)}
        onTouchStart={e => startDrag("right", e)} />
    </div>
  );
}

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
  if (phCheck)  { ok = v >= QL.pH.low_w && v <= QL.pH.high_w; fuori = v < QL.pH.low_c || v > QL.pH.high_c; }
  else if (o2Check) { ok = v >= QL.O2.warn; fuori = v < QL.O2.crit; }
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
  const cmd = dataSourceTag("command");
  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5}}>
        <span style={{display:"inline-flex", alignItems:"center", gap:8, flexWrap:"wrap"}}>
          <span style={{fontSize:16, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{label}</span>
          <span title={cmd.note} style={{display:"inline-flex", alignItems:"center", gap:3, fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, textTransform:"uppercase", color:t.textMuted}}>
            <span style={{fontSize:9}}>{cmd.icon}</span>{cmd.word}
          </span>
        </span>
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
export default function StoricaPage({ t, qualitySources = {}, showMarkers = true, onShowMarkers }) {
  const [history,       setHistory]       = useState([]);
  const [interventions, setInterventions] = useState([]);
  const [calMonth,      setCalMonth]      = useState(new Date());
  const [selectedKey,   setSelectedKey]   = useState(null);
  const [windowStart,   setWindowStart]   = useState(0);
  const [selectedIdx,   setSelectedIdx]   = useState(0);
  // Punto "ispezionato" sul grafico, indipendente dalla finestra dello slider:
  // null = segue il bordo destro (selectedIdx); altrimenti è l'indice cliccato.
  const [focusIdx,      setFocusIdx]      = useState(null);
  const [activeParams,  setActiveParams]  = useState(["COD", "TSS", "O2"]);
  const [highlightTs,   setHighlightTs]   = useState(null);
  const [histNode,      setHistNode]      = useState("plant"); // "plant" | stage index

  useEffect(() => {
    setHistory(loadHistory());
    setInterventions(loadInterventions());
  }, []);

  const byDate = useMemo(() => groupByDate(history), [history]);

  const daySnaps = useMemo(() => {
    if (!selectedKey) return [];
    return (byDate[selectedKey] || []).slice().sort((a, b) => a.t - b.t);
  }, [byDate, selectedKey]);

  // L'indice del cursore dei pannelli: il punto in focus se impostato, altrimenti
  // il bordo destro della finestra. Clamp entro i limiti della finestra visibile.
  const cursorIdx = focusIdx != null ? Math.min(Math.max(focusIdx, windowStart), selectedIdx) : selectedIdx;
  const snap = daySnaps[cursorIdx] ?? null;

  // auto-select most recent day on load
  useEffect(() => {
    if (history.length > 0 && !selectedKey) {
      const last = history[history.length - 1];
      const k = dateKey(new Date(last.t));
      setSelectedKey(k);
      setCalMonth(new Date(last.t));
    }
  }, [history]);

  // reset sliders when day changes
  useEffect(() => {
    setWindowStart(0);
    setSelectedIdx(daySnaps.length > 0 ? daySnaps.length - 1 : 0);
    setHighlightTs(null);
    setFocusIdx(null);
  }, [selectedKey]);

  // muovendo lo slider (finestra) il focus torna a seguire il bordo destro
  useEffect(() => { setFocusIdx(null); }, [windowStart, selectedIdx]);

  const nearby = useMemo(() => {
    if (!snap) return [];
    const W = 30 * 60_000;
    return interventions.filter(i => Math.abs(i.t - snap.t) <= W).sort((a, b) => b.t - a.t);
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
  const spanDays = Object.keys(byDate).length;

  const card  = { background:t.surface, border:`1px solid ${t.border}`, borderRadius:14, boxShadow:t.cardShadow };
  const secHd = { fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, letterSpacing:2,
    color:t.textSec, textTransform:"uppercase", marginBottom:14, display:"flex", alignItems:"center", gap:6 };

  // available stage nodes for the current snapshot (from saved stageNodes)
  const stageNodes = snap?.stageNodes ?? null;

  // reset to plant view when the selected node is unavailable for this snapshot
  useEffect(() => {
    if (histNode !== "plant" && (!stageNodes || histNode >= stageNodes.length))
      setHistNode("plant");
  }, [stageNodes, histNode]);

  // metric definitions for the selected node
  // For historical snapshots, stageNodes has the saved stage names — use them to
  // reconstruct defs. Fall back to keys saved in snapshot for old snapshots.
  const nodeMetricDefs = histNode === "plant"
    ? ALL_PARAMS.map(k => ({ key:k, label:k, color:PARAM_COLORS[k] }))
    : (() => {
        const name = stageNodes?.[histNode]?.name;
        if (!name) return [];
        const defs = STAGE_TREND_DEFS[name] ?? [];
        // For historical snapshots we don't have live stageConfig, so show all
        // defs that have data in the snapshot (no sensor gating needed for history).
        const savedKeys = stageNodes?.[histNode]?.metrics ?? [];
        return defs.filter(d => savedKeys.includes(d.key));
      })();
  const nodeMetrics = nodeMetricDefs.map(d => d.key);

  // Auto-select all available metrics when switching node
  useEffect(() => {
    setActiveParams(nodeMetrics);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [histNode]);

  // chart data: full day snapshots mapped to recharts-friendly format.
  // For a stage node, read that stage's saved output water; gaps where absent.
  const chartData = useMemo(() => daySnaps.slice(windowStart, selectedIdx + 1).map(s => {
    const base = { t: fmtTime(new Date(s.t)), _ts: s.t };
    if (histNode === "plant")
      return { ...base, COD:s.COD, BOD5:s.BOD5, TSS:s.TSS, NH4:s.NH4, pH:s.pH, O2:s.O2 };
    const sw = s.stageWater?.[histNode] ?? s.stages?.[histNode];
    return sw ? { ...base, ...sw } : base;
  }), [daySnaps, windowStart, selectedIdx, histNode]);

  const snapTimeStr = snap ? fmtTime(new Date(snap.t)) : null;

  // Click su un marker di anomalia nel grafico → riposiziona il cursore (snapshot)
  // su quell'istante: i pannelli ALLARMI (ora dello snapshot) e INTERVENTI (±30 min)
  // si ricentrano sull'evento, e la lista interventi scorre fino al più vicino.
  const pickAnomaly = useCallback((p) => {
    const ts = p?._ts;
    if (ts == null) return;
    const idx = daySnaps.findIndex(s => s.t === ts);
    if (idx >= 0) setFocusIdx(idx);   // sposta solo il cursore-pannelli, non la finestra
    setHighlightTs(ts);
  }, [daySnaps]);

  // indice dell'intervento più vicino all'istante evidenziato (per highlight + scroll)
  const hlIntervIdx = useMemo(() => {
    if (highlightTs == null || nearby.length === 0) return -1;
    let best = -1, bd = Infinity;
    nearby.forEach((it, i) => { const d = Math.abs(it.t - highlightTs); if (d < bd) { bd = d; best = i; } });
    return best;
  }, [highlightTs, nearby]);

  // punto del grafico attualmente sotto il cursore (aggiornato da onMouseMove);
  // usato dal click sul contenitore per sapere quale snapshot selezionare.
  const activePtRef = useRef(null);
  const hlIntervRef = useRef(null);
  useEffect(() => {
    if (highlightTs != null) hlIntervRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [highlightTs, hlIntervIdx]);

  // find closest chartData label for a given timestamp
  const highlightTimeStr = useMemo(() => {
    if (!highlightTs || chartData.length === 0) return null;
    let best = null, bestDist = Infinity;
    chartData.forEach(d => {
      const dist = Math.abs(d._ts - highlightTs);
      if (dist < bestDist) { bestDist = dist; best = d.t; }
    });
    return best;
  }, [highlightTs, chartData]);

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
                  Snapshot {cursorIdx + 1} di {daySnaps.length}
                  {focusIdx != null ? " · punto selezionato" : ""}
                  {snap?.auto ? " · AUTO-CORREZIONE ATTIVA" : " · MODALITÀ MANUALE"}
                </div>
              </div>

              {/* dual slider */}
              <div style={{padding:"0 8px"}}>
                <div style={{display:"flex", justifyContent:"space-between", marginBottom:10,
                  fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted}}>
                  <span>{fmtTime(new Date(daySnaps[0].t))}</span>
                  <span style={{fontSize:12}}>◂ trascina le maniglie ▸</span>
                  <span>{fmtTime(new Date(daySnaps[daySnaps.length - 1].t))}</span>
                </div>
                <DualSlider
                  count={daySnaps.length}
                  left={windowStart} right={selectedIdx}
                  onLeft={setWindowStart} onRight={setSelectedIdx}
                  t={t} />
                <div style={{display:"flex", justifyContent:"space-between", marginTop:10,
                  fontFamily:"'Share Tech Mono',monospace", fontSize:13}}>
                  <span style={{color:t.green}}>
                    ▸ DA: {fmtTime(new Date(daySnaps[windowStart].t))}
                  </span>
                  <span style={{color:t.textMuted, fontSize:12}}>
                    {selectedIdx - windowStart + 1} snapshot
                  </span>
                  <span style={{color:t.accent}}>
                    A: {fmtTime(new Date(daySnaps[selectedIdx].t))} ◂
                  </span>
                </div>
              </div>

              {/* metric toggles — all available metrics for the selected node */}
              <div style={{display:"flex", gap:10, flexWrap:"wrap", marginTop:4}}>
                {nodeMetricDefs.length === 0 ? (
                  <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted}}>
                    Nessuna metrica disponibile per questo stadio
                  </span>
                ) : nodeMetricDefs.map(md => (
                  <button key={md.key} onClick={() => setActiveParams(prev =>
                    prev.includes(md.key) ? prev.filter(x => x !== md.key) : [...prev, md.key]
                  )} style={{
                    padding:"4px 11px", borderRadius:5, cursor:"pointer", fontSize:13,
                    fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                    border:`${activeParams.includes(md.key) ? 2 : 1}px solid ${activeParams.includes(md.key) ? md.color : t.border}`,
                    background:activeParams.includes(md.key) ? `${md.color}22` : t.surface2,
                    color:activeParams.includes(md.key) ? md.color : t.textSec,
                  }}>{md.label}</button>
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
              { key:"COD",  label:"COD",  v:snap.COD,  unit:"mg/L", lim:QL.COD.warn,  warn:QL.COD.pre  },
              { key:"BOD5", label:"BOD5", v:snap.BOD5, unit:"mg/L", lim:QL.BOD5.warn, warn:QL.BOD5.pre },
              { key:"TSS",  label:"TSS",  v:snap.TSS,  unit:"mg/L", lim:QL.TSS.warn,  warn:QL.TSS.pre  },
              { key:"NH4",  label:"NH4",  v:snap.NH4,  unit:"mg/L", lim:QL.NH4.warn,  warn:QL.NH4.pre, decimals:2 },
              { key:"pH",   label:"pH",   v:snap.pH,   unit:"",     phCheck:true,      decimals:2 },
              { key:"O2",   label:"O₂",   v:snap.O2,   unit:"mg/L", o2Check:true,      decimals:2 },
            ].map(q => (
              <div key={q.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center",
                padding:"12px 0", borderBottom:`1px solid ${t.border}`}}>
                <div style={{display:"flex", alignItems:"center", gap:8, minWidth:52}}>
                  <span style={{fontSize:17, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:t.text}}>
                    {q.label}
                  </span>
                  {(() => {
                    const tag = dataSourceTag(qualitySources[q.key] ?? dataSource(q.label, q.unit));
                    const isSensor = tag.kind === "sensor";
                    return (
                      <span title={tag.note} style={{display:"inline-flex", alignItems:"center", gap:3, fontSize:9,
                        fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, textTransform:"uppercase",
                        color: isSensor ? t.accent : t.textMuted}}>
                        <span style={{fontSize:9}}>{tag.icon}</span>{tag.word}
                      </span>
                    );
                  })()}
                </div>
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
                  background: snap.MLSS < MLSS_LIMITS.lo_crit || snap.MLSS > MLSS_LIMITS.hi_crit ? `${t.red}18` :
                               snap.MLSS < MLSS_LIMITS.lo_warn || snap.MLSS > MLSS_LIMITS.hi_warn ? `${t.orange}18` : `${t.green}18`,
                  color: snap.MLSS < MLSS_LIMITS.lo_crit || snap.MLSS > MLSS_LIMITS.hi_crit ? t.red :
                         snap.MLSS < MLSS_LIMITS.lo_warn || snap.MLSS > MLSS_LIMITS.hi_warn ? t.orange : t.green,
                  border:`1px solid ${ snap.MLSS < MLSS_LIMITS.lo_crit || snap.MLSS > MLSS_LIMITS.hi_crit ? t.red :
                    snap.MLSS < MLSS_LIMITS.lo_warn || snap.MLSS > MLSS_LIMITS.hi_warn ? t.orange : t.green}44`,
                }}>
                  {snap.MLSS < MLSS_LIMITS.lo_crit ? "MLSS CRITICO — bassa biomassa" :
                   snap.MLSS > MLSS_LIMITS.hi_crit ? "MLSS CRITICO — eccesso fanghi" :
                   snap.MLSS < MLSS_LIMITS.lo_warn ? "MLSS basso" :
                   snap.MLSS > MLSS_LIMITS.hi_warn ? "MLSS elevato" : "MLSS nella norma"}
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
      {snap && (
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16}}>
            <div style={{...secHd, marginBottom:0}}>
              <span style={{color:t.accent}}>▸</span>
              TREND GIORNALIERO — {selectedKey?.split("-").reverse().join("/")}
            </div>
            <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, letterSpacing:1}}>
              {chartData.length} campioni · {histNode==="plant" ? "uscita impianto" : `uscita ${stageNodes?.[histNode]?.name ?? ""}`}
            </div>
          </div>
          {/* node selector — one per saved stage + GEN. IMPIANTO */}
          {stageNodes && stageNodes.length > 0 && (
            <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:14,
              paddingBottom:12, borderBottom:`1px solid ${t.border}`}}>
              {stageNodes.map((node, i) => {
                const active = histNode === i;
                const hasDefs = (STAGE_TREND_DEFS[node.name]?.length ?? 0) > 0;
                return (
                  <button key={i} onClick={() => setHistNode(i)}
                    title={node.name}
                    style={{padding:"4px 10px", borderRadius:5, cursor:"pointer",
                      fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:600, letterSpacing:1,
                      opacity: hasDefs ? 1 : 0.5,
                      border:`${active ? 2 : 1}px solid ${active?t.accent:t.border}`,
                      background:active?`${t.accent}22`:t.surface2,
                      color:active?t.accent:t.textSec}}>
                    {node.name}
                  </button>
                );
              })}
              <button onClick={() => setHistNode("plant")}
                style={{padding:"4px 12px", borderRadius:5, cursor:"pointer",
                  fontFamily:"'Rajdhani',sans-serif", fontSize:13, fontWeight:700, letterSpacing:1,
                  border:`${histNode==="plant" ? 2 : 1}px solid ${histNode==="plant"?t.green:t.border}`,
                  background:histNode==="plant"?`${t.green}22`:t.surface2,
                  color:histNode==="plant"?t.green:t.textSec}}>
                GEN. IMPIANTO
              </button>
              <label title="Mostra/nascondi i marker di anomalia su tutti i grafici"
                style={{marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer",
                  fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted, letterSpacing:0.5, alignSelf:"center"}}>
                <input type="checkbox" checked={showMarkers} onChange={e => onShowMarkers?.(e.target.checked)}
                  style={{accentColor:t.accent, cursor:"pointer", width:14, height:14}}/>
                marker anomalie
              </label>
            </div>
          )}
          {chartData.length < 2 ? (
            <div style={{height:260, display:"flex", flexDirection:"column", alignItems:"center",
              justifyContent:"center", gap:12}}>
              <div style={{fontSize:36, opacity:0.4}}>⏳</div>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:16, color:t.textMuted, textAlign:"center", lineHeight:1.6}}>
                Dati insufficienti per il grafico.<br/>
                {chartData.length === 0
                  ? "Seleziona un intervallo con almeno 2 campioni."
                  : "Solo 1 campione nel range — allarga la finestra o attendi nuovi snapshot."}
              </div>
              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12, color:t.textMuted}}>
                Un nuovo campione viene salvato ogni ~60 secondi (velocità 5×)
              </div>
            </div>
          ) : (
          <div style={{height:260, cursor:"pointer"}}
            onClick={() => { if (activePtRef.current) pickAnomaly(activePtRef.current); }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{top:6, right:8, bottom:0, left:-14}}
                onMouseMove={(state) => {
                  const i = state?.activeTooltipIndex;
                  activePtRef.current =
                    state?.activePayload?.[0]?.payload
                    ?? (typeof i === "number" ? chartData[i] : null)
                    ?? (state?.activeLabel != null ? chartData.find(d => d.t === state.activeLabel) : null)
                    ?? null;
                }}
                onMouseLeave={() => { activePtRef.current = null; }}>
                <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} />
                <XAxis dataKey="t"
                  interval={Math.max(0, Math.ceil(chartData.length / 10) - 1)}
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
                {highlightTimeStr && highlightTimeStr !== snapTimeStr && (
                  <ReferenceLine x={highlightTimeStr}
                    stroke={t.yellow} strokeDasharray="3 2" strokeWidth={2.5}
                    label={{ value:"★", fill:t.yellow, fontSize:14, position:"insideTopLeft" }} />
                )}
                {nodeMetricDefs.filter(md => activeParams.includes(md.key)).map(md => (
                  <Line key={md.key} type={md.step ? "stepAfter" : "monotone"}
                    dataKey={md.key} stroke={md.color} strokeWidth={2}
                    dot={showMarkers ? <AnomalyDot pkey={md.key} t={t} onPick={pickAnomaly}/> : false} isAnimationActive={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
            <div style={{display: showMarkers ? "flex" : "none", alignItems:"center", gap:14, marginTop:6, fontSize:10,
              fontFamily:"'Share Tech Mono',monospace", color:t.textMuted, letterSpacing:0.5}}>
              <span>MARKER:</span>
              <span style={{display:"inline-flex", alignItems:"center", gap:5}}>
                <span style={{width:9, height:9, borderRadius:"50%", background:t.orange, display:"inline-block"}}/>
                oltre limite (MEDIO)
              </span>
              <span style={{display:"inline-flex", alignItems:"center", gap:5}}>
                <span style={{width:9, height:9, borderRadius:"50%", background:t.red, display:"inline-block"}}/>
                critico (ALTO)
              </span>
            </div>
          </div>
          )}
        </div>
      )}

      {/* ── INTERVENTI VICINI + CONSUMI ── */}
      {snap && (
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14}}>
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}>
            <span style={{color:t.yellow}}>▸</span>
            INTERVENTI AUTO-CORREZIONE — ±30 min
            <span style={{fontSize:13, fontWeight:400, color:t.textMuted, marginLeft:8}}>
              ({nearby.length} trovati)
            </span>
          </div>
          {nearby.length === 0 ? (
            <div style={{padding:"20px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:15, textAlign:"center"}}>
              Nessun intervento registrato in questa finestra temporale
            </div>
          ) : (
            <div style={{display:"flex", flexDirection:"column", gap:8, maxHeight:520, overflowY:"auto", paddingRight:6}}>
              {nearby.map((it, idx) => {
                const c = it.outcome === "good" ? t.green : it.outcome === "bad" ? t.red : t.orange;
                const icon = it.outcome === "good" ? "✓" : it.outcome === "bad" ? "✗" : "~";
                const isHl = idx === hlIntervIdx;
                return (
                  <div key={idx} ref={isHl ? hlIntervRef : null}
                    onClick={() => setHighlightTs(highlightTs === it.t ? null : it.t)}
                    title="Clicca per evidenziare sul grafico"
                    style={{display:"grid", gridTemplateColumns:"auto 1fr auto auto", gap:16,
                      alignItems:"center", padding:"12px 16px", borderRadius:9, cursor:"pointer",
                      background: isHl ? `${t.yellow}18` : t.surface2,
                      border:`1px solid ${isHl ? t.yellow : t.border}`,
                      transition:"background 0.15s, border-color 0.15s"}}>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, whiteSpace:"nowrap"}}>
                      {fmtTime(new Date(it.t))}
                    </span>
                    <div>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:16, color:t.text}}>
                        {CONTROL_LABELS[it.control] ?? it.control}
                      </span>
                      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted, marginLeft:10}}>
                        {it.metricKey}: {it.before?.toFixed(2)} → {it.after?.toFixed(2)}
                        {" "}(obiettivo {it.target})
                      </span>
                    </div>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:t.textMuted}}>
                      Δcomando {it.deltaCtrl >= 0 ? "+" : ""}{it.deltaCtrl?.toFixed?.(1) ?? it.deltaCtrl}
                    </span>
                    <span style={{fontSize:13, padding:"3px 10px", borderRadius:5,
                      background:`${c}18`, color:c, border:`1px solid ${c}44`,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:1}}>
                      {icon} {OUTCOME_LABELS[it.outcome] ?? it.outcome?.toUpperCase()}
                      {it.gainAfter != null ? ` · guadagno ${it.gainAfter.toFixed(2)}×` : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ALLARMI */}
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}>
            <span style={{color:t.red}}>▸</span>
            ALLARMI — {snap ? fmtTime(new Date(snap.t)) : "—"}
          </div>
          {!snap.alarmState ? (
            <div style={{padding:"30px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
              fontSize:15, textAlign:"center", lineHeight:1.6}}>
              Dati allarmi non disponibili per questo snapshot.<br/>
              <span style={{fontSize:13}}>(salvati a partire da questa versione)</span>
            </div>
          ) : (() => {
            const active = Object.entries(snap.alarmState).filter(([,v]) => v !== "OK");
            const crits  = active.filter(([,v]) => v === "ALTO");
            const warns  = active.filter(([,v]) => v === "MEDIO");
            return (
              <>
                {/* summary badges */}
                <div style={{display:"flex", gap:10, marginBottom:16, flexWrap:"wrap"}}>
                  {[
                    { label:`${crits.length} Critici`,  c: crits.length > 0 ? t.red    : t.green, filled: crits.length > 0 },
                    { label:`${warns.length} Medi`,     c: warns.length > 0 ? t.orange : t.green, filled: warns.length > 0 },
                    { label:`${Object.keys(snap.alarmState).length - active.length} OK`, c: t.green, filled: false },
                  ].map(x => (
                    <span key={x.label} style={{fontSize:14, padding:"4px 12px", borderRadius:6,
                      background: x.filled ? `${x.c}22` : t.surface2,
                      color:x.c, border:`1px solid ${x.c}44`,
                      fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, fontWeight:700}}>
                      {x.label}
                    </span>
                  ))}
                </div>

                {active.length === 0 ? (
                  <div style={{padding:"28px 0", textAlign:"center", color:t.green,
                    fontFamily:"'Rajdhani',sans-serif", fontSize:16}}>
                    ✓ Nessun allarme attivo a quest'ora
                  </div>
                ) : (
                  <div style={{display:"flex", flexDirection:"column", gap:7,
                    maxHeight:330, overflowY:"auto", paddingRight:4}}>
                    {active.sort(([,a],[,b]) => (a==="ALTO"?0:1) - (b==="ALTO"?0:1)).map(([param, sev]) => {
                      const c = sev === "ALTO" ? t.red : t.orange;
                      const icon = sev === "ALTO" ? "🔴" : "🟡";
                      const detail = (snap.activeAlarms || []).find(a => a.msg?.includes(param));
                      const alarmTs = detail?.t ?? snap?.t;
                      const isHlAlarm = highlightTs === alarmTs;
                      return (
                        <div key={param}
                          onClick={() => setHighlightTs(isHlAlarm ? null : alarmTs)}
                          title="Clicca per evidenziare sul grafico"
                          style={{padding:"10px 14px", borderRadius:8, cursor:"pointer",
                            background: isHlAlarm ? `${t.yellow}18` : `${c}10`,
                            border:`1px solid ${isHlAlarm ? t.yellow : c}33`,
                            display:"flex", alignItems:"flex-start", gap:10,
                            transition:"background 0.15s, border-color 0.15s"}}>
                          <span style={{fontSize:16, flexShrink:0, marginTop:1}}>{icon}</span>
                          <div style={{flex:1, minWidth:0}}>
                            <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
                              fontSize:17, color:c}}>{param}</div>
                            {detail && (
                              <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                                color:t.textMuted, marginTop:3, whiteSpace:"nowrap",
                                overflow:"hidden", textOverflow:"ellipsis"}}>
                                {detail.msg}
                              </div>
                            )}
                            <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:12,
                              color:c, marginTop:2, letterSpacing:1}}>
                              {sev === "ALTO" ? "CRITICO" : "ATTENZIONE"}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* CONSUMI ENERGETICI */}
        <div style={{...card, padding:"20px 22px"}}>
          <div style={{...secHd}}>
            <span style={{color:t.accent}}>▸</span>
            CONSUMI ENERGETICI — {snap ? fmtTime(new Date(snap.t)) : "—"}
          </div>
          {snap.kw == null && !snap.stageEnergy ? (
            <div style={{padding:"30px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
              fontSize:15, textAlign:"center", lineHeight:1.6}}>
              Dati energetici non disponibili per questo snapshot.<br/>
              <span style={{fontSize:13, color:t.textMuted}}>(salvati a partire da questa versione)</span>
            </div>
          ) : (
            <>
              <div style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:14, marginBottom:18}}>
                {[
                  { label:"Potenza",   val:snap.kw != null ? snap.kw.toFixed(1) : "—", unit:"kW",   sub:"Totale impianto", color:t.accent },
                  { label:"Energia",   val:snap.kwh != null ? snap.kwh : "—",          unit:"kWh",  sub:"Sessione",         color:t.accent },
                  { label:"Specifico", val:snap.kw != null && snap.Q > 0 ? (snap.kw*1000/snap.Q).toFixed(2) : "—",
                    unit:"Wh/m³", sub:"Per m³ trattato", color:t.green },
                ].map(x => (
                  <div key={x.label} style={{padding:"12px 14px", background:t.surface2,
                    border:`1px solid ${t.border}`, borderRadius:9}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:24, fontWeight:700,
                      color:x.color, lineHeight:1.1}}>
                      {x.val}
                    </div>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13,
                      color:x.color, marginTop:4, letterSpacing:1}}>{x.unit}</div>
                    <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13,
                      color:t.textMuted, marginTop:2}}>{x.sub}</div>
                  </div>
                ))}
              </div>

              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                letterSpacing:2, color:t.textSec, marginBottom:10, textTransform:"uppercase"}}>
                Ripartizione per stadio
              </div>
              {Array.isArray(snap.stageEnergy) && snap.stageEnergy.length > 0 ? (
                <div style={{display:"flex", flexDirection:"column", gap:10}}>
                  {snap.stageEnergy.map((kw, i) => {
                    const total = snap.stageEnergy.reduce((a,b)=>a+b,0) || 1;
                    const pct = Math.round(kw / total * 100);
                    const name = STAGE_META[i]?.name ?? `ST-0${i+1}`;
                    const barC = i===2 ? t.accent : i===3 ? t.orange : t.green;
                    return (
                      <div key={i}>
                        <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                          <span style={{fontSize:14, color:i===2?t.accent:t.textSec,
                            fontFamily:"'Rajdhani',sans-serif", fontWeight:i===2?700:500}}>
                            ST-0{i+1} {name}
                          </span>
                          <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:barC}}>
                            {kw} kW ({pct}%)
                          </span>
                        </div>
                        <div style={{height:6, background:t.surface3, borderRadius:3, overflow:"hidden"}}>
                          <div style={{height:"100%", width:`${pct}%`, background:barC, borderRadius:3}}/>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{padding:"12px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:14, textAlign:"center"}}>
                  Ripartizione per stadio non disponibile
                </div>
              )}
            </>
          )}
        </div>
      </div>
      )}

    </div>
  );
}
