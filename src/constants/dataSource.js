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

// Percentuali, rendimenti, valori derivati/inferiti → sempre "calc".
const CALC_KW = [
  "bod", "n-tot", "ntot", "azoto totale",
  "rimoz", "rendiment", "efficien", "eff.",
  "nitrific", "denitrif", "prodott", "consumat", "residu",
  "setpoint", "target", "fattore", "intasam",
];

// Grandezze ottenute con uno strumento analitico (non una sonda diretta).
const ANALYZER_KW = ["cod"];

const SENSOR_KW = [
  "ph", "o2", "o₂", "ossigeno", "disciolt",
  "temperatur", "t°", "°c",
  "portata", "flow", "livello", "δh", "delta_h", "pressione",
  "tss", "torbid", "solidi sospes",
  "nh4", "nh₄", "ammoni", "no3", "no₃", "nitric",
  "redox", "orp", "corrente", "interfaccia", "mlss",
];

// Returns "sensor" | "analyzer" | "calc" for a label and (optional) unit.
// Le percentuali/efficienze hanno priorità (così "Rimozione COD %" resta calc),
// poi i concetti calcolati, poi gli strumenti analitici, infine le sonde dirette.
export function dataSource(label = "", unit = "") {
  const s = String(label).toLowerCase();
  if (String(unit).trim() === "%") return "calc";
  if (CALC_KW.some(k => s.includes(k))) return "calc";
  if (ANALYZER_KW.some(k => s.includes(k))) return "analyzer";
  if (SENSOR_KW.some(k => s.includes(k))) return "sensor";
  return "calc";
}

// Presentation metadata for a source kind. "command" is used for actuator
// outputs (setpoint/posizione inviata all'attuatore) — non è né misura né stima.
//   sensor   → sonda online a misura diretta (pH, O₂, temperatura, livello…)
//   analyzer → strumento analitico (analizzatore COD/NH₄ online, metodo di lab):
//              esegue una vera analisi, ma periodica / con reagenti
//   calc     → valore stimato/calcolato (correlazione, derivato, ecc.)
//   command  → comando inviato a un attuatore
export function dataSourceTag(kind) {
  if (kind === "sensor")   return { kind, icon: "📡", word: "sensore",     note: "misura diretta da sonda online" };
  if (kind === "analyzer") return { kind, icon: "🔬", word: "analizzatore", note: "strumento analitico (analizzatore online o metodo di laboratorio)" };
  if (kind === "command")  return { kind, icon: "⚙️", word: "comando",     note: "comando inviato all'attuatore (setpoint/posizione operativa)" };
  return { kind: "calc", icon: "🧮", word: "stimato", note: "valore stimato / calcolato (correlazione, laboratorio o derivato)" };
}

// ── Provenienza dei parametri di QUALITÀ USCITA (configurabile) ───────────────
// Lista dei parametri dell'effluente e tipo di fonte predefinito. L'utente può
// ridefinire il tipo di ciascuno dalla pagina Configurazione → PROVENIENZA DATI.
export const QUALITY_PARAMS = [
  { key: "COD",  label: "COD"   },
  { key: "BOD5", label: "BOD₅"  },
  { key: "TSS",  label: "TSS"   },
  { key: "NH4",  label: "NH₄"   },
  { key: "NO3",  label: "NO₃"   },
  { key: "NTOT", label: "N-tot" },
  { key: "pH",   label: "pH"    },
  { key: "T",    label: "T°"    },
  { key: "O2",   label: "O₂"    },
];

export const QUALITY_SOURCE_DEFAULTS = {
  COD: "analyzer",  // analizzatore COD online (a umido) o laboratorio
  BOD5: "calc",     // test di laboratorio 5 gg / stima da COD
  TSS: "sensor",    // sonda di torbidità
  NH4: "sensor",    // analizzatore/ISE NH₄ online
  NO3: "sensor",    // analizzatore/ISE NO₃ online
  NTOT: "calc",     // derivato: NH₄ + NO₃
  pH: "sensor",
  T: "sensor",
  O2: "sensor",
};

// Opzioni selezionabili in configurazione (ordine = ordine nel menu).
export const SOURCE_OPTIONS = [
  { kind: "sensor",   label: "Sensore"      },
  { kind: "analyzer", label: "Analizzatore" },
  { kind: "calc",     label: "Stimato"      },
];
