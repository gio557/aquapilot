// Dynamic stage processors — one function per stage type.
// Each processor signature:
//   (waterIn, cfg, state, g) => { waterOut, newState, stageOutput, stageDetail, eff, kw, newO2?, newMLSS? }
//
// waterIn/waterOut: { COD, BOD5, TSS, NH4, NO3, pH, T, Q }
// cfg:   stageConfig entry (from stageConfig array)
// state: previous per-stage state object (null on first tick)
// g:     globals { dt, noise, round1, round2, tgt, iQ, blower, sludgeRecycle,
//                  coagulant, naoh, h2so4, MLSSsp, O2, MLSS, mode, autoCorrect }

import { PC } from "../constants/processConstants";

// ─── helpers ──────────────────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

// Passive removal step shared by the simple physical/chemical stages. Scales
// each listed species by (1 - removal), reports kw = base + random*jitter and
// eff (defaults to TSS removal %, override where a stage reports a fixed value).
// Single home for the water-transform contract these stages all share.
function passiveStep(water, rem, kwBase, kwJitter, effOverride) {
  const waterOut = { ...water };
  if (rem.COD_REM != null) waterOut.COD  = water.COD  * (1 - rem.COD_REM);
  if (rem.BOD_REM != null) waterOut.BOD5 = water.BOD5 * (1 - rem.BOD_REM);
  if (rem.TSS_REM != null) waterOut.TSS  = water.TSS  * (1 - rem.TSS_REM);
  if (rem.NH4_REM != null) waterOut.NH4  = water.NH4  * (1 - rem.NH4_REM);
  if (rem.NO3_REM != null) waterOut.NO3  = (water.NO3 ?? 0) * (1 - rem.NO3_REM);
  const eff = effOverride ?? Math.round((rem.TSS_REM ?? 0) * 100);
  const kw  = +(kwBase + Math.random() * kwJitter).toFixed(2);
  return { waterOut, eff, kw };
}

