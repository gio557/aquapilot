import { useState, useEffect, useRef } from "react";
import { getTrendStats, getInterventionSummary, loadGains, resetLearning } from "../simulation/learning";
import { QUALITY_LIMITS as QL, MLSS_LIMITS } from "../constants/limits";

function trendLine(stats) {
  if (!stats) return null;
  const arrow = (d) => d > 0.5 ? "↑" : d < -0.5 ? "↓" : "→";
  const fmt = (s, key, decimals=1) => {
    const v = s?.[key];
    if (!v || !Number.isFinite(v.delta)) return null;
    return `${key} ${arrow(v.delta)} ${v.delta>=0?"+":""}${v.delta.toFixed(decimals)}`;
  };
  const parts = ["COD","TSS","NH4","O2","pH"]
    .map(k => fmt(stats.h1, k, k==="pH"||k==="NH4"?2:1))
    .filter(Boolean);
  if (parts.length === 0) return null;
  return `Trend ultima ora (${stats.h1.COD?.n ?? 0} camp.): ${parts.join(" · ")}`;
}

function gainsLine(gains) {
  if (!gains) return null;
  const fmt = (k, label) => {
    const v = gains[k] ?? 1;
    if (Math.abs(v - 1) < 0.05) return null;
    return `${label}=${v.toFixed(2)}×`;
  };
  const parts = [fmt("blower","soffianti"), fmt("coagulant","coagulante"), fmt("sludgeRecycle","RAS"), fmt("pH","pH")].filter(Boolean);
  if (parts.length === 0) return null;
  return `Gain adattivi: ${parts.join(" · ")}`;
}

function interventionLine(summary) {
  const keys = Object.keys(summary);
  if (keys.length === 0) return null;
  const parts = keys.map(k => {
    const s = summary[k];
    const pct = s.n > 0 ? Math.round(s.good / s.n * 100) : 0;
    return `${k} ${s.good}/${s.n} ok (${pct}%)`;
  });
  return `Efficacia interventi: ${parts.join(" · ")}`;
}

