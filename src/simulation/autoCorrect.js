import { QUALITY_LIMITS as QL } from "../constants/limits";

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function applyAutoCorrect(s, out, O2, MLSS, stageIndexMap) {
  const bioIdx = stageIndexMap?.bio >= 0 ? stageIndexMap.bio : 2;
  const sedIdx = stageIndexMap?.sed >= 0 ? stageIndexMap.sed : 3;
  const disIdx = stageIndexMap?.dis >= 0 ? stageIndexMap.dis : 4;
  const ac = s.autoCorrect;
  if (!ac || !ac.enabled) return { changes: {}, actions: {} };
  const ch = {};
  const actions = {};
  const g = s.adaptiveGains || {};
  const gBlower    = g.blower        ?? 1;
  const gCoagulant = g.coagulant     ?? 1;
  const gRas       = g.sludgeRecycle ?? 1;
  const gPH        = g.pH            ?? 1;

  // ── SOFFIANTI — controllo O2 e qualità biologica ─────────────
  if (ac.blower && ac.blower.on) {
    // O2 demand is referenced to the *regulatory* limits, not arbitrary
    // setpoints. Each term ramps from an anchor (below the warn limit, so the
    // controller reacts with margin to spare) up to full demand near the
    // critical limit. The previous gentle terms produced a steady-state offset:
    // the setpoint was satisfied at ~4 mg/L while NH4/BOD5 stayed over limit, so
    // the blower stopped climbing and the exceedance never cleared.
    // Proportional demand: gentle ramps referenced to the warn limits keep
    // normal operation energy-efficient (effluent under limit → low O2 target).
    const ramp = (v, lo, hi, gain) => clamp((v - lo) / (hi - lo), 0, 1) * gain;
    const O2sp_nh4 = ramp(out.NH4,  QL.NH4.warn  - 3,  QL.NH4.warn  + 2,  4.5);
    const O2sp_bod = ramp(out.BOD5, QL.BOD5.warn - 8,  QL.BOD5.warn + 5,  2.5);
    const O2sp_cod = ramp(out.COD,  QL.COD.warn  - 35, QL.COD.warn + 20,  1.5);
    // Integral action: a proportional-only setpoint leaves a steady-state offset
    // (effluent parks just over limit while O2 sits at a "satisfied" target). We
    // integrate the worst error against a target inside the *green* zone — held
    // ~8% below each pre-alarm threshold — so correction doesn't stop at "just
    // under the regulatory limit" (PRE band) but pushes parameters fully into
    // the green. The setpoint keeps climbing until the blower maxes out:
    // clearing recoverable breaches and, when even 100% can't recover, exposing
    // a true "at capacity" condition for diagnostics. The error goes negative
    // once effluent is comfortably under target, so the integral bleeds smoothly
    // (no limit-cycle) and clean influent relaxes the blower for energy savings.
    const greenTgt = 0.92;
    const err = Math.max(
      (out.NH4  - QL.NH4.pre  * greenTgt) / QL.NH4.warn,
      (out.BOD5 - QL.BOD5.pre * greenTgt) / QL.BOD5.warn,
      (out.COD  - QL.COD.pre  * greenTgt) / QL.COD.warn);
    // Low integral gain + gentle proportional inner loop, rate-limited: the O2
    // process has a long lag, so aggressive gains caused integral-windup hunting
    // (blower swinging 57↔92% in a slow limit-cycle). Softer gains track the
    // slow effluent dynamics smoothly without oscillating.
    const O2I = clamp((s.acO2I ?? 0) + err * 0.12, 0, 6);
    ch.acO2I = O2I;
    const O2sp = clamp(2.0 + O2sp_nh4 + O2sp_cod + O2sp_bod + O2I, 2.0, 8.0);
    const errO2 = O2sp - O2;
    const Kp = 3 * gBlower;
    const delta = clamp(Math.round(errO2 * Kp), -4, 6);
    const newBlower = clamp(s.blower + delta, 20, 100);

    if (Math.abs(delta) >= 1) {
      ch.blower = newBlower;
      if (O2 < 1.5) {
        actions[bioIdx] = { text: `URGENTE Soffianti: ${s.blower}→${newBlower}% — O2 critico ${O2.toFixed(1)} mg/L (set ${O2sp})`, sev: "ALTO" };
      } else if (delta > 0) {
        const reason = out.NH4 > 8 ? `NH4 ${out.NH4.toFixed(1)} mg/L — set O2>${O2sp.toFixed(1)}` : out.BOD5 > 25 ? `BOD5 ${out.BOD5.toFixed(1)} mg/L` : out.COD > 100 ? `COD ${out.COD.toFixed(1)} mg/L` : `O2 ${O2.toFixed(1)} mg/L → set ${O2sp.toFixed(1)}`;
        actions[bioIdx] = { text: `Soffianti: ${s.blower}→${newBlower}% (+${delta}%) — ${reason}`, sev: "MEDIO" };
      } else {
        actions[bioIdx] = { text: `Ottimiz. energia: soffianti ${s.blower}→${newBlower}% — O2 ${O2.toFixed(1)} mg/L, margine ok`, sev: "OK" };
      }
    }
  }

  // ── COAGULANTE — controllo TSS sedimentazione ─────────────────
  if (ac.coagulant && ac.coagulant.on) {
    const TSSsp = 20;
    const errTSS = out.TSS - TSSsp;
    const Kp = 1.8 * gCoagulant;
    const delta = clamp(Math.round(errTSS * Kp), -5, 20);
    const newCoag = clamp(s.coagulant + delta, 15, 100);

    if (Math.abs(delta) >= 1) {
      ch.coagulant = newCoag;
      if (out.TSS > 80) {
        actions[sedIdx] = { text: `URGENTE Coagulante: ${s.coagulant}→${newCoag}% — TSS critico ${out.TSS.toFixed(1)} mg/L`, sev: "ALTO" };
      } else if (delta > 0) {
        actions[sedIdx] = { text: `Coagulante: ${s.coagulant}→${newCoag}% (+${delta}%) — TSS ${out.TSS.toFixed(1)} mg/L > set ${TSSsp}`, sev: "MEDIO" };
      } else {
        actions[sedIdx] = { text: `Risparmio coagulante: ${s.coagulant}→${newCoag}% — TSS ${out.TSS.toFixed(1)} mg/L ottimale`, sev: "OK" };
      }
    }
  }

  // ── RICIRCOLO FANGHI — controllo MLSS biologico ───────────────
  if (ac.sludgeRecycle && ac.sludgeRecycle.on) {
    const MLSSsp = s.MLSSsp ?? 3200;
    const errMLSS = MLSS - MLSSsp;
    const Kp = 0.008 * gRas;
    const delta = clamp(Math.round(errMLSS * Kp), -6, 6);
    const newRAS = clamp(s.sludgeRecycle - delta, 20, 100);
    const prev = actions[bioIdx];

    if (Math.abs(delta) >= 1) {
      ch.sludgeRecycle = newRAS;
      const rasMsg = `RAS: ${s.sludgeRecycle}→${newRAS}% — MLSS ${Math.round(MLSS)} mg/L (set ${MLSSsp})`;
      if (prev) {
        actions[bioIdx] = { ...prev, text: prev.text + ` | ${rasMsg}` };
      } else {
        // A correction is being applied here, so don't report OK for a sizeable
        // deviation; 600 mg/L roughly matches the band where delta saturates.
        actions[bioIdx] = { text: rasMsg, sev: Math.abs(errMLSS) > 600 ? "MEDIO" : "OK" };
      }
    }
  }

  // ── CORREZIONE pH — dosaggio NaOH / H2SO4 ────────────────────
  if (ac.pH && ac.pH.on) {
    const pHsp = 7.2;
    const errpH = pHsp - out.pH;
    const Kp = 3 * gPH;
    const delta = clamp(Math.round(Math.abs(errpH) * Kp), 0, 5);

    if (Math.abs(errpH) > 0.20 && delta >= 2) {
      if (errpH > 0) {
        ch.naoh   = clamp(s.naoh + delta, 0, 100);
        ch.h2so4  = 0;
        const sev = out.pH < 5.5 ? "ALTO" : "MEDIO";
        actions[disIdx] = { text: `NaOH: ${s.naoh}→${ch.naoh}% (+${delta}%) — pH ${out.pH.toFixed(2)} < ${pHsp} (err ${errpH.toFixed(2)})`, sev };
      } else {
        ch.h2so4  = clamp(s.h2so4 + delta, 0, 100);
        ch.naoh   = 0;
        const sev = out.pH > 9.5 ? "ALTO" : "MEDIO";
        actions[disIdx] = { text: `H2SO4: ${s.h2so4}→${ch.h2so4}% (+${delta}%) — pH ${out.pH.toFixed(2)} > ${pHsp} (err ${(-errpH).toFixed(2)})`, sev };
      }
    } else if (Math.abs(errpH) <= 0.20) {
      if (s.naoh > 0)  { ch.naoh  = Math.max(0, s.naoh  - 2); }
      if (s.h2so4 > 0) { ch.h2so4 = Math.max(0, s.h2so4 - 2); }
      if (s.naoh > 0 || s.h2so4 > 0)
        actions[disIdx] = { text: `pH normalizzato (${out.pH.toFixed(2)}) — riduzione dosaggi in corso`, sev: "OK" };
    }
  }

  return { changes: ch, actions };
}
