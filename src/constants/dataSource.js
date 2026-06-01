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
  { key: "COD",  label: "COD",   name: "Domanda Chimica di Ossigeno",
    desc: "Ossigeno necessario a ossidare chimicamente le sostanze organiche e inorganiche ossidabili presenti nell'acqua. Esprime il carico inquinante complessivo (anche la frazione non biodegradabile)." },
  { key: "BOD5", label: "BOD₅",  name: "Domanda Biochimica di Ossigeno (5 gg)",
    desc: "Ossigeno consumato dai microrganismi per degradare la sostanza organica biodegradabile in 5 giorni a 20 °C. Misura la frazione biodegradabile del carico organico." },
  { key: "TSS",  label: "TSS",   name: "Solidi Sospesi Totali",
    desc: "Massa di particelle solide in sospensione, trattenute per filtrazione. Indica torbidità ed efficacia della sedimentazione secondaria." },
  { key: "NH4",  label: "NH₄",   name: "Azoto Ammoniacale (NH₄⁺)",
    desc: "Azoto in forma ammoniacale. Tossico per la fauna acquatica e indice di una nitrificazione incompleta nel comparto biologico." },
  { key: "NO3",  label: "NO₃",   name: "Azoto Nitrico (NO₃⁻)",
    desc: "Azoto in forma di nitrato, prodotto dalla nitrificazione. Va rimosso per denitrificazione anossica per contenere l'azoto totale allo scarico." },
  { key: "NTOT", label: "N-tot", name: "Azoto Totale",
    desc: "Somma delle forme di azoto (ammoniacale, nitrico, nitroso e organico). Parametro normato per lo scarico in corpo idrico superficiale (D.Lgs. 152/2006)." },
  { key: "pH",   label: "pH",    name: "Potenziale idrogeno (acidità/basicità)",
    desc: "Misura di acidità/basicità su scala 0–14. Deve restare in genere tra 6,5 e 8,5: valori fuori range danneggiano i fanghi attivi e violano i limiti di scarico." },
  { key: "T",    label: "T°",    name: "Temperatura",
    desc: "Temperatura dell'effluente. Influenza fortemente la cinetica biologica (nitrificazione/denitrificazione) ed è normata allo scarico (≤ 30 °C)." },
  { key: "O2",   label: "O₂",    name: "Ossigeno Disciolto",
    desc: "Concentrazione di ossigeno disciolto nell'acqua. Essenziale per i processi aerobici: valori bassi compromettono la nitrificazione e la rimozione del COD/BOD." },
];

// Segnali di stadio (non parametri dell'effluente): sonde/strumenti installati nei
// singoli comparti. Configurabili come i parametri di qualità.
export const STAGE_SIGNALS = [
  { key: "REDOX", label: "Redox / ORP", name: "Potenziale di ossido-riduzione (ORP)",
    desc: "Potenziale redox del liquame (mV): indica condizioni ossidanti o riducenti. Utile a distinguere zone aerobiche, anossiche e anaerobiche (es. controllo della denitrificazione)." },
  { key: "FLOW",  label: "Portata", name: "Portata volumetrica",
    desc: "Portata del refluo (m³/h). Base per i bilanci di massa, il calcolo dei carichi e il dimensionamento idraulico." },
  { key: "LEVEL", label: "Livello / ΔH", name: "Livello / battente",
    desc: "Livello del liquido o battente differenziale (m). Usato per il controllo delle vasche, la grigliatura (ΔH) e le sicurezze di tracimazione." },
  { key: "DIFFP", label: "Pressione diff.", name: "Pressione differenziale",
    desc: "Differenza di pressione (es. attraverso filtri o griglie). Indica l'intasamento e la necessità di controlavaggio/pulizia." },
  { key: "SBL",   label: "Interfaccia fanghi", name: "Livello interfaccia fanghi (blanket)",
    desc: "Altezza del manto di fanghi nel sedimentatore secondario. Indica la capacità di sedimentazione e il rischio di trascinamento dei solidi in uscita." },
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
  // segnali di stadio
  REDOX: "sensor",
  FLOW: "sensor",
  LEVEL: "sensor",
  DIFFP: "sensor",
  SBL: "sensor",
};

// Mappa l'id-sensore (SENSOR_TYPES / PARAM_SENSOR_MAP) alla chiave di provenienza,
// così la scelta in configurazione si applica anche ai dettagli di stadio.
export const SENSOR_ID_TO_SOURCE_KEY = {
  cod: "COD", tss: "TSS", nh4: "NH4", ph: "pH", temp: "T", o2: "O2",
  redox: "REDOX", flow: "FLOW", level: "LEVEL", diff_p: "DIFFP", sbl: "SBL",
};

// Risolve il tipo di fonte per un parametro: usa la provenienza configurata se il
// parametro è associato a un sensore noto, altrimenti il classificatore automatico.
export function resolveSource(sourceCfg, { sensorId, label = "", unit = "" } = {}) {
  if (sensorId && sourceCfg) {
    const k = SENSOR_ID_TO_SOURCE_KEY[sensorId];
    if (k && sourceCfg[k]) return sourceCfg[k];
  }
  return dataSource(label, unit);
}

// Opzioni selezionabili in configurazione (ordine = ordine nel menu).
export const SOURCE_OPTIONS = [
  { kind: "sensor",   label: "Sensore"      },
  { kind: "analyzer", label: "Analizzatore" },
  { kind: "calc",     label: "Stimato"      },
];
