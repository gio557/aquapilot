// AquaPilot — Modulo di apprendimento adattivo
//
// Persistenza: localStorage (buffer circolare di snapshot + gain adattivi per
// controllo). Tracciamento interventi auto-correzione → valutazione efficacia
// dopo N tick → aggiornamento gain (Kp moltiplicatore) per ciascun controllo.

const KEY_HISTORY  = "aquapilot.learning.history.v1";
const KEY_GAINS    = "aquapilot.learning.gains.v1";
const KEY_PENDING  = "aquapilot.learning.pending.v1";
const KEY_INTERV   = "aquapilot.learning.interventions.v1";

const HISTORY_MAX     = 5000;   // ~83h a 1 snapshot/min
const INTERV_MAX      = 500;
const SNAPSHOT_EVERY  = 120;    // tick (= 60 s sim a velocità 1×)
const EVAL_AFTER_TICKS= 30;     // ~15 s sim — orizzonte per valutare effetto
const GAIN_MIN        = 0.4;
const GAIN_MAX        = 2.2;
const GAIN_STEP       = 0.06;

const DEFAULT_GAINS = { blower: 1, coagulant: 1, sludgeRecycle: 1, pH: 1 };

// ── storage helpers ────────────────────────────────────────────
function safeRead(k, fallback) {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : fallback; }
  catch { return fallback; }
}
function safeWrite(k, v) {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch {}
}

// ── API pubblica ───────────────────────────────────────────────
export function loadGains()   { return { ...DEFAULT_GAINS, ...safeRead(KEY_GAINS, {}) }; }
export function loadHistory() { return safeRead(KEY_HISTORY, []); }
export function loadInterventions() { return safeRead(KEY_INTERV, []); }

export function resetLearning() {
  [KEY_HISTORY, KEY_GAINS, KEY_PENDING, KEY_INTERV].forEach(k => {
    try { localStorage.removeItem(k); } catch {}
  });
}

// Statistiche su finestra temporale (tick = circa 0.5 s reali a vel. 1×).
// Snapshot salvato ogni SNAPSHOT_EVERY tick → ogni snapshot ≈ 1 min sim.
export function getTrendStats() {
  const h = loadHistory();
  if (h.length < 2) return null;
  const now = h[h.length - 1].t;
  const slice = (minutes) => h.filter(s => now - s.t <= minutes * 60_000);
  const stats = (arr, key) => {
    if (arr.length === 0) return null;
    const vals = arr.map(s => s[key]).filter(v => Number.isFinite(v));
    if (vals.length === 0) return null;
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    const first = vals[0], last = vals[vals.length-1];
    return { avg, first, last, delta: last - first, n: vals.length };
  };
  const w1h  = slice(60);
  const w6h  = slice(360);
  const w24h = slice(1440);
  return {
    samples: h.length,
    spanMinutes: Math.round((now - h[0].t) / 60_000),
    h1:  { COD:stats(w1h,"COD"),  TSS:stats(w1h,"TSS"),  NH4:stats(w1h,"NH4"),  O2:stats(w1h,"O2"),  pH:stats(w1h,"pH") },
    h6:  { COD:stats(w6h,"COD"),  TSS:stats(w6h,"TSS"),  NH4:stats(w6h,"NH4"),  O2:stats(w6h,"O2"),  pH:stats(w6h,"pH") },
    h24: { COD:stats(w24h,"COD"), TSS:stats(w24h,"TSS"), NH4:stats(w24h,"NH4"), O2:stats(w24h,"O2"), pH:stats(w24h,"pH") },
  };
}

// Riassunto azioni: efficacia complessiva per controllo (ultimi N interventi).
export function getInterventionSummary() {
  const items = loadInterventions().slice(-100);
  const byCtrl = {};
  items.forEach(it => {
    const k = it.control;
    byCtrl[k] = byCtrl[k] || { n:0, good:0, bad:0, neutral:0 };
    byCtrl[k].n++;
    if (it.outcome === "good")    byCtrl[k].good++;
    else if (it.outcome === "bad") byCtrl[k].bad++;
    else byCtrl[k].neutral++;
  });
  return byCtrl;
}

