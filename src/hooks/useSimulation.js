import { useState, useEffect, useRef } from "react";
import { simTick, INIT_SIM } from "../simulation/engine";
import { recordTick, loadGains } from "../simulation/learning";

/**
 * Bridge React ↔ simulation engine.
 * In futuro, sostituire con useWebSocket(url) mantenendo la stessa interfaccia:
 *   { sim, setSim } — dove setSim accetta sia un nuovo stato che un updater fn.
 */
export function useSimulation() {
  const [sim, setSim] = useState(() => ({ ...INIT_SIM, adaptiveGains: loadGains() }));
  const prevRef = useRef(null);

  useEffect(() => {
    if (!sim.running) return;
    const id = setInterval(() => setSim(prev => {
      const next = simTick(prev);
      const { gains, didUpdate } = recordTick(next, prev);
      prevRef.current = next;
      return didUpdate ? { ...next, adaptiveGains: gains } : next;
    }), 500);
    return () => clearInterval(id);
  }, [sim.running]);

  return { sim, setSim };
}