function generateAIOffline(sim, autoOn) {
  const out = sim.output;
  const actions = Object.values(sim.stageActions || {}).filter(a => a && a.sev !== "OK");
  const alarms  = Object.entries(sim.alarmState  || {}).filter(([,v]) => v !== "OK");
  const crits   = alarms.filter(([,v]) => v === "ALTO");
  const ts = new Date().toLocaleTimeString("it-IT", { hour:"2-digit", minute:"2-digit" });
  const trend = getTrendStats();
  const gains = loadGains();
  const intsumm = getInterventionSummary();
  const trendMsg = trendLine(trend);
  const gainsMsg = gainsLine(gains);
  const intMsg   = interventionLine(intsumm);
  const learnFooter = [trendMsg, gainsMsg, intMsg].filter(Boolean).join("\n");

  if (autoOn) {
    if (crits.length > 0) {
      let msg = "INTERVENTO D'EMERGENZA ATTIVO (" + ts + ")\n";
      msg += "Parametri critici: " + crits.map(([p]) => p).join(", ") + "\n\n";
      actions.forEach(a => { msg += "• " + a.text + "\n"; });
      if (out.O2 < QL.O2.crit)
        msg += "\nPREVISIONE: Con soffianti al " + sim.blower + "%, l'O2 dovrebbe superare la soglia critica entro " + (sim.mode==="fast"?"2-4":"8-12") + " min.";
      else if (out.TSS > QL.TSS.crit)
        msg += "\nPREVISIONE: Dosaggio coagulante al " + sim.coagulant + "% — normalizzazione TSS attesa entro " + (sim.mode==="fast"?"5-8":"18-25") + " min.";
      if (learnFooter) msg += "\n\n— APPRENDIMENTO —\n" + learnFooter;
      return msg;
    }
    if (actions.length > 0) {
      let msg = "Correzione automatica in corso (" + ts + "):\n\n";
      actions.forEach(a => { msg += "• " + a.text + "\n"; });
      msg += "\nCOD: " + out.COD.toFixed(1) + " mg/L | O2: " + out.O2.toFixed(1) + " mg/L | MLSS: " + sim.MLSS + " mg/L";
      if (sim.blower > 85)
        msg += "\n\nSoffianti ad alta intensità (" + sim.blower + "%). Se la situazione non migliora entro 10 min, verificare il carico organico in ingresso.";
      else
        msg += "\n\nParametri in recupero. Monitoraggio continuo attivo.";
      if (learnFooter) msg += "\n\n— APPRENDIMENTO —\n" + learnFooter;
      return msg;
    }
    // Warning-level (MEDIO) exceedances with no critical alarm and no active
    // correction: don't claim "ottimali" — the effluent is over a regulatory
    // limit even if no actuator lever is currently moving.
    if (alarms.length > 0) {
      const valOf = { "COD":out.COD, "BOD₅":out.BOD5, "TSS":out.TSS, "NH₄":out.NH4, "O₂":out.O2, "pH":out.pH };
      let msg = "Parametri oltre soglia (" + ts + ")\n\n";
      alarms.forEach(([p, sev]) => {
        const v = valOf[p];
        const vs = v != null ? " (" + v.toFixed(p === "pH" ? 2 : 1) + " mg/L)" : "";
        msg += "• " + p + vs + " — " + (sev === "ALTO" ? "CRITICO" : "oltre il limite") + "\n";
      });
      msg += "\nL'auto-correzione agisce sulle leve disponibili (aerazione, dosaggi); "
           + "se il superamento persiste verificare il carico in ingresso o i limiti di processo.";
      if (learnFooter) msg += "\n\n— APPRENDIMENTO —\n" + learnFooter;
      return msg;
    }
    const optActions = Object.values(sim.stageActions || {}).filter(a => a && a.sev === "OK");
    if (optActions.length > 0) {
      let msg = "Ottimizzazione energetica in corso (" + ts + "):\n\n";
      optActions.forEach(a => { msg += "• " + a.text + "\n"; });
      let m = msg + "\nTutti i parametri nei target. Il sistema riduce i consumi mantenendo i margini di sicurezza.";
      if (learnFooter) m += "\n\n— APPRENDIMENTO —\n" + learnFooter;
      return m;
    }
    return "Impianto in condizioni ottimali (" + ts + ")\n\n"
      + "• COD: " + out.COD.toFixed(1) + " mg/L (target " + QL.COD.warn + ")\n"
      + "• BOD5: " + out.BOD5.toFixed(1) + " mg/L (target " + QL.BOD5.warn + ")\n"
      + "• TSS: " + out.TSS.toFixed(1) + " mg/L (target " + QL.TSS.warn + ")\n"
      + "• NH4: " + out.NH4.toFixed(2) + " mg/L (target " + QL.NH4.warn + ")\n"
      + "• pH: " + out.pH.toFixed(2) + " (range " + QL.pH.low_w + "-" + QL.pH.high_w + ")\n"
      + "• O2: " + out.O2.toFixed(1) + " mg/L\n\n"
      + "Nessun intervento automatico necessario. Soffianti: " + sim.blower + "%, coagulante: " + sim.coagulant + "%."
      + (learnFooter ? "\n\n— APPRENDIMENTO —\n" + learnFooter : "");
  } else {
    const sugg = [];
    if (out.O2 < QL.O2.crit)       sugg.push("URGENTE — O2 critico (" + out.O2.toFixed(1) + " mg/L). Portare le soffianti all'85-95% immediatamente.");
    else if (out.O2 < QL.O2.warn)  sugg.push("O2 basso (" + out.O2.toFixed(1) + " mg/L). Aumentare le soffianti del 10-15% (attuale: " + sim.blower + "%).");
    if (out.COD > QL.COD.crit)      sugg.push("COD critico (" + out.COD.toFixed(1) + " mg/L > limite " + QL.COD.crit + "). Ridurre carico in ingresso e aumentare HRT.");
    else if (out.COD > QL.COD.warn) sugg.push("COD oltre target (" + out.COD.toFixed(1) + " mg/L). Aumentare aerazione o ridurre COD in ingresso.");
    if (out.TSS > QL.TSS.crit)      sugg.push("TSS critico (" + out.TSS.toFixed(1) + " mg/L). Portare coagulante all'80-90%.");
    else if (out.TSS > QL.TSS.warn) sugg.push("TSS oltre target (" + out.TSS.toFixed(1) + " mg/L). Aumentare coagulante al " + Math.min(100,sim.coagulant+15) + "%.");
    if (out.NH4 > QL.NH4.crit)      sugg.push("NH4 critico (" + out.NH4.toFixed(1) + " mg/L). Aerazione insufficiente per nitrificazione.");
    else if (out.NH4 > QL.NH4.warn) sugg.push("NH4 elevato (" + out.NH4.toFixed(1) + " mg/L). Aumentare aerazione.");
    if (out.pH < QL.pH.low_c)       sugg.push("pH critico (" + out.pH.toFixed(2) + "). Avviare dosaggio NaOH al 30-40% immediatamente.");
    else if (out.pH < QL.pH.low_w)  sugg.push("pH basso (" + out.pH.toFixed(2) + "). Avviare dosaggio NaOH al 15-20%.");
    else if (out.pH > QL.pH.high_c) sugg.push("pH critico (" + out.pH.toFixed(2) + "). Avviare dosaggio H2SO4 al 30-40%.");
    else if (out.pH > QL.pH.high_w) sugg.push("pH alto (" + out.pH.toFixed(2) + "). Avviare dosaggio H2SO4 al 10-15%.");
    if (sim.MLSS > MLSS_LIMITS.hi_crit)    sugg.push("MLSS elevato (" + sim.MLSS + " mg/L). Ridurre ricircolo fanghi al " + Math.max(20,sim.sludgeRecycle-15) + "%.");
    else if (sim.MLSS<MLSS_LIMITS.lo_crit) sugg.push("MLSS basso (" + sim.MLSS + " mg/L). Aumentare ricircolo fanghi al " + Math.min(100,sim.sludgeRecycle+15) + "%.");

    if (sugg.length === 0)
      return "Parametri nella norma — monitoraggio manuale attivo (" + ts + ")\n\n"
        + "• COD: " + out.COD.toFixed(1) + " mg/L\n• BOD5: " + out.BOD5.toFixed(1) + " mg/L\n"
        + "• TSS: " + out.TSS.toFixed(1) + " mg/L\n• NH4: " + out.NH4.toFixed(2) + " mg/L\n"
        + "• pH: " + out.pH.toFixed(2) + "\n• O2: " + out.O2.toFixed(1) + " mg/L\n\nNessuna azione manuale necessaria."
        + (learnFooter ? "\n\n— APPRENDIMENTO —\n" + learnFooter : "");

    const urgent = crits.length > 0;
    return (urgent ? "INTERVENTO MANUALE URGENTE (" + ts + ")\n\n" : "Suggerimenti per intervento manuale (" + ts + ")\n\n")
      + sugg.map((s, i) => (i+1) + ". " + s).join("\n\n")
      + (learnFooter ? "\n\n— APPRENDIMENTO —\n" + learnFooter : "");
  }
}

