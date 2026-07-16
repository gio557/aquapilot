// Per-stage trend metric definitions.
// key:    dataKey used in recharts and in the trendData object emitted by each processor.
// sensor: if present, metric is hidden when that sensor is not enabled (undefined = always shown).

const COD_C  = "#00CFFF";
const BOD_C  = "#00E599";
const TSS_C  = "#FF9422";
const NH4_C  = "#BB66FF";
const PH_C   = "#FFD060";
const O2_C   = "#FF3B5C";
const CUR_C  = "#FFC300";  // current / ampere
const LVL_C  = "#00B4D8";  // level / height
const ACT_C  = "#9B5DE5";  // actuator / binary
const FLOW_C = "#F15BB5";  // flow / portata
const ACT2_C = "#8B8BFF";  // secondary actuator
const RDX_C  = "#E0AAFF";  // redox / ORP
const SBL_C  = "#48CAE4";  // sludge-blanket interface level

// Shared metric defs reused across stages (data comes from the base stageWater
// object built in engine.js, so no per-processor change is needed).
const TEMP_M  = { key:"T",      label:"Temperatura",        unit:"°C",   color:CUR_C,  sensor:"temp"   };
const PH_M    = { key:"pH",     label:"pH",                 unit:"",     color:PH_C,   sensor:"ph"     };
const FLOW_M  = { key:"Q",      label:"Portata",            unit:"m³/h", color:FLOW_C, sensor:"flow"   };
const REDOX_M = { key:"redox",  label:"Redox / ORP",        unit:"mV",   color:RDX_C,  sensor:"redox"  };
const SBL_M   = { key:"sbl",    label:"Liv. interf. fanghi",unit:"m",    color:SBL_C,  sensor:"sbl"    };
const DIFFP_M = { key:"diff_p", label:"Press. diff.",       unit:"mbar", color:LVL_C,  sensor:"diff_p" };

