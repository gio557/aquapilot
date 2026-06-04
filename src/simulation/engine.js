import { applyAutoCorrect } from "./autoCorrect";
import { STAGE_PROCESSORS, initStageState } from "./stageProcessors";
import { STAGE_META } from "../constants/stages";
import { DEFAULT_STAGE_CONFIG } from "../constants/stageConfig";
import { EVENT_TYPES } from "../constants/events";
import { QUALITY_LIMITS, MLSS_LIMITS } from "../constants/limits";

// When a parameter stays out of limit this many consecutive ticks *while its
// corrective actuator is already saturated* (maxed out, at its floor, or capped
// by a fault), we stop blaming the controller and raise a probable-cause
// diagnostic. ~40 ticks ≈ 20 s of real time, enough to rule out a normal ramp.
const DIAG_PERSIST_TICKS = 40;

// Builds the list of active probable-cause diagnostics and the per-actuator
// persistence counters. A diagnostic fires only when correction is clearly
// unable to recover a parameter — i.e. the relevant actuator can give no more.
function computeDiagnostics(prevTrack, prevDiag, ctx, hhmm) {
  const { newAS, MLSS, blower, sludge, coag, naoh, h2so4, pH,
          blowerCap, sludgeCap, coagCap, naohCap, h2so4Cap } = ctx;
  const airBad  = ["O₂","NH₄","BOD₅","COD"].some(p => newAS[p] && newAS[p] !== "OK");
  const tssBad  = newAS["TSS"] && newAS["TSS"] !== "OK";
  const phLow   = pH < QUALITY_LIMITS.pH.low_w;
  const phHigh  = pH > QUALITY_LIMITS.pH.high_w;
  const mlssLow = MLSS < MLSS_LIMITS.lo_warn;
  const mlssHi  = MLSS > MLSS_LIMITS.hi_warn;

  const defs = {
    blower: {
      active: airBad && (blower >= 98 || blowerCap < 100),
      icon: "💨",
      title: blowerCap < 100 ? "Probabile guasto soffianti" : "Aerazione insufficiente",
      msg: blowerCap < 100
        ? "Le soffianti non raggiungono la portata d'aria richiesta (limitazione attiva sull'attuatore). Probabile guasto meccanico del gruppo soffianti o blocco dei diffusori: O₂ in calo, NH₄/BOD₅/COD fuori limite."
        : "Soffianti al 100% ma O₂/NH₄/BOD₅ restano fuori limite. Probabile calo di rendimento delle soffianti, intasamento dei diffusori a bolle o sovraccarico organico in ingresso oltre la capacità dell'impianto.",
      action: "Verificare gruppo soffianti, valvole e diffusori; controllare il carico organico in ingresso.",
    },
    coagulant: {
      active: tssBad && (coag >= 98 || coagCap < 100),
      icon: "🧪",
      title: "Probabile esaurimento coagulante",
      msg: "Dosaggio coagulante al 100% ma il TSS resta fuori limite. Probabile serbatoio del coagulante esaurito, pompa dosatrice guasta/in cavitazione o flocculazione inefficiente.",
      action: "Verificare livello serbatoio coagulante, pompa dosatrice e condizioni di flocculazione/sedimentazione.",
    },
    ras: {
      active: (mlssLow && (sludge >= 98 || sludgeCap < 100)) || (mlssHi && sludge <= 20),
      icon: "⚙️",
      title: mlssHi ? "MLSS elevato non correggibile" : "Probabile guasto ricircolo fanghi",
      msg: mlssHi
        ? "Ricircolo fanghi (RAS) al minimo ma il MLSS resta elevato. Probabile eccesso di biomassa: necessario spurgo fanghi di supero (WAS) — il solo RAS non basta."
        : "Ricircolo fanghi (RAS) al massimo (o limitato da un guasto) ma il MLSS continua a calare. Probabile avaria della pompa RAS o perdita di fanghi dal sedimentatore.",
      action: mlssHi ? "Avviare/aumentare lo spurgo fanghi di supero." : "Verificare pompa RAS, linea di ricircolo e tenuta del sedimentatore secondario.",
    },
    naoh: {
      active: phLow && (naoh >= 98 || naohCap < 100),
      icon: "⚗️",
      title: "Probabile esaurimento reagente NaOH",
      msg: "Dosaggio NaOH al 100% ma il pH resta acido sotto il limite. Probabile serbatoio NaOH (soda) esaurito o pompa dosatrice guasta.",
      action: "Verificare livello serbatoio NaOH e pompa dosatrice di correzione pH.",
    },
    h2so4: {
      active: phHigh && (h2so4 >= 98 || h2so4Cap < 100),
      icon: "⚗️",
      title: "Probabile esaurimento reagente H₂SO₄",
      msg: "Dosaggio H₂SO₄ al 100% ma il pH resta basico sopra il limite. Probabile serbatoio H₂SO₄ (acido) esaurito o pompa dosatrice guasta.",
      action: "Verificare livello serbatoio H₂SO₄ e pompa dosatrice di correzione pH.",
    },
  };

  const track = {};
  const diagnostics = [];
  for (const [key, d] of Object.entries(defs)) {
    const n = d.active ? (prevTrack[key] || 0) + 1 : 0;
    track[key] = n;
    if (n >= DIAG_PERSIST_TICKS) {
      const existing = (prevDiag || []).find(x => x.id === key);
      diagnostics.push({ id: key, icon: d.icon, title: d.title, msg: d.msg, action: d.action,
        since: existing?.since || hhmm });
    }
  }
  return { diagnostics, diagTrack: track };
}

