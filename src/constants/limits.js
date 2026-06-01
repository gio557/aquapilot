// Single source of truth for effluent quality alarm thresholds.
// Consumed by the alarm engine (engine.js), the AI advisor (AIPanel.jsx) and
// the history quality badges (StoricaPage.jsx) so a limit is defined once.
//
//  warn = regulatory / target limit (MEDIO)   crit = critical limit (ALTO)
//  inv  = lower is worse (O2): warn/crit are floors, not ceilings
//  pH uses a band: low_c < low_w < high_w < high_c
export const QUALITY_LIMITS = {
  COD:  { warn: 125, crit: 160, unit: "mg/L", causa: "Efficienza biologica ridotta" },
  BOD5: { warn: 25,  crit: 40,  unit: "mg/L", causa: "Carico organico elevato" },
  TSS:  { warn: 35,  crit: 80,  unit: "mg/L", causa: "Sedimentazione inefficiente" },
  NH4:  { warn: 8,   crit: 15,  unit: "mg/L", causa: "Nitrificazione insufficiente" },
  O2:   { warn: 2.0, crit: 1.5, unit: "mg/L", causa: "Aerazione insufficiente", inv: true },
  pH:   { low_w: 6.5, low_c: 5.5, high_w: 8.5, high_c: 9.5, unit: "", causa: "Dosaggio reagente" },
};

// MLSS operating band for the biological stage (mg/L).
export const MLSS_LIMITS = { lo_crit: 1800, lo_warn: 2500, hi_warn: 4000, hi_crit: 5500 };
