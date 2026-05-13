import { useState } from "react";
import { STAGE_TYPES } from "../constants/stages";

export default function Configurator({ stages, onAdd, onRemove, onClose, t }) {
  const [sel, setSel] = useState(STAGE_TYPES[0]);
  return (
    <div style={{position:"fixed", inset:0, background:"rgba(0,0,0,0.55)", backdropFilter:"blur(4px)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center"}} onClick={onClose}>
      <div style={{background:t.surface, border:`1px solid ${t.border}`, borderRadius:16, padding:24, width:520, maxWidth:"95vw", maxHeight:"85vh", overflowY:"auto"}} onClick={e => e.stopPropagation()}>
        <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20}}>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, color:t.accent, letterSpacing:2}}>⚙ CONFIGURATORE STADI</div>
          <button onClick={onClose} style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.text, padding:"4px 12px", borderRadius:6, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:"pointer"}}>✕</button>
        </div>
        <div style={{marginBottom:20}}>
          {stages.map((s, i) => (
            <div key={s.id} style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"9px 12px", background:t.surface2, borderRadius:8, border:`1px solid ${t.border}`, marginBottom:6}}>
              <div style={{display:"flex", alignItems:"center", gap:12}}>
                <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color:t.textMuted, minWidth:28}}>{String(i+1).padStart(2,"0")}</span>
                <div>
                  <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, color:t.text, fontSize:14}}>{s.name}</div>
                  <div style={{fontSize:14, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>{s.sub}</div>
                </div>
              </div>
              <button onClick={() => onRemove(s.id)} disabled={stages.length <= 1}
                style={{background:"transparent", border:`1px solid ${stages.length>1?t.red:t.border}`, color:stages.length>1?t.red:t.textMuted, padding:"3px 10px", borderRadius:5, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:stages.length>1?"pointer":"not-allowed"}}>
                Rimuovi
              </button>
            </div>
          ))}
        </div>
        <div style={{background:t.surface2, borderRadius:10, padding:16, border:`1px solid ${t.border}`}}>
          <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:11, letterSpacing:2, color:t.textSec, textTransform:"uppercase", marginBottom:10}}>Aggiungi Stadio</div>
          <div style={{display:"flex", gap:8}}>
            <select value={sel} onChange={e => setSel(e.target.value)}
              style={{flex:1, background:t.surface, border:`1px solid ${t.border}`, borderRadius:7, color:t.text, padding:"8px 10px", fontFamily:"'Rajdhani',sans-serif", fontSize:12, cursor:"pointer"}}>
              {STAGE_TYPES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <button onClick={() => onAdd(sel)}
              style={{background:`${t.accent}20`, border:`1px solid ${t.accent}`, color:t.accent, padding:"8px 16px", borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer"}}>
              + Aggiungi
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
