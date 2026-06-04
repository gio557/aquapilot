// One-shot operator commands that change simulation state outside the engine's
// per-tick computation. Kept pure so both the main tab (direct button) and the
// Control Room (over the BroadcastChannel) apply them identically.

// Request a membrane CIP (Cleaning-In-Place) wash on the reverse-osmosis stage.
// No-op if the stage is absent or already washing — the engine reads the
// cip_request flag on the next tick and starts the cycle.
export function requestOsmosiCIP(sim) {
  if (!sim || !Array.isArray(sim.stageStates)) return sim;
  const idx = (sim.stages ?? []).findIndex(s => s.name === "Osmosi Inversa");
  if (idx < 0) return sim;
  const src = sim.stageStates[idx];
  if (!src || src.fase !== "ESERCIZIO") return sim;
  const stageStates = sim.stageStates.map((st, i) =>
    i === idx ? { ...st, cip_request: true } : st);
  return { ...sim, stageStates };
}

// Dispatch table for command messages received over the control channel.
export function applyCommand(sim, cmd) {
  switch (cmd) {
    case "cip-osmosi": return requestOsmosiCIP(sim);
    default:           return sim;
  }
}
