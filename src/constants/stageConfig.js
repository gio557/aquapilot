import { DEFAULT_MAINT_H } from "../simulation/pumpHours";

export const SENSOR_TYPES = {
  flow:   { label: "Misuratore portata",          unit: "m³/h",  icon: "〰" },
  level:  { label: "Sensore livello",             unit: "m",     icon: "📶" },
  diff_p: { label: "Pressione differenziale",     unit: "mbar",  icon: "↕" },
  o2:     { label: "Sonda O₂ disciolto",          unit: "mg/L",  icon: "💨" },
  ph:     { label: "Sonda pH",                    unit: "—",     icon: "⚗" },
  tss:    { label: "Sonda TSS / torbidità",       unit: "mg/L",  icon: "🌊" },
  temp:   { label: "Sensore temperatura",         unit: "°C",    icon: "🌡" },
  cod:    { label: "Analizzatore COD online",     unit: "mg/L",  icon: "🔬" },
  nh4:    { label: "Analizzatore NH₄ online",     unit: "mg/L",  icon: "🔬" },
  redox:  { label: "Sonda Redox / ORP",           unit: "mV",    icon: "⚡" },
  sbl:    { label: "Livello interfaccia fanghi",  unit: "m",     icon: "📊" },
  cond:   { label: "Conducimetro permeato",       unit: "µS/cm", icon: "🧪" },
};

// Maps stage NAME → param label → required sensorId.
// A param is hidden if its sensor exists but is disabled, or if the sensor is not in the config.
// Params NOT listed here are always shown (process-internal computed values: timers, currents, %).
export const PARAM_SENSOR_MAP = {
  "Grigliatura": {
    "TSS ingresso": "tss", "TSS uscita": "tss",
    "COD ingresso": "cod", "BOD5 ingresso": "cod",
    "Portata": "flow", "Temperatura": "temp", "ΔH livello": "diff_p",
  },
  "Dissabbiatura": {
    "TSS ingresso": "tss", "TSS uscita": "tss",
    "COD ingresso": "cod", "BOD5 ingresso": "cod",
    "NH4 ingresso": "nh4", "pH ingresso": "ph",
  },
  "Degrassatore": {
    "COD ingresso": "cod", "COD uscita": "cod", "BOD5 uscita": "cod",
    "TSS uscita": "tss", "pH": "ph", "Temperatura": "temp",
  },
  "Equalizzazione": {
    "Portata in ingresso": "flow", "Portata equalizzata": "flow",
    "COD ingresso": "cod", "pH": "ph", "Temperatura": "temp",
  },
  "Biologico": {
    "COD ingresso": "cod", "COD uscita": "cod", "BOD5 uscita": "cod",
    "NH4 uscita": "nh4", "Nitrificaz.": "nh4",
    "O2 disciolto": "o2", "Rimozione COD": "cod",
    "MLSS": "tss",
  },
  "Nitrificazione": {
    "NH4 ingresso": "nh4", "NH4 uscita": "nh4",
    "NO3 prodotto": "nh4", "Nitrificaz.": "nh4",
    "O2 disciolto": "o2", "pH": "ph",
  },
  "Denitrificazione": {
    "NO3 ingresso": "nh4", "NO3 uscita": "nh4",
    "COD consumato": "cod", "COD residuo": "cod",
    "pH": "ph",
  },
  "Sedimentazione": {
    "TSS ingresso": "tss", "TSS uscita": "tss",
    "COD uscita": "cod", "BOD5 uscita": "cod", "pH": "ph",
  },
  "Flottazione DAF": {
    "TSS ingresso": "tss", "TSS uscita": "tss",
    "COD uscita": "cod", "BOD5 uscita": "cod", "pH": "ph",
  },
  "Filtrazione": {
    "TSS ingresso": "tss", "TSS uscita": "tss",
    "COD uscita": "cod", "pH": "ph",
  },
  "Osmosi Inversa": {
    "COD ingresso": "cod", "COD uscita": "cod",
    "TSS uscita": "tss", "NH4 uscita": "nh4", "NO3 uscita": "nh4",
    "pH": "ph",
    "ΔP membrana": "diff_p", "Cond. permeato": "cond",
    "Portata permeato": "flow", "Portata concentr.": "flow",
  },
  "Disinfezione UV": {
    "COD uscita": "cod", "TSS uscita": "tss",
    "pH": "ph", "Temperatura": "temp",
  },
  "Disinfezione Cloro": {
    "COD uscita": "cod", "BOD5 uscita": "cod", "TSS uscita": "tss",
    "NH4 uscita": "nh4", "pH finale": "ph", "T° uscita": "temp", "O2 uscita": "o2",
  },
  "Disinfezione": {
    "COD uscita": "cod", "BOD5 uscita": "cod", "TSS uscita": "tss",
    "NH4 uscita": "nh4", "pH finale": "ph", "T° uscita": "temp", "O2 uscita": "o2",
  },
  "Post-trattamento": {
    "COD ingresso": "cod", "COD uscita": "cod",
    "TSS uscita": "tss", "pH": "ph",
  },
};