export function initTrend() {
  const pts = [];
  const now = new Date();
  for (let i = 59; i >= 0; i--) {
    const d = new Date(now - i * 60000);
    const h = d.getHours(), m = d.getMinutes();
    const s1 = Math.sin(i * 0.18), s2 = Math.cos(i * 0.12);
    pts.push({
      t: `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`,
      COD:  +(22 + s1*4  + Math.random()*2).toFixed(1),
      BOD5: +(8  + s1*2  + Math.random()*0.8).toFixed(1),
      TSS:  +(7  + s2*2  + Math.random()*1).toFixed(1),
      NH4:  +(0.8+ s2*0.3+ Math.random()*0.1).toFixed(2),
      pH:   +(7.2+ s1*0.15+ Math.random()*0.05).toFixed(2),
      O2:   +(4.5+ s1*0.6+ Math.random()*0.3).toFixed(2),
    });
  }
  return pts;
}

export const INIT_SIM = {
  running: true, speed: 1, mode: "realistic", tick: 0,
  blower: 75, coagulant: 60, sludgeRecycle: 70, naoh: 0, h2so4: 0,
  inlet: { Q: 1245, COD: 380, BOD5: 160, TSS: 240, NH4: 32, pH: 7.0, T: 20 },
  O2: 4.5, MLSS: 3500, MLSSsp: 3200,
  dosageMax: {
    blower:        75,
    coagulant:     120,
    naoh:          80,
    h2so4:         60,
    sludgeRecycle: 800,
  },
  stageEff: [100, 98, 96, 82, 95, 93],
  stageOutputs: [
    { param:"EFF", value:24,  target:24,  unit:"%",    label:"Rendimento rimozione solidi", higherIsBetter:true },
    { param:"EFF", value:37,  target:37,  unit:"%",    label:"Rendimento rimozione sabbie",  higherIsBetter:true },
    { param:"COD", value:72,  target:125, unit:"mg/L", label:"COD biologico" },
    { param:"NO3", value:4,   target:10,  unit:"mg/L", label:"NO₃ denitrificazione" },
    { param:"TSS", value:22,  target:35,  unit:"mg/L", label:"SST sediment." },
    { param:"NH4", value:7.9, target:8,   unit:"mg/L", label:"NH4 uscita" },
  ],
  stageDetails: null,
  stageConfig:  JSON.parse(JSON.stringify(DEFAULT_STAGE_CONFIG)),
  stages:       STAGE_META,
  stageStates:  null,   // per-stage persistent state (array parallel to stageConfig)
  qHistory: [],
  events: [],   // scenari/eventi attivi (vedi constants/events.js)
  output: { Q: 1245, COD: 22.4, BOD5: 8.1, TSS: 7.3, NH4: 0.80, pH: 7.2, T: 18.4, O2: 4.5 },
  stageEnergy: [0.35, 0.55, 13.5, 0.42, 0.65, 0.32],
  energy: { kw: 15.4, kwh: 128 },
  trend: initTrend(),
  alarms: [],
  alarmState: {},
  imhoff: "",
  stageActions: {},
  diagnostics: [],   // active probable-cause diagnostics (see computeDiagnostics)
  diagTrack: {},     // per-actuator persistence counters
  classifierConfig: {
    mode: "timed", timeOn: 10, timeOff: 20, speed: 60, thresholdWarn: 3.0, thresholdAlarm: 4.2,
  },
  sandClassifier: {
    isOn: true, secondsRemaining: 600, currentDraw: 3.7, sedimentLevel: 0.25, trafficLight: "green", mode: "timed",
  },
  grigliaturaConfig: {
    DH_AVVIO_PULIZIA:0.15, DH_STOP_PULIZIA:0.05, DH_GUARDIA_ALTA:0.35, DH_MAX_FISICO:0.60,
    INTASAMENTO_AVVIO:0.60, INTASAMENTO_STOP:0.20, VELOCITA_INTASAMENTO:0.004, VELOCITA_PULIZIA:0.015,
    TIMER_BACKUP_INTERVALLO:1800, DURATA_MINIMA_CICLO:120, CORRENTE_NOMINALE:4.5, CORRENTE_SOVRACCARICO:8.0,
    PROB_OSTACOLO_PER_CICLO:0.03, PRESSA_PRECONDIZIONAMENTO:15, PRESSA_POST_CICLO:30,
    RENDIMENTO_BASE:0.24, RENDIMENTO_MIN:0.05, BYPASS_AUTO:true,
  },
  grigliaturaState: {
    intasamento:0.10, delta_h:0.02, rendimento:0.24,
    fase:"STANDBY", timer_backup:0, timer_fase:0, timer_ciclo_totale:0,
    finecorsa_partenza:false, finecorsa_ritorno:true,
    corrente_motore:0, sovraccarico:false, ostacolo_presente:false,
    pressa_attiva:false, bypass_aperto:false, allarmi:[],
  },
  stageTargets: { COD: 125, SST: 35, NH4: 8 },
  autoCorrect: {
    enabled: true,
    blower:        { on: true, label: "Regolazione Soffianti",   desc: "Controlla O2 disciolto, rimozione COD/BOD5 e nitrificazione NH4" },
    coagulant:     { on: true, label: "Dosaggio Coagulante",     desc: "Regola la dose di coagulante in sedimentazione per il controllo TSS" },
    sludgeRecycle: { on: true, label: "Ricircolo Fanghi (RAS)",  desc: "Mantiene MLSS ottimale nel biologico (1800-5500 mg/L)" },
    pH:            { on: true, label: "Correzione pH",           desc: "Dosaggio automatico NaOH/H2SO4 per mantenere pH 6.5-8.5" },
  },
};

