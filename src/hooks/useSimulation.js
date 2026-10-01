import { useState, useEffect, useRef } from "react";
import { simTick, INIT_SIM } from "../simulation/engine";
import { recordTick, loadGains } from "../simulation/learning";
import { loadPumpHours, savePumpHours } from "../simulation/pumpHours";

/**
 * Bridge React ↔ simulation engine.
 * In futuro, sostituire con useWebSocket(url) mantenendo la stessa interfaccia:
 *   { sim, setSim } — dove setSim accetta sia un nuovo stato che un updater fn.
 */
export function useSimulation() {
  const [sim, setSim] = useState(() => ({
    ...INIT_SIM, adaptiveGains: loadGains(), pumpHours: loadPumpHours(),
  }));
  const prevRef = useRef(null);
  const latestRef = useRef(sim);

  // Keep latestRef in sync with EVERY sim update, not just engine ticks. The
  // periodic/unmount pump-hour persister reads latestRef; without this, a
  // pump-hours reset done from App (setSim) while the simulation is paused
  // would never reach latestRef and the stale pre-reset value would be
  // written back to localStorage, resurrecting it on reload.
  useEffect(() => { latestRef.current = sim; }, [sim]);

  useEffect(() => {
    if (!sim.running) return;
    const id = setInterval(() => setSim(prev => {
      const next = simTick(prev);
      const { gains, didUpdate } = recordTick(next, prev);
      prevRef.current = next;
      const merged = didUpdate ? { ...next, adaptiveGains: gains } : next;
      latestRef.current = merged;
      return merged;
    }), 500);
    return () => clearInterval(id);
  }, [sim.running]);

  // Persist pump operating-hours periodically (they change every tick, so a
  // throttled write avoids hammering localStorage) and once more on unmount.
  useEffect(() => {
    const id = setInterval(() => savePumpHours(latestRef.current?.pumpHours), 10000);
    return () => { clearInterval(id); savePumpHours(latestRef.current?.pumpHours); };
  }, []);

  return { sim, setSim };
}
