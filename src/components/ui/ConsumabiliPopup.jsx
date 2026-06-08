// Popup notifica livello consumabili: riordino (arancio) e vuoto (rosso).
// Le email vengono aperte tramite mailto: nel client dell'operatore — l'invio
// automatico sarà disponibile una volta attivo il server edge.
export default function ConsumabiliPopup({ alerts, t, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;

  const buildMailto = (to, subject, body) =>
    `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const bodyResponsabile = (a) =>
    `Gentile responsabile,\n\nSi informa che il sensore di ${a.tipo === "vuoto" ? "LIVELLO VUOTO" : "livello riordino"} del prodotto "${a.nome}" è stato raggiunto.\n\nQuota sensore: ${a.tipo === "vuoto" ? a.livelloVuoto_mm : a.livelloRiordino_mm} mm\n\nSi prega di provvedere tempestivamente.\n\nAquaPilot — Sistema di supervisione impianto`;

  const bodyFornitore = (a) =>
    `Spett.le ${a.fornitore || "Fornitore"},\n\nSi richiede la fornitura urgente del prodotto: ${a.nome}\n\nIl livello di riordino è stato raggiunto presso il nostro impianto.\n\nCordiali saluti`;

  return (
    <div style={{position:"fixed", inset:0, zIndex:325, background:"rgba(0,0,0,0.55)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
      justifyContent:"center", padding:20}}>
      <div style={{background:t.surface, border:`2px solid ${t.orange}`, borderRadius:14,
        padding:0, width:500, maxWidth:"95vw", maxHeight:"84vh", overflowY:"auto",
        boxShadow:`0 16px 70px rgba(0,0,0,0.45), 0 0 0 1px ${t.orange}33`}}>

        <div style={{display:"flex", alignItems:"center", gap:10, padding:"16px 20px",
          borderBottom:`1px solid ${t.border}`, background:`${t.orange}12`}}>
          <span style={{fontSize:20}}>🧪</span>
          <div style={{flex:1, fontFamily:"'Orbitron',sans-serif", fontSize:14,
            color:t.orange, letterSpacing:1.5}}>LIVELLO CONSUMABILI</div>
          <button onClick={onDismiss}
            style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text,
              width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:"6px 20px 18px"}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted,
            margin:"10px 0 14px"}}>
            {alerts.length === 1
              ? "Un prodotto ha raggiunto la soglia di livello:"
              : `${alerts.length} prodotti hanno raggiunto la soglia di livello:`}
          </div>

          {alerts.map(a => {
            const isVuoto = a.tipo === "vuoto";
            const color   = isVuoto ? t.red : t.orange;
            const label   = isVuoto ? "⚠ LIVELLO VUOTO" : "↓ LIVELLO RIORDINO";
            const quota   = isVuoto ? a.livelloVuoto_mm : a.livelloRiordino_mm;
            return (
              <div key={a.id} style={{marginBottom:12, padding:"12px 14px",
                background:t.surface2, border:`1px solid ${color}55`, borderRadius:10}}>

                <div style={{display:"flex", alignItems:"center", gap:9, marginBottom:8}}>
                  <span style={{fontSize:18}}>🧴</span>
                  <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700,
                    fontSize:15, color:t.text, flex:1}}>{a.nome}</span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11,
                    color, background:t.surface3, padding:"2px 8px", borderRadius:4,
                    fontWeight:700, letterSpacing:0.5}}>{label}</span>
                </div>

                <div style={{display:"flex", alignItems:"center", justifyContent:"space-between",
                  marginBottom:10, gap:8}}>
                  <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textSec}}>
                    Quota galleggiante
                  </span>
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13,
                    color, fontWeight:700}}>{quota} mm</span>
                </div>

                <div style={{display:"flex", gap:8, flexWrap:"wrap"}}>
                  {a.emailResponsabile && (
                    <a href={buildMailto(a.emailResponsabile,
                        `Livello ${isVuoto ? "vuoto" : "riordino"}: ${a.nome}`,
                        bodyResponsabile(a))}
                      style={{flex:1, minWidth:160, padding:"8px", textAlign:"center",
                        background:`${t.accent}1a`, border:`1px solid ${t.accent}66`,
                        color:t.accent, borderRadius:7, fontFamily:"'Rajdhani',sans-serif",
                        fontWeight:700, fontSize:12.5, cursor:"pointer", letterSpacing:0.5,
                        textDecoration:"none", display:"block"}}>
                      ✉ Avvisa responsabile
                    </a>
                  )}
                  {a.autoEmailFornitore && a.emailFornitore && (
                    <a href={buildMailto(a.emailFornitore,
                        `Riordino prodotto: ${a.nome}`,
                        bodyFornitore(a))}
                      style={{flex:1, minWidth:160, padding:"8px", textAlign:"center",
                        background:`${t.green}1a`, border:`1px solid ${t.green}66`,
                        color:t.green, borderRadius:7, fontFamily:"'Rajdhani',sans-serif",
                        fontWeight:700, fontSize:12.5, cursor:"pointer", letterSpacing:0.5,
                        textDecoration:"none", display:"block"}}>
                      ✉ Ordine a fornitore
                    </a>
                  )}
                </div>

                {(!a.emailResponsabile && !a.autoEmailFornitore) && (
                  <div style={{fontSize:11.5, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
                    marginTop:6}}>
                    Configura le email nel tab Consumabili per abilitare le notifiche.
                  </div>
                )}
              </div>
            );
          })}

          <div style={{fontSize:11, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif",
            textAlign:"center", marginTop:6, marginBottom:10, opacity:0.7}}>
            ℹ L'invio automatico senza intervento sarà disponibile con il server edge.
          </div>

          <button onClick={onDismiss}
            style={{width:"100%", padding:"9px", background:`${t.orange}1a`,
              border:`1px solid ${t.orange}66`, color:t.orange, borderRadius:8,
              fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13.5,
              cursor:"pointer", letterSpacing:1}}>
            HO PRESO VISIONE
          </button>
        </div>
      </div>
    </div>
  );
}
