// Scenari/eventi simulabili. Ogni evento applica dei modificatori temporanei
// all'acqua in ingresso e/o agli attuatori, per testare la risposta
// dell'impianto e dell'auto-correzione.
//
// Modificatori:
//   inlet.<param>    → fattore moltiplicativo su s.inlet (Q, COD, BOD5, TSS, NH4)
//   inlet.pH_delta   → scostamento additivo sul pH d'ingresso
//   inlet.T_delta    → scostamento additivo sulla temperatura d'ingresso (°C)
//   actuator.blowerCap        → tetto massimo % soffianti (guasto)
//   actuator.sludgeRecycleCap → tetto massimo % ricircolo fanghi (guasto)
//   actuator.coagulantCap     → tetto massimo % dosaggio coagulante (serbatoio/pompa)
//   actuator.naohCap          → tetto massimo % dosaggio NaOH (serbatoio/pompa)
//   actuator.h2so4Cap         → tetto massimo % dosaggio H2SO4 (serbatoio/pompa)
//
// defaultDuration: durata in tick del motore (~2 tick/secondo reale).
//
// kind: "scenario" | "fault"
//   scenario → colonna SCENARI (condizioni esterne, eventi di processo)
//   fault    → colonna GUASTI (avarie hardware, rotture)

export const EVENT_TYPES = {
  // ── SCENARI ────────────────────────────────────────────────────────────────
  rain: {
    type: "rain", kind: "scenario",
    label: "Pioggia intensa",
    icon: "🌧️",
    color: "#00CFFF",
    defaultDuration: 240,
    desc: "Evento meteorico: forte aumento di portata e diluizione del carico in ingresso.",
    inlet: { Q: 2.2, COD: 0.45, BOD5: 0.45, TSS: 0.60, NH4: 0.50 },
  },
  industrial: {
    type: "industrial", kind: "scenario",
    label: "Scarico industriale",
    icon: "🏭",
    color: "#FF9422",
    defaultDuration: 180,
    desc: "Scarico non autorizzato: picco di carico organico e abbassamento del pH.",
    inlet: { COD: 2.6, BOD5: 2.4, TSS: 1.5, NH4: 1.4, pH_delta: -1.2 },
  },
  cold_weather: {
    type: "cold_weather", kind: "scenario",
    label: "Ondata di freddo",
    icon: "❄️",
    color: "#7FB2FF",
    defaultDuration: 300,
    desc: "Forte calo della temperatura del refluo: la nitrificazione rallenta drasticamente (cinetica di Arrhenius), NH₄ in uscita tende a salire.",
    inlet: { T_delta: -11 },
  },

  // ── GUASTI ─────────────────────────────────────────────────────────────────
  blower_fail: {
    type: "blower_fail", kind: "fault",
    label: "Guasto soffianti",
    icon: "💨",
    color: "#FF3B5C",
    defaultDuration: 150,
    desc: "Avaria del gruppo soffianti: aerazione insufficiente, calo O₂ nel biologico.",
    actuator: { blowerCap: 12 },
  },
  blower_inverter_fail: {
    type: "blower_inverter_fail", kind: "fault",
    label: "Guasto inverter soffianti",
    icon: "⚡",
    color: "#FF3B5C",
    defaultDuration: 150,
    desc: "Inverter del gruppo soffianti fuori servizio: soffianti ferme, O₂ nel biologico crolla rapidamente.",
    actuator: { blowerCap: 0 },
  },
  diffuser_clog: {
    type: "diffuser_clog", kind: "fault",
    label: "Diffusori intasati",
    icon: "🫧",
    color: "#BB66FF",
    defaultDuration: 200,
    desc: "Membrana dei diffusori a bolle parzialmente intasata: trasferimento O₂ ridotto anche con soffianti al massimo.",
    actuator: { blowerCap: 40 },
  },
  pump_fail: {
    type: "pump_fail", kind: "fault",
    label: "Guasto pompa RAS",
    icon: "⚙️",
    color: "#BB66FF",
    defaultDuration: 150,
    desc: "Avaria pompa ricircolo fanghi: progressivo crollo del MLSS nel biologico.",
    actuator: { sludgeRecycleCap: 15 },
  },
  pump_inverter_fail: {
    type: "pump_inverter_fail", kind: "fault",
    label: "Guasto inverter pompa RAS",
    icon: "⚡",
    color: "#BB66FF",
    defaultDuration: 150,
    desc: "Inverter pompa di ricircolo fanghi fuori servizio: pompa ferma, biomassa in rapido calo.",
    actuator: { sludgeRecycleCap: 0 },
  },
  coag_empty: {
    type: "coag_empty", kind: "fault",
    label: "Serbatoio coagulante esaurito",
    icon: "🧪",
    color: "#FF9422",
    defaultDuration: 180,
    desc: "Coagulante esaurito + aumento solidi in ingresso: il dosaggio non riesce a contenere il TSS.",
    inlet: { TSS: 2.2 },
    actuator: { coagulantCap: 8 },
  },
  naoh_empty: {
    type: "naoh_empty", kind: "fault",
    label: "Serbatoio NaOH esaurito",
    icon: "⚗️",
    color: "#00CFFF",
    defaultDuration: 180,
    desc: "Soda (NaOH) esaurita con scarico acido: il pH resta sotto il limite, correzione impossibile.",
    inlet: { pH_delta: -2.2 },
    actuator: { naohCap: 5 },
  },
  h2so4_empty: {
    type: "h2so4_empty", kind: "fault",
    label: "Serbatoio H₂SO₄ esaurito",
    icon: "⚗️",
    color: "#FFD060",
    defaultDuration: 180,
    desc: "Acido (H₂SO₄) esaurito con scarico basico: il pH resta sopra il limite, correzione impossibile.",
    inlet: { pH_delta: 2.6 },
    actuator: { h2so4Cap: 5 },
  },
  ph_probe_fail: {
    type: "ph_probe_fail", kind: "fault",
    label: "Guasto sonda pH",
    icon: "🔬",
    color: "#FFD060",
    defaultDuration: 120,
    desc: "Sonda pH fuori calibrazione o guasta: il controllo automatico del dosaggio reagenti va in deriva, pH non correggibile.",
    actuator: { naohCap: 5, h2so4Cap: 5 },
  },
  o2_probe_fail: {
    type: "o2_probe_fail", kind: "fault",
    label: "Guasto sonda O₂",
    icon: "💡",
    color: "#FF3B5C",
    defaultDuration: 120,
    desc: "Sonda O₂ disciolto guasta: il loop di controllo aerazione perde il feedback, soffianti in modalità sicurezza al minimo.",
    actuator: { blowerCap: 20 },
  },
};

export const EVENT_LIST     = Object.values(EVENT_TYPES);
export const SCENARIO_LIST  = EVENT_LIST.filter(e => e.kind === "scenario");
export const FAULT_LIST     = EVENT_LIST.filter(e => e.kind === "fault");

// Crea un'istanza di evento attivo pronta per essere inserita in sim.events.
export function makeEvent(type) {
  const def = EVENT_TYPES[type];
  if (!def) return null;
  return {
    id: `${type}-${Date.now()}-${Math.round(Math.random() * 1e4)}`,
    type,
    remaining: def.defaultDuration,
    duration: def.defaultDuration,
  };
}

