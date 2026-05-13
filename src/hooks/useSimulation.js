import { useState, useEffect } from "react";
import { simTick, INIT_SIM } from "../simulation/engine";

/**
 * Bridge React ↔ simulation engine.
 * In futuro, sostituire con useWebSocket(url) mantenendo la stessa interfaccia:
 *   { sim, setSim } — dove setSim accetta sia un nuovo stato che un updater fn.
 */
export function useSimulation() {
  const [sim, setSim] = useState(INIT_SIM);

  useEffect(() => {
    if (!sim.running) return;
    const id = setInterval(() => setSim(prev => simTick(prev)), 500);
    return () => clearInterval(id);
  }, [sim.running]);

  return { sim, setSim };
}