// ── sensorGauge: computes gauge data for a given sensor type at a given stage ──
function sensorGauge(si, sensorId, stageWater, tgt, O2, MLSS, s3TSS, iQ, inlet, grigliaturaState, noise, round1, round2) {
  const w = stageWater[Math.min(si, stageWater.length - 1)];
  const redoxVal = Math.round(-50 + (O2 / 8) * 350 + noise(800));
  const sblVal   = round2(Math.max(0.05, Math.min(2.5, 0.3 + (s3TSS / 2000) * 2.5 + noise(4))));
  switch (sensorId) {
    case "flow":   return { value: round1(iQ), target: round1((inlet?.Q ?? 1000) * 1.2), unit: "m³/h", label: "Portata" };
    case "level":
    case "diff_p": return { value: round2(+(grigliaturaState?.delta_h || 0)), target: 0.35, unit: "m", label: "ΔH livello" };
    case "o2":     return { value: round2(O2),    target: 2,              unit: "mg/L", label: "O₂ disciolto", higherIsBetter: true };
    case "ph":     return { value: round2(w.pH),  target: 8.0,            unit: "",     label: "pH" };
    case "tss": {
      const tssTgt = si <= 1 ? 150 : si === 2 ? 4000 : tgt.SST ?? 35;
      return { value: round1(w.TSS), target: tssTgt, unit: "mg/L", label: "TSS" };
    }
    case "temp":   return { value: round1(w.T),   target: 30,             unit: "°C",   label: "Temperatura" };
    case "cod":    return { value: round1(w.COD), target: tgt.COD ?? 125, unit: "mg/L", label: "COD" };
    case "nh4":    return { value: round2(w.NH4), target: tgt.NH4 ?? 8,   unit: "mg/L", label: "NH₄" };
    case "redox":  return { value: redoxVal,       target: 200,            unit: "mV",   label: "Redox / ORP", higherIsBetter: true };
    case "sbl":    return { value: sblVal,         target: 1.0,            unit: "m",    label: "Interfaccia fanghi" };
    default: return null;
  }
}

