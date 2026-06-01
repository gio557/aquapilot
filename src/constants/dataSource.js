// Classifica un valore mostrato in interfaccia in base a come si otterrebbe in
// un impianto reale:
//   "sensor" → misura diretta da strumento online (pH, O₂, NH₄, NO₃, TSS/torbidità,
//              temperatura, portata, livello/ΔH, pressione, corrente, redox, MLSS)
//   "calc"   → valore stimato/calcolato: analizzatore a correlazione (COD), test di
//              laboratorio (BOD₅), valore derivato (N-tot = NH₄+NO₃), efficienze e
//              percentuali di processo, rendimenti, setpoint, timer, stati inferiti.
//
// Regola: i concetti "calcolati" hanno priorità (COD/BOD restano stime anche se
// esiste un analizzatore); poi qualunque grandezza in % è un calcolo di processo;
// infine si riconoscono le grandezze tipicamente misurate da sonda. Il default,
// per una grandezza non riconosciuta, è "calc" (valore interno di processo).

const CALC_KW = [
  "cod", "bod", "n-tot", "ntot", "azoto totale",
  "rimoz", "rendiment", "efficien", "eff.",
  "nitrific", "denitrif", "prodott", "consumat", "residu",
  "setpoint", "target", "fattore", "intasam",
];

const SENSOR_KW = [
  "ph", "o2", "o₂", "ossigeno", "disciolt",
  "temperatur", "t°", "°c",
  "portata", "flow", "livello", "δh", "delta_h", "pressione",
  "tss", "torbid", "solidi sospes",
  "nh4", "nh₄", "ammoni", "no3", "no₃", "nitric",
  "redox", "orp", "corrente", "interfaccia", "mlss",
];

// Returns "sensor" | "calc" for a given parameter label and (optional) unit.
export function dataSource(label = "", unit = "") {
  const s = String(label).toLowerCase();
  if (CALC_KW.some(k => s.includes(k))) return "calc";
  if (String(unit).trim() === "%") return "calc";
  if (SENSOR_KW.some(k => s.includes(k))) return "sensor";
  return "calc";
}

// Presentation metadata for a source kind.
export function dataSourceTag(kind) {
  return kind === "sensor"
    ? { kind, icon: "📡", word: "sensore",  note: "misura diretta da sensore online" }
    : { kind, icon: "🧮", word: "stimato",  note: "valore stimato / calcolato (correlazione, laboratorio o derivato)" };
}
