// AquaPilot — SHOWREEL (demo scriptata per ledwall / fiera)
//
// Attivazione: ?show=1  (implica il layout fiera, vedi fairMode.js)
//   es. https://gio557.github.io/aquapilot/?show=1
//
// Riproduce automaticamente una sequenza di ~3 minuti di scenari REALI iniettati
// nel motore di simulazione (gli stessi eventi della Control Room: scarico
// industriale, guasto soffianti, pioggia, coagulante esaurito, CIP membrane…),
// mostrando a schermo una didascalia che spiega l'evento in corso e la reazione
// dell'auto-correzione. Non modifica la fisica: usa i veri EVENT_TYPES.

import { makeEvent } from "./constants/events";
import { applyCommand } from "./simulation/commands";

const PARAMS = new URLSearchParams(window.location.search);
export const SHOW = PARAMS.get("show") === "1";

const TPS = 2; // tick al secondo (engine: interval 500 ms)

// Costruisce un evento con durata (in secondi) personalizzata per lo showreel.
function timedEvent(type, seconds) {
  const ev = makeEvent(type);
  if (!ev) return null;
  const ticks = Math.round(seconds * TPS);
  return { ...ev, remaining: ticks, duration: ticks };
}

// Palette coerente con i temi (ciano/verde/arancio/rosso/viola).
const C = { ok:"#00E599", cyan:"#00CFFF", warn:"#FF9422", bad:"#FF3B5C", violet:"#BB66FF", blue:"#7FB2FF" };

// ── TIMELINE ────────────────────────────────────────────────────────────────
// Ogni passo: { at: secondi, caption:{icon,title,desc,color}, event?, cmd?, clear? }
// `event` = [tipo, durataSecondi]; `clear` svuota gli eventi attivi.
export const TIMELINE = [
  { at: 1,  caption: { icon:"🟢", color:C.ok,
      title:"Impianto in esercizio — tutti i parametri nella norma",
      desc:"Depurazione di reflui industriali · 6 stadi monitorati in tempo reale · auto-correzione adattiva attiva." } },

  { at: 24, event:["industrial", 30], caption: { icon:"🏭", color:C.warn,
      title:"Scenario: scarico industriale non autorizzato",
      desc:"Picco di carico organico (COD/BOD₅ ×2,6) e pH in calo. Il controllo aumenta aerazione e dosaggio reagenti." } },
  { at: 48, clear:true, caption: { icon:"✓", color:C.ok,
      title:"Auto-correzione: valori riportati nei limiti",
      desc:"Soffianti e dosaggio NaOH hanno recuperato O₂ e pH. Effluente di nuovo conforme ai limiti di legge." } },

  { at: 60, event:["blower_fail", 28], caption: { icon:"💨", color:C.bad,
      title:"Guasto: avaria gruppo soffianti",
      desc:"Aerazione insufficiente: O₂ nel biologico in calo, NH₄/BOD₅ in salita. L'attuatore satura." } },
  { at: 82, clear:true, caption: { icon:"🧠", color:C.cyan,
      title:"Diagnostica a probabile-causa",
      desc:"Soffianti al 100% ma qualità fuori limite → il sistema segnala 'probabile guasto soffianti' e l'azione correttiva." } },

  { at: 96, event:["rain", 28], caption: { icon:"🌧️", color:C.cyan,
      title:"Scenario: pioggia intensa",
      desc:"Portata in ingresso ×2,2 e forte diluizione del carico: il sistema gestisce l'onda idraulica." } },
  { at: 120, clear:true, caption: { icon:"✓", color:C.ok,
      title:"Transitorio idraulico assorbito",
      desc:"Portata e qualità rientrano. Nessun superamento dei limiti allo scarico." } },

  { at: 132, event:["coag_empty", 28], caption: { icon:"🧪", color:C.warn,
      title:"Guasto: serbatoio coagulante esaurito",
      desc:"Con più solidi in ingresso il TSS sale: dosaggio al 100% ma non correggibile → diagnostica di esaurimento." } },
  { at: 156, clear:true, caption: { icon:"✓", color:C.ok,
      title:"Ripristino coagulante — TSS rientrato",
      desc:"Sostituito il reagente, la sedimentazione torna efficiente e il TSS rientra nel target." } },

  { at: 166, cmd:"cip-osmosi", caption: { icon:"🫧", color:C.violet,
      title:"Osmosi inversa: lavaggio CIP membrane",
      desc:"Ciclo di pulizia chimica automatico (flussaggio → alcalino → acido → risciacquo) per ripristinare il flusso." } },

  { at: 184, caption: { icon:"💧", color:C.cyan,
      title:"AquaPilot — controllo e auto-correzione in tempo reale",
      desc:"GreenEco Wastewater · ingegneria del trattamento acque reflue industriali." } },
];

export const SHOWREEL_DURATION = 192; // secondi totali (per la registrazione)

// Avvia lo showreel. `handlers = { setSim, setThemeId, setCaption }`.
// Ritorna una funzione di cleanup che annulla i timer.
export function startShowreel({ setSim, setThemeId, setCaption }) {
  // Il data-show attiva (via CSS) la fascia riservata alla didascalia, ma solo
  // quando è attivo il layout fiera. In modalità FULL (dashboard completa per il
  // PIP) non lo impostiamo, così la dashboard non viene ridimensionata.
  if (document.documentElement.hasAttribute("data-fair")) {
    document.documentElement.setAttribute("data-show", "1");
  }
  // Forza tema scuro e simulazione attiva con auto-correzione.
  setThemeId?.("dark");
  setSim?.(p => ({ ...p, running: true,
    autoCorrect: { ...(p.autoCorrect || {}), enabled: true } }));

  const timers = TIMELINE.map(step => setTimeout(() => {
    if (step.clear) setSim?.(p => ({ ...p, events: [] }));
    if (step.event) {
      const [type, secs] = step.event;
      const ev = timedEvent(type, secs);
      if (ev) setSim?.(p => ({ ...p, events: [...(p.events || []).filter(e => e.type !== type), ev] }));
    }
    if (step.cmd) setSim?.(p => applyCommand(p, step.cmd));
    if (step.caption) setCaption?.(step.caption);
  }, step.at * 1000));

  return () => timers.forEach(clearTimeout);
}
