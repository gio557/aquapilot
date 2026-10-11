const KEY = "aquapilot.customPumps.v1";

// Modelli di pompa definiti dall'operatore. Sono dei "template" (nome +
// parametri motore) che vivono nella tab CONSUMABILI; da qui confluiscono nel
// menu "Aggiungi pompa" come gruppo "Pompe personalizzate" e, quando scelti,
// generano una vera pompa nello stadio. Persistiti in localStorage.
export function loadCustomPumps() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || []; }
  catch { return []; }
}

export function saveCustomPumps(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list || [])); }
  catch { /* storage non disponibile */ }
}

export function newCustomPump() {
  return {
    id: `cp_${Date.now()}`,
    name: "Nuova pompa",
    power_kw: 0,
    flow_m3h: 0,
    head_m: 0,
    rpm: 1450,
    vfd: false,
  };
}
