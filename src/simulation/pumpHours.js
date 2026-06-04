// Persistent operating-hours counters for every installed pump/motor.
//
// Counters accumulate simulated run-time in the engine (one entry per enabled
// pump) and survive reloads via localStorage, so a maintenance-hours threshold
// stays meaningful across sessions — just like a real CMMS run-hour meter.

const KEY = "aquapilot.pumpHours.v1";

// Soglia di manutenzione di default (ore). Si applica a una pompa che non porta
// un valore esplicito — così vale anche per le configurazioni già salvate prima
// dell'introduzione del campo. Un valore esplicito 0 disattiva la notifica.
export const DEFAULT_MAINT_H = 4000;

export function pumpMaintH(pump) {
  return pump?.maintH == null ? DEFAULT_MAINT_H : Number(pump.maintH) || 0;
}

// Stable per-pump key. Stage names are unique within a plant (a stage type
// can't be added twice) and pump ids are unique within a stage, so the pair is
// stable across stage reordering — unlike a positional index.
export function pumpKey(stageName, pumpId) {
  return `${stageName}::${pumpId}`;
}

export function loadPumpHours() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
  catch { return {}; }
}

export function savePumpHours(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map || {})); }
  catch { /* storage non disponibile */ }
}
