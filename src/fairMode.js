// AquaPilot — Modalità FIERA (ledwall 4×2 m, formato 2:1, visione a distanza)
//
// Attivazione NON invasiva: la versione normale dell'app non cambia. La modalità
// fiera si abilita solo con il parametro URL `?fair=1`
//   es. https://gio557.github.io/aquapilot/?fair=1
//
// Cosa fa:
//  - marca <html data-fair="1"> così i fix grafici scoped in fairMode.css si
//    applicano SOLO in questa modalità (ingrandimento per lettura a distanza,
//    contrasto e glow rinforzati);
//  - il flag FAIR è letto dai componenti per i fix di coerenza (es. colore EFF)
//    senza toccare il comportamento della versione standard.

export const FAIR = new URLSearchParams(window.location.search).get("fair") === "1";

export function initFairMode() {
  if (!FAIR) return;
  const html = document.documentElement;
  html.setAttribute("data-fair", "1");
  // Il grado di ingrandimento può essere affinato alla risoluzione reale del
  // ledwall tramite ?fairzoom=N (es. ?fair=1&fairzoom=1.35).
  const z = parseFloat(new URLSearchParams(window.location.search).get("fairzoom"));
  if (Number.isFinite(z) && z > 0.5 && z < 3) {
    html.style.setProperty("--fair-zoom", String(z));
  }
}