async function generateAIOnline(sim, autoOn) {
  const out = sim.output;
  const actions = Object.values(sim.stageActions || {}).filter(a => a && a.sev !== "OK").map(a => a.text).join("; ") || "nessuna";
  const alarmList = Object.entries(sim.alarmState || {}).filter(([,v]) => v!=="OK").map(([p,s]) => p+":"+s).join(", ") || "nessuno";
  const modeInstr = autoOn
    ? "Il sistema di auto-correzione è ATTIVO. Spiega le azioni automatiche in corso e fornisci previsioni di ripristino. Massimo 4 punti concisi in italiano."
    : "Il sistema è in MODALITÀ MANUALE. Fornisci suggerimenti prioritari e quantificati per l'operatore. Massimo 4 azioni ordinate per urgenza in italiano.";

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body: JSON.stringify({
      model:"claude-sonnet-4-6",
      max_tokens:400,
      system:"Sei un sistema esperto di supporto decisionale per impianti di depurazione acque reflue industriali. Rispondi SEMPRE in italiano. Sii conciso e professionale. Usa solo testo semplice senza markdown.",
      messages:[{ role:"user", content:
        "Stato impianto (" + new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"}) + "):\n"
        +"COD: "+out.COD.toFixed(1)+" mg/L | BOD5: "+out.BOD5.toFixed(1)+" mg/L | TSS: "+out.TSS.toFixed(1)+" mg/L\n"
        +"NH4: "+out.NH4.toFixed(2)+" mg/L | pH: "+out.pH.toFixed(2)+" | O2: "+out.O2.toFixed(1)+" mg/L\n"
        +"MLSS: "+sim.MLSS+" mg/L | Soffianti: "+sim.blower+"% | Coagulante: "+sim.coagulant+"% | RAS: "+sim.sludgeRecycle+"%\n"
        +"Allarmi: "+alarmList+"\nAzioni automatiche: "+actions+"\n\n"+modeInstr
      }]
    })
  });
  if (!resp.ok) throw new Error("HTTP " + resp.status);
  const data = await resp.json();
  return data.content[0]?.text || "Nessuna risposta ricevuta.";
}

