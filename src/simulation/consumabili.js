const KEY = "aquapilot.consumabili.v1";

export const DEFAULT_CONSUMABILI = [
  {
    id: "coagulante",
    nome: "Coagulante",
    fornitore: "",
    emailFornitore: "",
    emailResponsabile: "",
    autoEmailFornitore: false,
    livelloRiordino_mm: 400,
    livelloVuoto_mm: 100,
  },
  {
    id: "naoh",
    nome: "NaOH (Soda caustica)",
    fornitore: "",
    emailFornitore: "",
    emailResponsabile: "",
    autoEmailFornitore: false,
    livelloRiordino_mm: 400,
    livelloVuoto_mm: 100,
  },
  {
    id: "h2so4",
    nome: "H₂SO₄ (Acido solforico)",
    fornitore: "",
    emailFornitore: "",
    emailResponsabile: "",
    autoEmailFornitore: false,
    livelloRiordino_mm: 400,
    livelloVuoto_mm: 100,
  },
];

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
    fornitore: "",
    emailFornitore: "",
    emailResponsabile: "",
    autoEmailFornitore: false,
    livelloRiordino_mm: 400,
    livelloVuoto_mm: 100,
  };
}