// ─── GRIGLIATURA ──────────────────────────────────────────────────────────────
function processGrigliatura(water, cfg, prevState, g) {
  const { dt, round1 } = g;
  const gCfg = {
    DH_AVVIO_PULIZIA:        cfg?.grigliatura?.DH_AVVIO_PULIZIA        ?? PC.GR.DH_AVVIO_PULIZIA,
    DH_STOP_PULIZIA:         cfg?.grigliatura?.DH_STOP_PULIZIA         ?? PC.GR.DH_STOP_PULIZIA,
    DH_GUARDIA_ALTA:         cfg?.grigliatura?.DH_GUARDIA_ALTA         ?? PC.GR.DH_GUARDIA_ALTA,
    DH_MAX_FISICO:           PC.GR.DH_MAX_FISICO,
    INTASAMENTO_AVVIO:       PC.GR.INTASAMENTO_AVVIO,
    INTASAMENTO_STOP:        PC.GR.INTASAMENTO_STOP,
    VELOCITA_INTASAMENTO:    PC.GR.VELOCITA_INTASAMENTO,
    VELOCITA_PULIZIA:        PC.GR.VELOCITA_PULIZIA,
    TIMER_BACKUP_INTERVALLO: cfg?.grigliatura?.TIMER_BACKUP_INTERVALLO ?? PC.GR.TIMER_BACKUP_INTERVALLO,
    DURATA_MINIMA_CICLO:     cfg?.grigliatura?.DURATA_MINIMA_CICLO     ?? PC.GR.DURATA_MINIMA_CICLO,
    CORRENTE_NOMINALE:       cfg?.grigliatura?.CORRENTE_NOMINALE       ?? PC.GR.CORRENTE_NOMINALE,
    CORRENTE_SOVRACCARICO:   cfg?.grigliatura?.CORRENTE_SOVRACCARICO   ?? PC.GR.CORRENTE_SOVRACCARICO,
    PROB_OSTACOLO_PER_CICLO: PC.GR.PROB_OSTACOLO,
    PRESSA_PRECONDIZIONAMENTO: PC.GR.PRESSA_PRE,
    PRESSA_POST_CICLO:       PC.GR.PRESSA_POST,
    RENDIMENTO_BASE:         PC.GR.RENDIMENTO_BASE,
    RENDIMENTO_MIN:          PC.GR.RENDIMENTO_MIN,
    BYPASS_AUTO:             cfg?.grigliatura?.BYPASS_AUTO ?? PC.GR.BYPASS_AUTO,
  };
  const g0 = prevState ?? {
    intasamento: 0.10, delta_h: 0.02, rendimento: PC.GR.RENDIMENTO_BASE,
    fase: "STANDBY", timer_backup: 0, timer_fase: 0, timer_ciclo_totale: 0,
    finecorsa_partenza: false, finecorsa_ritorno: true,
    corrente_motore: 0, sovraccarico: false, ostacolo_presente: false,
    pressa_attiva: false, bypass_aperto: false, allarmi: [],
  };
  const gr = { ...g0, allarmi: [...g0.allarmi] };

  const carico_norm = Math.max(0.1, water.TSS / 200);
  if (gr.fase === "PULIZIA_ATTIVA") {
    gr.intasamento -= gCfg.VELOCITA_PULIZIA * dt;
  } else {
    gr.intasamento += gCfg.VELOCITA_INTASAMENTO * carico_norm * dt;
  }
  gr.intasamento = clamp(gr.intasamento, 0, 1);
  gr.delta_h    = +(gCfg.DH_MAX_FISICO * gr.intasamento).toFixed(3);
  gr.rendimento  = gCfg.RENDIMENTO_BASE - (gCfg.RENDIMENTO_BASE - gCfg.RENDIMENTO_MIN) * gr.intasamento;

  if (+gr.delta_h >= gCfg.DH_GUARDIA_ALTA && !gr.bypass_aperto) {
    if (!gr.allarmi.includes("ALM-01")) gr.allarmi.push("ALM-01");
    if (gCfg.BYPASS_AUTO) gr.bypass_aperto = true;
  }
  if (+gr.delta_h < gCfg.DH_AVVIO_PULIZIA && gr.bypass_aperto && !gr.allarmi.includes("ALM-02")) {
    gr.bypass_aperto = false;
    gr.allarmi = gr.allarmi.filter(a => a !== "ALM-01");
  }
  gr.timer_backup += dt;
  const gBackup = gr.timer_backup >= gCfg.TIMER_BACKUP_INTERVALLO;
  gr.timer_fase  += dt;

  switch (gr.fase) {
    case "STANDBY":
      gr.corrente_motore = 0; gr.pressa_attiva = false; gr.finecorsa_ritorno = true;
      if (gr.intasamento >= gCfg.INTASAMENTO_AVVIO || gBackup) {
        gr.ostacolo_presente = Math.random() < gCfg.PROB_OSTACOLO_PER_CICLO;
        gr.fase = "AVVIO_PRESSA"; gr.timer_fase = 0; gr.timer_ciclo_totale = 0;
        if (gBackup) gr.timer_backup = 0;
      }
      break;
    case "AVVIO_PRESSA":
      gr.pressa_attiva = true; gr.corrente_motore = 0;
      if (gr.timer_fase >= gCfg.PRESSA_PRECONDIZIONAMENTO) {
        gr.fase = "PULIZIA_ATTIVA"; gr.timer_fase = 0;
        gr.finecorsa_partenza = true; gr.finecorsa_ritorno = false;
      }
      break;
    case "PULIZIA_ATTIVA":
      gr.pressa_attiva = true;
      gr.corrente_motore = gr.ostacolo_presente ? 11.0
        : +(gCfg.CORRENTE_NOMINALE * (1 + gr.intasamento * 0.4) + (Math.random()-0.5)*0.15).toFixed(1);
      gr.timer_ciclo_totale += dt;
      if (gr.corrente_motore >= gCfg.CORRENTE_SOVRACCARICO) {
        if (!gr.allarmi.includes("ALM-02")) gr.allarmi.push("ALM-02");
        gr.sovraccarico = true; gr.fase = "ALLARME_MOTORE"; gr.timer_fase = 0;
      } else if (gr.intasamento <= gCfg.INTASAMENTO_STOP && gr.timer_fase >= gCfg.DURATA_MINIMA_CICLO) {
        gr.finecorsa_ritorno = true; gr.finecorsa_partenza = false;
        gr.fase = "POST_CICLO_PRESSA"; gr.timer_fase = 0;
      }
      break;
    case "POST_CICLO_PRESSA":
      gr.pressa_attiva = true; gr.corrente_motore = 0;
      if (gr.timer_fase >= gCfg.PRESSA_POST_CICLO) {
        gr.pressa_attiva = false; gr.fase = "STANDBY"; gr.timer_fase = 0; gr.timer_backup = 0;
      }
      break;
    case "ALLARME_MOTORE":
      gr.pressa_attiva = false; gr.corrente_motore = 0;
      gr.finecorsa_ritorno = false; gr.finecorsa_partenza = false;
      break;
    default: break;
  }

  const waterOut = {
    ...water,
    COD:  water.COD  * PC.GR.COD_PASS,
    BOD5: water.BOD5 * PC.GR.BOD_PASS,
    TSS:  water.TSS  * (1 - gr.rendimento),
  };

  const grCorrNorm = gr.corrente_motore / (gCfg.CORRENTE_NOMINALE || 4.5);
  const kw = gr.fase === "PULIZIA_ATTIVA"
    ? +(0.20 + grCorrNorm * 0.55 + (gr.pressa_attiva ? 0.22 : 0) + Math.random()*0.02).toFixed(2)
    : gr.pressa_attiva
      ? +(0.18 + Math.random()*0.02).toFixed(2)
      : +(0.08 + Math.random()*0.01).toFixed(2);

  const eff = Math.round(clamp((gr.rendimento / gCfg.RENDIMENTO_BASE) * 100, 5, 100));

  const stageOutput = {
    value: eff, target: 24, unit: "%",
    label: "Rendimento rimozione solidi", higherIsBetter: true,
  };

  const stageDetail = {
    icon: "🔲",
    function: "Rimozione meccanica dei solidi grossolani mediante griglia a rastrello motorizzato con ciclo di pulizia automatico",
    params: [
      { label:"TSS ingresso",        value:round1(water.TSS),                                  unit:"mg/L", note:"solidi totali in ingresso" },
      { label:"TSS uscita",          value:round1(waterOut.TSS),                               unit:"mg/L", note:"dopo grigliatura" },
      { label:"COD ingresso",        value:round1(water.COD),                                  unit:"mg/L" },
      { label:"BOD5 ingresso",       value:round1(water.BOD5),                                 unit:"mg/L" },
      { label:"Portata",             value:round1(water.Q),                                    unit:"m³/h" },
      { label:"Temperatura",         value:round1(water.T),                                    unit:"°C" },
      { label:"ΔH livello",          value:+gr.delta_h,                                        unit:"m",    note:`avvio>${gCfg.DH_AVVIO_PULIZIA} m | bypass>${gCfg.DH_GUARDIA_ALTA} m` },
      { label:"Intasamento griglia", value:Math.round(gr.intasamento*100),                     unit:"%",    note:"0=libera · 100=occlusa" },
      { label:"Rendimento",          value:round1(gr.rendimento*100),                          unit:"%",    note:`base:${(gCfg.RENDIMENTO_BASE*100).toFixed(0)}% · min:${(gCfg.RENDIMENTO_MIN*100).toFixed(0)}%` },
      { label:"Corrente rastrello",  value:round1(gr.corrente_motore),                         unit:"A",    note:gr.fase==="PULIZIA_ATTIVA"?"ciclo attivo":"fermo" },
      { label:"Timer backup",        value:Math.round(gr.timer_backup),                        unit:"s",    note:`ciclo forzato ogni ${gCfg.TIMER_BACKUP_INTERVALLO} s` },
    ],
    controls: [
      { label:"Intasamento griglia", value:Math.round(gr.intasamento*100),                     unit:"%" },
      { label:"Corrente / sov.",     value:Math.round(gr.corrente_motore/gCfg.CORRENTE_SOVRACCARICO*100), unit:"%" },
    ],
    note: gr.allarmi.length > 0
      ? `⚠ ALLARMI: ${gr.allarmi.join(" · ")}${gr.bypass_aperto?" — BYPASS APERTO":""}`
      : gr.fase === "STANDBY"
        ? `Griglia in standby — intasamento ${Math.round(gr.intasamento*100)}% — ΔH: ${gr.delta_h} m. Prossimo ciclo: ΔH>${gCfg.DH_AVVIO_PULIZIA}m o timer backup ${gCfg.TIMER_BACKUP_INTERVALLO}s.`
        : `Fase: ${gr.fase} — ciclo in corso da ${gr.timer_ciclo_totale.toFixed(0)} s — corrente rastrello: ${gr.corrente_motore.toFixed(1)} A.`,
    trendData: {
      delta_h:    +gr.delta_h,
      intasamento:Math.round(gr.intasamento * 100),
      corrente:   +round1(gr.corrente_motore),
      pulizia:    gr.fase === "PULIZIA_ATTIVA" ? 1 : 0,
      TSS:        +round1(waterOut.TSS),
    },
  };

  return { waterOut, newState: gr, stageOutput, stageDetail, eff, kw };
}

