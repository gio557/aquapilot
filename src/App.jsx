import { useState, useEffect, useMemo } from "react";
import { useBreakpoint } from "./hooks/useWindowSize";
import { DARK, LIGHT } from "./constants/theme";
import { STAGE_META, STAGE_TYPES, TIME_RANGES } from "./constants/stages";
import { DEFAULT_STAGE_CONFIG, makeDefaultStageConfig } from "./constants/stageConfig";
import { STAGE_TREND_DEFS, stageAvailableMetrics } from "./constants/stageTrend";
import { NORMATIVA_TAB4, NORMATIVA_SETS } from "./constants/normativa";
import { limitsFromNorms } from "./constants/limits";
import { dataSourceTag, QUALITY_SOURCE_DEFAULTS } from "./constants/dataSource";
import { EVENT_TYPES } from "./constants/events";
import { useSimulation } from "./hooks/useSimulation";
import { requestOsmosiCIP } from "./simulation/commands";
import { savePumpHours, pumpKey, pumpMaintH } from "./simulation/pumpHours";
import { loadConsumabili, saveConsumabili } from "./simulation/consumabili";
import { loadPumpsRegistry, savePumpsRegistry, resolveLinks, migrateToRegistry } from "./simulation/pumpsRegistry";
import MaintenancePopup from "./components/ui/MaintenancePopup";
import ConsumabiliPopup from "./components/ui/ConsumabiliPopup";
import GreenEcoLogo from "./components/GreenEcoLogo";
import StageCard from "./components/StageCard";
import StageDetailPopup from "./components/StageDetailPopup";
import { useControlBroadcast } from "./hooks/useControlChannel";
import ConfigurazionePage from "./components/ConfigurazionePage";
import AIPanel from "./components/AIPanel";
import StoricaPage from "./components/StoricaPage";
import EnergiaPage from "./components/EnergiaPage";
import AlarmRow from "./components/ui/AlarmRow";
import CustomTooltip from "./components/ui/CustomTooltip";
import AnomalyDot from "./components/ui/AnomalyDot";
import BlockingAlarmPopup from "./components/ui/BlockingAlarmPopup";
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
  const bp = useBreakpoint(); // "sm" | "md" | "lg" | "xl"

  const { sim, setSim } = useSimulation();

  // Mirror sim state to the Control Room tab and accept its control commands.
  useControlBroadcast(sim, setSim, darkMode);

  // Smoothed display values — EMA with alpha=0.10 so numbers drift gradually
  const ALPHA = 0.10;
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
        NO3:    lerp(base.NO3  ?? sim.output.NO3  ?? 0, sim.output.NO3  ?? 0),
        NTOT:   lerp(base.NTOT ?? sim.output.NTOT ?? 0, sim.output.NTOT ?? 0),
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

  // EMA-smooth the per-stage energy readouts (each processor adds random kw
  // jitter every tick) so the consumption bars/numbers drift instead of flicker.
  const [stageEnergyDisp, setStageEnergyDisp] = useState(null);
  useEffect(() => {
    const arr = sim.stageEnergy;
    if (!Array.isArray(arr)) return;
    setStageEnergyDisp(prev => arr.map((v, i) => {
      const p = prev?.[i];
      return Number.isFinite(p) ? p + ALPHA * (v - p) : v;
    }));
  }, [sim.stageEnergy]);
  const seDisp = stageEnergyDisp ?? (sim.stageEnergy || []);

  // Compute initial stageConfig + pumpsRegistry together so migration (old
  // inline pump objects → link format + separate registry) runs exactly once.
  const [_init] = useState(() => {
    const sc = (() => {
      try {
        const saved = localStorage.getItem("aquapilot.stageConfig.v3");
        return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG));
      } catch { return JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG)); }
    })();
    const pr = loadPumpsRegistry();
    const needsMigration =
      pr.dosatrici.length === 0 && pr.inverter.length === 0 &&
      sc.some(s => (s.pumps || []).some(p => p.name !== undefined));
    if (!needsMigration) return { sc, pr };
    const cp = (() => {
      try { return JSON.parse(localStorage.getItem("aquapilot.customPumps.v1") || "[]") || []; }
      catch { return []; }
    })();
    const { registry, configs } = migrateToRegistry(sc, cp);
    return { sc: configs, pr: registry };
  });
  const [stageConfig, setStageConfig] = useState(_init.sc);
  const [pumpsRegistry, setPumpsRegistry] = useState(_init.pr);
  const [stages, setStages] = useState(() => {
    try {
      const saved = localStorage.getItem("aquapilot.stages.v3");
      return saved ? JSON.parse(saved) : STAGE_META;
    } catch { return STAGE_META; }
  });
  const [norms, setNorms] = useState(() => {
    try {
      const saved = localStorage.getItem("aquapilot.norms.v1");
      return saved ? JSON.parse(saved) : JSON.parse(JSON.stringify(NORMATIVA_TAB4));
    } catch { return JSON.parse(JSON.stringify(NORMATIVA_TAB4)); }
  });
  const [energyPrice, setEnergyPrice] = useState(() => {
    try {
      const saved = localStorage.getItem("aquapilot.energyPrice.v1");
      return saved != null ? parseFloat(saved) : 0.22;
    } catch { return 0.22; }
  });
  useEffect(() => {
    try { localStorage.setItem("aquapilot.energyPrice.v1", String(energyPrice)); } catch { /* storage non disponibile */ }
  }, [energyPrice]);

  // Provenienza dati dei parametri di QUALITÀ USCITA (sensore/analizzatore/stimato),
  // configurabile dall'utente. Merge col default per assorbire eventuali nuove chiavi.
  const [qualitySources, setQualitySources] = useState(() => {
    try {
      const saved = localStorage.getItem("aquapilot.qualitySources.v1");
      return saved ? { ...QUALITY_SOURCE_DEFAULTS, ...JSON.parse(saved) } : { ...QUALITY_SOURCE_DEFAULTS };
    } catch { return { ...QUALITY_SOURCE_DEFAULTS }; }
  });
  useEffect(() => {
    try { localStorage.setItem("aquapilot.qualitySources.v1", JSON.stringify(qualitySources)); } catch { /* storage non disponibile */ }
  }, [qualitySources]);

  // Effective quality limits derived from the selected normativa. Single source
  // of truth for every reference shown in the UI (stage gauges, QUALITÀ USCITA
  // panel) and the alarm engine, so changing the regulation updates them all.
  const qualityLimits = useMemo(() => limitsFromNorms(norms), [norms]);

  // Sync normativa targets → sim.stageTargets whenever norms changes
  useEffect(() => {
    const find = (id) => norms.flatMap(c => c.params).find(p => p.id === id);
    const COD = find("COD")?.target_max ?? 125;
    const SST = find("SST")?.target_max ?? 35;
    const NH4 = find("NH4")?.target_max ?? 8;
    setSim(prev => ({ ...prev, stageTargets: { COD, SST, NH4 } }));
  }, [norms]);

  // Push the derived limits into the simulation so the alarm engine evaluates
  // breaches against the selected normativa instead of the static defaults.
  useEffect(() => {
    setSim(prev => ({ ...prev, limits: qualityLimits }));
  }, [qualityLimits]);

  const [page, setPage] = useState("dashboard");
  const [showAlarms, setShowAlarms] = useState(false);

  // Open the Control Room in a dedicated browser tab. The simulation engine keeps
  // running here (main tab); the Control Room mirrors state and sends control
  // commands back over a BroadcastChannel.
  const openControlRoom = () => {
    const url = `${window.location.pathname}?view=controlroom`;
    window.open(url, "aquapilot-controlroom", "noopener");
  };
  const [selectedStage, setSelectedStage] = useState(null);
  const [timeRange, setTimeRange] = useState("1h");
  const [activeTrends, setActiveTrends] = useState(["COD","O2"]);
  const [trendNode, setTrendNode] = useState("plant"); // "plant" | stage index
  // Mostra/nascondi i marker di anomalia su TUTTI i grafici (live + storico).
  const [showMarkers, setShowMarkers] = useState(() => {
    try { const s = localStorage.getItem("aquapilot.showMarkers.v1"); return s == null ? true : s === "true"; }
    catch { return true; }
  });
  useEffect(() => { try { localStorage.setItem("aquapilot.showMarkers.v1", String(showMarkers)); } catch { /* storage non disponibile */ } }, [showMarkers]);
  const [clock, setClock] = useState(new Date());
  const [dismissedDiag, setDismissedDiag] = useState([]);
  const [dismissedBlocking, setDismissedBlocking] = useState([]);
  const [dismissedMaint, setDismissedMaint] = useState([]);
  const [dismissedConsumabili, setDismissedConsumabili] = useState([]);
  const [consumabili, setConsumabili] = useState(() => loadConsumabili());

  useEffect(() => {
    const id = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const activeAlarms = Object.entries(sim.alarmState || {}).filter(([,v]) => v !== "OK");
  const critAlarms   = activeAlarms.filter(([,v]) => v === "ALTO");

  // Probable-cause diagnostics: fire when auto-correction can't recover a
  // parameter (actuator saturated/faulted). Show those the operator hasn't
  // dismissed; once a diagnostic clears, drop it from the dismissed list so it
  // can re-surface if the fault recurs.
  const diagnostics = sim.diagnostics || [];
  const diagIds = diagnostics.map(d => d.id).join(",");
  useEffect(() => {
    const ids = diagnostics.map(d => d.id);
    setDismissedDiag(prev => prev.filter(id => ids.includes(id)));
  }, [diagIds]);
  const activeDiag = diagnostics.filter(d => !dismissedDiag.includes(d.id));

  // ── Blocking / critical alarms ──────────────────────────────────────────────
  // Covers: motor overload (ALLARME_MOTORE) + ALTO quality parameters.
  // Each entry: { id, kind, icon, col, title, stageName?, msg, causa, action }
  const QUAL_BLOCKING = {
    COD:  { icon:"🧪", title:"COD critico",
      msg:"Il COD in uscita supera la soglia critica di scarico.",
      causa:"Efficienza biologica ridotta: probabile sovraccarico organico, carenza di O₂ nel reattore, o biomassa in stress.",
      action:"Verificare O₂ disciolto e percentuale soffianti. Controllare il carico in ingresso (portata e concentrazione). Ridurre la portata se possibile." },
    BOD5: { icon:"🧪", title:"BOD₅ critico",
      msg:"Il BOD₅ in uscita supera la soglia critica di scarico.",
      causa:"Degradazione biologica incompleta: aerazione insufficiente o biomassa in fase di declino.",
      action:"Aumentare il setpoint delle soffianti. Verificare MLSS e portata di ricircolo fanghi (RAS)." },
    TSS:  { icon:"🌊", title:"TSS critico",
      msg:"I solidi sospesi totali in uscita superano la soglia critica.",
      causa:"Sedimentazione inefficiente, rigonfiamento del fango (bulking filamentoso) o esaurimento coagulante.",
      action:"Aumentare il dosaggio coagulante. Verificare la blanket del sedimentatore e la portata RAS. Controllare SVI se disponibile." },
    NH4:  { icon:"⚗️", title:"NH₄ critico",
      msg:"L'ammoniaca in uscita supera la soglia critica di scarico.",
      causa:"Nitrificazione insufficiente: temperatura effluente bassa, carenza di O₂, pH fuori range ottimale (7.0–8.0) o biomassa nitrificante carente.",
      action:"Aumentare l'aerazione. Verificare temperatura e pH in ingresso al biologico. Controllare l'età del fango (SRT)." },
    O2:   { icon:"💨", title:"O₂ disciolto critico",
      msg:"Il livello di O₂ disciolto nel reattore biologico è sceso sotto la soglia critica.",
      causa:"Capacità di aerazione insufficiente rispetto al carico organico. Possibile guasto soffianti, diffusori intasati o membrana forata.",
      action:"Verificare stato e percentuale apertura soffianti. Ispezionare i diffusori. Ridurre il carico in ingresso se possibile." },
    pH:   { icon:"⚗️", title:"pH fuori range critico",
      msg:"Il pH dell'effluente è uscito dal range critico di accettabilità.",
      causa:"Mancato dosaggio del reagente correttivo (NaOH o H₂SO₄) o serbatoio esaurito. Possibile guasto pompa dosaggio.",
      action:"Verificare i livelli dei serbatoi di NaOH e H₂SO₄. Controllare le pompe di dosaggio reagenti. Eseguire calibrazione sonde pH." },
  };
  const blockingAlarms = (() => {
    const result = [];
    // 1. Motor overload (ALLARME_MOTORE) — per ogni stadio Grigliatura
    stages.forEach((st, si) => {
      if (st.name !== "Grigliatura") return;
      const state = Array.isArray(sim.stageStates) ? sim.stageStates[si] : sim.grigliaturaState;
      if (state?.fase === "ALLARME_MOTORE") {
        result.push({ id:`motor_${si}`, kind:"motor", col:t.red,
          icon:"⚙️", title:"ALLARME MOTORE — Grigliatura", stageName:`ST-${String(si+1).padStart(2,"0")}`,
          msg:"Il motore della grigliatura è andato in protezione per sovraccarico di corrente. Lo stadio è bloccato e non filtra il liquame fino a reset manuale.",
          causa:"Griglia intasata da materiale grossolano o corpo estraneo incastrato nel gruppo pressa. Possibile guasto meccanico del motore o della trasmissione.",
          action:"1. Ispezionare visivamente la griglia e il gruppo pressa. 2. Rimuovere eventuali ostruzioni in sicurezza (impianto fermo). 3. Premere RESET sul pannello Grigliatura per riavviare. 4. Monitorare la corrente nei primi minuti dopo il riavvio.",
        });
      }
    });
    // 2. ALTO quality parameters
    Object.entries(sim.alarmState || {}).forEach(([key, sev]) => {
      if (sev !== "ALTO") return;
      const def = QUAL_BLOCKING[key];
      if (!def) return;
      result.push({ id:`quality_${key}`, kind:"quality", col:t.orange, ...def });
    });
    return result;
  })();
  const blockingIds = blockingAlarms.map(a => a.id).join(",");
  useEffect(() => {
    const ids = blockingAlarms.map(a => a.id);
    setDismissedBlocking(prev => prev.filter(id => ids.includes(id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blockingIds]);
  const activeBlocking = blockingAlarms.filter(a => !dismissedBlocking.includes(a.id));

  // ── Manutenzione programmata pompe ──────────────────────────────────────────
  // Una pompa abilitata con soglia > 0 che supera le ore impostate genera una
  // notifica; alla stessa logica di dismiss/riemersione della diagnostica.
  // Resolved pumps (full objects) used for engine, popup, maint alerts.
  // Recomputed whenever stageConfig links or registry entries change.
  const resolvedStageConfig = useMemo(() =>
    stageConfig.map(sc => ({ ...sc, pumps: resolveLinks(sc.pumps, pumpsRegistry) })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [JSON.stringify(stageConfig), JSON.stringify(pumpsRegistry)]);

  const maintAlerts = (() => {
    const out = [];
    const hours = sim.pumpHours || {};
    stages.forEach((st, si) => {
      (resolvedStageConfig[si]?.pumps ?? []).forEach(p => {
        const thr = pumpMaintH(p);
        if (thr <= 0 || !p.enabled) return;
        const h = hours[pumpKey(st.name, p.id)] || 0;
        if (h >= thr) out.push({
          id: `maint_${st.name}_${p.id}`, stageName: st.name,
          stageTag: `ST-${String(si + 1).padStart(2, "0")}`,
          pumpId: p.id, pump: p.name, hours: h, threshold: thr,
        });
      });
    });
    return out;
  })();
  const maintIds = maintAlerts.map(a => a.id).join(",");
  useEffect(() => {
    const ids = maintAlerts.map(a => a.id);
    setDismissedMaint(prev => prev.filter(id => ids.includes(id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maintIds]);
  const activeMaint = maintAlerts.filter(a => !dismissedMaint.includes(a.id));

  // Reset a pump's run-hour counter (after servicing). Persist immediately so a
  // reload right after won't resurrect the old value from localStorage.
  const handleResetPumpHours = (stageName, pumpId) => {
    setSim(prev => {
      const next = { ...prev.pumpHours, [pumpKey(stageName, pumpId)]: 0 };
      savePumpHours(next);
      return { ...prev, pumpHours: next };
    });
  };
  // Persist consumabili config on every change.
  useEffect(() => { saveConsumabili(consumabili); }, [consumabili]);

  // Persist pumpsRegistry on every change.
  useEffect(() => { savePumpsRegistry(pumpsRegistry); }, [pumpsRegistry]);

  const handleConsumabili = (updater) => {
    setConsumabili(prev => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      // Clear productId on dosing pumps whose product was removed
      const ids = new Set(next.map(c => c.id));
      setPumpsRegistry(pr => ({
        ...pr,
        dosatrici: pr.dosatrici.map(p =>
          p.productId && !ids.has(p.productId) ? { ...p, productId: null } : p
        ),
      }));
      return next;
    });
  };

  const onToggleSensor = (productId, tipo) => {
    setSim(prev => {
      const cur = prev.consumabiliSensors?.[productId] || {};
      return {
        ...prev,
        consumabiliSensors: {
          ...prev.consumabiliSensors,
          [productId]: { ...cur, [tipo]: !cur[tipo] },
        },
      };
    });
  };

  const consumabiliAlerts = (() => {
    const out = [];
    const sensors = sim.consumabiliSensors || {};
    consumabili.forEach(c => {
      const s = sensors[c.id] || {};
      if (s.vuoto)    out.push({ id:`cons_vuoto_${c.id}`,    tipo:"vuoto",    ...c });
      else if (s.riordino) out.push({ id:`cons_riordino_${c.id}`, tipo:"riordino", ...c });
    });
    return out;
  })();
  const consumabiliAlertIds = consumabiliAlerts.map(a => a.id).join(",");
  useEffect(() => {
    const ids = consumabiliAlerts.map(a => a.id);
    setDismissedConsumabili(prev => prev.filter(id => ids.includes(id)));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [consumabiliAlertIds]);
  const activeConsumabili = consumabiliAlerts.filter(a => !dismissedConsumabili.includes(a.id));
  // ─────────────────────────────────────────────────────────────────────────────

  // Reset to plant view if the selected stage node no longer exists
  useEffect(() => {
    if (trendNode !== "plant" && trendNode >= stages.length) setTrendNode("plant");
  }, [stages.length, trendNode]);

  // Close the detail popup if its stage was removed (avoid showing a shifted stage)
  useEffect(() => {
    if (selectedStage != null && selectedStage >= stages.length) setSelectedStage(null);
  }, [stages.length, selectedStage]);

  // Show the plant-wide trend (GEN. IMPIANTO) whenever the dashboard is opened
  useEffect(() => {
    if (page === "dashboard") setTrendNode("plant");
  }, [page]);

  // Available metric definitions for the selected node
  const nodeMetricDefs = trendNode === "plant"
    ? TREND_KEYS
    : stageAvailableMetrics(stages[trendNode]?.name, stageConfig[trendNode]);
  const nodeMetrics = nodeMetricDefs.map(d => d.key);

  // Auto-select all available metrics when the selected node's identity or its
  // metric set changes. Keyed on node name + metric keys (not the bare index),
  // so a reorder/removal that shifts which stage sits at this index re-selects.
  const nodeKey = trendNode === "plant"
    ? "plant"
    : `${stages[trendNode]?.name ?? "?"}|${nodeMetrics.join(",")}`;
  useEffect(() => {
    setActiveTrends(nodeMetrics);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nodeKey]);

  const trendData = (() => {
    const pts = { "15m":15, "1h":60, "6h":72, "24h":96 }[timeRange] || 60;
    const win = (sim.trend || []).slice(-pts);
    if (trendNode === "plant") return win;
    return win.map(pt => {
      const sw = pt.stages?.[trendNode];
      return sw ? { t: pt.t, ...sw } : { t: pt.t };
    });
  })();

  const handleAddStage = (stageType) => {
    const typeOrder = STAGE_TYPES.findIndex(st => st.name === stageType.name);
    const insertIdx = (() => {
      const idx = stages.findIndex(s => STAGE_TYPES.findIndex(st => st.name === s.name) > typeOrder);
      return idx === -1 ? stages.length : idx;
    })();
    const newStage  = { id: Date.now(), name: stageType.name, sub: stageType.sub };
    const newConfig = makeDefaultStageConfig(insertIdx, stageType.name);
    setStages(prev => { const a = [...prev]; a.splice(insertIdx, 0, newStage);  return a; });
    setStageConfig(prev => { const a = [...prev]; a.splice(insertIdx, 0, newConfig); return a; });
  };

  const handleRemoveStage = (si) => {
    setStages(prev => prev.filter((_, i) => i !== si));
    setStageConfig(prev => prev.filter((_, i) => i !== si));
  };

  const autoOn = sim.autoCorrect?.enabled ?? false;
  const card = { background:t.surface, border:`2px solid ${t.border}`, borderRadius:12, boxShadow:t.cardShadow };

  // Locate special stages by NAME (matches engine.js), not by fixed index —
  // the stage list can be reordered, added to, or have earlier stages removed.
  const dissIdx = stages.findIndex(s => s.name === "Dissabbiatura");
  const grIdx   = stages.findIndex(s => s.name === "Grigliatura");
  const osmoIdx = stages.findIndex(s => s.name === "Osmosi Inversa");

  const classifierCfgJson = JSON.stringify(stageConfig[dissIdx]?.classifier);
  useEffect(() => {
    const cfg = stageConfig[dissIdx]?.classifier;
    if (cfg) setSim(prev => ({ ...prev, classifierConfig: { ...prev.classifierConfig, ...cfg } }));
  }, [classifierCfgJson]);

  const grCfgJson = JSON.stringify(stageConfig[grIdx]?.grigliatura);
  useEffect(() => {
    const cfg = stageConfig[grIdx]?.grigliatura;
    if (cfg) setSim(prev => ({ ...prev, grigliaturaConfig: { ...prev.grigliaturaConfig, ...cfg } }));
  }, [grCfgJson]);

  const stagesJson = JSON.stringify(stages);
  useEffect(() => {
    setSim(prev => ({ ...prev, stages }));
    try { localStorage.setItem("aquapilot.stages.v3", stagesJson); } catch { /* storage non disponibile */ }
  }, [stagesJson]);

  const stageConfigJson = JSON.stringify(stageConfig);
  // Save raw (link format) stageConfig to localStorage
  useEffect(() => {
    try { localStorage.setItem("aquapilot.stageConfig.v3", stageConfigJson); } catch { /* storage non disponibile */ }
  }, [stageConfigJson]);
  // Push resolved (full pump objects) stageConfig to sim engine
  const resolvedJson = JSON.stringify(resolvedStageConfig);
  useEffect(() => {
    setSim(prev => ({ ...prev, stageConfig: resolvedStageConfig, stages }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedJson, stagesJson]);

  useEffect(() => {
    try { localStorage.setItem("aquapilot.norms.v1", JSON.stringify(norms)); } catch { /* storage non disponibile */ }
  }, [norms]);

  const handleGrigliaturaReset = () => {
    setSim(prev => {
      // The engine reads grigliatura state from stageStates[grIdx]; updating only
      // the legacy grigliaturaState alias is ignored and overwritten next tick.
      const src = (Array.isArray(prev.stageStates) ? prev.stageStates[grIdx] : null)
        ?? prev.grigliaturaState ?? {};
      const reset = {
        ...src,
        fase: "STANDBY", sovraccarico: false, ostacolo_presente: false,
        timer_fase: 0, corrente_motore: 0,
        // Drop screen clogging below the cleaning-start threshold so the motor
        // doesn't immediately re-trip on the next tick.
        intasamento: Math.min(src.intasamento ?? 0, 0.25),
        finecorsa_ritorno: true, finecorsa_partenza: false,
        allarmi: (src.allarmi || []).filter(a => a !== "ALM-02"),
      };
      const stageStates = Array.isArray(prev.stageStates)
        ? prev.stageStates.map((st, i) => i === grIdx ? reset : st)
        : prev.stageStates;
      return { ...prev, stageStates, grigliaturaState: reset };
    });
  };

  // Manually request a membrane CIP wash on the reverse-osmosis stage. Shares the
  // same pure helper used by the Control Room command path: the engine reads the
  // request flag next tick and starts the CIP cycle regardless of auto-CIP.
  const handleOsmosiCIP = () => setSim(prev => requestOsmosiCIP(prev));

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
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        select { appearance:none; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{
        position:"sticky", top:0, zIndex:100,
        background:t.surface, borderBottom:`1px solid ${t.border}`,
        padding: bp === "sm" ? "0 14px" : "0 24px",
        height: bp === "sm" ? 60 : 76,
        display:"grid", gridTemplateColumns:"1fr auto 1fr", alignItems:"center",
        gap: bp === "sm" ? 8 : 16,
      }}>
        {/* LEFT: nav buttons */}
        <div style={{display:"flex", gap: bp === "sm" ? 4 : 6}}>
          {[
            {id:"dashboard",      label: bp === "sm" || bp === "md" ? "DASH" : "DASHBOARD"},
            {id:"configurazione", label: bp === "sm" || bp === "md" ? "CONFIG" : "CONFIGURAZIONE"},
            {id:"energia",        label:"ENERGIA"},
            {id:"storica",        label:"STORICO"},
          ].map(p => (
            <button key={p.id} onClick={() => setPage(p.id)}
              style={{padding: bp === "sm" ? "6px 10px" : "7px 16px", borderRadius:7, cursor:"pointer",
                fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
                fontSize: bp === "sm" ? 12 : 14,
                letterSpacing: bp === "sm" ? 0.5 : 1,
                border:`1px solid ${page===p.id?t.accent:t.border}`,
                background:page===p.id?`${t.accent}18`:t.surface2,
                color:page===p.id?t.accent:t.textSec,
                boxShadow:page===p.id
                  ?`0 0 10px ${t.accent}55, 0 0 22px ${t.accent}28, 0 -2px 8px ${t.accent}22, 0 4px 8px #00000055`
                  :"none",
                transform:page===p.id?"translateY(-2px)":"none",
                transition:"all 0.18s"}}>
              {p.label}
            </button>
          ))}
        </div>

        {/* CENTER: AQUAPILOT + GreenEco logo */}
        <div style={{display:"flex", alignItems:"center", gap: bp === "sm" ? 8 : 14, justifyContent:"center"}}>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontWeight:900,
            fontSize: bp === "sm" ? 22 : 34,
            color:t.accent, letterSpacing: bp === "sm" ? 2 : 4, whiteSpace:"nowrap", lineHeight:1}}>
            AQUA<span style={{color:t.textSec}}>PILOT</span>
          </div>
          {bp !== "sm" && bp !== "md" && (
            <div style={{display:"flex", alignItems:"center", gap:6}}>
              <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, letterSpacing:1}}>by</span>
              <GreenEcoLogo height={42} />
            </div>
          )}
        </div>

        {/* RIGHT: clock, status, controls */}
        <div style={{display:"flex", alignItems:"center", gap: bp === "sm" ? 6 : 12, justifyContent:"flex-end"}}>
          {bp !== "sm" && (
            <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:15, color:t.textSec, letterSpacing:2}}>
              {clock.toLocaleTimeString("it-IT")}
            </div>
          )}

          <div style={{display:"flex", alignItems:"center", gap:7,
            padding: bp === "sm" ? "4px 8px" : "5px 13px", borderRadius:7,
            background:sim.running?`${t.green}15`:`${t.orange}15`,
            border:`1px solid ${sim.running?t.green:t.orange}44`}}>
            <span style={{width:8, height:8, borderRadius:"50%", background:sim.running?t.green:t.orange,
              animation:sim.running?"blink 1.4s infinite":"none", flexShrink:0}}/>
            {bp !== "sm" && (
              <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:sim.running?t.green:t.orange, letterSpacing:1}}>
                {sim.running?"SIM ATTIVA":"SIM PAUSA"}
              </span>
            )}
          </div>

          <button onClick={() => setShowAlarms(p => !p)}
            style={{position:"relative", padding: bp === "sm" ? "5px 10px" : "6px 13px", borderRadius:7, cursor:"pointer",
              fontFamily:"'Share Tech Mono',monospace", fontSize:13, letterSpacing:1,
              border:`1px solid ${activeAlarms.length>0?t.red:t.border}`,
              background:activeAlarms.length>0?`${t.red}15`:t.surface2,
              color:activeAlarms.length>0?t.red:t.textSec,
              animation:critAlarms.length>0?"pulse 1.8s infinite":"none"}}>
            🔔 {activeAlarms.length}
          </button>

          <button onClick={openControlRoom} title="Apri la Control Room in una nuova scheda"
            style={{padding: bp === "sm" ? "5px 10px" : "6px 16px", borderRadius:7, cursor:"pointer",
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize: bp === "sm" ? 12 : 14, letterSpacing:1,
              border:`1px solid ${t.accent}`, background:`${t.accent}18`, color:t.accent,
              display:"inline-flex", alignItems:"center", gap:6}}>
            🎛️ {bp !== "sm" && "CONTROL ROOM"} <span style={{fontSize:11, opacity:0.7}}>↗</span>
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

      {/* ── EVENT BANNER ── */}
      {(sim.events?.length > 0) && (
        <div style={{background:t.surface2, borderBottom:`1px solid ${t.border}`, padding:"6px 20px",
          display:"flex", alignItems:"center", gap:14, flexWrap:"wrap",
          fontFamily:"'Share Tech Mono',monospace", fontSize:12, letterSpacing:1}}>
          <span style={{color:t.textMuted}}>🎬 SCENARI ATTIVI:</span>
          {sim.events.map(ev => {
            const def = EVENT_TYPES[ev.type];
            if (!def) return null;
            const secs = ev.remaining != null ? Math.ceil(ev.remaining * 0.5) : null;
            return (
              <span key={ev.id} style={{display:"flex", alignItems:"center", gap:6, padding:"2px 10px",
                borderRadius:5, background:`${def.color}1a`, border:`1px solid ${def.color}55`, color:def.color}}>
                <span>{def.icon}</span>{def.label}
                {secs != null && <span style={{color:t.textMuted}}>· ~{secs}s</span>}
              </span>
            );
          })}
          <button onClick={openControlRoom}
            style={{marginLeft:"auto", padding:"3px 10px", borderRadius:5, cursor:"pointer",
              background:t.surface3, border:`1px solid ${t.border}`, color:t.textSec,
              fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:12}}>
            Gestisci ↗
          </button>
        </div>
      )}

      {/* ── PAGES ── */}
      {page === "configurazione" ? (
        <ConfigurazionePage t={t} config={stageConfig} onChange={setStageConfig}
          dosageMax={sim.dosageMax}
          onDosageMax={upd => setSim(prev => ({ ...prev, dosageMax: { ...prev.dosageMax, ...(typeof upd === "function" ? upd(prev.dosageMax) : upd) } }))}
          stages={stages} stageTypes={STAGE_TYPES}
          onAddStage={handleAddStage} onRemoveStage={handleRemoveStage}
          norms={norms} setNorms={setNorms} normativaSets={NORMATIVA_SETS}
          qualitySources={qualitySources} onQualitySources={setQualitySources}
          pumpHours={sim.pumpHours} onResetPumpHours={handleResetPumpHours}
          ac={sim.autoCorrect || {enabled:false}} onAC={setSim}
          consumabili={consumabili} onConsumabili={handleConsumabili}
          consumabiliSensors={sim.consumabiliSensors || {}} onToggleSensor={onToggleSensor}
          pumpsRegistry={pumpsRegistry} onPumpsRegistry={setPumpsRegistry}/>
      ) : page === "energia" ? (
        <EnergiaPage t={t} sim={sim} price={energyPrice} onPrice={setEnergyPrice} stages={stages} />
      ) : page === "storica" ? (
        <StoricaPage t={t} qualitySources={qualitySources} showMarkers={showMarkers} onShowMarkers={setShowMarkers} limits={qualityLimits} />
      ) : (
        <main style={{padding:"12px 16px", display:"flex", flexDirection:"column", gap:12,
          maxWidth: bp === "xl" ? 2200 : "100%", margin:"0 auto", width:"100%"}}>

          {/* ── STAGES ROW ── */}
          <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
            {stages.map((s, i) => (
              <StageCard key={s.id} stage={s} index={i}
                stageOutput={sim.stageOutputs?.[i]} action={sim.stageActions?.[i]}
                eff={sim.stageEff?.[i]}
                referenceSensor={stageConfig[i]?.referenceSensor} qualitySources={qualitySources}
                autoEnabled={autoOn} t={t} onClick={() => setSelectedStage(i)}
                classifierState={i === dissIdx ? sim.sandClassifier : null}
                grigliaturaState={i === grIdx ? sim.grigliaturaState : null}
                onGrigliaturaReset={i === grIdx ? handleGrigliaturaReset : undefined}
                osmosiState={i === osmoIdx ? sim.stageStates?.[osmoIdx] : null}
                onOsmosiCIP={i === osmoIdx ? handleOsmosiCIP : undefined}/>
            ))}
          </div>

          {/* ── MAIN ROW: trend | right panel ── */}
          <div style={{display:"grid",
            gridTemplateColumns: bp === "sm" ? "1fr 300px" : bp === "xl" ? "1fr 420px" : "1fr 380px",
            gap:12, minHeight:300}}>

            {/* ── TREND LIVE ── */}
            <div style={{...card, padding:14, display:"flex", flexDirection:"column", minWidth:0}}>
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
                      style={{padding:"2px 9px", borderRadius:4, cursor:"pointer",
                        fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
                        fontWeight: 400,
                        border:`${timeRange===r ? 2 : 1}px solid ${timeRange===r ? t.accent : t.border}`,
                        background: "transparent",
                        color: timeRange===r ? t.text : t.textMuted,
                        opacity: timeRange===r ? 1 : 0.65}}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              {/* node selector — one button per active stage + GEN. IMPIANTO */}
              <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:8,
                paddingBottom:8, borderBottom:`1px solid ${t.border}`}}>
                {stages.map((st, i) => {
                  const active = trendNode === i;
                  const defs = STAGE_TREND_DEFS[st.name];
                  const hasMetrics = defs && defs.length > 0;
                  return (
                    <button key={st.id ?? i} onClick={() => setTrendNode(i)}
                      title={hasMetrics ? st.name : `${st.name} — nessuna metrica trend definita`}
                      style={{padding:"3px 10px", borderRadius:5, cursor: hasMetrics ? "pointer" : "not-allowed",
                        fontFamily:"'Rajdhani',sans-serif", fontSize:12, letterSpacing:1,
                        fontWeight: 500,
                        opacity: !hasMetrics ? 0.35 : active ? 1 : 0.6,
                        border:`${active ? 2 : 1}px solid ${active ? t.accent : t.border}`,
                        background: "transparent",
                        color: active ? t.text : t.textMuted}}>
                      {st.name}
                    </button>
                  );
                })}
                <button onClick={() => setTrendNode("plant")}
                  style={{padding:"3px 11px", borderRadius:5, cursor:"pointer",
                    fontFamily:"'Rajdhani',sans-serif", fontSize:12, letterSpacing:1,
                    fontWeight: 500,
                    opacity: trendNode==="plant" ? 1 : 0.6,
                    border:`${trendNode==="plant" ? 2 : 1}px solid ${trendNode==="plant" ? t.green : t.border}`,
                    background: "transparent",
                    color: trendNode==="plant" ? t.text : t.textMuted}}>
                  GEN. IMPIANTO
                </button>
                <label title="Mostra/nascondi i marker di anomalia su tutti i grafici"
                  style={{marginLeft:"auto", display:"inline-flex", alignItems:"center", gap:6, cursor:"pointer",
                    fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted, letterSpacing:0.5, alignSelf:"center"}}>
                  <input type="checkbox" checked={showMarkers} onChange={e => setShowMarkers(e.target.checked)}
                    style={{accentColor:t.accent, cursor:"pointer", width:14, height:14}}/>
                  marker anomalie
                </label>
              </div>
              {/* metric toggles — all available metrics for the selected node */}
              <div style={{display:"flex", gap:4, flexWrap:"wrap", marginBottom:8}}>
                {nodeMetricDefs.length === 0 ? (
                  <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, padding:"3px 0"}}>
                    Nessuna metrica disponibile — abilita i sensori di questo stadio in Configurazione.
                  </span>
                ) : nodeMetricDefs.map(md => (
                  <button key={md.key} onClick={() => setActiveTrends(prev =>
                    prev.includes(md.key) ? prev.filter(k=>k!==md.key) : [...prev, md.key]
                  )}
                    style={{padding:"3px 11px", borderRadius:5, cursor:"pointer",
                      fontFamily:"'Share Tech Mono',monospace", fontSize:11, letterSpacing:1,
                      fontWeight: 400,
                      opacity: activeTrends.includes(md.key) ? 1 : 0.5,
                      border:`${activeTrends.includes(md.key) ? 2 : 1}px solid ${activeTrends.includes(md.key) ? md.color : t.border}`,
                      background: "transparent",
                      color: activeTrends.includes(md.key) ? t.text : t.textMuted}}>
                    {md.label}
                  </button>
                ))}
              </div>
              <div style={{flex:1, minHeight:200}}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trendData} margin={{top:4, right:4, bottom:0, left:-20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid}/>
                    <XAxis dataKey="t" tick={{fill:t.textMuted, fontSize:11, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false} interval={Math.max(0, Math.ceil(trendData.length / 8) - 1)}/>
                    <YAxis tick={{fill:t.textMuted, fontSize:11, fontFamily:"'Share Tech Mono',monospace"}} tickLine={false} axisLine={false}/>
                    <Tooltip content={<CustomTooltip t={t}/>}/>
                    {nodeMetricDefs.filter(md => activeTrends.includes(md.key)).map(md => (
                      <Line key={md.key} type={md.step ? "stepAfter" : "monotone"}
                        dataKey={md.key} stroke={md.color}
                        strokeWidth={1.5} dot={showMarkers ? <AnomalyDot pkey={md.key} t={t} limits={qualityLimits}/> : false} isAnimationActive={false} connectNulls/>
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
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

            {/* ── RIGHT COLUMN: QUALITÀ + AI ── */}
            <div style={{display:"flex", flexDirection:"column", gap:8, minWidth:0, overflow:"hidden"}}>

              {/* QUALITÀ USCITA */}
              <div style={{...card, padding:"14px 16px"}}>
                <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:10}}>
                  <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ QUALITÀ USCITA</span>
                  <span style={{fontSize:11, padding:"2px 8px", borderRadius:3, background:`${t.green}18`, color:t.green, fontFamily:"'Share Tech Mono',monospace", letterSpacing:1, border:`1px solid ${t.green}44`}}>LIVE</span>
                </div>
                {[
                  // key = chiave provenienza (qualitySources); il tipo di fonte
                  // (sensore/analizzatore/stimato) è configurabile in Configurazione.
                  {key:"COD",  param:"COD",  v:d.COD,  unit:" mg/L", lim:qualityLimits.COD.warn,  warn:qualityLimits.COD.pre},
                  {key:"BOD5", param:"BOD₅", v:d.BOD5, unit:" mg/L", lim:qualityLimits.BOD5.warn, warn:qualityLimits.BOD5.pre},
                  {key:"TSS",  param:"TSS",  v:d.TSS,  unit:" mg/L", lim:qualityLimits.TSS.warn,  warn:qualityLimits.TSS.pre},
                  {key:"NH4",  param:"NH₄",  v:d.NH4,  unit:" mg/L", lim:qualityLimits.NH4.warn,  warn:qualityLimits.NH4.pre},
                  {key:"NO3",  param:"NO₃",  v:d.NO3,  unit:" mg/L", lim:qualityLimits.NO3.warn,  warn:qualityLimits.NO3.pre,  requiresStage:"Denitrificazione"},
                  {key:"NTOT", param:"N-tot",v:d.NTOT, unit:" mg/L", lim:qualityLimits.NTOT.warn, warn:qualityLimits.NTOT.pre, requiresStage:"Denitrificazione"},
                  {key:"pH",   param:"pH",   v:d.pH,   unit:"",      lim:null, warn:null, phCheck:true},
                  {key:"T",    param:"T°",   v:d.T,    unit:"°C",    lim:qualityLimits.T?.crit ?? 30,  warn:qualityLimits.T?.warn ?? 28},
                  {key:"O2",   param:"O₂",   v:d.O2,   unit:" mg/L", lim:null, warn:null, o2Check:true},
                ].filter(q => !q.requiresStage || stages.some(s => s.name === q.requiresStage))
                 .map(q => {
                  let ok, fuori;
                  if (q.phCheck) {
                    const ph = qualityLimits.pH;
                    ok = q.v >= ph.low_w && q.v <= ph.high_w;
                    fuori = q.v < ph.low_c || q.v > ph.high_c;
                  }
                  else if (q.o2Check) { ok = q.v >= qualityLimits.O2.warn; fuori = q.v < qualityLimits.O2.crit; }
                  else { ok = q.v < (q.warn ?? q.lim); fuori = q.lim != null && q.v >= q.lim; }
                  const c = fuori ? t.red : ok ? t.green : t.orange;
                  const badge = fuori ? "✗ FUORI" : ok ? "✓ OK" : "⚠ PRE";
                  const srcTag = dataSourceTag(qualitySources[q.key] ?? "calc");
                  const srcColor = srcTag.kind === "sensor" ? t.accent : t.textMuted;
                  return (
                    <div key={q.param} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:`1px solid ${t.border}`}}>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <span style={{fontSize:16, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, color:t.text}}>{q.param}</span>
                        <span title={srcTag.note} style={{display:"inline-flex", alignItems:"center", gap:3, fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, color:srcColor, textTransform:"uppercase"}}>
                          <span style={{fontSize:9}}>{srcTag.icon}</span>{srcTag.word}
                        </span>
                      </div>
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
          <div style={{display:"flex", gap:12, flexWrap: bp === "sm" ? "wrap" : "nowrap", alignItems:"stretch"}}>

            {/* CONSUMI ENERGETICI */}
            <div style={{...card, padding:"16px 18px", flex:"1 1 280px", minWidth:0}}>
              <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:14}}>
                <span style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec}}>▸ CONSUMI ENERGETICI</span>
                <span style={{fontSize:11, padding:"2px 8px", borderRadius:3, background:`${t.green}18`, color:t.green, fontFamily:"'Share Tech Mono',monospace", border:`1px solid ${t.green}44`}}>LIVE</span>
              </div>
              {seDisp.map((kw, i) => {
                const total = seDisp.reduce((a,b)=>a+b,0)||1;
                const pct = Math.round(kw/total*100);
                const stageName = stages[i]?.name ?? `ST-0${i+1}`;
                const barC = i===2 ? t.accent : i===3 ? t.orange : t.green;
                return (
                  <div key={i} style={{marginBottom:11}}>
                    <div style={{display:"flex", justifyContent:"space-between", marginBottom:4}}>
                      <span style={{fontSize:14, color: i===2?t.accent:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:i===2?700:500}}>
                        ST-0{i+1} {stageName}
                      </span>
                      <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:barC}}>{kw.toFixed(2)} kW ({pct}%)</span>
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
            <div style={{...card, padding:"16px 18px", display:"flex", flexDirection:"column", flex:"2 1 340px", minWidth:0}}>
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
            <div style={{...card, padding:"16px 18px", flex:"1 1 240px", minWidth:0}}>
              <div style={{fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:14}}>▸ IMPIANTO</div>
              {(() => {
                const dm = sim.dosageMax || {};
                const abs = (pct, max, unit, dec=0) =>
                  max ? ` · ${((pct/100)*max).toFixed(dec)} ${unit}` : "";
                return [
                  {label:"Portata Ingresso", val:`${Math.round(sim.inlet?.Q??0)} m³/h`,  ref:"portata istantanea in ingresso",        color:t.accent,  kind:"sensor"},
                  {label:"COD ingresso",     val:`${Math.round(sim.inlet?.COD??0)} mg/L`, ref:"carico organico grezzo",                color:t.textSec, kind:"calc"},
                  {label:"Soffianti",        val:`${d.blower?.toFixed(0)??0}%`,           ref:`% pot. max installata${abs(d.blower??0, dm.blower,"kW",1)}`,       color: d.blower>80?t.red:d.blower>60?t.orange:t.green, kind:"command"},
                  {label:"Coagulante",       val:`${sim.coagulant??0}%`,                  ref:`% dosaggio max${abs(sim.coagulant??0, dm.coagulant,"L/h",1)}`,      color:t.orange, kind:"command"},
                  {label:"Ric. fanghi",      val:`${sim.sludgeRecycle??0}%`,              ref:`% portata max RAS${abs(sim.sludgeRecycle??0, dm.sludgeRecycle,"m³/h",0)} · target MLSS ${sim.MLSSsp??3200} mg/L`, color:t.purple, kind:"command"},
                ].map(x => {
                  const tag = dataSourceTag(x.kind);
                  const tagColor = tag.kind === "sensor" ? t.accent : t.textMuted;
                  return (
                  <div key={x.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 0", borderBottom:`1px solid ${t.border}`}}>
                    <div>
                      <div style={{display:"flex", alignItems:"center", gap:8}}>
                        <span style={{fontSize:15, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:500}}>{x.label}</span>
                        <span title={tag.note} style={{display:"inline-flex", alignItems:"center", gap:3, fontSize:9, fontFamily:"'Share Tech Mono',monospace", letterSpacing:0.5, textTransform:"uppercase", color:tagColor}}>
                          <span style={{fontSize:9}}>{tag.icon}</span>{tag.word}
                        </span>
                      </div>
                      <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:1}}>{x.ref}</div>
                    </div>
                    <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:16, fontWeight:700, color:x.color}}>{x.val}</span>
                  </div>
                  );
                });
              })()}
            </div>

            {/* PORTATA + FANGHI — strisce orizzontali impilate */}
            <div style={{flex:"1 1 230px", minWidth:0, display:"flex", flexDirection:"column", gap:12}}>

              {/* PORTATA */}
              <div style={{...card, padding:"14px 16px", flex:1, display:"flex", flexDirection:"column"}}>
                <div style={{fontSize:13, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:10}}>
                  ▸ PORTATA <span style={{width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block",marginLeft:4,boxShadow:`0 0 5px ${t.green}`,animation:"blink 1.5s infinite"}}/>
                </div>
                <div style={{flex:1, display:"flex", alignItems:"center", gap:14}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:30, fontWeight:700, color:t.accent, lineHeight:1}}>
                      {Math.round(d.Q ?? sim.inlet?.Q ?? 0)}
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:4}}>m³/h · Portata attuale</div>
                  </div>
                  <div style={{flex:1, minWidth:0, borderLeft:`1px solid ${t.border}`, paddingLeft:14}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:20, color:t.textSec, lineHeight:1}}>
                      {sim.qHistory?.length > 0
                        ? (sim.qHistory.reduce((a,b)=>a+b,0)/sim.qHistory.length).toFixed(3)
                        : "—"}
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:4}}>m³/g · Medio mobile</div>
                  </div>
                </div>
              </div>

              {/* FANGHI */}
              <div style={{...card, padding:"14px 16px", flex:1, display:"flex", flexDirection:"column"}}>
                <div style={{fontSize:13, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:10}}>
                  ▸ FANGHI <span style={{width:7,height:7,borderRadius:"50%",background:t.green,display:"inline-block",marginLeft:4,boxShadow:`0 0 5px ${t.green}`,animation:"blink 1.5s infinite"}}/>
                </div>
                <div style={{flex:1, display:"flex", alignItems:"center", gap:14}}>
                  <div style={{flex:1, minWidth:0}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:30, fontWeight:700, color:t.purple, lineHeight:1}}>
                      {Math.round(d.MLSS ?? 0)}
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:4}}>mg/L · MLSS biologico</div>
                  </div>
                  <div style={{flex:1, minWidth:0, borderLeft:`1px solid ${t.border}`, paddingLeft:14}}>
                    <div style={{fontFamily:"'Share Tech Mono',monospace", fontSize:20,
                      color: d.blower > 80 ? t.red : d.blower > 60 ? t.orange : t.green, lineHeight:1}}>
                      {d.blower?.toFixed(0) ?? 0}%
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:4}}>potenza · Soffianti</div>
                    <div style={{height:4, background:t.surface3, borderRadius:2, marginTop:6, overflow:"hidden"}}>
                      <div style={{height:"100%", width:`${d.blower??0}%`,
                        background: d.blower > 80 ? t.red : d.blower > 60 ? t.orange : t.green,
                        borderRadius:2, transition:"width 0.5s"}}/>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* CONN. */}
            <div style={{...card, padding:"14px 16px", flex:"0 0 175px", minWidth:0}}>
              <div style={{fontSize:13, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:2, color:t.textSec, marginBottom:12}}>▸ CONN.</div>
              {[
                {label:"Internet",   on:true},
                {label:"PLC/SCADA",  on:true},
                {label:"AI Engine",  on:true},
                {label:"Simulatore", on:sim.running},
              ].map(c => (
                <div key={c.label} style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8}}>
                  <span style={{fontSize:14, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", fontWeight:600}}>{c.label}</span>
                  <span style={{fontSize:11, padding:"2px 7px", borderRadius:4,
                    background:c.on?`${t.green}18`:`${t.red}18`,
                    color:c.on?t.green:t.red,
                    fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
                    border:`1px solid ${c.on?t.green:t.red}33`}}>
                    <span style={{marginRight:3, fontSize:9}}>●</span>{c.on?"ON":"OFF"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* ── FOOTER ── */}
          <div style={{borderTop:`1px solid ${t.border}`, paddingTop:10, textAlign:"center",
            fontSize:10, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", letterSpacing:2}}>
            AQUAPILOT v1.0.0 — PHASE 1 SIMULATION MODULE — © 2025 AQUAPILOT / GREENECO WASTEWATER
          </div>

        </main>
      )}

      {/* ── OVERLAYS ── */}

      {selectedStageData && (
        <StageDetailPopup
          {...selectedStageData}
          autoEnabled={autoOn}
          stageConfig={resolvedStageConfig[selectedStage] ?? null}
          qualitySources={qualitySources}
          osmosiState={selectedStage === osmoIdx ? sim.stageStates?.[osmoIdx] : null}
          onOsmosiCIP={selectedStage === osmoIdx ? handleOsmosiCIP : undefined}
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

      {/* ── ALLARMI BLOCCANTI / GRAVI: popup immediato ── */}
      <BlockingAlarmPopup
        alarms={activeBlocking}
        t={t}
        onDismiss={() => setDismissedBlocking(blockingAlarms.map(a => a.id))}
      />

      {/* ── MANUTENZIONE PROGRAMMATA POMPE: popup soglia ore ── */}
      <MaintenancePopup
        alerts={activeMaint}
        t={t}
        onService={handleResetPumpHours}
        onDismiss={() => setDismissedMaint(maintAlerts.map(a => a.id))}
      />

      {/* ── CONSUMABILI: popup livello riordino / vuoto ── */}
      <ConsumabiliPopup
        alerts={activeConsumabili}
        t={t}
        onDismiss={() => setDismissedConsumabili(consumabiliAlerts.map(a => a.id))}
      />

      {/* ── DIAGNOSTICA: pop-up causa probabile (auto-correzione inefficace) ── */}
      {activeDiag.length > 0 && (
        <div style={{position:"fixed", inset:0, zIndex:300, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
          display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
          <div style={{background:t.surface, border:`2px solid ${t.red}`, borderRadius:14, padding:0,
            width:460, maxWidth:"95vw", maxHeight:"80vh", overflowY:"auto",
            boxShadow:`0 16px 70px rgba(0,0,0,0.45), 0 0 0 1px ${t.red}33`}}>
            <div style={{display:"flex", alignItems:"center", gap:10, padding:"16px 20px",
              borderBottom:`1px solid ${t.border}`, background:`${t.red}12`}}>
              <span style={{fontSize:20, color:t.red, animation:"blink 0.8s infinite"}}>⚠</span>
              <div style={{flex:1, fontFamily:"'Orbitron',sans-serif", fontSize:14, color:t.red, letterSpacing:1.5}}>
                DIAGNOSTICA — CAUSA PROBABILE
              </div>
              <button onClick={() => setDismissedDiag(diagnostics.map(d => d.id))}
                style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text,
                  width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, flexShrink:0}}>✕</button>
            </div>
            <div style={{padding:"6px 20px 18px"}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, margin:"10px 0 14px"}}>
                L'auto-correzione non riesce a riportare uno o più parametri entro i limiti.
                Probabile guasto o anomalia di impianto:
              </div>
              {activeDiag.map(d => (
                <div key={d.id} style={{marginBottom:12, padding:"12px 14px", background:t.surface2,
                  border:`1px solid ${t.red}55`, borderRadius:10}}>
                  <div style={{display:"flex", alignItems:"center", gap:9, marginBottom:6}}>
                    <span style={{fontSize:20}}>{d.icon}</span>
                    <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15.5, color:t.red, flex:1}}>{d.title}</span>
                    {d.since && <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted,
                      background:t.surface3, padding:"2px 7px", borderRadius:4}}>dalle {d.since}</span>}
                  </div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13.5, color:t.text, lineHeight:1.5, marginBottom:8}}>{d.msg}</div>
                  {d.action && (
                    <div style={{display:"flex", gap:7, alignItems:"flex-start", paddingTop:8, borderTop:`1px dashed ${t.border}`}}>
                      <span style={{color:t.accent, fontSize:13, flexShrink:0}}>▸</span>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textSec, lineHeight:1.45}}>{d.action}</span>
                    </div>
                  )}
                </div>
              ))}
              <button onClick={() => setDismissedDiag(diagnostics.map(d => d.id))}
                style={{width:"100%", marginTop:4, padding:"9px", background:`${t.red}1a`, border:`1px solid ${t.red}66`,
                  color:t.red, borderRadius:8, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13.5,
                  cursor:"pointer", letterSpacing:1}}>
                HO PRESO VISIONE
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
