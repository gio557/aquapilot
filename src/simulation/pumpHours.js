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

// Stable per-pump key. The counter follows the physical pump (registry id),
// so its accumulated wear survives relinking to another stage and stage
// rename/remove — unlike the old "stageName::pumpId" key, which reset the
// meter whenever a pump moved and resurrected stale hours onto a re-added
// stage of the same name.
export function pumpKey(pumpId) {
  return `pump::${pumpId}`;
}

export function loadPumpHours() {
  try { return JSON.parse(localStorage.getItem(KEY) || "{}") || {}; }
  catch { return {}; }
}

export function savePumpHours(map) {
  try { localStorage.setItem(KEY, JSON.stringify(map || {})); }
  catch { /* storage non disponibile */ }
}