// ── Cuore: recordTick — chiamato dopo simTick con sim aggiornato.
// Ritorna { gains, didUpdate }: la chiamante (App.jsx) può, se gains cambiati,
// scriverli in sim.adaptiveGains così che autoCorrect.js li veda al tick seguente.
export function recordTick(sim, prevSim) {
  if (!sim || !sim.output) return { gains: loadGains(), didUpdate: false };
  const tick = sim.tick ?? 0;

  // 1. Snapshot periodico
  if (tick % SNAPSHOT_EVERY === 0) {
    const h = loadHistory();
    h.push({
      t: Date.now(),
      tick,
      COD: sim.output.COD, BOD5: sim.output.BOD5,
      TSS: sim.output.TSS, NH4: sim.output.NH4,
      pH:  sim.output.pH,  O2:  sim.O2,
      T:   sim.output.T,   Q:   sim.output.Q,
      MLSS: sim.MLSS,
      blower: sim.blower, coagulant: sim.coagulant,
      ras: sim.sludgeRecycle, naoh: sim.naoh, h2so4: sim.h2so4,
      kw:  sim.energy?.kw  ?? null,
      kwh: sim.energy?.kwh ?? null,
      stageEnergy: Array.isArray(sim.stageEnergy) ? sim.stageEnergy.slice() : null,
      auto: !!sim.autoCorrect?.enabled,
    });
    if (h.length > HISTORY_MAX) h.splice(0, h.length - HISTORY_MAX);
    safeWrite(KEY_HISTORY, h);
  }

  // 2. Rileva nuovi interventi (cambio di attuatori) e li mette in pending
  const pending = safeRead(KEY_PENDING, []);
  if (prevSim) {
    const detect = (control, beforeKey, metricKey, target) => {
      const before = prevSim[beforeKey];
      const after  = sim[beforeKey];
      if (before == null || after == null) return;
      if (Math.abs(after - before) < 0.5) return;
      const metricBefore = metricKey === "O2"  ? prevSim.O2
                        : metricKey === "MLSS" ? prevSim.MLSS
                        : prevSim.output?.[metricKey];
      if (!Number.isFinite(metricBefore)) return;
      pending.push({ control, startTick: tick, metricKey, target, metricBefore, deltaCtrl: after - before });
    };
    detect("blower",        "blower",       "O2",   2.5);     // O2 target operativo
    detect("coagulant",     "coagulant",    "TSS",  20);
    detect("sludgeRecycle", "sludgeRecycle","MLSS", 3200);
    // pH: NaOH e H2SO4 lavorano su pH=7.2
    if (prevSim.naoh !== sim.naoh && Math.abs(sim.naoh - prevSim.naoh) >= 1) {
      pending.push({ control:"pH", startTick:tick, metricKey:"pH", target:7.2, metricBefore:prevSim.output?.pH, deltaCtrl: sim.naoh - prevSim.naoh });
    } else if (prevSim.h2so4 !== sim.h2so4 && Math.abs(sim.h2so4 - prevSim.h2so4) >= 1) {
      pending.push({ control:"pH", startTick:tick, metricKey:"pH", target:7.2, metricBefore:prevSim.output?.pH, deltaCtrl: sim.h2so4 - prevSim.h2so4 });
    }
  }

  // 3. Valuta interventi pending maturi (≥ EVAL_AFTER_TICKS)
  let gains = loadGains();
  const stillPending = [];
  const newInterv = [];
  pending.forEach(p => {
    if (tick - p.startTick < EVAL_AFTER_TICKS) { stillPending.push(p); return; }
    const metricNow = p.metricKey === "O2"   ? sim.O2
                    : p.metricKey === "MLSS" ? sim.MLSS
                    : sim.output?.[p.metricKey];
    if (!Number.isFinite(metricNow) || !Number.isFinite(p.metricBefore)) return;
    const errBefore = p.target - p.metricBefore;
    const errAfter  = p.target - metricNow;
    const improved  = Math.abs(errAfter) < Math.abs(errBefore) - 0.05;
    const overshot  = Math.sign(errBefore) !== Math.sign(errAfter) && Math.abs(errAfter) > Math.abs(errBefore) * 0.4;
    const stuck     = Math.abs(errAfter - errBefore) < Math.abs(errBefore) * 0.05;

    let outcome = "neutral", adj = 0;
    if (overshot)      { outcome = "bad";  adj = -GAIN_STEP; }
    else if (improved) { outcome = "good"; adj =  0; }
    else if (stuck)    { outcome = "bad";  adj = +GAIN_STEP; }
    gains[p.control] = Math.max(GAIN_MIN, Math.min(GAIN_MAX, (gains[p.control] ?? 1) + adj));

    newInterv.push({
      t: Date.now(), control:p.control, metricKey:p.metricKey,
      before: p.metricBefore, after: metricNow, target:p.target,
      deltaCtrl: p.deltaCtrl, outcome, gainAfter: gains[p.control],
    });
  });

  safeWrite(KEY_PENDING, stillPending);
  if (newInterv.length > 0) {
    const all = loadInterventions().concat(newInterv);
    if (all.length > INTERV_MAX) all.splice(0, all.length - INTERV_MAX);
    safeWrite(KEY_INTERV, all);
    safeWrite(KEY_GAINS, gains);
    return { gains, didUpdate: true };
  }
  return { gains, didUpdate: false };
}