export const STAGE_TREND_DEFS = {
  "Grigliatura": [
    { key:"delta_h",    label:"ΔH livello",        unit:"m",    color:LVL_C  },
    { key:"intasamento",label:"Intasamento",        unit:"%",    color:TSS_C  },
    { key:"corrente",   label:"Corrente rastrello", unit:"A",    color:CUR_C  },
    { key:"pulizia",    label:"Pulizia attiva",     unit:"0/1",  color:ACT_C,  step:true },
    { key:"TSS",        label:"TSS uscita",         unit:"mg/L", color:TSS_C,  sensor:"tss" },
    FLOW_M, TEMP_M,
  ],
  "Dissabbiatura": [
    { key:"tss_in",      label:"TSS ingresso",      unit:"mg/L", color:COD_C,  sensor:"tss" },
    { key:"TSS",         label:"TSS uscita",        unit:"mg/L", color:TSS_C,  sensor:"tss" },
    { key:"corrente_inv",label:"Corrente inverter", unit:"A",    color:CUR_C  },
    FLOW_M, TEMP_M,
  ],
  "Degrassatore": [
    { key:"cod_in", label:"COD ingresso", unit:"mg/L", color:COD_C,  sensor:"cod" },
    { key:"COD",    label:"COD uscita",   unit:"mg/L", color:BOD_C,  sensor:"cod" },
    { key:"TSS",    label:"TSS uscita",   unit:"mg/L", color:TSS_C,  sensor:"tss" },
    PH_M, FLOW_M, TEMP_M,
  ],
  "Equalizzazione": [
    { key:"q_in", label:"Portata ingresso",  unit:"m³/h", color:COD_C,  sensor:"flow" },
    { key:"Q",    label:"Portata equaliz.",  unit:"m³/h", color:BOD_C,  sensor:"flow" },
    { key:"COD",  label:"COD ingresso",      unit:"mg/L", color:NH4_C,  sensor:"cod"  },
    PH_M, TEMP_M,
  ],
  "Biologico": [
    { key:"O2",     label:"O₂ disciolto",  unit:"mg/L", color:O2_C,   sensor:"o2"  },
    { key:"NH4",    label:"NH₄ uscita",    unit:"mg/L", color:NH4_C,  sensor:"nh4" },
    { key:"MLSS",   label:"MLSS",          unit:"mg/L", color:TSS_C,  sensor:"tss" },
    { key:"COD",    label:"COD uscita",    unit:"mg/L", color:COD_C,  sensor:"cod" },
    { key:"blower", label:"Soffianti",     unit:"%",    color:ACT_C  },
    PH_M, TEMP_M,
  ],
  "Nitrificazione": [
    { key:"NH4",    label:"NH₄ uscita",    unit:"mg/L", color:NH4_C,  sensor:"nh4" },
    { key:"NO3",    label:"NO₃ prodotto",  unit:"mg/L", color:ACT2_C, sensor:"nh4" },
    { key:"O2",     label:"O₂ disciolto",  unit:"mg/L", color:O2_C,   sensor:"o2"  },
    { key:"blower", label:"Soffianti",     unit:"%",    color:ACT_C  },
    PH_M, FLOW_M, TEMP_M,
  ],
  "Denitrificazione": [
    { key:"no3_in", label:"NO₃ ingresso",  unit:"mg/L", color:COD_C,  sensor:"nh4" },
    { key:"NO3",    label:"NO₃ uscita",    unit:"mg/L", color:ACT2_C, sensor:"nh4" },
    { key:"COD",    label:"COD residuo",   unit:"mg/L", color:BOD_C,  sensor:"cod" },
    PH_M, REDOX_M, FLOW_M, TEMP_M,
  ],
  "Sedimentazione": [
    { key:"tss_in",    label:"TSS ingresso",     unit:"mg/L", color:COD_C, sensor:"tss" },
    { key:"TSS",       label:"TSS uscita",       unit:"mg/L", color:TSS_C, sensor:"tss" },
    { key:"COD",       label:"COD uscita",       unit:"mg/L", color:BOD_C, sensor:"cod" },
    { key:"coagulant", label:"Coagulante",       unit:"%",    color:ACT_C },
    PH_M, SBL_M, FLOW_M, TEMP_M,
  ],
  "Flottazione DAF": [
    { key:"tss_in", label:"TSS ingresso", unit:"mg/L", color:COD_C, sensor:"tss" },
    { key:"TSS",    label:"TSS uscita",   unit:"mg/L", color:TSS_C, sensor:"tss" },
    { key:"COD",    label:"COD uscita",   unit:"mg/L", color:BOD_C, sensor:"cod" },
    PH_M, DIFFP_M, FLOW_M, TEMP_M,
  ],
  "Filtrazione": [
    { key:"tss_in", label:"TSS ingresso",    unit:"mg/L", color:COD_C, sensor:"tss"   },
    { key:"TSS",    label:"TSS uscita",      unit:"mg/L", color:TSS_C, sensor:"tss"   },
    { key:"COD",    label:"COD uscita",      unit:"mg/L", color:BOD_C, sensor:"cod"   },
    PH_M, DIFFP_M, FLOW_M, TEMP_M,
  ],
  "Osmosi Inversa": [
    { key:"cod_in",    label:"COD ingresso",     unit:"mg/L",  color:COD_C,  sensor:"cod"    },
    { key:"COD",       label:"COD uscita",       unit:"mg/L",  color:BOD_C,  sensor:"cod"    },
    { key:"NH4",       label:"NH₄ uscita",       unit:"mg/L",  color:NH4_C,  sensor:"nh4"    },
    { key:"TSS",       label:"TSS uscita",       unit:"mg/L",  color:TSS_C,  sensor:"tss"    },
    { key:"dp_ro",     label:"ΔP membrana",      unit:"bar",   color:LVL_C,  sensor:"diff_p" },
    { key:"flux",      label:"Flusso normaliz.", unit:"%",     color:BOD_C   },
    { key:"perm_cond", label:"Cond. permeato",   unit:"µS/cm", color:RDX_C,  sensor:"cond"   },
    { key:"perm_q",    label:"Portata permeato", unit:"m³/h",  color:FLOW_C, sensor:"flow"   },
    { key:"cip",       label:"Lavaggio CIP",     unit:"0/1",   color:ACT_C,  step:true },
    FLOW_M, TEMP_M,
  ],
  "Disinfezione UV": [
    { key:"TSS",  label:"TSS uscita",  unit:"mg/L", color:TSS_C, sensor:"tss"  },
    { key:"COD",  label:"COD uscita",  unit:"mg/L", color:COD_C, sensor:"cod"  },
    PH_M, FLOW_M, TEMP_M,
  ],
  "Disinfezione Cloro": [
    { key:"COD",   label:"COD uscita",   unit:"mg/L", color:COD_C, sensor:"cod" },
    { key:"TSS",   label:"TSS uscita",   unit:"mg/L", color:TSS_C, sensor:"tss" },
    { key:"NH4",   label:"NH₄ uscita",   unit:"mg/L", color:NH4_C, sensor:"nh4" },
    { key:"pH",    label:"pH finale",    unit:"",     color:PH_C,  sensor:"ph"  },
    { key:"naoh",  label:"NaOH",         unit:"%",    color:ACT_C  },
    { key:"h2so4", label:"H₂SO₄",        unit:"%",    color:ACT2_C },
    FLOW_M, TEMP_M,
  ],
  "Disinfezione": [
    { key:"COD",   label:"COD uscita",   unit:"mg/L", color:COD_C, sensor:"cod" },
    { key:"TSS",   label:"TSS uscita",   unit:"mg/L", color:TSS_C, sensor:"tss" },
    { key:"NH4",   label:"NH₄ uscita",   unit:"mg/L", color:NH4_C, sensor:"nh4" },
    { key:"pH",    label:"pH finale",    unit:"",     color:PH_C,  sensor:"ph"  },
    { key:"naoh",  label:"NaOH",         unit:"%",    color:ACT_C  },
    { key:"h2so4", label:"H₂SO₄",        unit:"%",    color:ACT2_C },
    FLOW_M, TEMP_M,
  ],
  "Post-trattamento": [
    { key:"cod_in", label:"COD ingresso", unit:"mg/L", color:COD_C, sensor:"cod" },
    { key:"COD",    label:"COD uscita",   unit:"mg/L", color:BOD_C, sensor:"cod" },
    { key:"TSS",    label:"TSS uscita",   unit:"mg/L", color:TSS_C, sensor:"tss" },
    PH_M, FLOW_M, TEMP_M,
  ],
};

// Returns the subset of a stage's trend metrics whose sensor (if any) is enabled.
export function stageAvailableMetrics(stageName, stageConfig) {
  const defs = STAGE_TREND_DEFS[stageName] ?? [];
  const sensors = stageConfig?.sensors;
  return defs.filter(d => !d.sensor || sensors?.[d.sensor]?.enabled === true);
}
