// Single source of truth for effluent quality alarm thresholds.
// Consumed by the alarm engine (engine.js), the AI advisor (AIPanel.jsx) and
// the history quality badges (StoricaPage.jsx) so a limit is defined once.
//
//  pre  = pre-alarm / green-zone boundary: below this the parameter is "OK",
//         between pre and warn it is in pre-alarm (PRE). Auto-correction aims
//         to keep effluent in the green zone (below pre), not merely under warn.
//  warn = regulatory / target limit (MEDIO)   crit = critical limit (ALTO)
//  inv  = lower is worse (O2): warn/crit are floors, not ceilings
//  pH uses a band: low_c < low_w < high_w < high_c
export const QUALITY_LIMITS = {
  COD:  { pre: 100, warn: 125, crit: 160, unit: "mg/L", causa: "Efficienza biologica ridotta" },
  BOD5: { pre: 20,  warn: 25,  crit: 40,  unit: "mg/L", causa: "Carico organico elevato" },
  TSS:  { pre: 28,  warn: 35,  crit: 80,  unit: "mg/L", causa: "Sedimentazione inefficiente" },
  NH4:  { pre: 6,   warn: 8,   crit: 15,  unit: "mg/L", causa: "Nitrificazione insufficiente" },
  // NO3 / N-tot are informational (effluent panel colour only — NOT wired to the
  // popup alarm engine). Limits from D.Lgs. 152/2006 Tab.3 (NO3 max 20, N-tot max
  // 15 mg/L). Without an active denitrification stage NO3 accumulates and N-tot
  // exceeds the limit: the realistic cue that motivates Proposal A.
  NO3:  { pre: 12,  warn: 20,  crit: 30,  unit: "mg/L", causa: "Denitrificazione assente/insufficiente" },
  NTOT: { pre: 10,  warn: 15,  crit: 25,  unit: "mg/L", causa: "Azoto totale: manca rimozione NO₃" },
  O2:   { warn: 2.0, crit: 1.5, unit: "mg/L", causa: "Aerazione insufficiente", inv: true },
  pH:   { low_w: 6.5, low_c: 5.5, high_w: 8.5, high_c: 9.5, unit: "", causa: "Dosaggio reagente" },
};

// MLSS operating band for the biological stage (mg/L).
export const MLSS_LIMITS = { lo_crit: 1800, lo_warn: 2500, hi_warn: 4000, hi_crit: 5500 };

// Derives a QUALITY_LIMITS-shaped object from the user-selected normativa
// (the `norms` array edited in NormativaPage / ConfigurazionePage), so every
// reference shown in the UI and the alarm engine follows the chosen regulation
// instead of the hardcoded constant above.
//
// Mapping (the app treats target_max as the regulatory limit and legge_max as
// the absolute/critical ceiling — e.g. Tab.3 COD: target 125 = legal limit):
//   warn (MEDIO)  = target_max               → "fuori valore" / regulatory threshold
//   crit (ALTO)   = legge_max                → critical/absolute ceiling
//   pre           = target_max * preAllarme% → green-zone boundary
//   pH band       = target_min/max (warn) and legge_min/max (crit)
// O₂ has no discharge limit in the normativa, so it keeps the static default.
// A param with both limits null in the selected set (e.g. Tab.4 NO₃/N-tot) is
// treated as unbounded (Infinity) so it never raises a false breach.
const NORM_ID_TO_KEY = {
  COD: "COD", BOD5: "BOD5", SST: "TSS", NH4: "NH4",
  NO3: "NO3", NTOT: "NTOT", pH: "pH", T: "T",
};

export function limitsFromNorms(norms) {
  const L = JSON.parse(JSON.stringify(QUALITY_LIMITS));
  if (!Array.isArray(norms)) return L;
  const find = (id) => norms.flatMap(c => c.params || []).find(p => p.id === id);
  for (const [id, key] of Object.entries(NORM_ID_TO_KEY)) {
    const p = find(id);
    if (!p) continue;
    if (key === "pH") {
      if (p.legge_min  != null) L.pH = { ...L.pH, low_c:  p.legge_min  };
      if (p.target_min != null) L.pH = { ...L.pH, low_w:  p.target_min };
      if (p.target_max != null) L.pH = { ...L.pH, high_w: p.target_max };
      if (p.legge_max  != null) L.pH = { ...L.pH, high_c: p.legge_max  };
      continue;
    }
    const tmax = p.target_max;
    const lmax = p.legge_max;
    if (tmax == null && lmax == null) {
      L[key] = { ...(L[key] || {}), pre: Infinity, warn: Infinity, crit: Infinity };
      continue;
    }
    const warn = tmax ?? lmax;
    const crit = lmax ?? tmax;
    const prePct = (p.preAllarme ?? 80) / 100;
    L[key] = { ...(L[key] || {}), pre: +(warn * prePct).toFixed(2), warn, crit };
  }
  return L;
}

// True if a quality parameter value is out of its regulatory limit (an anomaly),
// honouring inverse params (O₂: lower is worse) and band params (pH). Used to mark
// anomaly points on the trend charts. Returns the severity or null.
//   key    = QUALITY_LIMITS key (COD, BOD5, TSS, NH4, NO3, NTOT, O2, pH)
//   limits = active limit set (defaults to static QUALITY_LIMITS). Pass the
//            normativa-derived limits (limitsFromNorms) so the trend markers
//            agree with the effluent panel and the alarm engine.
export function qualitySeverity(key, v, limits = QUALITY_LIMITS) {
  const L = (limits || QUALITY_LIMITS)[key];
  if (!L || v == null || !Number.isFinite(v)) return null;
  if (L.low_w !== undefined) {           // pH band
    if (v < L.low_c || v > L.high_c) return "ALTO";
    if (v < L.low_w || v > L.high_w) return "MEDIO";
    return null;
  }
  if (L.inv) {                            // O₂: floors (lower is worse)
    if (v < L.crit) return "ALTO";
    if (v < L.warn) return "MEDIO";
    return null;
  }
  if (v >= L.crit) return "ALTO";         // ceilings
  if (v >= L.warn) return "MEDIO";
  return null;
}
