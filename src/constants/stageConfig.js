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

const pump = (id, name, power_kw, flow_m3h, head_m, rpm, vfd = false) =>
  ({ id, name, enabled: true, power_kw, flow_m3h, head_m, rpm, vfd, maintH: DEFAULT_MAINT_H,
     isDosatrice: false, productId: null });

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

export const DEFAULT_STAGE_CONFIG = [
  {
    stageIndex: 0,
    ...fromPreset("Grigliatura"),
    pumps: [],
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
    pumps: [
      { ...pump("p1", "Pompa classificatore sabbie", 2.2, 45, 5, 1450), noDosaggio: true },
    ],
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
    pumps: [
      { ...pump("p1", "Soffianti aria",        15.0,   0,  0, 2900, true), noDosaggio: true },
      { ...pump("p2", "Pompa ricircolo fanghi", 5.5, 200,  6, 1450, true), noDosaggio: true },
    ],
  },
  {
    stageIndex: 3,
    ...fromPreset("Denitrificazione"),
    pumps: [
      { ...pump("p1", "Pompa ricircolo miscela (MLR)", 5.5, 300, 5, 1450, true), noDosaggio: true },
      pump("p2", "Pompa dosaggio carbonio",       0.37, 0.4, 15, 1450),
    ],
  },
  {
    stageIndex: 4,
    ...fromPreset("Sedimentazione"),
    pumps: [
      { ...pump("p1", "Pompa fanghi di ricircolo", 4.0, 120, 7, 1450), noDosaggio: true },
    ],
  },
  {
    stageIndex: 5,
    ...fromPreset("Osmosi Inversa"),
    pumps: [],
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

