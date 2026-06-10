const KEY = "aquapilot.pumpsRegistry.v1";

export function loadPumpsRegistry() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { dosatrici: [], inverter: [] };
    const p = JSON.parse(raw);
    return {
      dosatrici: Array.isArray(p.dosatrici) ? p.dosatrici : [],
      inverter:  Array.isArray(p.inverter)  ? p.inverter  : [],
    };
  } catch { return { dosatrici: [], inverter: [] }; }
}

export function savePumpsRegistry(reg) {
  try { localStorage.setItem(KEY, JSON.stringify(reg)); } catch { /* storage non disponibile */ }
}

export function newDosatriceEntry() {
  return { id: `pd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: "Nuova pompa dosatrice", flow_m3h: 0.4, productId: null, maintH: 4000 };
}

export function newInverterEntry() {
  return { id: `pi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name: "Nuova pompa a inverter", flow_m3h: 0,
    // Energy: only inverter pumps contribute to the consumption calc.
    // Consumo ≈ power_kw × loadPct/100.
    power_kw: 0, loadPct: 75, maintH: 4000 };
}

// Resolve stage pump links [{registryId, enabled}] to full pump objects.
// The engine and popup always work with resolved objects.
export function resolveLinks(links, registry) {
  const map = new Map();
  for (const p of (registry.dosatrici || [])) map.set(p.id, { ...p, isDosatrice: true,  vfd: false });
  for (const p of (registry.inverter  || [])) map.set(p.id, { ...p, isDosatrice: false, vfd: true  });
  return (links || []).map(link => {
    const base = map.get(link.registryId);
    if (!base) return null;
    return { ...base, enabled: link.enabled ?? true };
  }).filter(Boolean);
}

// Find which stage (if any) a registry pump is currently linked to.
export function linkedStage(registryId, stageConfigs, stages) {
  for (let i = 0; i < stageConfigs.length; i++) {
    if ((stageConfigs[i]?.pumps || []).some(l => l.registryId === registryId)) {
      return { stage: stages[i], idx: i };
    }
  }
  return null;
}

// One-time migration: extract old inline pump objects into registry entries
// and replace them with link objects. Also absorbs old customPumps templates
// as unlinked inverter entries.
export function migrateToRegistry(stageConfigs, oldCustomPumps = []) {
  const dosatrici = [];
  const inverter  = [];
  const seen = new Set();

  const configs = stageConfigs.map(sc => ({
    ...sc,
    pumps: (sc.pumps || []).map(p => {
      if (p.registryId !== undefined) return p; // already a link
      if (!seen.has(p.id)) {
        seen.add(p.id);
        const e = { id: p.id, name: p.name || "Pompa",
          flow_m3h: p.flow_m3h ?? 0, maintH: p.maintH ?? 4000 };
        if (p.isDosatrice) dosatrici.push({ ...e, productId: p.productId ?? null });
        else               inverter.push({ ...e, power_kw: p.power_kw ?? 0, loadPct: p.loadPct ?? 75 });
      }
      return { registryId: p.id, enabled: p.enabled ?? true };
    }),
  }));

  for (const cp of oldCustomPumps) {
    if (!seen.has(cp.id)) {
      seen.add(cp.id);
      inverter.push({ id: cp.id, name: cp.name || "Pompa personalizzata",
        flow_m3h: cp.flow_m3h ?? 0, power_kw: cp.power_kw ?? 0, loadPct: cp.loadPct ?? 75, maintH: 4000 });
    }
  }

  return { registry: { dosatrici, inverter }, configs };
}