export function simTick(s) {
  if (!s.running) return s;

  const dt    = s.speed * 0.5;
  const noise = (k=1) => (Math.random() - 0.5) * 0.025 * k;
  const round1 = v => Math.round(v * 10) / 10;
  const round2 = v => Math.round(v * 100) / 100;

  // ── Active events: aggregate modifiers ──────────────────────────────────────
  const events = Array.isArray(s.events) ? s.events : [];
  const evMod = { Q:1, COD:1, BOD5:1, TSS:1, NH4:1, pH_delta:0, T_delta:0 };
  let blowerCap = 100, sludgeRecycleCap = 100, coagulantCap = 100, naohCap = 100, h2so4Cap = 100;
  for (const ev of events) {
    const def = EVENT_TYPES[ev.type];
    if (!def) continue;
    if (def.inlet) {
      for (const k of ["Q","COD","BOD5","TSS","NH4"]) {
        if (def.inlet[k] != null) evMod[k] *= def.inlet[k];
      }
      if (def.inlet.pH_delta) evMod.pH_delta += def.inlet.pH_delta;
      if (def.inlet.T_delta)  evMod.T_delta  += def.inlet.T_delta;
    }
    if (def.actuator) {
      if (def.actuator.blowerCap        != null) blowerCap        = Math.min(blowerCap,        def.actuator.blowerCap);
      if (def.actuator.sludgeRecycleCap != null) sludgeRecycleCap = Math.min(sludgeRecycleCap, def.actuator.sludgeRecycleCap);
      if (def.actuator.coagulantCap     != null) coagulantCap     = Math.min(coagulantCap,     def.actuator.coagulantCap);
      if (def.actuator.naohCap          != null) naohCap          = Math.min(naohCap,          def.actuator.naohCap);
      if (def.actuator.h2so4Cap         != null) h2so4Cap         = Math.min(h2so4Cap,         def.actuator.h2so4Cap);
    }
  }

  // ── Inlet water with process noise + event modifiers ────────────────────────
  const iQ   = Math.max(400,  s.inlet.Q    * evMod.Q    * (1 + noise(0.08)));
  const iCOD = Math.max(80,   s.inlet.COD  * evMod.COD  * (1 + noise(0.12)));
  const iBOD = Math.max(30,   s.inlet.BOD5 * evMod.BOD5 * (1 + noise(0.12)));
  const iTSS = Math.max(40,   s.inlet.TSS  * evMod.TSS  * (1 + noise(0.12)));
  const iNH4 = Math.max(3,    s.inlet.NH4  * evMod.NH4  * (1 + noise(0.08)));
  const ipH  = Math.max(5.0, Math.min(10, s.inlet.pH + evMod.pH_delta + (Math.random()-0.5)*0.02));
  const iT   = Math.max(4,   Math.min(35, s.inlet.T  + evMod.T_delta + (Math.random()-0.5)*0.05));

  const waterInlet = { COD:iCOD, BOD5:iBOD, TSS:iTSS, NH4:iNH4, NO3:0, pH:ipH, T:iT, Q:iQ };
  const tgt = s.stageTargets || {};

  // ── Stage pipeline ───────────────────────────────────────────────────────────
  const stageCfgs   = s.stageConfig   ?? [];
  const stages      = s.stages        ?? [];  // stage meta array { name, ... }
  const prevStates  = Array.isArray(s.stageStates) ? s.stageStates : [];

  // Globals passed to every processor — actuators limited by active faults
  const effBlower        = Math.min(s.blower,        blowerCap);
  const effSludgeRecycle = Math.min(s.sludgeRecycle, sludgeRecycleCap);
  let O2   = s.O2;
  let MLSS = s.MLSS;
  const globals = {
    dt, noise, round1, round2, tgt,
    iQ, inlet: s.inlet,
    blower:        effBlower,
    sludgeRecycle: effSludgeRecycle,
    coagulant:     Math.min(s.coagulant, coagulantCap),
    naoh:          Math.min(s.naoh,      naohCap),
    h2so4:         Math.min(s.h2so4,     h2so4Cap),
    MLSSsp:        s.MLSSsp,
    mode:          s.mode,
    autoCorrect:   s.autoCorrect,
    get O2()   { return O2; },
    get MLSS() { return MLSS; },
  };

  let water = { ...waterInlet };
  const newStageStates  = [];
  const stageOutputsArr = [];
  const stageDetailsArr = [];
  const stageEffArr     = [];
  const stageEnergyArr  = [];
  const stageWaterArr   = [];   // water quality at output of each stage

  // Map stage names to indices for autoCorrect
  const stageIndexMap = { bio: -1, sed: -1, dis: -1 };

  for (let si = 0; si < stageCfgs.length; si++) {
    const sc   = stageCfgs[si];
    const meta = stages[si] ?? { name: sc?.name ?? "?" };
    const name = meta.name ?? "?";
    const proc = STAGE_PROCESSORS[name];

    const prevState = prevStates[si] ?? initStageState(name);
    const result = proc
      ? proc(water, sc, prevState, globals)
      : { waterOut: water, newState: prevState, stageOutput: null, stageDetail: null, eff: 100, kw: 0 };

    water = result.waterOut;
    newStageStates.push(result.newState);
    stageOutputsArr.push(result.stageOutput);
    stageDetailsArr.push(result.stageDetail);
    stageEffArr.push(result.eff ?? 100);
    stageEnergyArr.push(result.kw ?? 0);
    stageWaterArr.push({ ...water });

    // Biologico / Nitrificazione update global O2/MLSS
    if (result.newO2   != null) O2   = result.newO2;
    if (result.newMLSS != null) MLSS = result.newMLSS;

    // Map key stage types to indices for autoCorrect
    if (name === "Biologico"                 ) stageIndexMap.bio = si;
    if (name === "Sedimentazione"            ) stageIndexMap.sed = si;
    if (name === "Disinfezione" || name === "Disinfezione Cloro" || name === "Disinfezione UV") stageIndexMap.dis = si;
  }

  // ── Backward-compat aliases for grigliatura / sandClassifier ─────────────────
  const grIdx   = stages.findIndex(st => st.name === "Grigliatura");
  const dissIdx = stages.findIndex(st => st.name === "Dissabbiatura");
  const grigliaturaState = grIdx   >= 0 ? newStageStates[grIdx]   : s.grigliaturaState;
  const sandClassifier   = dissIdx >= 0 ? newStageStates[dissIdx] : s.sandClassifier;

  // ── Apply sensorGauge overrides where referenceSensor is set ─────────────────
  // TSS feeding the sludge-blanket (SBL) gauge comes from the sedimentation
  // stage; locate it by name rather than assuming a fixed pipeline index.
  const sedTSSIdx = stageIndexMap.sed ?? 2;
  const s3TSS = stageWaterArr[sedTSSIdx]?.TSS ?? 0;
  for (let si = 0; si < stageCfgs.length; si++) {
    const ref = stageCfgs[si]?.referenceSensor;
    if (ref) {
      const g = sensorGauge(si, ref, stageWaterArr, tgt, O2, MLSS, s3TSS, iQ, s.inlet, grigliaturaState, noise, round1, round2);
      if (g) stageOutputsArr[si] = g;
    }
  }

  // ── Final output water ────────────────────────────────────────────────────────
  const finalWater = water;
  const finalNO3 = finalWater.NO3 ?? 0;
  const output = {
    Q:    round1(iQ),
    COD:  round1(finalWater.COD),
    BOD5: round1(finalWater.BOD5),
    TSS:  round1(finalWater.TSS),
    NH4:  round2(finalWater.NH4),
    NO3:  round2(finalNO3),
    // Total nitrogen ≈ ammoniacal + nitric (organic N negligible at this stage).
    // Without an active anoxic (denitrification) stage NO3 accumulates and N-tot
    // exceeds the discharge limit — the realistic driver for enabling Proposal A.
    NTOT: round1(finalWater.NH4 + finalNO3),
    pH:   round2(finalWater.pH),
    T:    round1(finalWater.T),
    O2:   round2(O2),
  };

  // ── Energy ────────────────────────────────────────────────────────────────────
  const kw  = +(stageEnergyArr.reduce((a, b) => a + b, 0)).toFixed(1);
  const kwh = +(s.energy.kwh + kw / 60 * dt).toFixed(1);

  // ── Alarm checks (thresholds follow the selected normativa when provided) ─────
  // s.limits is derived from the user-selected regulation (see limitsFromNorms);
  // fall back to the static defaults if it hasn't been wired in yet.
  const LIM = s.limits || QUALITY_LIMITS;
  const CHECKS = [
    {p:"COD",  v:finalWater.COD,  ...LIM.COD},
    {p:"BOD₅", v:finalWater.BOD5, ...LIM.BOD5},
    {p:"TSS",  v:finalWater.TSS,  ...LIM.TSS},
    {p:"NH₄",  v:finalWater.NH4,  ...LIM.NH4},
    {p:"O₂",   v:O2,              ...LIM.O2},
    {p:"pH",   v:finalWater.pH,   ...LIM.pH},
  ];
  const prevAS = s.alarmState || {};
  const newAS  = {};
  const newEvents = [];
  const hhmm = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});

  CHECKS.forEach(c => {
    let sev = "OK";
    let limit = null;   // threshold actually breached (for the alarm message)
    if (c.inv) {
      sev = c.v < c.crit ? "ALTO" : c.v < c.warn ? "MEDIO" : "OK";
      limit = sev === "ALTO" ? c.crit : sev === "MEDIO" ? c.warn : null;
    } else if (c.low_w !== undefined) {
      if (c.v < c.low_c || c.v > c.high_c) sev = "ALTO";
      else if (c.v < c.low_w || c.v > c.high_w) sev = "MEDIO";
      if (sev !== "OK") {
        const tooHigh = c.v > c.high_w;
        limit = tooHigh
          ? (sev === "ALTO" ? c.high_c : c.high_w)
          : (sev === "ALTO" ? c.low_c  : c.low_w);
      }
    } else {
      sev = c.v > c.crit ? "ALTO" : c.v > c.warn ? "MEDIO" : "OK";
      limit = sev === "ALTO" ? c.crit : sev === "MEDIO" ? c.warn : null;
    }
    newAS[c.p] = sev;
    if (sev !== "OK" && sev !== prevAS[c.p]) {
      const dec = c.unit === "" ? 2 : 1;
      const u = c.unit ? " " + c.unit : "";
      const limStr = limit != null ? ` su ${(+limit).toFixed(dec)}${u}` : "";
      newEvents.push({
        id: Date.now() + Math.random(),
        time: hhmm, sev, auto: true,
        msg: `${c.p} ${c.inv?"sotto":"oltre"} soglia: ${c.v.toFixed(dec)}${u}${limStr}`,
        value: +c.v.toFixed(dec), limit: limit != null ? +(+limit).toFixed(dec) : null,
        unit: c.unit, param: c.p,
        causa: c.causa,
      });
    }
  });

  const alarms = newEvents.length > 0
    ? [...newEvents, ...s.alarms.slice(0, 6)]
    : s.alarms;

  // ── Per-stage trend data (water quality + operational metrics from trendData) ───
  // Each processor emits stageDetail.trendData; we merge it with the water quality
  // values so the chart has both water params and mechanical/actuator values.
  const stageWater = stageWaterArr.map((w, i) => {
    const td = stageDetailsArr[i]?.trendData ?? {};
    return {
      COD:  round1(w.COD),
      BOD5: round1(w.BOD5),
      TSS:  round1(w.TSS),
      NH4:  round2(w.NH4),
      pH:   round2(w.pH),
      T:    round1(w.T ?? 20),
      ...td,   // operational metrics override/extend the baseline
    };
  });

  // ── Trend ─────────────────────────────────────────────────────────────────────
  const newTick = s.tick + 1;
  const TEVERY  = Math.max(1, Math.round(6 / s.speed));
  let trend = s.trend;
  if (newTick % TEVERY === 0) {
    const now = new Date();
    const tLabel = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    trend = [...s.trend.slice(-79), {
      t: tLabel,
      COD:  +finalWater.COD.toFixed(1),
      BOD5: +finalWater.BOD5.toFixed(1),
      TSS:  +finalWater.TSS.toFixed(1),
      NH4:  +finalWater.NH4.toFixed(2),
      pH:   +finalWater.pH.toFixed(2),
      O2:   +O2.toFixed(2),
      stages: stageWater,
    }];
  }

  // ── autoCorrect ───────────────────────────────────────────────────────────────
  const { changes: acChanges, actions: stageActions } = applyAutoCorrect(s, output, O2, MLSS, stageIndexMap);

  // Enforce actuator caps on the persisted values so a fault can't be overridden
  // by the operator slider or by auto-correction until the event ends.
  const persistedBlower = Math.min(acChanges.blower        ?? s.blower,        blowerCap);
  const persistedSludge = Math.min(acChanges.sludgeRecycle ?? s.sludgeRecycle, sludgeRecycleCap);
  const persistedCoag   = Math.min(acChanges.coagulant     ?? s.coagulant,     coagulantCap);
  const persistedNaoh   = Math.min(acChanges.naoh          ?? s.naoh,          naohCap);
  const persistedH2so4  = Math.min(acChanges.h2so4         ?? s.h2so4,         h2so4Cap);

  // ── Diagnostics: probable cause when correction can't recover a parameter ────
  const { diagnostics, diagTrack } = computeDiagnostics(s.diagTrack || {}, s.diagnostics, {
    newAS, MLSS,
    blower: persistedBlower, sludge: persistedSludge,
    coag: persistedCoag, naoh: persistedNaoh, h2so4: persistedH2so4,
    pH: output.pH,
    blowerCap, sludgeCap: sludgeRecycleCap, coagCap: coagulantCap, naohCap, h2so4Cap,
  }, hhmm);

  // ── Advance event countdowns, drop the expired ones ─────────────────────────
  const updatedEvents = events
    .map(ev => (ev.remaining != null ? { ...ev, remaining: ev.remaining - 1 } : ev))
    .filter(ev => ev.remaining == null || ev.remaining > 0);

  return {
    ...s, ...acChanges,
    blower: persistedBlower, sludgeRecycle: persistedSludge,
    coagulant: persistedCoag, naoh: persistedNaoh, h2so4: persistedH2so4,
    tick: newTick, O2, MLSS: Math.round(MLSS),
    stageEff: stageEffArr, output, stageOutputs: stageOutputsArr, stageDetails: stageDetailsArr,
    stageWater, stageEnergy: stageEnergyArr, energy: { kw, kwh },
    qHistory: [...(s.qHistory||[]).slice(-59), round1(iQ)],
    trend, alarms, alarmState: newAS,
    stageActions, sandClassifier, grigliaturaState,
    stageStates: newStageStates,
    events: updatedEvents,
    diagnostics, diagTrack,
  };
}
