// Scheduled-maintenance popup: surfaces when one or more pumps reach their
// configured operating-hours threshold. The operator can mark a pump as
// serviced (resets its counter) or dismiss the notice.
export default function MaintenancePopup({ alerts, t, onService, onDismiss }) {
  if (!alerts || alerts.length === 0) return null;
  return (
    <div style={{position:"fixed", inset:0, zIndex:320, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)",
      display:"flex", alignItems:"center", justifyContent:"center", padding:20}}>
      <div style={{background:t.surface, border:`2px solid ${t.orange}`, borderRadius:14, padding:0,
        width:480, maxWidth:"95vw", maxHeight:"82vh", overflowY:"auto",
        boxShadow:`0 16px 70px rgba(0,0,0,0.45), 0 0 0 1px ${t.orange}33`}}>

        <div style={{display:"flex", alignItems:"center", gap:10, padding:"16px 20px",
          borderBottom:`1px solid ${t.border}`, background:`${t.orange}12`}}>
          <span style={{fontSize:20}}>🔧</span>
          <div style={{flex:1, fontFamily:"'Orbitron',sans-serif", fontSize:14, color:t.orange, letterSpacing:1.5}}>
            MANUTENZIONE PROGRAMMATA
          </div>
          <button onClick={onDismiss}
            style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text,
              width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:"6px 20px 18px"}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, margin:"10px 0 14px"}}>
            {alerts.length === 1
              ? "Una pompa ha raggiunto la soglia di ore impostata per la manutenzione programmata:"
              : `${alerts.length} pompe hanno raggiunto la soglia di ore impostata per la manutenzione programmata:`}
          </div>

          {alerts.map(a => (
            <div key={a.id} style={{marginBottom:12, padding:"12px 14px", background:t.surface2,
              border:`1px solid ${t.orange}55`, borderRadius:10}}>
              <div style={{display:"flex", alignItems:"center", gap:9, marginBottom:6}}>
                <span style={{fontSize:18}}>⚙️</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15, color:t.text, flex:1}}>{a.pump}</span>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted,
                  background:t.surface3, padding:"2px 7px", borderRadius:4}}>{a.stageTag} · {a.stageName}</span>
              </div>
              <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, marginBottom:10}}>
                <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13.5, color:t.textSec}}>
                  Ore di funzionamento
                </span>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:13.5, color:t.orange, fontWeight:700}}>
                  {a.hours.toFixed(1)} h / {a.threshold} h
                </span>
              </div>
              <button onClick={() => onService(a.stageName, a.pumpId)}
                style={{width:"100%", padding:"8px", background:`${t.green}1a`, border:`1px solid ${t.green}66`,
                  color:t.green, borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13,
                  cursor:"pointer", letterSpacing:0.5}}>
                ✓ Manutenzione effettuata — azzera contatore
              </button>
            </div>
          ))}

          <button onClick={onDismiss}
            style={{width:"100%", marginTop:4, padding:"9px", background:`${t.orange}1a`, border:`1px solid ${t.orange}66`,
              color:t.orange, borderRadius:8, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:13.5,
              cursor:"pointer", letterSpacing:1}}>
            HO PRESO VISIONE
          </button>
        </div>
      </div>
    </div>
  );
}