// ─── DISSABBIATURA ────────────────────────────────────────────────────────────
function processDissabbiatura(water, cfg, prevState, g) {
  const { dt, round1, round2 } = g;
  const clsCfg = cfg?.classifier ?? {
    mode: "timed", timeOn: 10, timeOff: 20, speed: 60, thresholdWarn: 3.0, thresholdAlarm: 4.2,
  };
  const prev = prevState ?? {
    isOn: true, secondsRemaining: 600, currentDraw: 3.7,
    sedimentLevel: 0.25, trafficLight: "green", mode: "timed",
  };

  const kAccum = PC.CLS.K_ACCUM * (water.TSS / 200);
  let clsSediment = clamp(prev.sedimentLevel + kAccum * dt, 0, 1);
  let clsIsOn = prev.isOn;
  let clsSecRemaining = Math.max(0, prev.secondsRemaining - dt);
  let clsEffSpeed;

  if (clsCfg.mode === "timed") {
    if (clsSecRemaining <= 0) {
      clsIsOn = !clsIsOn;
      clsSecRemaining = (clsIsOn ? clsCfg.timeOn : clsCfg.timeOff) * 60;
    }
    clsEffSpeed = clsIsOn ? 1.0 : 0.0;
  } else {
    clsIsOn = true; clsEffSpeed = clsCfg.speed / 100; clsSecRemaining = 0;
  }

  clsSediment = Math.max(0, clsSediment - PC.CLS.K_EXTR * clsEffSpeed * dt);

  const overloadFactor = 1 + PC.CLS.OVERLOAD_F * clsSediment;
  const clsCurrent = clsEffSpeed > 0
    ? Math.max(0, +(PC.CLS.NOMINAL_A * clsEffSpeed * overloadFactor + (Math.random()-0.5)*0.08).toFixed(1))
    : 0;
  const clsWarn  = clsCfg.thresholdWarn  ?? 3.0;
  const clsAlarm = clsCfg.thresholdAlarm ?? 4.2;
  const clsTraffic = clsEffSpeed === 0 ? "off"
    : clsCurrent >= clsAlarm ? "red"
    : clsCurrent >= clsWarn  ? "yellow" : "green";

  const newState = {
    isOn: clsIsOn,
    secondsRemaining: Math.round(clsSecRemaining),
    currentDraw: clsCurrent,
    sedimentLevel: +clsSediment.toFixed(3),
    trafficLight: clsTraffic,
    mode: clsCfg.mode,
  };

  const waterOut = {
    ...water,
    COD:  water.COD  * PC.CLS.COD_PASS,
    BOD5: water.BOD5 * PC.CLS.BOD_PASS,
    TSS:  water.TSS  * (1 - PC.CLS.TSS_REM),
  };

  const eff02 = Math.round(clamp(PC.CLS.TSS_REM * 100 * (0.85 + 0.15 * clsEffSpeed), 0, 99));

  const kw = clsEffSpeed > 0
    ? +(0.15 + 1.8 * clsEffSpeed * (1 + 0.8 * clsSediment) + Math.random()*0.05).toFixed(2)
    : +(0.05 + Math.random()*0.02).toFixed(2);

  const stageOutput = {
    value: eff02, target: 37, unit: "%",
    label: "Rendimento rimozione sabbie", higherIsBetter: true,
  };

  const stageDetail = {
    icon: "⏳",
    function: "Rimozione di sabbie, ghiaie e materiali inerti per sedimentazione accelerata",
    params: [
      { label:"TSS ingresso",      value:round1(water.TSS),   unit:"mg/L", note:"da grigliatura" },
      { label:"TSS uscita",        value:round1(waterOut.TSS),unit:"mg/L", note:"sabbie e inerti rimossi" },
      { label:"COD ingresso",      value:round1(water.COD),   unit:"mg/L" },
      { label:"BOD5 ingresso",     value:round1(water.BOD5),  unit:"mg/L" },
      { label:"NH4 ingresso",      value:round2(water.NH4),   unit:"mg/L" },
      { label:"pH ingresso",       value:round2(water.pH),    unit:"" },
      { label:"Corrente inverter", value:clsCurrent,          unit:"A",    note: clsIsOn ? (clsSediment > 0.6 ? "carico elevato" : "funzionamento regolare") : "fermo" },
    ],
    controls: clsCfg.mode === "continuous"
      ? [
          { label:"Velocità classificatore", value:clsCfg.speed,                  unit:"%" },
          { label:"Carico sedimento",         value:Math.round(clsSediment*100),   unit:"%" },
        ]
      : [],
    note: clsCfg.mode === "timed"
      ? `Classificatore temporizzato: ON ${clsCfg.timeOn} min / OFF ${clsCfg.timeOff} min. Stato attuale: ${clsIsOn?"IN FUNZIONE":"FERMO"} — prossimo cambio in ${Math.floor(clsSecRemaining/60)}:${String(clsSecRemaining%60).padStart(2,"0")}.`
      : `Classificatore in continuo al ${clsCfg.speed}% — corrente attuale ${clsCurrent.toFixed(1)} A (⚡${clsWarn.toFixed(1)} warn / 🔴${clsAlarm.toFixed(1)} alarm). Sedimento hopper: ${Math.round(clsSediment*100)}%.`,
    trendData: {
      tss_in:       +round1(water.TSS),
      TSS:          +round1(waterOut.TSS),
      corrente_inv: clsCurrent,
    },
  };

  return { waterOut, newState, stageOutput, stageDetail, eff: eff02, kw };
}