// Renders the plain-text advisor message with a clear visual hierarchy:
// heading, bullet/numbered items, metric line, and an "apprendimento" footer.
function AIMessage({ text, t, modeColor }) {
  const SEP = "— APPRENDIMENTO —";
  const sepIdx = text.indexOf(SEP);
  const mainText  = (sepIdx >= 0 ? text.slice(0, sepIdx) : text).trim();
  const learnText = sepIdx >= 0 ? text.slice(sepIdx + SEP.length).trim() : null;

  const lines = mainText.split("\n");
  const headIdx = lines.findIndex(l => l.trim() !== "");
  const heading = headIdx >= 0 ? lines[headIdx].trim() : "";
  const bodyLines = headIdx >= 0 ? lines.slice(headIdx + 1) : [];

  const isUrgent  = /URGENT|EMERGENZA|CRITIC/i.test(heading);
  const headColor = isUrgent ? t.red : modeColor;
  const tm = heading.match(/\((\d{1,2}:\d{2})\)/);
  const headText = heading.replace(/\s*\(\d{1,2}:\d{2}\)\s*:?\s*$/, "").replace(/:\s*$/, "");

  const renderLine = (line, i) => {
    const s = line.trim();
    if (s === "") return <div key={i} style={{ height: 4 }} />;

    if (s.startsWith("•")) {
      return (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"3px 0" }}>
          <span style={{ color:headColor, flexShrink:0, fontSize:13, marginTop:1 }}>▪</span>
          <span style={{ flex:1 }}>{s.replace(/^•\s*/, "")}</span>
        </div>
      );
    }
    const num = s.match(/^(\d+)\.\s+(.*)$/);
    if (num) {
      return (
        <div key={i} style={{ display:"flex", gap:8, alignItems:"flex-start", padding:"3px 0" }}>
          <span style={{ color:headColor, fontFamily:"'Share Tech Mono',monospace", fontWeight:700, flexShrink:0, minWidth:18 }}>{num[1]}.</span>
          <span style={{ flex:1 }}>{num[2]}</span>
        </div>
      );
    }
    if (s.includes(" | ") && /mg\/L|%|mV|°C/.test(s)) {
      return (
        <div key={i} style={{ margin:"6px 0", padding:"7px 10px", background:t.surface2,
          border:`1px solid ${t.border}`, borderRadius:7, fontFamily:"'Share Tech Mono',monospace",
          fontSize:12, color:t.textSec, lineHeight:1.6 }}>
          {s}
        </div>
      );
    }
    return <div key={i} style={{ padding:"3px 0" }}>{s}</div>;
  };

  return (
    <div style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:14, color:t.text, lineHeight:1.5 }}>
      {heading && (
        <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:9,
          paddingBottom:8, borderBottom:`1px solid ${t.border}` }}>
          {isUrgent && <span style={{ fontSize:14, animation:"blink 0.7s infinite" }}>⚠</span>}
          <span style={{ fontWeight:700, fontSize:14, color:headColor, letterSpacing:0.3, flex:1 }}>{headText}</span>
          {tm && (
            <span style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted,
              background:t.surface2, padding:"1px 7px", borderRadius:4, flexShrink:0 }}>{tm[1]}</span>
          )}
        </div>
      )}
      <div>{bodyLines.map(renderLine)}</div>
      {learnText && (
        <div style={{ marginTop:12, paddingTop:10, borderTop:`1px dashed ${t.border}` }}>
          <div style={{ fontFamily:"'Share Tech Mono',monospace", fontSize:10, letterSpacing:2,
            color:t.textMuted, marginBottom:6, display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ color:modeColor }}>◆</span>APPRENDIMENTO
          </div>
          {learnText.split("\n").filter(l => l.trim()).map((l, i) => (
            <div key={i} style={{ fontFamily:"'Rajdhani',sans-serif", fontSize:12.5, color:t.textMuted,
              lineHeight:1.5, padding:"2px 0" }}>{l.trim()}</div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AIPanel({ sim, autoOn, t }) {
  const [engine, setEngine] = useState("offline");
  const [msg, setMsg] = useState({text:"", loading:true, ts:null});
  const lastAutoOn = useRef(autoOn);
  const lastAlarmKey = useRef("");
  const debounceRef = useRef(null);

  const doRefresh = async (s, ao, eng) => {
    setMsg(prev => ({...prev, loading:true}));
    try {
      const text = eng==="online" ? await generateAIOnline(s, ao) : generateAIOffline(s, ao);
      setMsg({text, loading:false, ts:new Date()});
    } catch {
      setMsg({text: generateAIOffline(s, ao) + "\n\n[Claude API non disponibile — modalità offline attiva]", loading:false, ts:new Date()});
    }
  };

  const scheduleRefresh = (s, ao, eng) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doRefresh(s, ao, eng), 400);
  };

  useEffect(() => { doRefresh(sim, autoOn, engine); }, []);
  useEffect(() => { if (lastAutoOn.current !== autoOn) { lastAutoOn.current = autoOn; scheduleRefresh(sim, autoOn, engine); } }, [autoOn]);
  useEffect(() => { scheduleRefresh(sim, autoOn, engine); }, [engine]);
  useEffect(() => {
    const key = Object.entries(sim.alarmState||{}).filter(([,v]) => v!=="OK").map(([p,v]) => p+v).join("");
    if (key !== lastAlarmKey.current) { lastAlarmKey.current = key; scheduleRefresh(sim, autoOn, engine); }
  }, [sim.alarmState]);
  useEffect(() => {
    const id = setInterval(() => scheduleRefresh(sim, autoOn, engine), 30000);
    return () => clearInterval(id);
  }, [autoOn, engine]);

  const modeColor = autoOn ? t.green : t.orange;
  const modeLabel = autoOn ? "AUTO-CORREZIONE" : "GUIDA MANUALE";
  const modeIcon  = autoOn ? "🤖" : "💡";

  const iconBtn = {
    width:30, height:28, display:"flex", alignItems:"center", justifyContent:"center",
    borderRadius:6, cursor:"pointer", fontFamily:"'Share Tech Mono',monospace", fontSize:13,
    border:`1px solid ${t.border}`, background:t.surface2, color:t.textSec,
  };

  return (
    <div style={{background:t.surface, border:`2px solid ${modeColor}66`, borderRadius:12, padding:14, display:"flex", flexDirection:"column", flex:1, minHeight:180, position:"relative", overflow:"hidden", boxShadow:t.cardShadow}}>
      <div style={{position:"absolute", inset:0, opacity:0.03, background:`radial-gradient(ellipse at top,${modeColor},transparent 60%)`, pointerEvents:"none"}}/>

      {/* ── HEADER ── */}
      {/* Row 1: titolo + selezione motore */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9}}>
        <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, letterSpacing:2, textTransform:"uppercase", color:t.textSec, display:"flex", alignItems:"center", gap:6}}>
          <span style={{color:modeColor}}>▸</span>AI ADVISOR
        </div>
        <div style={{display:"flex", gap:0, border:`1px solid ${t.border}`, borderRadius:6, overflow:"hidden", flexShrink:0}}>
          <button onClick={() => setEngine("offline")}
            style={{padding:"4px 11px", cursor:"pointer", fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1, border:"none", borderRight:`1px solid ${t.border}`, background:engine==="offline"?`${modeColor}22`:"transparent", color:engine==="offline"?modeColor:t.textMuted, fontWeight:engine==="offline"?700:400}}>
            LOCAL
          </button>
          <button
            title="Richiede backend server (prossimamente)"
            onClick={() => alert("Funzione CLOUD richiede un server backend.\nDisponibile nella prossima versione.")}
            style={{padding:"4px 11px", cursor:"not-allowed", fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1, border:"none", background:"transparent", color:t.textMuted, opacity:0.55, display:"flex", alignItems:"center", gap:3}}>
            CLOUD <span style={{fontSize:9}}>🔒</span>
          </button>
        </div>
      </div>

      {/* Row 2: badge modalità + azioni */}
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", gap:8, marginBottom:11}}>
        <span style={{fontSize:12, padding:"3px 10px", borderRadius:5, background:`${modeColor}22`, color:modeColor, border:`1px solid ${modeColor}55`, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, whiteSpace:"nowrap", display:"inline-flex", alignItems:"center", gap:5}}>
          <span>{modeIcon}</span>{modeLabel}
        </span>
        <div style={{display:"flex", gap:5, flexShrink:0}}>
          <button onClick={() => { if (confirm("Cancellare lo storico di apprendimento (snapshot + gain adattivi)?")) { resetLearning(); doRefresh(sim, autoOn, engine); } }}
            title="Reset apprendimento" style={iconBtn}>
            ⟲
          </button>
          <button onClick={() => doRefresh(sim, autoOn, engine)} disabled={msg.loading}
            title="Aggiorna analisi"
            style={{...iconBtn, width:"auto", padding:"0 12px", gap:5, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:msg.loading?"wait":"pointer", color:msg.loading?t.textMuted:t.textSec}}>
            <span style={{fontSize:13, display:"inline-block", animation:msg.loading?"spin 0.8s linear infinite":"none"}}>↻</span>
            {msg.loading ? "..." : "Aggiorna"}
          </button>
        </div>
      </div>

      {/* ── BODY ── */}
      <div style={{flex:1, overflowY:"auto", maxHeight:220, paddingRight:4}}>
        {msg.loading ? (
          <div style={{display:"flex", alignItems:"center", justifyContent:"center", gap:8, padding:"28px 0", color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontSize:14}}>
            <span style={{animation:"blink 0.7s infinite", fontSize:14, color:modeColor}}>●</span>
            {engine==="online" ? "Interrogazione Claude API..." : "Analisi in corso..."}
          </div>
        ) : (
          <AIMessage text={msg.text} t={t} modeColor={modeColor} />
        )}
      </div>

      {/* ── FOOTER ── */}
      {msg.ts && !msg.loading && (
        <div style={{marginTop:10, paddingTop:8, borderTop:`1px solid ${t.border}`, display:"flex", justifyContent:"space-between", alignItems:"center", fontSize:11, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace"}}>
          <span>Aggiornato {msg.ts.toLocaleTimeString("it-IT")}</span>
          <span style={{display:"inline-flex", alignItems:"center", gap:5, color:engine==="online"?t.accent:t.textMuted}}>
            <span style={{width:6, height:6, borderRadius:"50%", background:engine==="online"?t.accent:t.green, display:"inline-block"}}/>
            {engine==="online"?"CLAUDE API":"OFFLINE"}
          </span>
        </div>
      )}
    </div>
  );
}
