import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Cross-tab bridge for the Control Room.
 *
 * The main AquaPilot tab owns the simulation engine loop; the Control Room can
 * run in a separate browser tab. They talk over a BroadcastChannel:
 *   - main → CR:  { kind:"state", sim, darkMode }   (on every sim change)
 *   - CR → main:  { kind:"request" }                (on mount, ask for state)
 *   - CR → main:  { kind:"control", patch }         (control-field changes)
 *
 * Only the whitelisted control fields are accepted from the Control Room — the
 * engine remains the single source of truth for everything it computes.
 */
const CHANNEL = "aquapilot-control";
const CONTROL_FIELDS = [
  "running", "speed", "mode",
  "blower", "coagulant", "sludgeRecycle", "MLSSsp", "naoh", "h2so4", "imhoff",
  "inlet", "events",
];

// Used by the MAIN tab: broadcasts state and applies incoming control patches.
export function useControlBroadcast(sim, setSim, darkMode) {
  const chRef  = useRef(null);
  const simRef = useRef(sim);
  const dmRef  = useRef(darkMode);
  simRef.current = sim;
  dmRef.current  = darkMode;

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    chRef.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.kind === "request") {
        ch.postMessage({ kind: "state", sim: simRef.current, darkMode: dmRef.current });
      } else if (msg.kind === "control" && msg.patch) {
        setSim(prev => {
          const next = { ...prev };
          for (const f of CONTROL_FIELDS) if (f in msg.patch) next[f] = msg.patch[f];
          return next;
        });
      }
    };
    return () => ch.close();
  }, [setSim]);

  useEffect(() => {
    chRef.current?.postMessage({ kind: "state", sim, darkMode });
  }, [sim, darkMode]);
}

// Used by the CONTROL ROOM tab: mirrors state and sends control patches.
// Returns { sim, darkMode, onSim, connected } — onSim mimics setSim's API
// (accepts an updater fn or a partial object) for drop-in reuse of UI logic.
export function useControlMirror() {
  const [sim, setSim] = useState(null);
  const [darkMode, setDarkMode] = useState(false);
  const [connected, setConnected] = useState(false);
  const chRef  = useRef(null);
  const simRef = useRef(null);

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    chRef.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (msg?.kind === "state") {
        simRef.current = msg.sim;
        setSim(msg.sim);
        setDarkMode(!!msg.darkMode);
        setConnected(true);
      }
    };
    ch.postMessage({ kind: "request" });
    // Re-ask periodically until the first state arrives (covers the race where
    // the CR tab opens before the main tab's listener is ready).
    const retry = setInterval(() => {
      if (!simRef.current) ch.postMessage({ kind: "request" });
    }, 600);
    return () => { clearInterval(retry); ch.close(); };
  }, []);

  const onSim = useCallback((updater) => {
    const cur = simRef.current;
    if (!cur) return;
    const next = typeof updater === "function" ? updater(cur) : { ...cur, ...updater };
    simRef.current = next;
    setSim(next); // optimistic local feedback; reconciled by next broadcast
    const patch = {};
    for (const f of CONTROL_FIELDS) patch[f] = next[f];
    chRef.current?.postMessage({ kind: "control", patch });
  }, []);

  return { sim, darkMode, onSim, connected };
}