// ─── DEGRASSATORE ─────────────────────────────────────────────────────────────
function processDegrassatore(water, cfg, prevState, g) {
  const { round1, round2 } = g;
  const { waterOut, eff, kw } = passiveStep(water, PC.DEG, 0.25, 0.05);
  const stageOutput = {
    value: round1(waterOut.COD), target: 200, unit: "mg/L", label: "COD dopo degrassazione",
  };
  const stageDetail = {
    icon: "🧴",
    function: "Rimozione di oli, grassi e schiume per flottazione naturale o insufflazione aria",
    params: [
      { label:"COD ingresso",  value:round1(water.COD),    unit:"mg/L" },
      { label:"COD uscita",    value:round1(waterOut.COD), unit:"mg/L", note:`-${Math.round(PC.DEG.COD_REM*100)}%` },
      { label:"BOD5 uscita",   value:round1(waterOut.BOD5),unit:"mg/L" },
      { label:"TSS uscita",    value:round1(waterOut.TSS), unit:"mg/L", note:`-${Math.round(PC.DEG.TSS_REM*100)}%` },
      { label:"pH",            value:round2(water.pH),     unit:"" },
      { label:"Temperatura",   value:round1(water.T),      unit:"°C" },
    ],
    controls: [],
    note: "Degrassatore in funzione — rimozione grassi e oli con raccolta superficiale automatica.",
    trendData: {
      cod_in: +round1(water.COD),
      COD:    +round1(waterOut.COD),
      TSS:    +round1(waterOut.TSS),
      pH:     +round2(water.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── EQUALIZZAZIONE ───────────────────────────────────────────────────────────
function processEqualizzazione(water, cfg, prevState, g) {
  const { round1, round2, iQ } = g;
  const buf = prevState?.Qbuf ?? iQ;
  const newBuf = buf + PC.EQ.DAMPING * (water.Q - buf);
  const smoothQ = +newBuf.toFixed(1);
  const waterOut = { ...water, Q: smoothQ };
  const eff = Math.round(clamp(100 - Math.abs(water.Q - smoothQ) / (iQ || 1) * 100, 0, 100));
  const kw = +(0.10 + Math.random()*0.02).toFixed(2);
  const stageOutput = {
    value: round1(smoothQ), target: round1(iQ * 1.1), unit: "m³/h", label: "Portata equalizzata",
  };
  const stageDetail = {
    icon: "🪣",
    function: "Accumulo e omogeneizzazione del refluo per attenuare i picchi di portata e carico organico",
    params: [
      { label:"Portata in ingresso", value:round1(water.Q),    unit:"m³/h" },
      { label:"Portata equalizzata", value:round1(waterOut.Q), unit:"m³/h" },
      { label:"COD ingresso",        value:round1(water.COD),  unit:"mg/L" },
      { label:"pH",                  value:round2(water.pH),   unit:"" },
      { label:"Temperatura",         value:round1(water.T),    unit:"°C" },
    ],
    controls: [],
    note: "Vasca di equalizzazione attiva — variazioni di portata in ingresso vengono smorzate prima del trattamento biologico.",
    trendData: {
      q_in: +round1(water.Q),
      Q:    +round1(waterOut.Q),
      COD:  +round1(water.COD),
      pH:   +round2(water.pH),
    },
  };
  return { waterOut, newState: { Qbuf: newBuf }, stageOutput, stageDetail, eff, kw };
}

// ─── BIOLOGICO ────────────────────────────────────────────────────────────────
function processBiologico(water, cfg, prevState, g) {
  const { dt, round1, round2, tgt, blower, sludgeRecycle, MLSSsp, mode, autoCorrect, O2: prevO2, MLSS: prevMLSS } = g;
  const tauO2   = mode === "fast" ? PC.BIO.TAU_O2_FAST   : PC.BIO.TAU_O2_SLOW;
  const tauMLSS = mode === "fast" ? PC.BIO.TAU_MLSS_FAST : PC.BIO.TAU_MLSS_SLOW;

  const O2t  = blower / 100 * PC.BIO.O2_SAT;
  const dO2  = (O2t - prevO2) / tauO2 * dt;
  const O2   = clamp(prevO2 + dO2, PC.BIO.O2_MIN, PC.BIO.O2_MAX);
  const MLSSt = 1800 + sludgeRecycle / 100 * 4200;
  const dMLSS = (MLSSt - prevMLSS) / tauMLSS * dt;
  const MLSS  = clamp(prevMLSS + dMLSS, PC.BIO.MLSS_MIN, PC.BIO.MLSS_MAX);

  // Arrhenius temperature factors: heterotrophic (COD/BOD) vs autotrophic (NH4).
  // Removal efficiencies are scaled by θ^(T-T_REF), then clamped — so warm water
  // keeps full efficiency while cold water (e.g. winter) sharply curtails
  // nitrification before it touches carbon removal.
  const fT_c = Math.pow(PC.BIO.THETA_COD, water.T - PC.BIO.T_REF);
  const fT_b = Math.pow(PC.BIO.THETA_BOD, water.T - PC.BIO.T_REF);
  const fT_n = Math.pow(PC.BIO.THETA_NH4, water.T - PC.BIO.T_REF);

  const bioC = Math.min(0.97, (PC.BIO.COD_REM_BASE + (O2/8) * PC.BIO.COD_REM_O2 + (MLSS/12000) * PC.BIO.COD_REM_MLSS) * fT_c);
  const bioB = Math.min(0.98, (PC.BIO.BOD_REM_BASE + (O2/8) * PC.BIO.BOD_REM_O2) * fT_b);
  const bioN = Math.max(0, Math.min(0.96, (O2 > PC.BIO.NH4_O2_MIN
    ? PC.BIO.NH4_REM_BASE + (O2 - PC.BIO.NH4_O2_MIN) / 6.5 * PC.BIO.NH4_REM_O2
    : (O2 / PC.BIO.NH4_O2_MIN) * 0.30) * fT_n));

  const waterOut = {
    ...water,
    COD:  water.COD  * (1 - bioC),
    BOD5: water.BOD5 * (1 - bioB),
    TSS:  water.TSS  * PC.BIO.TSS_FACTOR,
    NH4:  water.NH4  * (1 - bioN),
    NO3:  (water.NO3 ?? 0) + water.NH4 * bioN * PC.BIO.NO3_YIELD,
    pH:   water.pH   - bioN * PC.BIO.PH_DROP_N,
    T:    water.T,
  };

  const kw = +(blower/100*18 + sludgeRecycle/100*1.2).toFixed(2);
  const eff = Math.round(clamp(bioC * 100, 50, 99));

  const stageOutput = {
    value: round1(waterOut.COD), target: tgt.COD ?? 125, unit: "mg/L", label: "COD biologico",
  };

  const stageDetail = {
    icon: "🦠",
    function: "Degradazione biologica aerobica del carico organico tramite fanghi attivi",
    params: [
      { label:"COD ingresso",  value:round1(water.COD),        unit:"mg/L", note:"da stadio precedente" },
      { label:"COD uscita",    value:round1(waterOut.COD),     unit:"mg/L", note:"dopo trattamento" },
      { label:"BOD5 uscita",   value:round1(waterOut.BOD5),    unit:"mg/L" },
      { label:"NH4 uscita",    value:round2(waterOut.NH4),     unit:"mg/L", note:"dopo nitrificazione" },
      { label:"O2 disciolto",  value:round2(O2),               unit:"mg/L", note:`setpoint calcolato: ${round2(blower/100*8)} mg/L` },
      { label:"MLSS",          value:Math.round(MLSS),         unit:"mg/L", note:`setpoint ${MLSSsp ?? 3200} mg/L` },
      { label:"Rimozione COD", value:Math.round(bioC*100),     unit:"%",    note:"efficienza biologica" },
      { label:"Nitrificaz.",   value:Math.round(bioN*100),     unit:"%",    note:`NH4→NO3 · fattore T ${fT_n.toFixed(2)}×` },
      { label:"Temperatura",   value:round1(water.T),          unit:"°C",   note:`rif. ${PC.BIO.T_REF}°C — incide su nitrificazione` },
    ],
    controls: [
      { label:"Soffianti",        value:blower,        unit:"%" },
      { label:"Ricircolo fanghi", value:sludgeRecycle, unit:"%" },
    ],
    note: autoCorrect?.enabled
      ? `Sistema automatico attivo — soffianti (${autoCorrect.blower?.on?"ON":"OFF"}) e ricircolo fanghi (${autoCorrect.sludgeRecycle?.on?"ON":"OFF"}) sotto controllo. O2 setpoint adattivo in funzione di COD, BOD5 e NH4 in uscita.`
      : "Modalità manuale. Mantenere O2 > 2 mg/L per nitrificazione efficace. Regolare soffianti e ricircolo fanghi per mantenere MLSS tra 2500 e 4000 mg/L.",
    trendData: {
      O2:     +round2(O2),
      NH4:    +round2(waterOut.NH4),
      MLSS:   Math.round(MLSS),
      COD:    +round1(waterOut.COD),
      blower: blower,
    },
  };

  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw, newO2: O2, newMLSS: Math.round(MLSS) };
}

// ─── NITRIFICAZIONE ───────────────────────────────────────────────────────────
function processNitrificazione(water, cfg, prevState, g) {
  const { dt, round1, round2, tgt, blower, mode, O2: prevO2 } = g;
  const tauO2 = mode === "fast" ? PC.NIT.TAU_O2_FAST : PC.NIT.TAU_O2_SLOW;
  const O2t   = blower / 100 * PC.BIO.O2_SAT;
  const O2    = clamp(prevO2 + (O2t - prevO2) / tauO2 * dt, 0, PC.BIO.O2_SAT);
  const fT_n  = Math.pow(PC.NIT.THETA, water.T - PC.NIT.T_REF);
  const nitE  = Math.max(0, Math.min(PC.NIT.NH4_REM_MAX, (O2 > PC.BIO.NH4_O2_MIN
    ? 0.50 + (O2 / 8) * 0.40
    : (O2 / PC.BIO.NH4_O2_MIN) * 0.20) * fT_n));

  const waterOut = {
    ...water,
    TSS:  water.TSS  * PC.NIT.TSS_FACTOR,
    NH4:  water.NH4  * (1 - nitE),
    NO3:  (water.NO3 ?? 0) + water.NH4 * nitE * PC.NIT.NO3_YIELD,
    pH:   water.pH   - nitE * PC.NIT.PH_DROP_N,
    T:    water.T,
  };

  const kw = +(blower/100*12 + 0.4).toFixed(2);
  const eff = Math.round(clamp(nitE * 100, 20, 99));

  const stageOutput = {
    value: round2(waterOut.NH4), target: tgt.NH4 ?? 8, unit: "mg/L", label: "NH₄ nitrificazione",
  };
  const stageDetail = {
    icon: "⚗",
    function: "Nitrificazione dedicata: conversione biologica NH₄⁺ → NO₃⁻ in condizioni di alta aerazione",
    params: [
      { label:"NH4 ingresso",  value:round2(water.NH4),     unit:"mg/L" },
      { label:"NH4 uscita",    value:round2(waterOut.NH4),  unit:"mg/L", note:"dopo nitrificazione" },
      { label:"NO3 prodotto",  value:round2(waterOut.NO3),  unit:"mg/L" },
      { label:"O2 disciolto",  value:round2(O2),            unit:"mg/L", note:"setpoint 4 mg/L" },
      { label:"Nitrificaz.",   value:Math.round(nitE*100),  unit:"%",    note:`NH4→NO3 · fattore T ${fT_n.toFixed(2)}×` },
      { label:"Temperatura",   value:round1(water.T),       unit:"°C",   note:`rif. ${PC.NIT.T_REF}°C` },
      { label:"pH",            value:round2(waterOut.pH),   unit:"" },
    ],
    controls: [
      { label:"Soffianti (nitrif.)", value:blower, unit:"%" },
    ],
    note: `Nitrificazione attiva — efficienza ${Math.round(nitE*100)}%. O2 corrente: ${round2(O2)} mg/L (target ≥ 2 mg/L).`,
    trendData: {
      NH4:    +round2(waterOut.NH4),
      NO3:    +round2(waterOut.NO3),
      O2:     +round2(O2),
      blower: blower,
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw, newO2: O2 };
}

// ─── DENITRIFICAZIONE ─────────────────────────────────────────────────────────
function processDenitrificazione(water, cfg, prevState, g) {
  const { round1, round2 } = g;
  const no3In  = water.NO3 ?? 0;
  // Removal efficiency is set by operation (carbon availability via MLE recycle /
  // dosed carbon) and curtailed by temperature (θ≈1.07): a cold anoxic basin
  // removes markedly less nitrate. Carbon donor is drawn from the influent COD up
  // to COD_MAX_FRAC; the balance is external (dosed) carbon, so effluent COD is
  // reduced but not driven to zero — matching post-denitrification practice.
  const fT_d   = Math.pow(PC.DEN.THETA, water.T - PC.DEN.T_REF);
  const denE   = Math.max(0, Math.min(PC.DEN.NO3_REM_MAX, PC.DEN.NO3_REM_BASE * fT_d));
  const no3Rem = no3In * denE;
  const codConsumed = Math.min(no3Rem * PC.DEN.COD_PER_NO3, water.COD * PC.DEN.COD_MAX_FRAC);

  const waterOut = {
    ...water,
    COD:  Math.max(1, water.COD  - codConsumed),
    TSS:  water.TSS  * PC.DEN.TSS_FACTOR,
    NO3:  no3In * (1 - denE),
    pH:   water.pH   + denE * PC.DEN.PH_RISE_N,
    T:    water.T,
  };

  const eff = Math.round(clamp(denE * 100, 20, 99));
  const kw  = +(0.35 + Math.random()*0.05).toFixed(2);

  const stageOutput = {
    value: round2(waterOut.NO3), target: 10, unit: "mg/L", label: "NO₃ denitrificazione",
  };
  const stageDetail = {
    icon: "🌿",
    function: "Denitrificazione anossica: conversione NO₃⁻ → N₂ con consumo di COD come donatore di elettroni",
    params: [
      { label:"NO3 ingresso",    value:round2(no3In),             unit:"mg/L" },
      { label:"NO3 uscita",      value:round2(waterOut.NO3),      unit:"mg/L", note:"dopo denitrificazione" },
      { label:"COD consumato",   value:round1(codConsumed),       unit:"mg/L", note:"usato come C-source" },
      { label:"COD residuo",     value:round1(waterOut.COD),      unit:"mg/L" },
      { label:"Efficienza",      value:Math.round(denE*100),      unit:"%",    note:`NO3 rimosso · fattore T ${fT_d.toFixed(2)}×` },
      { label:"Temperatura",     value:round1(water.T),           unit:"°C",   note:`rif. ${PC.DEN.T_REF}°C` },
      { label:"pH",              value:round2(waterOut.pH),       unit:"" },
    ],
    controls: [],
    note: `Reattore anossico attivo — rimozione NO₃ ${Math.round(denE*100)}%. pH in leggera risalita per produzione alcalinità.`,
    trendData: {
      no3_in: +round2(no3In),
      NO3:    +round2(waterOut.NO3),
      COD:    +round1(waterOut.COD),
      pH:     +round2(waterOut.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── SEDIMENTAZIONE ───────────────────────────────────────────────────────────
function processSedimentazione(water, cfg, prevState, g) {
  const { round1, round2, tgt, coagulant, autoCorrect } = g;
  const sedE = Math.min(PC.SED.EFF_MAX, PC.SED.EFF_BASE + (coagulant / 100) * PC.SED.EFF_COAG);
  const waterOut = {
    ...water,
    COD:  water.COD  * PC.SED.COD_PASS,
    BOD5: water.BOD5 * PC.SED.BOD_PASS,
    TSS:  water.TSS  * (1 - sedE),
  };

  const eff = Math.round(clamp(sedE * 100, 60, 99));
  const kw  = +(0.38 + coagulant/100*0.55 + Math.random()*0.05).toFixed(2);

  const stageOutput = {
    value: round1(waterOut.TSS), target: tgt.SST ?? 35, unit: "mg/L", label: "SST sediment.",
  };
  const stageDetail = {
    icon: "🌀",
    function: "Separazione dei fanghi biologici dall'acqua chiarificata per sedimentazione secondaria",
    params: [
      { label:"TSS ingresso",   value:round1(water.TSS),       unit:"mg/L", note:"MLSS in sospensione" },
      { label:"TSS uscita",     value:round1(waterOut.TSS),    unit:"mg/L", note:"solidi residui" },
      { label:"COD uscita",     value:round1(waterOut.COD),    unit:"mg/L" },
      { label:"BOD5 uscita",    value:round1(waterOut.BOD5),   unit:"mg/L" },
      { label:"pH",             value:round2(water.pH),        unit:"" },
      { label:"Eff. sediment.", value:Math.round(sedE*100),    unit:"%",    note:"rimozione solidi" },
    ],
    controls: [
      { label:"Dosaggio coagulante", value:coagulant, unit:"%" },
    ],
    note: autoCorrect?.enabled
      ? `Sistema automatico attivo — dosaggio coagulante (${autoCorrect.coagulant?.on?"ON":"OFF"}) con setpoint TSS 20 mg/L. Attuale: ${round1(waterOut.TSS)} mg/L.`
      : "Modalità manuale. Aumentare coagulante se TSS > 35 mg/L.",
    trendData: {
      tss_in:   +round1(water.TSS),
      TSS:      +round1(waterOut.TSS),
      COD:      +round1(waterOut.COD),
      pH:       +round2(water.pH),
      coagulant: coagulant,
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── FLOTTAZIONE DAF ──────────────────────────────────────────────────────────
function processFlottazioneDAF(water, cfg, prevState, g) {
  const { round1, round2, tgt } = g;
  const { waterOut, eff, kw } = passiveStep(water, PC.DAF, 1.2, 0.2);
  const stageOutput = {
    value: round1(waterOut.TSS), target: tgt.SST ?? 35, unit: "mg/L", label: "SST flottazione DAF",
  };
  const stageDetail = {
    icon: "💭",
    function: "Rimozione solidi, oli e schiume per flottazione ad aria disciolta (DAF)",
    params: [
      { label:"TSS ingresso", value:round1(water.TSS),    unit:"mg/L" },
      { label:"TSS uscita",   value:round1(waterOut.TSS), unit:"mg/L", note:`-${Math.round(PC.DAF.TSS_REM*100)}%` },
      { label:"COD uscita",   value:round1(waterOut.COD), unit:"mg/L" },
      { label:"BOD5 uscita",  value:round1(waterOut.BOD5),unit:"mg/L" },
      { label:"pH",           value:round2(water.pH),     unit:"" },
    ],
    controls: [],
    note: `Flottatore DAF in funzione — rimozione TSS ${Math.round(PC.DAF.TSS_REM*100)}% · COD -${Math.round(PC.DAF.COD_REM*100)}%.`,
    trendData: {
      tss_in: +round1(water.TSS),
      TSS:    +round1(waterOut.TSS),
      COD:    +round1(waterOut.COD),
      pH:     +round2(water.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── FILTRAZIONE ──────────────────────────────────────────────────────────────
function processFiltrazione(water, cfg, prevState, g) {
  const { round1, round2, tgt } = g;
  const { waterOut, eff, kw } = passiveStep(water, PC.FIL, 0.15, 0.05);
  const stageOutput = {
    value: round1(waterOut.TSS), target: tgt.SST ?? 35, unit: "mg/L", label: "TSS filtrazione",
  };
  const stageDetail = {
    icon: "🔘",
    function: "Filtrazione su sabbia / antracite per rimozione fine di solidi residui",
    params: [
      { label:"TSS ingresso", value:round1(water.TSS),    unit:"mg/L" },
      { label:"TSS uscita",   value:round1(waterOut.TSS), unit:"mg/L", note:`-${Math.round(PC.FIL.TSS_REM*100)}%` },
      { label:"COD uscita",   value:round1(waterOut.COD), unit:"mg/L" },
      { label:"pH",           value:round2(water.pH),     unit:"" },
    ],
    controls: [],
    note: `Filtro in funzione — poliziotto fine per TSS e torbidità. Risciacquo automatico programmato.`,
    trendData: {
      tss_in: +round1(water.TSS),
      TSS:    +round1(waterOut.TSS),
      COD:    +round1(waterOut.COD),
      pH:     +round2(water.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── OSMOSI INVERSA ───────────────────────────────────────────────────────────
function processOsmosIInversa(water, cfg, prevState, g) {
  const { dt, round1, round2, iQ } = g;
  const R = PC.RO;
  const oCfg = {
    FEED_PRESSURE: cfg?.osmosi?.FEED_PRESSURE ?? R.FEED_PRESSURE,
    DP_CLEAN:      cfg?.osmosi?.DP_CLEAN      ?? R.DP_CLEAN,
    DP_TRIGGER:    cfg?.osmosi?.DP_TRIGGER    ?? R.DP_TRIGGER,
    FLUX_TRIGGER:  cfg?.osmosi?.FLUX_TRIGGER  ?? R.FLUX_TRIGGER,
    RECOVERY:      cfg?.osmosi?.RECOVERY      ?? R.RECOVERY,
    CIP_AUTO:      cfg?.osmosi?.CIP_AUTO      ?? R.CIP_AUTO,
  };

  const o0 = prevState ?? initStageState("Osmosi Inversa");
  const o  = { ...o0, allarmi: [...(o0.allarmi ?? [])] };

  const { waterOut, eff, kw: kwBase } = passiveStep(water, R, 3.5, 0.5);

  // ── Sporcamento membrana ────────────────────────────────────────
  // Le membrane spiralate dell'osmosi NON si possono contro-lavare: lo
  // sporcamento (fouling/scaling) cresce con il carico di solidi/organico in
  // alimentazione e cala solo con un lavaggio chimico CIP.
  const load = Math.max(0.3, water.TSS / 5 + water.COD / 200);
  if (o.fase === "ESERCIZIO") {
    o.fouling = clamp(o.fouling + R.FOULING_RATE * load * dt, 0.04, 1);
    o.hours_run += dt;
  }

  // Indicatori derivati dallo sporcamento — usati per la soglia di avvio CIP.
  const dpNow   = oCfg.DP_CLEAN * (1 + o.fouling * R.DP_FOUL_K);
  const fluxNow = 100 - o.fouling * R.FLUX_DROP_K;
  const dpOver  = dpNow   >= oCfg.DP_CLEAN * (1 + oCfg.DP_TRIGGER);
  const fluxLow = fluxNow <= oCfg.FLUX_TRIGGER;

  // ── Macchina a stati del lavaggio CIP ───────────────────────────
  o.timer_fase += dt;
  switch (o.fase) {
    case "ESERCIZIO":
      // L'avvio automatico (ΔP/flusso oltre soglia) è subordinato a CIP_AUTO; la
      // richiesta manuale (pulsante "Avvia CIP") avvia il ciclo in ogni caso.
      if (((dpOver || fluxLow) && oCfg.CIP_AUTO) || o.cip_request) {
        o.fase = "FLUSSAGGIO"; o.timer_fase = 0; o.cip_request = false;
        if (!o.allarmi.includes("CIP-01")) o.allarmi.push("CIP-01");
      }
      break;
    case "FLUSSAGGIO":   // risciacquo a bassa pressione per spiazzare il concentrato
      if (o.timer_fase >= R.CIP_FLUSH_T) { o.fase = "LAV_ALCALINO"; o.timer_fase = 0; }
      break;
    case "LAV_ALCALINO": // pH alto: rimuove sostanza organica e biofilm
      o.fouling = Math.max(0.04, o.fouling - (0.5 / R.CIP_ALK_T) * dt);
      if (o.timer_fase >= R.CIP_ALK_T) { o.fase = "LAV_ACIDO"; o.timer_fase = 0; }
      break;
    case "LAV_ACIDO":    // pH basso: scioglie incrostazioni e metalli
      o.fouling = Math.max(0.04, o.fouling - (0.5 / R.CIP_ACID_T) * dt);
      if (o.timer_fase >= R.CIP_ACID_T) { o.fase = "RISCIACQUO"; o.timer_fase = 0; }
      break;
    case "RISCIACQUO":   // lavaggio finale e rientro in esercizio
      if (o.timer_fase >= R.CIP_RINSE_T) {
        o.fase = "ESERCIZIO"; o.timer_fase = 0;
        o.fouling = 0.05; o.hours_run = 0; o.cip_count += 1;
        o.allarmi = o.allarmi.filter(a => a !== "CIP-01");
      }
      break;
    default:
      o.fase = "ESERCIZIO"; break;
  }
  const inCIP = o.fase !== "ESERCIZIO";

  // Indicatori finali (dopo l'eventuale pulizia avvenuta in questo tick).
  o.dp        = +(oCfg.DP_CLEAN * (1 + o.fouling * R.DP_FOUL_K)).toFixed(3);
  o.flux_norm = +clamp(100 - o.fouling * R.FLUX_DROP_K, 60, 100).toFixed(1);
  o.salt_rej  = +clamp(R.REJ_CLEAN - o.fouling * R.REJ_DROP_K, 95, 99.9).toFixed(2);
  o.perm_cond = Math.round(R.COND_CLEAN * (1 + o.fouling * R.COND_RISE_K));

  // Bilancio di portata permeato / concentrato.
  const feedQ = round1(water.Q ?? iQ);
  const permQ = round1(feedQ * oCfg.RECOVERY / 100);
  const concQ = round1(feedQ - permQ);
  const dpTrip = +(oCfg.DP_CLEAN * (1 + oCfg.DP_TRIGGER)).toFixed(2);
  o.dp_trip = dpTrip;   // soglia ΔP per avvio CIP — usata dal gauge ΔP membrana

  // L'energia cresce con lo sporcamento (serve più pressione). Durante il CIP
  // l'alta pressione è esclusa: lavora la pompa di ricircolo del lavaggio.
  const kw = inCIP
    ? +(2.0 + Math.random() * 0.2).toFixed(2)
    : +(kwBase + (oCfg.FEED_PRESSURE / 15) * 0.5 + o.fouling * 0.6).toFixed(2);

  // Gauge di stadio: la reiezione sali è l'indicatore sintetico di salute della
  // membrana e degrada man mano che si avvicina la necessità di un CIP.
  const stageOutput = {
    value: o.salt_rej, target: 97, unit: "%",
    label: "Reiezione sali", higherIsBetter: true,
  };

  const faseLabel = {
    ESERCIZIO:    "In esercizio",
    FLUSSAGGIO:   "Flussaggio",
    LAV_ALCALINO: "Lavaggio alcalino",
    LAV_ACIDO:    "Lavaggio acido",
    RISCIACQUO:   "Risciacquo",
  }[o.fase] ?? o.fase;

  const stageDetail = {
    icon: "💠",
    function: "Separazione avanzata per osmosi inversa — rimozione molecolare di sali e inquinanti disciolti; manutenzione membrane con lavaggio chimico CIP (Cleaning-In-Place)",
    params: [
      { label:"COD ingresso",      value:round1(water.COD),        unit:"mg/L" },
      { label:"COD uscita",        value:round1(waterOut.COD),     unit:"mg/L", note:`-${Math.round(R.COD_REM*100)}%` },
      { label:"TSS uscita",        value:round1(waterOut.TSS),     unit:"mg/L" },
      { label:"NH4 uscita",        value:round2(waterOut.NH4),     unit:"mg/L" },
      { label:"NO3 uscita",        value:round2(waterOut.NO3??0),  unit:"mg/L" },
      { label:"pH",                value:round2(water.pH),         unit:"" },
      { label:"Press. alimentaz.", value:round1(oCfg.FEED_PRESSURE), unit:"bar" },
      { label:"ΔP membrana",       value:o.dp,                     unit:"bar",  note:`pulita ${oCfg.DP_CLEAN} · CIP>${dpTrip}` },
      { label:"Flusso normaliz.",  value:o.flux_norm,              unit:"%",    note:`CIP se < ${oCfg.FLUX_TRIGGER}%` },
      { label:"Reiezione sali",    value:o.salt_rej,               unit:"%",    note:"integrità membrana" },
      { label:"Cond. permeato",    value:o.perm_cond,              unit:"µS/cm" },
      { label:"Recupero",          value:round1(oCfg.RECOVERY),    unit:"%",    note:"permeato/alimentazione" },
      { label:"Portata permeato",  value:permQ,                    unit:"m³/h" },
      { label:"Portata concentr.", value:concQ,                    unit:"m³/h", note:"da gestire separatamente" },
      { label:"Sporcamento",       value:Math.round(o.fouling*100),unit:"%",    note:"0=pulita · 100=da lavare" },
      { label:"Cicli CIP",         value:o.cip_count,              unit:"" },
    ],
    controls: [
      { label:"Sporcamento membrana", value:Math.round(o.fouling*100),                  unit:"%" },
      { label:"ΔP / soglia CIP",      value:Math.round(o.dp / dpTrip * 100),            unit:"%" },
    ],
    note: inCIP
      ? `🧪 Lavaggio CIP in corso — fase: ${faseLabel} (${o.timer_fase.toFixed(0)} s) — sporcamento ${Math.round(o.fouling*100)}%.`
      : o.allarmi.length > 0
        ? `⚠ ${o.allarmi.join(" · ")} — CIP richiesto: ΔP ${o.dp} bar / flusso ${o.flux_norm}%.`
        : `Osmosi in esercizio — recupero ≈ ${oCfg.RECOVERY}%, reiezione ${o.salt_rej}%, sporcamento ${Math.round(o.fouling*100)}%. Prossimo CIP a ΔP>${dpTrip} bar o flusso<${oCfg.FLUX_TRIGGER}%.`,
    trendData: {
      cod_in:    +round1(water.COD),
      COD:       +round1(waterOut.COD),
      NH4:       +round2(waterOut.NH4),
      TSS:       +round1(waterOut.TSS),
      dp_ro:     +o.dp,
      flux:      +o.flux_norm,
      perm_cond: +o.perm_cond,
      perm_q:    +permQ,
      cip:       inCIP ? 1 : 0,
    },
  };
  return { waterOut, newState: o, stageOutput, stageDetail, eff, kw };
}

// ─── DISINFEZIONE UV ──────────────────────────────────────────────────────────
function processDisinfezioneUV(water, cfg, prevState, g) {
  const { round1, round2 } = g;
  // UV does not change bulk water chemistry (COD/TSS/etc.) — only pathogens
  const waterOut = { ...water };
  const kw  = +(0.40 + Math.random()*0.05).toFixed(2);
  const eff = 95;
  const stageOutput = {
    value: eff, target: 90, unit: "%", label: "Efficienza disinfezione UV", higherIsBetter: true,
  };
  const stageDetail = {
    icon: "💡",
    function: "Disinfezione finale con radiazione UV — inattivazione di agenti patogeni senza aggiunta di reagenti chimici",
    params: [
      { label:"COD uscita",  value:round1(water.COD),  unit:"mg/L" },
      { label:"TSS uscita",  value:round1(water.TSS),  unit:"mg/L", note:"deve essere < 10 mg/L per efficienza UV" },
      { label:"pH",          value:round2(water.pH),   unit:"" },
      { label:"Temperatura", value:round1(water.T),    unit:"°C" },
    ],
    controls: [],
    note: "Reattore UV in funzione. Intensità lampade al 100%. Sostituire lampade ogni 8760 h (1 anno di esercizio).",
    trendData: {
      TSS:  +round1(water.TSS),
      COD:  +round1(water.COD),
      pH:   +round2(water.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── DISINFEZIONE CLORO ───────────────────────────────────────────────────────
function processDisinfezioneCloro(water, cfg, prevState, g) {
  const { round1, round2, tgt, naoh, h2so4, autoCorrect } = g;
  const phForce = (naoh - h2so4) * PC.DIS.PH_FORCE_SCALE;
  const phCorr  = clamp(phForce, -PC.DIS.PH_CAP, PC.DIS.PH_CAP);
  const waterOut = {
    ...water,
    COD:  Math.max(1,   water.COD  * PC.DIS.COD_PASS),
    BOD5: Math.max(0.5, water.BOD5 * PC.DIS.BOD_PASS),
    TSS:  Math.max(0.5, water.TSS  * PC.DIS.TSS_PASS),
    pH:   clamp(water.pH + phCorr, 5.5, 10),
    T:    water.T * 0.99,
  };
  const eff = 92;
  const kw  = +(0.28 + (naoh+h2so4)/100*0.35 + Math.random()*0.04).toFixed(2);
  const stageOutput = {
    value: round1(waterOut.TSS), target: tgt.SST ?? 35, unit: "mg/L", label: "TSS finale",
  };
  const stageDetail = {
    icon: "💧",
    function: "Disinfezione con ipoclorito e correzione pH prima dello scarico",
    params: [
      { label:"COD uscita",  value:round1(waterOut.COD),  unit:"mg/L", note:"limite 125" },
      { label:"BOD5 uscita", value:round1(waterOut.BOD5), unit:"mg/L", note:"limite 25" },
      { label:"TSS uscita",  value:round1(waterOut.TSS),  unit:"mg/L", note:"limite 35" },
      { label:"NH4 uscita",  value:round2(waterOut.NH4),  unit:"mg/L", note:"limite 8 (target)" },
      { label:"pH finale",   value:round2(waterOut.pH),   unit:"",     note:"range 6.5-8.5 | setpoint 7.2" },
      { label:"T° uscita",   value:round1(waterOut.T),    unit:"°C",   note:"limite 30°C" },
    ],
    controls: [
      { label:"NaOH",  value:naoh,  unit:"%" },
      { label:"H2SO4", value:h2so4, unit:"%" },
    ],
    note: autoCorrect?.enabled
      ? `Sistema automatico attivo — correzione pH (${autoCorrect.pH?.on?"ON":"OFF"}) con setpoint 7.2. pH attuale: ${round2(waterOut.pH)}.`
      : "Modalità manuale. Dosare NaOH se pH < 6.5, H2SO4 se pH > 8.5. Verificare conformità AIA vigente.",
    trendData: {
      COD:   +round1(waterOut.COD),
      TSS:   +round1(waterOut.TSS),
      NH4:   +round2(waterOut.NH4),
      pH:    +round2(waterOut.pH),
      naoh:  naoh,
      h2so4: h2so4,
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── DISINFEZIONE (generico — alias Cloro) ────────────────────────────────────
const processDisinfezione = processDisinfezioneCloro;

// ─── POST-TRATTAMENTO ─────────────────────────────────────────────────────────
function processPostTrattamento(water, cfg, prevState, g) {
  const { round1, round2, tgt } = g;
  const { waterOut, eff, kw } = passiveStep(water, PC.POST, 0.20, 0.03, 90);
  const stageOutput = {
    value: round1(waterOut.COD), target: tgt.COD ?? 125, unit: "mg/L", label: "COD post-trattamento",
  };
  const stageDetail = {
    icon: "🔬",
    function: "Trattamento finale di affinamento — riduzione residuale di COD, TSS e torbidità",
    params: [
      { label:"COD ingresso", value:round1(water.COD),    unit:"mg/L" },
      { label:"COD uscita",   value:round1(waterOut.COD), unit:"mg/L", note:`-${Math.round(PC.POST.COD_REM*100)}%` },
      { label:"TSS uscita",   value:round1(waterOut.TSS), unit:"mg/L" },
      { label:"pH",           value:round2(water.pH),     unit:"" },
    ],
    controls: [],
    note: `Post-trattamento attivo — affinamento finale prima dello scarico autorizzato.`,
    trendData: {
      cod_in: +round1(water.COD),
      COD:    +round1(waterOut.COD),
      TSS:    +round1(waterOut.TSS),
      pH:     +round2(water.pH),
    },
  };
  return { waterOut, newState: null, stageOutput, stageDetail, eff, kw };
}

// ─── REGISTRY ─────────────────────────────────────────────────────────────────
export const STAGE_PROCESSORS = {
  "Grigliatura":        processGrigliatura,
  "Dissabbiatura":      processDissabbiatura,
  "Degrassatore":       processDegrassatore,
  "Equalizzazione":     processEqualizzazione,
  "Biologico":          processBiologico,
  "Nitrificazione":     processNitrificazione,
  "Denitrificazione":   processDenitrificazione,
  "Sedimentazione":     processSedimentazione,
  "Flottazione DAF":    processFlottazioneDAF,
  "Filtrazione":        processFiltrazione,
  "Osmosi Inversa":     processOsmosIInversa,
  "Disinfezione UV":    processDisinfezioneUV,
  "Disinfezione Cloro": processDisinfezioneCloro,
  "Disinfezione":       processDisinfezione,
  "Post-trattamento":   processPostTrattamento,
};

// Default states for stages that need persistent state across ticks.
export function initStageState(stageName) {
  if (stageName === "Grigliatura") return {
    intasamento: 0.10, delta_h: 0.02, rendimento: PC.GR.RENDIMENTO_BASE,
    fase: "STANDBY", timer_backup: 0, timer_fase: 0, timer_ciclo_totale: 0,
    finecorsa_partenza: false, finecorsa_ritorno: true,
    corrente_motore: 0, sovraccarico: false, ostacolo_presente: false,
    pressa_attiva: false, bypass_aperto: false, allarmi: [],
  };
  if (stageName === "Dissabbiatura") return {
    isOn: true, secondsRemaining: 600, currentDraw: 3.7,
    sedimentLevel: 0.25, trafficLight: "green", mode: "timed",
  };
  if (stageName === "Equalizzazione") return { Qbuf: 1000 };
  if (stageName === "Osmosi Inversa") return {
    fase: "ESERCIZIO", fouling: 0.05,
    dp: PC.RO.DP_CLEAN, flux_norm: 100, salt_rej: PC.RO.REJ_CLEAN,
    perm_cond: PC.RO.COND_CLEAN, hours_run: 0, timer_fase: 0,
    cip_count: 0, cip_request: false, allarmi: [],
  };
  return null;
}
