// Scenari/eventi simulabili. Ogni evento applica dei modificatori temporanei
// all'acqua in ingresso e/o agli attuatori, per testare la risposta
// dell'impianto e dell'auto-correzione.
//
// Modificatori:
//   inlet.<param>    → fattore moltiplicativo su s.inlet (Q, COD, BOD5, TSS, NH4)
//   inlet.pH_delta   → scostamento additivo sul pH d'ingresso
//   actuator.blowerCap        → tetto massimo % soffianti (guasto)
//   actuator.sludgeRecycleCap → tetto massimo % ricircolo fanghi (guasto)
//
// defaultDuration: durata in tick del motore (~2 tick/secondo reale).

export const EVENT_TYPES = {
  rain: {
    type: "rain",
    label: "Pioggia intensa",
    icon: "🌧️",
    color: "#00CFFF",
    defaultDuration: 240,
    desc: "Evento meteorico: forte aumento di portata e diluizione del carico in ingresso.",
    inlet: { Q: 2.2, COD: 0.45, BOD5: 0.45, TSS: 0.60, NH4: 0.50 },
  },
  industrial: {
    type: "industrial",
    label: "Scarico industriale",
    icon: "🏭",
    color: "#FF9422",
    defaultDuration: 180,
    desc: "Scarico non autorizzato: picco di carico organico e abbassamento del pH.",
    inlet: { COD: 2.6, BOD5: 2.4, TSS: 1.5, NH4: 1.4, pH_delta: -1.2 },
  },
  blower_fail: {
    type: "blower_fail",
    label: "Guasto soffiante",
    icon: "💨",
    color: "#FF3B5C",
    defaultDuration: 150,
    desc: "Avaria del gruppo soffianti: aerazione insufficiente, calo O₂ nel biologico.",
    actuator: { blowerCap: 12 },
  },
  pump_fail: {
    type: "pump_fail",
    label: "Guasto pompa RAS",
    icon: "⚙️",
    color: "#BB66FF",
    defaultDuration: 150,
    desc: "Avaria pompa ricircolo fanghi: progressivo crollo del MLSS nel biologico.",
    actuator: { sludgeRecycleCap: 15 },
  },
};

export const EVENT_LIST = Object.values(EVENT_TYPES);

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
