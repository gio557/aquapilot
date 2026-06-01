// All process-tuning constants in one place. Change values here to calibrate
// the simulation without touching the stage logic.
export const PC = {

  // ── GRIGLIATURA ───────────────────────────────────────────────────────────
  GR: {
    DH_AVVIO_PULIZIA:        0.15,
    DH_STOP_PULIZIA:         0.05,
    DH_GUARDIA_ALTA:         0.35,
    DH_MAX_FISICO:           0.60,
    INTASAMENTO_AVVIO:       0.60,
    INTASAMENTO_STOP:        0.20,
    VELOCITA_INTASAMENTO:    0.004,
    VELOCITA_PULIZIA:        0.015,
    TIMER_BACKUP_INTERVALLO: 1800,
    DURATA_MINIMA_CICLO:     120,
    CORRENTE_NOMINALE:       4.5,
    CORRENTE_SOVRACCARICO:   8.0,
    PROB_OSTACOLO:           0.03,
    PRESSA_PRE:              15,
    PRESSA_POST:             30,
    RENDIMENTO_BASE:         0.24,
    RENDIMENTO_MIN:          0.05,
    BYPASS_AUTO:             true,
    COD_PASS:                0.92,
    BOD_PASS:                0.96,
  },

  // ── DISSABBIATURA ─────────────────────────────────────────────────────────
  CLS: {
    K_ACCUM:    0.00018,
    K_EXTR:     0.0009,
    NOMINAL_A:  3.7,
    OVERLOAD_F: 1.2,
    COD_PASS:   0.96,
    BOD_PASS:   0.97,
    TSS_REM:    0.37,  // fraction of TSS removed (sand + grit)
  },

  // ── BIOLOGICO ─────────────────────────────────────────────────────────────
  BIO: {
    TAU_O2_FAST:    3.0,
    TAU_O2_SLOW:    18,
    TAU_MLSS_FAST:  12.0,
    TAU_MLSS_SLOW:  80,
    O2_SAT:         8.0,
    MLSS_MIN:       800,
    MLSS_MAX:       7000,
    O2_MIN:         0,
    O2_MAX:         8,
    COD_REM_BASE:   0.55,
    COD_REM_O2:     0.38,
    COD_REM_MLSS:   0.04,
    BOD_REM_BASE:   0.65,
    BOD_REM_O2:     0.30,
    NH4_REM_BASE:   0.55,
    NH4_REM_O2:     0.41,
    NH4_O2_MIN:     1.5,
    TSS_FACTOR:     1.45,
    PH_DROP_N:      0.45,
    NO3_YIELD:      0.85,    // fraction of removed NH4 that becomes NO3
    // Temperature correction (Arrhenius, θ^(T-T_REF)). Heterotrophs (COD/BOD)
    // are mildly T-sensitive; autotrophic nitrifiers (NH4) are strongly so —
    // θ≈1.10 ⇒ nitrification roughly halves from 20 °C to 10 °C.
    T_REF:          20,
    THETA_COD:      1.04,
    THETA_BOD:      1.04,
    THETA_NH4:      1.10,
  },

  // ── NITRIFICAZIONE ────────────────────────────────────────────────────────
  NIT: {
    TAU_O2_FAST:   2.5,
    TAU_O2_SLOW:   15,
    O2_SETPOINT:   4.0,      // higher than biologico to favour nitrifiers
    NH4_REM_MAX:   0.92,
    NO3_YIELD:     0.95,
    TSS_FACTOR:    1.15,
    PH_DROP_N:     0.55,
    T_REF:         20,
    THETA:         1.10,     // nitrifiers very temperature-sensitive
  },

  // ── DENITRIFICAZIONE ──────────────────────────────────────────────────────
  DEN: {
    NO3_REM_BASE:  0.82,     // well-operated anoxic zone (MLE recycle + carbon) at T_REF
    NO3_REM_MAX:   0.90,
    COD_PER_NO3:   4.0,      // mg COD consumed per mg NO3-N removed
    COD_MAX_FRAC:  0.45,     // max share of influent COD used as donor; the rest of
                             // the demand is met by dosed/external carbon, so the
                             // effluent COD isn't driven to zero (post-denit reality)
    TSS_FACTOR:    0.98,
    PH_RISE_N:     0.30,     // pH slight rise due to alkalinity produced
    T_REF:         20,
    THETA:         1.07,     // denitrifiers moderately temperature-sensitive
  },

  // ── SEDIMENTAZIONE ────────────────────────────────────────────────────────
  SED: {
    EFF_BASE:  0.70,
    EFF_COAG:  0.27,
    EFF_MAX:   0.97,
    COD_PASS:  0.97,
    BOD_PASS:  0.97,
  },

  // ── DISINFEZIONE (Cloro / generico) ───────────────────────────────────────
  DIS: {
    PH_FORCE_SCALE: 0.040,
    PH_CAP:         2.5,
    COD_PASS:       0.99,
    BOD_PASS:       0.99,
    TSS_PASS:       0.97,
  },

  // ── DISINFEZIONE UV ───────────────────────────────────────────────────────
  UV: {
    // UV does not change bulk water chemistry — just pathogens (not tracked)
    COD_PASS:  1.00,
    BOD_PASS:  1.00,
    TSS_PASS:  1.00,
  },

  // ── DEGRASSATORE ──────────────────────────────────────────────────────────
  DEG: {
    COD_REM:  0.15,
    BOD_REM:  0.20,
    TSS_REM:  0.25,
    NH4_PASS: 1.00,
  },

  // ── EQUALIZZAZIONE ────────────────────────────────────────────────────────
  EQ: {
    DAMPING:  0.15,   // fraction per tick toward moving average
  },

  // ── FLOTTAZIONE DAF ───────────────────────────────────────────────────────
  DAF: {
    TSS_REM:  0.90,
    COD_REM:  0.30,
    BOD_REM:  0.25,
    NH4_PASS: 1.00,
  },

  // ── FILTRAZIONE ───────────────────────────────────────────────────────────
  FIL: {
    TSS_REM:  0.85,
    COD_REM:  0.25,
    BOD_REM:  0.20,
    NH4_PASS: 1.00,
  },

  // ── OSMOSI INVERSA ────────────────────────────────────────────────────────
  RO: {
    COD_REM:  0.95,
    BOD_REM:  0.95,
    TSS_REM:  0.99,
    NH4_REM:  0.90,
    NO3_REM:  0.90,
  },

  // ── POST-TRATTAMENTO ──────────────────────────────────────────────────────
  POST: {
    COD_REM:  0.08,
    BOD_REM:  0.08,
    TSS_REM:  0.10,
    NH4_PASS: 1.00,
  },
};
