import { applyAutoCorrect } from "./autoCorrect";

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
  running: true, speed: 5, mode: "fast", tick: 0,
  blower: 75, coagulant: 60, sludgeRecycle: 70, naoh: 0, h2so4: 0,
  inlet: { Q: 1245, COD: 380, BOD5: 160, TSS: 240, NH4: 32, pH: 7.0, T: 20 },
  O2: 4.5, MLSS: 3500, MLSSsp: 3200,
  stageEff: [100, 98, 96, 95, 93],
  stageOutputs: [
    { param:"EFF", value:24,  target:24,  unit:"%",    label:"Rendimento rimozione solidi", higherIsBetter:true },
    { param:"EFF", value:37,  target:37,  unit:"%",    label:"Rendimento rimozione sabbie",  higherIsBetter:true },
    { param:"COD", value:72,  target:125, unit:"mg/L", label:"COD biologico" },
    { param:"TSS", value:22,  target:35,  unit:"mg/L", label:"SST sediment." },
    { param:"NH4", value:7.9, target:8,   unit:"mg/L", label:"NH4 uscita" },
  ],
  stageDetails: null,
  qHistory: [],
  output: { Q: 1245, COD: 22.4, BOD5: 8.1, TSS: 7.3, NH4: 0.80, pH: 7.2, T: 18.4, O2: 4.5 },
  stageEnergy: [0.35, 0.55, 13.5, 0.65, 0.32],
  energy: { kw: 15.4, kwh: 128 },
  trend: initTrend(),
  alarms: [],
  alarmState: {},
  imhoff: "",
  stageActions: {},
  classifierConfig: {
    mode: "timed", timeOn: 10, timeOff: 20, speed: 60, thresholdWarn: 3.0, thresholdAlarm: 4.2,
  },
  sandClassifier: {
    isOn: true, secondsRemaining: 600, currentDraw: 3.7, sedimentLevel: 0.25, trafficLight: "green", mode: "timed",
  },
  grigliaturaConfig: {
    DH_AVVIO_PULIZIA:0.15, DH_STOP_PULIZIA:0.05, DH_GUARDIA_ALTA:0.35, DH_MAX_FISICO:0.60,
    INTASAMENTO_AVVIO:0.60, INTASAMENTO_STOP:0.20,
    VELOCITA_INTASAMENTO:0.004, VELOCITA_PULIZIA:0.015,
    TIMER_BACKUP_INTERVALLO:1800, DURATA_MINIMA_CICLO:120,
    CORRENTE_NOMINALE:4.5, CORRENTE_SOVRACCARICO:8.0, PROB_OSTACOLO_PER_CICLO:0.03,
    PRESSA_PRECONDIZIONAMENTO:15, PRESSA_POST_CICLO:30,
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

export function simTick(s) {
  if (!s.running) return s;

  const dt = s.speed * 0.5;
  const tauO2   = s.mode === "fast" ? 3.0  : 18;
  const tauMLSS = s.mode === "fast" ? 12.0 : 80;
  const noise = (k=1) => (Math.random() - 0.5) * 0.025 * k;

  const O2t = s.blower / 100 * 8.0;
  const dO2 = (O2t - s.O2) / tauO2 * dt;
  const O2 = Math.max(0, Math.min(8, s.O2 + dO2));

  const MLSSt = 1800 + s.sludgeRecycle / 100 * 4200;
  const dMLSS = (MLSSt - s.MLSS) / tauMLSS * dt;
  const MLSS = Math.max(800, Math.min(7000, s.MLSS + dMLSS));

  const iQ   = Math.max(400,  s.inlet.Q    * (1 + noise(0.08)));
  const iCOD = Math.max(80,   s.inlet.COD  * (1 + noise(0.12)));
  const iBOD = Math.max(30,   s.inlet.BOD5 * (1 + noise(0.12)));
  const iTSS = Math.max(40,   s.inlet.TSS  * (1 + noise(0.12)));
  const iNH4 = Math.max(3,    s.inlet.NH4  * (1 + noise(0.08)));
  const ipH  = Math.max(5.5, Math.min(10, s.inlet.pH + (Math.random()-0.5)*0.02));
  const iT   = Math.max(10,  Math.min(35, s.inlet.T  + (Math.random()-0.5)*0.05));

  // ── GRIGLIATURA STATE MACHINE ────────────────────────────────
  const gCfg = s.grigliaturaConfig || {
    DH_AVVIO_PULIZIA:0.15, DH_STOP_PULIZIA:0.05, DH_GUARDIA_ALTA:0.35, DH_MAX_FISICO:0.60,
    INTASAMENTO_AVVIO:0.60, INTASAMENTO_STOP:0.20, VELOCITA_INTASAMENTO:0.004, VELOCITA_PULIZIA:0.015,
    TIMER_BACKUP_INTERVALLO:1800, DURATA_MINIMA_CICLO:120, CORRENTE_NOMINALE:4.5, CORRENTE_SOVRACCARICO:8.0,
    PROB_OSTACOLO_PER_CICLO:0.03, PRESSA_PRECONDIZIONAMENTO:15, PRESSA_POST_CICLO:30,
    RENDIMENTO_BASE:0.24, RENDIMENTO_MIN:0.05, BYPASS_AUTO:true,
  };
  const gPrev = s.grigliaturaState || {
    intasamento:0.10, delta_h:0.02, rendimento:0.24, fase:"STANDBY",
    timer_backup:0, timer_fase:0, timer_ciclo_totale:0,
    finecorsa_partenza:false, finecorsa_ritorno:true,
    corrente_motore:0, sovraccarico:false, ostacolo_presente:false,
    pressa_attiva:false, bypass_aperto:false, allarmi:[],
  };
  const g = { ...gPrev, allarmi: [...gPrev.allarmi] };

  // 1. Clogging
  const carico_norm = Math.max(0.1, iTSS / 200);
  if (g.fase === "PULIZIA_ATTIVA") {
    g.intasamento -= gCfg.VELOCITA_PULIZIA * dt;
  } else {
    g.intasamento += gCfg.VELOCITA_INTASAMENTO * carico_norm * dt;
  }
  g.intasamento = Math.max(0, Math.min(1, g.intasamento));

  // 2. Derived process variables
  g.delta_h    = +(gCfg.DH_MAX_FISICO * g.intasamento).toFixed(3);
  g.rendimento = gCfg.RENDIMENTO_BASE - (gCfg.RENDIMENTO_BASE - gCfg.RENDIMENTO_MIN) * g.intasamento;

  // 3. Bypass emergency check
  if (+g.delta_h >= gCfg.DH_GUARDIA_ALTA && !g.bypass_aperto) {
    if (!g.allarmi.includes("ALM-01")) g.allarmi.push("ALM-01");
    if (gCfg.BYPASS_AUTO) g.bypass_aperto = true;
  }
  if (+g.delta_h < gCfg.DH_AVVIO_PULIZIA && g.bypass_aperto && !g.allarmi.includes("ALM-02")) {
    g.bypass_aperto = false;
    g.allarmi = g.allarmi.filter(a => a !== "ALM-01");
  }

  // 4. Backup timer
  g.timer_backup += dt;
  const gBackup = g.timer_backup >= gCfg.TIMER_BACKUP_INTERVALLO;

  // 5. State machine
  g.timer_fase += dt;
  switch (g.fase) {
    case "STANDBY":
      g.corrente_motore = 0; g.pressa_attiva = false; g.finecorsa_ritorno = true;
      if (g.intasamento >= gCfg.INTASAMENTO_AVVIO || gBackup) {
        g.ostacolo_presente = Math.random() < gCfg.PROB_OSTACOLO_PER_CICLO;
        g.fase = "AVVIO_PRESSA"; g.timer_fase = 0; g.timer_ciclo_totale = 0;
        if (gBackup) g.timer_backup = 0;
      }
      break;
    case "AVVIO_PRESSA":
      g.pressa_attiva = true; g.corrente_motore = 0;
      if (g.timer_fase >= gCfg.PRESSA_PRECONDIZIONAMENTO) {
        g.fase = "PULIZIA_ATTIVA"; g.timer_fase = 0;
        g.finecorsa_partenza = true; g.finecorsa_ritorno = false;
      }
      break;
    case "PULIZIA_ATTIVA":
      g.pressa_attiva = true;
      g.corrente_motore = g.ostacolo_presente ? 11.0
        : +(gCfg.CORRENTE_NOMINALE * (1 + g.intasamento * 0.4) + (Math.random()-0.5)*0.15).toFixed(1);
      g.timer_ciclo_totale += dt;
      if (g.corrente_motore >= gCfg.CORRENTE_SOVRACCARICO) {
        if (!g.allarmi.includes("ALM-02")) g.allarmi.push("ALM-02");
        g.sovraccarico = true; g.fase = "ALLARME_MOTORE"; g.timer_fase = 0;
      } else if (g.intasamento <= gCfg.INTASAMENTO_STOP && g.timer_fase >= gCfg.DURATA_MINIMA_CICLO) {
        g.finecorsa_ritorno = true; g.finecorsa_partenza = false;
        g.fase = "POST_CICLO_PRESSA"; g.timer_fase = 0;
      }
      break;
    case "POST_CICLO_PRESSA":
      g.pressa_attiva = true; g.corrente_motore = 0;
      if (g.timer_fase >= gCfg.PRESSA_POST_CICLO) {
        g.pressa_attiva = false; g.fase = "STANDBY"; g.timer_fase = 0; g.timer_backup = 0;
      }
      break;
    case "ALLARME_MOTORE":
      g.pressa_attiva = false; g.corrente_motore = 0;
      g.finecorsa_ritorno = false; g.finecorsa_partenza = false;
      break;
    default: break;
  }
  const grigliaturaState = g;

  // Stage 1: Grigliatura — TSS removal depends on actual clogging state
  const s1 = { COD:iCOD*0.92, BOD5:iBOD*0.96, TSS:iTSS*(1-grigliaturaState.rendimento), NH4:iNH4, pH:ipH, T:iT };

  // Stage 2: Dissabbiatura
  const s2 = { COD:s1.COD*0.96, BOD5:s1.BOD5*0.97, TSS:s1.TSS*0.63, NH4:s1.NH4, pH:s1.pH, T:s1.T };

  // Stage 3: Biologico
  const bioC = Math.min(0.97, 0.55 + (O2 / 8) * 0.38 + (MLSS / 12000) * 0.04);
  const bioB = Math.min(0.98, 0.65 + (O2 / 8) * 0.30);
  const bioN = O2 > 1.5 ? Math.min(0.96, 0.55 + (O2 - 1.5) / 6.5 * 0.41) : (O2 / 1.5) * 0.30;
  const s3 = {
    COD:  s2.COD  * (1 - bioC),
    BOD5: s2.BOD5 * (1 - bioB),
    TSS:  s2.TSS  * 1.45,
    NH4:  s2.NH4  * (1 - bioN),
    pH:   s2.pH   - bioN * 0.45,
    T:    s2.T,
  };

  // Stage 4: Sedimentazione
  const sedE = Math.min(0.97, 0.70 + (s.coagulant / 100) * 0.27);
  const s4 = {
    COD:  s3.COD  * 0.97,
    BOD5: s3.BOD5 * 0.97,
    TSS:  s3.TSS  * (1 - sedE),
    NH4:  s3.NH4,
    pH:   s3.pH,
    T:    s3.T,
  };

  // Stage 5: Disinfezione + correzione pH
  const phForce = (s.naoh - s.h2so4) * 0.040;
  const phCap   = 2.5;
  const phCorr  = Math.max(-phCap, Math.min(phCap, phForce));
  const s5 = {
    COD:  Math.max(1,   s4.COD  * 0.99),
    BOD5: Math.max(0.5, s4.BOD5 * 0.99),
    TSS:  Math.max(0.5, s4.TSS  * 0.97),
    NH4:  Math.max(0.05,s4.NH4),
    pH:   Math.max(5.5, Math.min(10, s4.pH + phCorr)),
    T:    s4.T * 0.99,
    O2,
    Q:    iQ,
  };

  const eff = [
    Math.round(Math.max(5, Math.min(100, (grigliaturaState.rendimento / gCfg.RENDIMENTO_BASE) * 100))),
    Math.round(Math.min(99, Math.max(70, 90 + noise(4) * 100))),
    Math.round(Math.min(99, Math.max(50, bioC * 100))),
    Math.round(Math.min(99, Math.max(60, sedE * 100))),
    Math.round(Math.min(99, Math.max(85, 91 + noise(2) * 100))),
  ];

  // ── CLASSIFICATORE SABBIE ────────────────────────────────────
  const clsCfg = s.classifierConfig || { mode:"timed", timeOn:10, timeOff:20, speed:60, thresholdWarn:3.0, thresholdAlarm:4.2 };
  const prevCls = s.sandClassifier || { isOn:true, secondsRemaining:600, currentDraw:3.7, sedimentLevel:0.25, trafficLight:"green", mode:"timed" };

  const kAccum = 0.00018 * (iTSS / 200);
  let clsSediment = Math.max(0, Math.min(1, prevCls.sedimentLevel + kAccum * dt));

  let clsIsOn = prevCls.isOn;
  let clsSecRemaining = Math.max(0, prevCls.secondsRemaining - dt);
  let clsEffSpeed;

  if (clsCfg.mode === "timed") {
    if (clsSecRemaining <= 0) {
      clsIsOn = !clsIsOn;
      clsSecRemaining = (clsIsOn ? clsCfg.timeOn : clsCfg.timeOff) * 60;
    }
    clsEffSpeed = clsIsOn ? 1.0 : 0.0;
  } else {
    clsIsOn = true;
    clsEffSpeed = clsCfg.speed / 100;
    clsSecRemaining = 0;
  }

  const kExtr = 0.0009 * clsEffSpeed;
  clsSediment = Math.max(0, clsSediment - kExtr * dt);

  const nominalA = 3.7;
  const overloadFactor = 1 + 1.2 * clsSediment;
  const clsCurrent = clsEffSpeed > 0
    ? Math.max(0, +(nominalA * clsEffSpeed * overloadFactor + (Math.random()-0.5)*0.08).toFixed(1))
    : 0;

  const clsWarn  = clsCfg.thresholdWarn  ?? clsCfg.currentThreshold * 0.7 ?? 3.0;
  const clsAlarm = clsCfg.thresholdAlarm ?? clsCfg.currentThreshold      ?? 4.2;
  const clsTraffic = clsEffSpeed === 0 ? "off"
    : clsCurrent >= clsAlarm ? "red"
    : clsCurrent >= clsWarn  ? "yellow"
    : "green";

  const sandClassifier = {
    isOn: clsIsOn,
    secondsRemaining: Math.round(clsSecRemaining),
    currentDraw: clsCurrent,
    sedimentLevel: +clsSediment.toFixed(3),
    trafficLight: clsTraffic,
    mode: clsCfg.mode,
  };

  const grCorrNorm = grigliaturaState.corrente_motore / (gCfg.CORRENTE_NOMINALE || 4.5);
  const e1 = grigliaturaState.fase === "PULIZIA_ATTIVA"
    ? +(0.20 + grCorrNorm * 0.55 + (grigliaturaState.pressa_attiva ? 0.22 : 0) + Math.random()*0.02).toFixed(2)
    : grigliaturaState.pressa_attiva
      ? +(0.18 + Math.random()*0.02).toFixed(2)
      : +(0.08 + Math.random()*0.01).toFixed(2);
  const e2 = clsEffSpeed > 0
    ? +(0.15 + 1.8 * clsEffSpeed * (1 + 0.8 * clsSediment) + Math.random()*0.05).toFixed(2)
    : +(0.05 + Math.random()*0.02).toFixed(2);
  const e3 = +(s.blower/100*18 + s.sludgeRecycle/100*1.2).toFixed(2);
  const e4 = +(0.38 + s.coagulant/100*0.55 + Math.random()*0.05).toFixed(2);
  const e5 = +(0.28 + (s.naoh+s.h2so4)/100*0.35 + Math.random()*0.04).toFixed(2);
  const stageEnergy = [e1, e2, e3, e4, e5];
  const kw  = +(e1+e2+e3+e4+e5).toFixed(1);
  const kwh = +(s.energy.kwh + kw/60*dt).toFixed(1);

  const newTick = s.tick + 1;
  const TEVERY = Math.max(1, Math.round(6 / s.speed));
  let trend = s.trend;
  if (newTick % TEVERY === 0) {
    const now = new Date();
    const tLabel = `${String(now.getHours()).padStart(2,"0")}:${String(now.getMinutes()).padStart(2,"0")}`;
    trend = [...s.trend.slice(-79), {
      t: tLabel,
      COD:  +s5.COD.toFixed(1),
      BOD5: +s5.BOD5.toFixed(1),
      TSS:  +s5.TSS.toFixed(1),
      NH4:  +s5.NH4.toFixed(2),
      pH:   +s5.pH.toFixed(2),
      O2:   +s5.O2.toFixed(2),
    }];
  }

  const CHECKS = [
    {p:"COD",  v:s5.COD,  warn:125, crit:160,  unit:"mg/L", causa:"Efficienza biologica ridotta"},
    {p:"BOD₅", v:s5.BOD5, warn:25,  crit:40,   unit:"mg/L", causa:"Carico organico elevato"},
    {p:"TSS",  v:s5.TSS,  warn:35,  crit:80,   unit:"mg/L", causa:"Sedimentazione inefficiente"},
    {p:"NH₄",  v:s5.NH4,  warn:8,   crit:15,   unit:"mg/L", causa:"Nitrificazione insufficiente"},
    {p:"O₂",   v:O2,      warn:2.0, crit:1.5,  unit:"mg/L", causa:"Aerazione insufficiente", inv:true},
    {p:"pH",   v:s5.pH,   low_w:6.5,low_c:5.5, high_w:8.5, high_c:9.5, unit:"", causa:"Dosaggio reagente"},
  ];
  const prevAS = s.alarmState || {};
  const newAS = {};
  const newEvents = [];
  const hhmm = new Date().toLocaleTimeString("it-IT",{hour:"2-digit",minute:"2-digit"});

  CHECKS.forEach(c => {
    let sev = "OK";
    if (c.inv) {
      sev = c.v < c.crit ? "ALTO" : c.v < c.warn ? "MEDIO" : "OK";
    } else if (c.low_w !== undefined) {
      if (c.v < c.low_c || c.v > c.high_c) sev = "ALTO";
      else if (c.v < c.low_w || c.v > c.high_w) sev = "MEDIO";
    } else {
      sev = c.v > c.crit ? "ALTO" : c.v > c.warn ? "MEDIO" : "OK";
    }
    newAS[c.p] = sev;
    if (sev !== "OK" && sev !== prevAS[c.p]) {
      newEvents.push({
        id: Date.now() + Math.random(),
        time: hhmm, sev, auto: true,
        msg: `${c.p} ${c.inv?"sotto":"oltre"} soglia: ${c.v.toFixed(c.unit===""?2:1)} ${c.unit}`,
        causa: c.causa,
      });
    }
  });

  const alarms = newEvents.length > 0
    ? [...newEvents, ...s.alarms.slice(0, 6)]
    : s.alarms;

  const round1 = v => Math.round(v * 10) / 10;
  const round2 = v => Math.round(v * 100) / 100;

  const output = {
    Q: round1(iQ), COD: round1(s5.COD), BOD5: round1(s5.BOD5),
    TSS: round1(s5.TSS), NH4: round2(s5.NH4),
    pH: round2(s5.pH), T: round1(s5.T), O2: round2(O2),
  };

  const inletTSS = Math.max(1, s.inlet.TSS);
  const eff01 = Math.max(0, Math.min(100, round1((inletTSS - s1.TSS) / inletTSS * 100)));
  const eff02 = Math.max(0, Math.min(100, round1((s1.TSS   - s2.TSS) / Math.max(1,s1.TSS) * 100)));
  const tgt = s.stageTargets || {};
  const stageOutputs = [
    { param:"EFF",  value:eff01,           target:24,           unit:"%",    label:"Rendimento rimozione solidi", higherIsBetter:true },
    { param:"EFF",  value:eff02,           target:37,           unit:"%",    label:"Rendimento rimozione sabbie",  higherIsBetter:true },
    { param:"COD",  value:round1(s3.COD),  target:tgt.COD??125, unit:"mg/L", label:"COD biologico" },
    { param:"TSS",  value:round1(s4.TSS),  target:tgt.SST??35,  unit:"mg/L", label:"SST sediment." },
    { param:"NH4",  value:round2(s5.NH4),  target:tgt.NH4??8,   unit:"mg/L", label:"NH4 uscita" },
  ];

  const { changes: acChanges, actions: stageActions } = applyAutoCorrect(s, output, O2, MLSS);

  const stageDetails = [
    {
      icon:"🔲", function:"Rimozione meccanica dei solidi grossolani mediante griglia a rastrello motorizzato con ciclo di pulizia automatico",
      params:[
        { label:"TSS ingresso",        value:round1(s.inlet.TSS),                                  unit:"mg/L", note:"solidi totali in ingresso" },
        { label:"TSS uscita",          value:round1(s1.TSS),                                       unit:"mg/L", note:"dopo grigliatura" },
        { label:"COD ingresso",        value:round1(iCOD),                                         unit:"mg/L", note:"" },
        { label:"BOD5 ingresso",       value:round1(iBOD),                                         unit:"mg/L", note:"" },
        { label:"Portata",             value:round1(iQ),                                           unit:"m³/h", note:"" },
        { label:"Temperatura",         value:round1(iT),                                           unit:"°C",   note:"" },
        { label:"ΔH livello",          value:+grigliaturaState.delta_h,                            unit:"m",    note:`avvio>${gCfg.DH_AVVIO_PULIZIA} m | bypass>${gCfg.DH_GUARDIA_ALTA} m` },
        { label:"Intasamento griglia", value:Math.round(grigliaturaState.intasamento*100),          unit:"%",    note:"0=libera · 100=occlusa" },
        { label:"Rendimento",          value:round1(grigliaturaState.rendimento*100),               unit:"%",    note:`base:${(gCfg.RENDIMENTO_BASE*100).toFixed(0)}% · min:${(gCfg.RENDIMENTO_MIN*100).toFixed(0)}%` },
        { label:"Corrente rastrello",  value:round1(grigliaturaState.corrente_motore),              unit:"A",    note:grigliaturaState.fase==="PULIZIA_ATTIVA"?"ciclo attivo":"fermo" },
        { label:"Timer backup",        value:Math.round(grigliaturaState.timer_backup),             unit:"s",    note:`ciclo forzato ogni ${gCfg.TIMER_BACKUP_INTERVALLO} s` },
      ],
      controls:[
        { label:"Intasamento griglia", value:Math.round(grigliaturaState.intasamento*100),          unit:"%" },
        { label:"Corrente / sov.",     value:Math.round(grigliaturaState.corrente_motore/gCfg.CORRENTE_SOVRACCARICO*100), unit:"%" },
      ],
      note: grigliaturaState.allarmi.length > 0
        ? `⚠ ALLARMI: ${grigliaturaState.allarmi.join(" · ")}${grigliaturaState.bypass_aperto?" — BYPASS APERTO":""}`
        : grigliaturaState.fase === "STANDBY"
          ? `Griglia in standby — intasamento ${Math.round(grigliaturaState.intasamento*100)}% — ΔH: ${grigliaturaState.delta_h} m. Prossimo ciclo: ΔH>${gCfg.DH_AVVIO_PULIZIA}m o timer backup ${gCfg.TIMER_BACKUP_INTERVALLO}s.`
          : `Fase: ${grigliaturaState.fase} — ciclo in corso da ${grigliaturaState.timer_ciclo_totale.toFixed(0)} s — corrente rastrello: ${grigliaturaState.corrente_motore.toFixed(1)} A.`,
    },
    {
      icon:"⏳", function:"Rimozione di sabbie, ghiaie e materiali inerti per sedimentazione accelerata",
      params:[
        { label:"TSS ingresso",  value:round1(s1.TSS),  unit:"mg/L", note:"da grigliatura" },
        { label:"TSS uscita",    value:round1(s2.TSS),  unit:"mg/L", note:"sabbie e inerti rimossi" },
        { label:"COD ingresso",  value:round1(s1.COD),  unit:"mg/L", note:"" },
        { label:"BOD5 ingresso", value:round1(s1.BOD5), unit:"mg/L", note:"" },
        { label:"NH4 ingresso",  value:round2(iNH4),    unit:"mg/L", note:"" },
        { label:"pH ingresso",   value:round2(ipH),     unit:"",     note:"" },
        { label:"Corrente inverter", value:clsCurrent,  unit:"A",    note: clsIsOn ? (clsSediment > 0.6 ? "carico elevato" : "funzionamento regolare") : "fermo" },
      ],
      controls: clsCfg.mode === "continuous"
        ? [
          { label:"Velocità classificatore", value:clsCfg.speed,                              unit:"%" },
          { label:"Carico sedimento",         value:Math.round(clsSediment * 100),             unit:"%" },
        ]
        : [],
      note: clsCfg.mode === "timed"
        ? (s.autoCorrect.enabled
          ? `Classificatore temporizzato: ON ${clsCfg.timeOn} min / OFF ${clsCfg.timeOff} min. Stato attuale: ${clsIsOn?"IN FUNZIONE":"FERMO"} — prossimo cambio in ${Math.floor(clsSecRemaining/60)}:${String(clsSecRemaining%60).padStart(2,"0")}.`
          : `Classificatore temporizzato: ON ${clsCfg.timeOn} min / OFF ${clsCfg.timeOff} min. Verificare accumulo manualmente.`)
        : (s.autoCorrect.enabled
          ? `Classificatore in continuo al ${clsCfg.speed}% — corrente attuale ${clsCurrent.toFixed(1)} A (⚡${clsWarn.toFixed(1)} warn / 🔴${clsAlarm.toFixed(1)} alarm). Sedimento hopper: ${Math.round(clsSediment*100)}%.`
          : `Classificatore in continuo al ${clsCfg.speed}%. Verificare corrente inverter. Soglie: giallo ${clsWarn.toFixed(1)} A, rosso ${clsAlarm.toFixed(1)} A.`),
    },
    {
      icon:"🦠", function:"Degradazione biologica aerobica del carico organico tramite fanghi attivi",
      params:[
        { label:"COD ingresso",  value:round1(s2.COD),       unit:"mg/L", note:"da dissabbiatura" },
        { label:"COD uscita",    value:round1(s3.COD),       unit:"mg/L", note:"dopo trattamento" },
        { label:"BOD5 uscita",   value:round1(s3.BOD5),      unit:"mg/L", note:"" },
        { label:"NH4 uscita",    value:round2(s3.NH4),       unit:"mg/L", note:"dopo nitrificazione" },
        { label:"O2 disciolto",  value:round2(O2),           unit:"mg/L", note:`setpoint calcolato: ${round2(s.blower/100*8)} mg/L` },
        { label:"MLSS",          value:Math.round(MLSS),     unit:"mg/L", note:`setpoint ${s.MLSSsp ?? 3200} mg/L` },
        { label:"Rimozione COD", value:Math.round(bioC*100), unit:"%",    note:"efficienza biologica" },
        { label:"Nitrificaz.",   value:Math.round(bioN*100), unit:"%",    note:"NH4→NO3" },
      ],
      controls:[
        { label:"Soffianti",        value:s.blower,        unit:"%" },
        { label:"Ricircolo fanghi", value:s.sludgeRecycle, unit:"%" },
      ],
      note: s.autoCorrect.enabled
        ? `Sistema automatico attivo — soffianti (${s.autoCorrect.blower?.on?"ON":"OFF"}) e ricircolo fanghi (${s.autoCorrect.sludgeRecycle?.on?"ON":"OFF"}) sotto controllo. O2 setpoint adattivo in funzione di COD, BOD5 e NH4 in uscita.`
        : "Modalità manuale. Mantenere O2 > 2 mg/L per nitrificazione efficace. Regolare soffianti e ricircolo fanghi per mantenere MLSS tra 2500 e 4000 mg/L.",
    },
    {
      icon:"🌀", function:"Separazione dei fanghi biologici dall'acqua chiarificata per sedimentazione secondaria",
      params:[
        { label:"TSS ingresso",   value:round1(s3.TSS),         unit:"mg/L", note:"MLSS in sospensione" },
        { label:"TSS uscita",     value:round1(s4.TSS),         unit:"mg/L", note:"solidi residui" },
        { label:"COD uscita",     value:round1(s4.COD),         unit:"mg/L", note:"" },
        { label:"BOD5 uscita",    value:round1(s4.BOD5),        unit:"mg/L", note:"" },
        { label:"pH",             value:round2(s4.pH),          unit:"",     note:"" },
        { label:"Eff. sediment.", value:Math.round(sedE*100),   unit:"%",    note:"rimozione solidi" },
      ],
      controls:[
        { label:"Dosaggio coagulante", value:s.coagulant, unit:"%" },
      ],
      note: s.autoCorrect.enabled
        ? `Sistema automatico attivo — dosaggio coagulante (${s.autoCorrect.coagulant?.on?"ON":"OFF"}) con setpoint TSS 20 mg/L. Attuale: ${round1(s4.TSS)} mg/L.`
        : "Modalità manuale. Aumentare coagulante se TSS > 35 mg/L. IVF cono Imhoff indicativo: 150-300 mL/L ottimale.",
    },
    {
      icon:"💧", function:"Disinfezione finale e correzione pH prima dello scarico",
      params:[
        { label:"COD uscita",   value:round1(s5.COD),  unit:"mg/L", note:"limite 125" },
        { label:"BOD5 uscita",  value:round1(s5.BOD5), unit:"mg/L", note:"limite 25" },
        { label:"TSS uscita",   value:round1(s5.TSS),  unit:"mg/L", note:"limite 35" },
        { label:"NH4 uscita",   value:round2(s5.NH4),  unit:"mg/L", note:"limite 8 (target)" },
        { label:"pH finale",    value:round2(s5.pH),   unit:"",     note:"range 6.5-8.5 | setpoint 7.2" },
        { label:"T° uscita",    value:round1(s5.T),    unit:"°C",   note:"limite 30°C" },
        { label:"O2 uscita",    value:round2(O2),      unit:"mg/L", note:"" },
      ],
      controls:[
        { label:"NaOH",  value:s.naoh,  unit:"%" },
        { label:"H2SO4", value:s.h2so4, unit:"%" },
      ],
      note: s.autoCorrect.enabled
        ? `Sistema automatico attivo — correzione pH (${s.autoCorrect.pH?.on?"ON":"OFF"}) con setpoint 7.2. pH attuale: ${round2(s5.pH)}.`
        : "Modalità manuale. Dosare NaOH se pH < 6.5, H2SO4 se pH > 8.5. Verificare conformità con l'autorizzazione AIA vigente.",
    },
  ];

  return {
    ...s, ...acChanges,
    tick: newTick, O2, MLSS: Math.round(MLSS),
    stageEff: eff, output, stageOutputs, stageDetails,
    stageEnergy, energy: { kw, kwh },
    qHistory: [...(s.qHistory||[]).slice(-59), round1(iQ)],
    trend, alarms, alarmState: newAS,
    stageActions, sandClassifier, grigliaturaState,
  };
}
