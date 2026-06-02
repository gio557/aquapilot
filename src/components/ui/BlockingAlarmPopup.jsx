/**
 * Popup modale per allarmi bloccanti e/o gravi.
 * Appare non appena la condizione si verifica e scompare solo quando
 * l'operatore preme "HO PRESO VISIONE"; si ripresenta se il guasto recidiva.
 */
export default function BlockingAlarmPopup({ alarms, t, onDismiss }) {
  if (!alarms.length) return null;

  const hasMotor  = alarms.some(a => a.kind === "motor");
  const borderCol = hasMotor ? t.red : t.orange;

  return (
    <div style={{position:"fixed", inset:0, zIndex:290, background:"rgba(0,0,0,0.55)",
      backdropFilter:"blur(4px)", display:"flex", alignItems:"center",
      justifyContent:"center", padding:20}}>
      <div style={{background:t.surface, border:`2px solid ${borderCol}`, borderRadius:14,
        padding:0, width:480, maxWidth:"95vw", maxHeight:"82vh", overflowY:"auto",
        boxShadow:`0 16px 70px rgba(0,0,0,0.45), 0 0 0 1px ${borderCol}33`}}>

        {/* Header */}
        <div style={{display:"flex", alignItems:"center", gap:10, padding:"15px 20px",
          borderBottom:`1px solid ${t.border}`, background:`${borderCol}12`}}>
          <span style={{fontSize:20, color:borderCol, animation:"blink 0.8s infinite"}}>⚠</span>
          <div style={{flex:1, fontFamily:"'Orbitron',sans-serif", fontSize:13,
            color:borderCol, letterSpacing:1.5}}>
            ALLARME {hasMotor ? "BLOCCANTE" : "CRITICO"}
          </div>
          <button onClick={onDismiss}
            style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text,
              width:28, height:28, borderRadius:6, cursor:"pointer", fontSize:12, flexShrink:0}}>✕</button>
        </div>

        <div style={{padding:"8px 20px 18px"}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13, color:t.textMuted, margin:"10px 0 14px"}}>
            {hasMotor
              ? "Uno stadio è in blocco motore e richiede intervento manuale prima di riprendere il servizio."
              : "Uno o più parametri di uscita hanno superato la soglia critica. Verificare e intervenire."}
          </div>

          {alarms.map(a => (
            <div key={a.id} style={{marginBottom:12, padding:"12px 14px", background:t.surface2,
              border:`1px solid ${a.col}55`, borderRadius:10}}>
              {/* Title row */}
              <div style={{display:"flex", alignItems:"center", gap:9, marginBottom:6}}>
                <span style={{fontSize:19}}>{a.icon}</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:15.5,
                  color:a.col, flex:1}}>{a.title}</span>
                {a.stageName && (
                  <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11,
                    color:t.textMuted, background:t.surface3, padding:"2px 7px", borderRadius:4}}>
                    {a.stageName}
                  </span>
                )}
              </div>

              {/* Description */}
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13.5, color:t.text,
                lineHeight:1.5, marginBottom:8}}>{a.msg}</div>

              {/* Causa */}
              <div style={{display:"flex", gap:6, alignItems:"flex-start",
                padding:"7px 10px", background:`${a.col}0d`, borderRadius:7, marginBottom:8}}>
                <span style={{color:a.col, fontSize:12, flexShrink:0, marginTop:1}}>⚑</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13,
                  color:t.textSec, lineHeight:1.4}}>
                  <strong style={{color:a.col}}>Causa probabile: </strong>{a.causa}
                </span>
              </div>

              {/* Azione */}
              <div style={{display:"flex", gap:7, alignItems:"flex-start",
                paddingTop:8, borderTop:`1px dashed ${t.border}`}}>
                <span style={{color:t.accent, fontSize:13, flexShrink:0}}>▸</span>
                <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:13,
                  color:t.textSec, lineHeight:1.45}}>{a.action}</span>
              </div>
            </div>
          ))}

          <button onClick={onDismiss}
            style={{width:"100%", marginTop:4, padding:"9px",
              background:`${borderCol}1a`, border:`1px solid ${borderCol}66`,
              color:borderCol, borderRadius:8, fontFamily:"'Rajdhani',sans-serif",
              fontWeight:700, fontSize:13.5, cursor:"pointer", letterSpacing:1}}>
            HO PRESO VISIONE
          </button>
        </div>
      </div>
    </div>
  );
}