// A stage references a pump by LINK ({registryId, enabled}); the pump itself
// lives in the registry (DEFAULT_PUMPS_REGISTRY below). This enforces the
// "registry first" rule: a stage can never carry a pump that wasn't created in
// the Pompe a Inverter / Pompe Dosatrici registry first.
const link = (registryId, enabled = true) => ({ registryId, enabled });

// Catalogo delle pompe di PROCESSO (non dosatrici) selezionabili quando si
// aggiunge una pompa a uno stadio. Le pompe dosatrici NON stanno qui: vengono
// generate dinamicamente, una per ogni prodotto consumabile, dalla UI.
export const PUMP_CATALOG = [
  { key:"soffianti",       name:"Soffianti aria",                        power_kw:15.0, flow_m3h:0,   head_m:0,   rpm:2900, vfd:true },
  { key:"ric_fanghi",      name:"Pompa ricircolo fanghi",                power_kw:5.5,  flow_m3h:200, head_m:6,   rpm:1450, vfd:true },
  { key:"ric_miscela",     name:"Pompa ricircolo miscela (MLR)",         power_kw:5.5,  flow_m3h:300, head_m:5,   rpm:1450, vfd:true },
  { key:"classificatore",  name:"Pompa classificatore sabbie",           power_kw:2.2,  flow_m3h:45,  head_m:5,   rpm:1450, vfd:true },
  { key:"rilancio",        name:"Pompa di rilancio",                     power_kw:5.5,  flow_m3h:100, head_m:10,  rpm:1450, vfd:true },
  { key:"sollevamento",    name:"Pompa di sollevamento liquami",         power_kw:7.5,  flow_m3h:120, head_m:8,   rpm:1450, vfd:true },
  { key:"soffiante_diss",  name:"Soffiante insufflazione aerato",        power_kw:3.0,  flow_m3h:0,   head_m:0,   rpm:2900, vfd:true },
  { key:"rilancio_eq",     name:"Pompa di rilancio/alimentazione",       power_kw:5.5,  flow_m3h:100, head_m:10,  rpm:1450, vfd:true },
  { key:"mixer_eq",        name:"Mixer equalizzazione",                   power_kw:2.2,  flow_m3h:0,   head_m:0,   rpm:960,  vfd:true },
  { key:"mixer_anossico",  name:"Mixer anossico",                         power_kw:2.2,  flow_m3h:0,   head_m:0,   rpm:960,  vfd:true },
  { key:"spurgo_fanghi",   name:"Pompa spurgo fanghi (WAS)",             power_kw:3.0,  flow_m3h:30,  head_m:8,   rpm:1450, vfd:true },
  { key:"press_daf",       name:"Pompa pressurizzazione/ricircolo DAF",  power_kw:5.5,  flow_m3h:80,  head_m:30,  rpm:1450, vfd:true },
  { key:"controlavaggio",  name:"Pompa controlavaggio filtrazione",       power_kw:4.0,  flow_m3h:60,  head_m:15,  rpm:1450, vfd:true },
  { key:"alta_pressione",  name:"Pompa alta pressione membrana",         power_kw:11.0, flow_m3h:20,  head_m:100, rpm:2900, vfd:true },
  { key:"booster_osmosi",  name:"Pompa booster osmosi",                   power_kw:3.0,  flow_m3h:30,  head_m:50,  rpm:1450, vfd:true },
  { key:"rilancio_finale", name:"Pompa di rilancio finale",               power_kw:3.0,  flow_m3h:100, head_m:10,  rpm:1450, vfd:true },
];

