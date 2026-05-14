const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

export function applyAutoCorrect(s, out, O2, MLSS) {
  const ac = s.autoCorrect;
  if (!ac || !ac.enabled) return { changes: {}, actions: {} };
  const ch = {};
  const actions = {};

  // ── SOFFIANTI — controllo O2 e qualità biologica ─────────────
  if (ac.blower && ac.blower.on) {
    const O2sp_nh4 = Math.max(0, Math.min(1, (out.NH4  - 5.0) / 7.0)) * 2.8;
    const O2sp_cod = Math.max(0, Math.min(1, (out.COD  - 80)  / 80))  * 1.2;
    const O2sp_bod = Math.max(0, Math.min(1, (out.BOD5 - 20)  / 20))  * 1.0;
    const O2sp = Math.min(7.0, 3.5 + O2sp_nh4 + O2sp_cod + O2sp_bod);
    const errO2 = O2sp - O2;
    const Kp = 6;
    const delta = clamp(Math.round(errO2 * Kp), -8, 15);
    const newBlower = clamp(s.blower + delta, 20, 100);

    if (Math.abs(delta) >= 1) {
      ch.blower = newBlower;
      if (O2 < 1.5) {
        actions[2] = { text: `URGENTE Soffianti: ${s.blower}→${newBlower}% — O2 critico ${O2.toFixed(1)} mg/L (set ${O2sp})`, sev: "ALTO" };
      } else if (delta > 0) {
        const reason = out.NH4 > 8 ? `NH4 ${out.NH4.toFixed(1)} mg/L — set O2>${O2sp.toFixed(1)}` : out.BOD5 > 25 ? `BOD5 ${out.BOD5.toFixed(1)} mg/L` : out.COD > 100 ? `COD ${out.COD.toFixed(1)} mg/L` : `O2 ${O2.toFixed(1)} mg/L → set ${O2sp.toFixed(1)}`;
        actions[2] = { text: `Soffianti: ${s.blower}→${newBlower}% (+${delta}%) — ${reason}`, sev: "MEDIO" };
      } else {
        actions[2] = { text: `Ottimiz. energia: soffianti ${s.blower}→${newBlower}% — O2 ${O2.toFixed(1)} mg/L, margine ok`, sev: "OK" };
      }
    }
  }

  // ── COAGULANTE — controllo TSS sedimentazione ─────────────────
  if (ac.coagulant && ac.coagulant.on) {
    const TSSsp = 20;
    const errTSS = out.TSS - TSSsp;
    const Kp = 1.8;
    const delta = clamp(Math.round(errTSS * Kp), -5, 20);
    const newCoag = clamp(s.coagulant + delta, 15, 100);

    if (Math.abs(delta) >= 1) {
      ch.coagulant = newCoag;
      if (out.TSS > 80) {
        actions[3] = { text: `URGENTE Coagulante: ${s.coagulant}→${newCoag}% — TSS critico ${out.TSS.toFixed(1)} mg/L`, sev: "ALTO" };
      } else if (delta > 0) {
        actions[3] = { text: `Coagulante: ${s.coagulant}→${newCoag}% (+${delta}%) — TSS ${out.TSS.toFixed(1)} mg/L > set ${TSSsp}`, sev: "MEDIO" };
      } else {
        actions[3] = { text: `Risparmio coagulante: ${s.coagulant}→${newCoag}% — TSS ${out.TSS.toFixed(1)} mg/L ottimale`, sev: "OK" };
      }
    }
  }

  // ── RICIRCOLO FANGHI — controllo MLSS biologico ───────────────
  if (ac.sludgeRecycle && ac.sludgeRecycle.on) {
    const MLSSsp = 3200;
    const errMLSS = MLSS - MLSSsp;
    const Kp = 0.008;
    const delta = clamp(Math.round(errMLSS * Kp), -6, 6);
    const newRAS = clamp(s.sludgeRecycle - delta, 20, 100);
    const prev = actions[2];

    if (Math.abs(delta) >= 1) {
      ch.sludgeRecycle = newRAS;
      const rasMsg = `RAS: ${s.sludgeRecycle}→${newRAS}% — MLSS ${Math.round(MLSS)} mg/L (set ${MLSSsp})`;
      if (prev) {
        actions[2] = { ...prev, text: prev.text + ` | ${rasMsg}` };
      } else {
        actions[2] = { text: rasMsg, sev: Math.abs(errMLSS) > 1500 ? "MEDIO" : "OK" };
      }
    }
  }

  // ── CORREZIONE pH — dosaggio NaOH / H2SO4 ────────────────────
  if (ac.pH && ac.pH.on) {
    const pHsp = 7.2;
    const errpH = pHsp - out.pH;
    const Kp = 3;                                          // era 12 — gain ridotto per evitare oscillazioni
    const delta = clamp(Math.round(Math.abs(errpH) * Kp), 0, 5); // max +5% per tick (era 25)

    if (Math.abs(errpH) > 0.20 && delta >= 2) {           // banda morta 0.20 (era 0.15), soglia min 2%
      if (errpH > 0) {
        ch.naoh   = clamp(s.naoh + delta, 0, 100);
        ch.h2so4  = 0;
        const sev = out.pH < 5.5 ? "ALTO" : "MEDIO";
        actions[4] = { text: `NaOH: ${s.naoh}→${ch.naoh}% (+${delta}%) — pH ${out.pH.toFixed(2)} < ${pHsp} (err ${errpH.toFixed(2)})`, sev };
      } else {
        ch.h2so4  = clamp(s.h2so4 + delta, 0, 100);
        ch.naoh   = 0;
        const sev = out.pH > 9.5 ? "ALTO" : "MEDIO";
        actions[4] = { text: `H2SO4: ${s.h2so4}→${ch.h2so4}% (+${delta}%) — pH ${out.pH.toFixed(2)} > ${pHsp} (err ${(-errpH).toFixed(2)})`, sev };
      }
    } else if (Math.abs(errpH) <= 0.20) {
      if (s.naoh > 0)  { ch.naoh  = Math.max(0, s.naoh  - 2); } // ramp-down 2%/tick (era 3)
      if (s.h2so4 > 0) { ch.h2so4 = Math.max(0, s.h2so4 - 2); }
      if (s.naoh > 0 || s.h2so4 > 0)
        actions[4] = { text: `pH normalizzato (${out.pH.toFixed(2)}) — riduzione dosaggi in corso`, sev: "OK" };
    }
  }

  return { changes: ch, actions };
}
