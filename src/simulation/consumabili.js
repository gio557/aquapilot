const KEY = "aquapilot.consumabili.v1";

// Default chemical products dosable across the plant. Each carries the stage
// types where it is typically used (stadiTipici) and the active substance (note).
// IDs are stable: existing pump links (productId) and saved configs rely on them.
export const DEFAULT_CONSUMABILI = [
  {
    id: "coagulante", nome: "Coagulante",
    note: "Cloruro ferrico (FeCl₃) / Policloruro di alluminio (PAC)",
    stadiTipici: ["Sedimentazione", "Flottazione DAF", "Filtrazione"],
  },
  {
    id: "naoh", nome: "NaOH (Soda caustica)",
    note: "Correzione pH / alcalinità (soluzione 30-50%)",
    stadiTipici: ["Equalizzazione", "Biologico", "Nitrificazione", "Post-trattamento"],
  },
  {
    id: "h2so4", nome: "H₂SO₄ (Acido solforico)",
    note: "Correzione pH",
    stadiTipici: ["Equalizzazione", "Osmosi Inversa", "Post-trattamento"],
  },
  {
    id: "carbonio", nome: "Fonte di carbonio",
    note: "Metanolo / Etanolo (donatore di elettroni)",
    stadiTipici: ["Denitrificazione", "Biologico"],
  },
  {
    id: "antischiuma", nome: "Antischiuma",
    note: "Agente antifoam (emulsione)",
    stadiTipici: ["Biologico", "Equalizzazione", "Degrassatore"],
  },
  {
    id: "antiscalante", nome: "Antiscalante",
    note: "Inibitore di scaling per membrane",
    stadiTipici: ["Osmosi Inversa"],
  },
  {
    id: "ipoclorito", nome: "Ipoclorito di sodio",
    note: "Disinfettante a base di cloro (soluzione)",
    stadiTipici: ["Disinfezione Cloro"],
  },
].map(p => ({
  fornitore: "", emailFornitore: "", emailResponsabile: "",
  autoEmailFornitore: false, livelloRiordino_mm: 400, livelloVuoto_mm: 100,
  ...p,
}));

export function loadConsumabili() {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") || DEFAULT_CONSUMABILI; }
  catch { return DEFAULT_CONSUMABILI; }
}

export function saveConsumabili(list) {
  try { localStorage.setItem(KEY, JSON.stringify(list || [])); }
  catch { /* storage non disponibile */ }
}

export function newConsumabile() {
  return {
    id: `prod_${Date.now()}`,
    nome: "Nuovo prodotto",
    note: "",
    stadiTipici: [],
    fornitore: "",
    emailFornitore: "",
    emailResponsabile: "",
    autoEmailFornitore: false,
    livelloRiordino_mm: 400,
    livelloVuoto_mm: 100,
  };
}

// Non-destructive merge: append any default product whose id is absent from the
// current list, preserving the operator's edits and custom products. Used by the
// "Aggiungi prodotti predefiniti mancanti" button so existing installs (whose
// localStorage holds an older, shorter default set) can pull in the new entries.
export function mergeDefaults(list) {
  const have = new Set((list || []).map(c => c.id));
  const missing = DEFAULT_CONSUMABILI.filter(d => !have.has(d.id));
  return [...(list || []), ...missing.map(d => ({ ...d }))];
}
