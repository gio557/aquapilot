import { useEffect, useRef, useState, useCallback } from "react";
import { applyCommand } from "../simulation/commands";

/**
 * Cross-tab bridge for the Control Room.
 *
 * The main AquaPilot tab owns the simulation engine loop; the Control Room can
 * run in a separate browser tab. They talk over a BroadcastChannel:
 *   - main → CR:  { kind:"state", sim, themeId }   (on every sim change)
 *   - CR → main:  { kind:"request" }                (on mount, ask for state)
 *   - CR → main:  { kind:"control", patch }         (control-field changes)
 *   - CR → main:  { kind:"command", cmd }           (one-shot operator commands)
 *
 * Only the whitelisted control fields are accepted from the Control Room — the
 * engine remains the single source of truth for everything it computes. One-shot
 * commands (e.g. start a CIP wash) go through applyCommand, which only flips
 * engine-honoured request flags rather than overwriting computed state.
 */
const CHANNEL = "aquapilot-control";
const CONTROL_FIELDS = [
  "running", "speed", "mode",
  "blower", "coagulant", "sludgeRecycle", "MLSSsp", "naoh", "h2so4", "imhoff",
  "inlet", "events",
];

// Used by the MAIN tab: broadcasts state and applies incoming control patches.
export function useControlBroadcast(sim, setSim, themeId) {
  const chRef  = useRef(null);
  const simRef = useRef(sim);
  const tmRef  = useRef(themeId);
  simRef.current = sim;
  tmRef.current  = themeId;

  useEffect(() => {
    const ch = new BroadcastChannel(CHANNEL);
    chRef.current = ch;
    ch.onmessage = (e) => {
      const msg = e.data;
      if (!msg) return;
      if (msg.kind === "request") {
        ch.postMessage({ kind: "state", sim: simRef.current, themeId: tmRef.current });
      } else if (msg.kind === "control" && msg.patch) {
        setSim(prev => {
          const next = { ...prev };
          for (const f of CONTROL_FIELDS) if (f in msg.patch) next[f] = msg.patch[f];
          return next;
        });
      } else if (msg.kind === "command" && msg.cmd) {
        setSim(prev => applyCommand(prev, msg.cmd));
      }
    };
    return () => ch.close();
  }, [setSim]);

  useEffect(() => {
    chRef.current?.postMessage({ kind: "state", sim, themeId });
  }, [sim, themeId]);
}

// Used by the CONTROL ROOM tab: mirrors state and sends control patches.
// Returns { sim, themeId, onSim, connected } — onSim mimics setSim's API
// (accepts an updater fn or a partial object) for drop-in reuse of UI logic.
export function useControlMirror() {
  const [sim, setSim] = useState(null);
  const [themeId, setThemeId] = useState("light");
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
        setThemeId(msg.themeId || "light");
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

  // Fire a one-shot command (e.g. "cip-osmosi"). The main tab applies it to the
  // engine state and the change comes back on the next state broadcast.
  const sendCommand = useCallback((cmd) => {
    chRef.current?.postMessage({ kind: "command", cmd });
  }, []);

  return { sim, themeId, onSim, sendCommand, connected };
}
