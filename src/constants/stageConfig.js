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
};

// Maps stageIndex → param label in stageDetails → required sensorId
// If the sensor is disabled the param shows "N/D" in the detail popup
export const PARAM_SENSOR_MAP = {
  0: { "Portata": "flow",  "Temperatura": "temp", "TSS uscita": "tss" },
  1: { "TSS ingresso": "tss", "TSS uscita": "tss" },
  2: { "O2 disciolto": "o2", "NH4 uscita": "nh4", "COD uscita": "cod", "BOD5 uscita": "cod", "Nitrificaz.": "nh4" },
  3: { "TSS ingresso": "tss", "TSS uscita": "tss", "pH": "ph" },
  4: { "pH finale": "ph", "T° uscita": "temp", "O2 uscita": "o2" },
};

const pump = (id, name, power_kw, flow_m3h, head_m, rpm, vfd = false) =>
  ({ id, name, enabled: true, power_kw, flow_m3h, head_m, rpm, vfd });

export const DEFAULT_STAGE_CONFIG = [
  {
    stageIndex: 0,
    referenceSensor: "diff_p",
    sensors: {
      flow:   { enabled: true  },
      level:  { enabled: true  },
      diff_p: { enabled: true  },
      temp:   { enabled: false },
      tss:    { enabled: false },
    },
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
    referenceSensor: "tss",
    sensors: {
      flow:  { enabled: true  },
      tss:   { enabled: true  },
      level: { enabled: true  },
      temp:  { enabled: false },
    },
    pumps: [
      pump("p1", "Pompa classificatore sabbie", 2.2, 45, 5, 1450),
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
    referenceSensor: "cod",
    sensors: {
      o2:    { enabled: true  },
      ph:    { enabled: true  },
      temp:  { enabled: true  },
      tss:   { enabled: true  },
      nh4:   { enabled: true  },
      redox: { enabled: false },
      cod:   { enabled: false },
    },
    pumps: [
      pump("p1", "Soffianti aria",            15.0,   0,  0, 2900, true),
      pump("p2", "Pompa ricircolo fanghi",     5.5, 200,  6, 1450, true),
    ],
  },
  {
    stageIndex: 3,
    referenceSensor: "tss",
    sensors: {
      tss:  { enabled: true  },
      sbl:  { enabled: true  },
      ph:   { enabled: false },
      flow: { enabled: false },
    },
    pumps: [
      pump("p1", "Pompa fanghi di ricircolo", 4.0, 120, 7, 1450),
    ],
  },
  {
    stageIndex: 4,
    referenceSensor: "nh4",
    sensors: {
      ph:   { enabled: true  },
      flow: { enabled: true  },
      tss:  { enabled: true  },
      temp: { enabled: false },
      o2:   { enabled: false },
    },
    pumps: [
      pump("p1", "Pompa dosaggio disinfettante", 0.37, 0.5, 20, 1450),
    ],
  },
];

export function makeDefaultStageConfig(stageIndex) {
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