// Caratteristiche di default per una pompa dosatrice (piccola portata, alta
// prevalenza), usate quando la si aggiunge dal catalogo per un prodotto.
export const DOSING_PUMP_SPEC = { power_kw:0.37, flow_m3h:0.4, head_m:15, rpm:1450 };

// Factory pubblica per costruire una pompa con tutti i campi di default. Usata
// dalla UI di configurazione per aggiungere pompe dal catalogo.
export function makePump({ name, power_kw, flow_m3h, head_m, rpm, vfd = false, isDosatrice = false, productId = null }) {
  return {
    id: `p${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, name, enabled: true,
    power_kw, flow_m3h, head_m, rpm, vfd, maintH: DEFAULT_MAINT_H,
    isDosatrice, productId,
  };
}

// Per-stage-type sensor/referenceSensor defaults. Single source of truth for
// the sensor layout of a stage type — consumed both by makeDefaultStageConfig
// (newly added stages) and by DEFAULT_STAGE_CONFIG below (initial plant), so
// the two can never drift apart.
const STAGE_SENSOR_PRESETS = {
  "Grigliatura": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, level:{enabled:true}, diff_p:{enabled:true}, temp:{enabled:false}, tss:{enabled:false} },
  },
  "Dissabbiatura": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, tss:{enabled:true}, level:{enabled:true}, temp:{enabled:false} },
  },
  "Degrassatore": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, level:{enabled:true}, tss:{enabled:false}, ph:{enabled:false}, temp:{enabled:false} },
  },
  "Equalizzazione": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, level:{enabled:true}, tss:{enabled:false}, ph:{enabled:false}, temp:{enabled:false} },
  },
  "Biologico": {
    referenceSensor: "cod",
    sensors: { o2:{enabled:true}, ph:{enabled:true}, temp:{enabled:true}, tss:{enabled:true}, nh4:{enabled:true}, redox:{enabled:false}, cod:{enabled:false} },
  },
  "Nitrificazione": {
    referenceSensor: "nh4",
    sensors: { flow:{enabled:true}, o2:{enabled:true}, nh4:{enabled:true}, ph:{enabled:true}, temp:{enabled:true}, tss:{enabled:false} },
  },
  "Denitrificazione": {
    referenceSensor: "nh4",
    sensors: { flow:{enabled:true}, nh4:{enabled:true}, redox:{enabled:true}, ph:{enabled:true}, temp:{enabled:true}, tss:{enabled:false} },
  },
  "Sedimentazione": {
    referenceSensor: "tss",
    sensors: { tss:{enabled:true}, sbl:{enabled:true}, ph:{enabled:false}, flow:{enabled:false}, cod:{enabled:false}, temp:{enabled:false} },
  },
  "Flottazione DAF": {
    referenceSensor: "tss",
    sensors: { flow:{enabled:true}, tss:{enabled:true}, diff_p:{enabled:true}, ph:{enabled:false}, temp:{enabled:false}, level:{enabled:false} },
  },
  "Filtrazione": {
    referenceSensor: "tss",
    sensors: { flow:{enabled:true}, tss:{enabled:true}, diff_p:{enabled:true}, cod:{enabled:true}, ph:{enabled:false}, temp:{enabled:false}, level:{enabled:false} },
  },
  "Osmosi Inversa": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, diff_p:{enabled:true}, cond:{enabled:true}, cod:{enabled:true}, nh4:{enabled:true}, tss:{enabled:true}, ph:{enabled:false}, temp:{enabled:false} },
  },
  "Disinfezione UV": {
    referenceSensor: null,
    sensors: { flow:{enabled:true}, tss:{enabled:true}, ph:{enabled:false}, temp:{enabled:false} },
  },
  "Disinfezione Cloro": {
    referenceSensor: "nh4",
    sensors: { ph:{enabled:true}, flow:{enabled:true}, tss:{enabled:true}, cod:{enabled:true}, nh4:{enabled:true}, temp:{enabled:false}, o2:{enabled:false} },
  },
  "Post-trattamento": {
    referenceSensor: "cod",
    sensors: { flow:{enabled:true}, cod:{enabled:true}, tss:{enabled:true}, ph:{enabled:false}, temp:{enabled:false} },
  },
};

// Sensor layout per default stage is derived from STAGE_SENSOR_PRESETS so it can
// never drift from what add-stage produces. Each entry then adds the stage's
// process detail (pumps, sub-config) that presets don't carry.
const fromPreset = (name) => ({
  referenceSensor: STAGE_SENSOR_PRESETS[name].referenceSensor,
  sensors: { ...STAGE_SENSOR_PRESETS[name].sensors },
});

// ── Registro pompe di default ────────────────────────────────────────────────
// Setup tipico di un depuratore reale a fanghi attivi con pre-denitrificazione
// (schema MLE) seguito da affinamento a osmosi inversa. Ogni pompa qui è una
// voce di registro (visibile nella pagina "Pompe a Inverter" / "Pompe Dosatrici")
// e gli stadi la richiamano per LINK. Gli id sono stabili: i link in
// DEFAULT_STAGE_CONFIG e le config salvate vi fanno riferimento.
//   inverter:  { id, name, flow_m3h, power_kw, loadPct, maintH }
//   dosatrici: { id, name, flow_m3h, productId, maintH }
const inv = (id, name, power_kw, flow_m3h, loadPct) =>
  ({ id, name, flow_m3h, power_kw, loadPct, maintH: DEFAULT_MAINT_H });
const dos = (id, name, flow_m3h, productId) =>
  ({ id, name, flow_m3h, productId, maintH: DEFAULT_MAINT_H });

export const DEFAULT_PUMPS_REGISTRY = {
  inverter: [
    inv("pi_def_sollev",    "Pompa di sollevamento liquami",   7.5, 120, 70),  // Grigliatura
    inv("pi_def_soffdiss",  "Soffiante dissabbiatore",         3.0,   0, 60),  // Dissabbiatura
    inv("pi_def_classif",   "Pompa classificatore sabbie",     2.2,  45, 35),  // Dissabbiatura
    inv("pi_def_soffianti", "Soffianti aria",                 15.0,   0, 75),  // Biologico
    inv("pi_def_mlr",       "Pompa ricircolo miscela (MLR)",   5.5, 300, 80),  // Denitrificazione
    inv("pi_def_mixerden",  "Mixer anossico",                  2.2,   0, 60),  // Denitrificazione
    inv("pi_def_ras",       "Pompa ricircolo fanghi (RAS)",    5.5, 200, 70),  // Sedimentazione
    inv("pi_def_was",       "Pompa spurgo fanghi (WAS)",       3.0,  30, 25),  // Sedimentazione
    inv("pi_def_osmohp",    "Pompa alta pressione membrana",  11.0,  20, 85),  // Osmosi Inversa
    inv("pi_def_osmoboost", "Pompa booster osmosi",            3.0,  30, 70),  // Osmosi Inversa
  ],
  dosatrici: [
    dos("pd_def_carbonio",  "Pompa dosaggio fonte di carbonio", 0.4, "carbonio"),  // Denitrificazione
    dos("pd_def_coagulante","Pompa dosaggio coagulante",        0.5, "coagulante"), // Sedimentazione
  ],
};

export const DEFAULT_STAGE_CONFIG = [
  {
    stageIndex: 0,
    ...fromPreset("Grigliatura"),
    pumps: [ link("pi_def_sollev") ],
    grigliatura: {
      DH_AVVIO_PULIZIA:        0.15,
      DH_STOP_PULIZIA:         0.05,
      DH_GUARDIA_ALTA:         0.35,
      TIMER_BACKUP_INTERVALLO: 1800,
      DURATA_MINIMA_CICLO:     120,
      CORRENTE_NOMINALE:       4.5,
      CORRENTE_SOVRACCARICO:   8.0,
      BYPASS_AUTO:             true,
    },
  },
  {
    stageIndex: 1,
    ...fromPreset("Dissabbiatura"),
    pumps: [ link("pi_def_soffdiss"), link("pi_def_classif") ],
    classifier: {
      mode: "timed",    // "timed" | "continuous"
      timeOn: 10,       // minutes
      timeOff: 20,      // minutes
      speed: 60,        // % for continuous mode
      thresholdWarn: 3.0,     // A — green → yellow
      thresholdAlarm: 4.2,    // A — yellow → red
    },
  },
  {
    stageIndex: 2,
    ...fromPreset("Biologico"),
    pumps: [ link("pi_def_soffianti") ],
  },
  {
    stageIndex: 3,
    ...fromPreset("Denitrificazione"),
    pumps: [ link("pi_def_mlr"), link("pi_def_mixerden"), link("pd_def_carbonio") ],
  },
  {
    stageIndex: 4,
    ...fromPreset("Sedimentazione"),
    pumps: [ link("pi_def_ras"), link("pi_def_was"), link("pd_def_coagulante") ],
  },
  {
    stageIndex: 5,
    ...fromPreset("Osmosi Inversa"),
    pumps: [ link("pi_def_osmohp"), link("pi_def_osmoboost") ],
  },
];

export function makeDefaultStageConfig(stageIndex, stageName) {
  const preset = stageName && STAGE_SENSOR_PRESETS[stageName];
  if (preset) {
    return { stageIndex, referenceSensor: preset.referenceSensor, sensors: { ...preset.sensors }, pumps: [] };
  }
  return {
    stageIndex,
    referenceSensor: "cod",
    sensors: {
      flow:  { enabled: true  },
      level: { enabled: false },
      tss:   { enabled: false },
      ph:    { enabled: false },
      temp:  { enabled: false },
      o2:    { enabled: false },
    },
    pumps: [],
  };
}

// VFD pump keys (from PUMP_CATALOG) to auto-create when a stage type is added to the plant.
export const STAGE_DEFAULT_PUMPS = {
  "Grigliatura":       ["sollevamento"],
  "Dissabbiatura":     ["soffiante_diss", "classificatore"],
  "Degrassatore":      [],
  "Equalizzazione":    ["rilancio_eq", "mixer_eq"],
  "Biologico":         ["soffianti"],
  "Nitrificazione":    ["soffianti"],
  "Denitrificazione":  ["ric_miscela", "mixer_anossico"],
  "Sedimentazione":    ["ric_fanghi", "spurgo_fanghi"],
  "Flottazione DAF":   ["press_daf"],
  "Filtrazione":       ["controlavaggio"],
  "Osmosi Inversa":    ["alta_pressione", "booster_osmosi"],
  "Disinfezione UV":   [],
  "Disinfezione Cloro":[],
  "Post-trattamento":  ["rilancio_finale"],
};

// Creates inverter-registry entries and link objects for a stage's default VFD pumps.
// Call when adding a new stage to the plant; add returned entries to pumpsRegistry.inverter
// and use links as the stage's pumps array.
export function makeStagePumps(stageName) {
  const keys = STAGE_DEFAULT_PUMPS[stageName] || [];
  const newRegistryEntries = [];
  const links = [];
  for (const key of keys) {
    const cat = PUMP_CATALOG.find(c => c.key === key);
    if (!cat || !cat.vfd) continue;
    const id = `pi_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    newRegistryEntries.push({
      id, name: cat.name, flow_m3h: cat.flow_m3h,
      power_kw: cat.power_kw, loadPct: 75, maintH: DEFAULT_MAINT_H,
    });
    links.push({ registryId: id, enabled: true });
  }
  return { newRegistryEntries, links };
}

