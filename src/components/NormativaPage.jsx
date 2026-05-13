import { useState } from "react";
import { NORMATIVA_DEFAULT, NORMATIVA_SETS } from "../constants/normativa";
import EditableCell from "./ui/EditableCell";
import Tag from "./ui/Tag";

export default function NormativaPage({ t, ac, onAC }) {
  const [norms, setNorms] = useState(NORMATIVA_DEFAULT);
  const [tipoScarico, setTipoScarico] = useState("Tab. 3 – Acque superficiali");
  const [saved, setSaved] = useState(false);
  const [expandedCat, setExpandedCat] = useState(0);

  const AC_LABELS = {
    blower:        { icon:"💨", stadio:"Stadio Biologico" },
    coagulant:     { icon:"⚗️", stadio:"Sedimentazione" },
    sludgeRecycle: { icon:"♻️", stadio:"Biologico/Sedimentazione" },
    pH:            { icon:"⚗️", stadio:"Disinfezione" },
  };

  const handleTipoChange = (tipo) => {
    setTipoScarico(tipo);
    setNorms(JSON.parse(JSON.stringify(NORMATIVA_SETS[tipo] || NORMATIVA_DEFAULT)));
    setExpandedCat(0);
  };

  const upd = (ci, pi, field, raw) => {
    const num = parseFloat(raw);
    const v = raw===""||raw===null ? null : isNaN(num) ? raw : num;
    setNorms(prev => { const n = prev.map(c => ({...c, params:[...c.params]})); n[ci].params[pi] = {...n[ci].params[pi], [field]:v}; return n; });
  };

  const thS = {padding:"8px 10px", borderBottom:`1px solid ${t.border}`, fontSize:14, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, letterSpacing:1, textTransform:"uppercase", color:t.textSec, textAlign:"left", background:t.surface3, whiteSpace:"nowrap"};
  const tdS = {padding:"8px 10px", borderBottom:`1px solid ${t.border}`, fontSize:12, fontFamily:"'Rajdhani',sans-serif"};

  return (
    <div style={{padding:"20px 24px 40px"}}>

      {/* ── CONTROLLO AUTOMATICO ── */}
      <div style={{marginBottom:28}}>
        <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:t.accent, letterSpacing:2, marginBottom:4}}>CONTROLLO AUTOMATICO IMPIANTO</div>
        <div style={{fontSize:16, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", marginBottom:16}}>Gestione delle funzioni di auto-correzione per ciascuno stadio del processo</div>

        <div style={{display:"flex", alignItems:"center", justifyContent:"space-between", padding:"14px 18px", background:ac.enabled?t.greenDim:t.surface2, border:`2px solid ${ac.enabled?t.green:t.border}`, borderRadius:12, marginBottom:16, transition:"all 0.3s"}}>
          <div>
            <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, color:ac.enabled?t.green:t.text}}>
              {ac.enabled ? "● Sistema Auto-Correzione ATTIVO" : "○ Sistema Auto-Correzione DISATTIVATO"}
            </div>
            <div style={{fontSize:12, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", marginTop:2}}>
              {ac.enabled ? "L'impianto corregge autonomamente le anomalie di processo" : "Controllo completamente manuale — tutti gli automatismi disabilitati"}
            </div>
          </div>
          <button onClick={() => onAC(p => ({...p, autoCorrect:{...p.autoCorrect, enabled:!p.autoCorrect.enabled}}))}
            style={{padding:"8px 20px", borderRadius:8, cursor:"pointer", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, border:"none", background:ac.enabled?t.green:t.surface3, color:ac.enabled?"#fff":t.textSec, transition:"all 0.3s", minWidth:90}}>
            {ac.enabled ? "DISABILITA" : "ABILITA"}
          </button>
        </div>

        <div style={{display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:10}}>
          {Object.entries(ac).filter(([k]) => k !== "enabled").map(([key, fn]) => {
            const meta = AC_LABELS[key] || {};
            const isOn = ac.enabled && fn.on;
            return (
              <div key={key} style={{padding:"12px 14px", background:t.surface, border:`1px solid ${isOn?t.accent+"66":t.border}`, borderRadius:10, opacity:ac.enabled?1:0.5, transition:"all 0.3s"}}>
                <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", gap:10}}>
                  <div style={{flex:1}}>
                    <div style={{display:"flex", alignItems:"center", gap:6, marginBottom:4}}>
                      <span style={{fontSize:12}}>{meta.icon}</span>
                      <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:isOn?t.accent:t.text}}>{fn.label}</span>
                    </div>
                    <div style={{fontSize:12, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginBottom:4, lineHeight:1.4}}>{fn.desc}</div>
                    <div style={{fontSize:12, fontFamily:"'Share Tech Mono',monospace", color:t.textMuted}}>Stadio: {meta.stadio}</div>
                  </div>
                  <button onClick={() => { if (!ac.enabled) return; onAC(p => ({...p, autoCorrect:{...p.autoCorrect, [key]:{...p.autoCorrect[key], on:!p.autoCorrect[key].on}}})); }}
                    disabled={!ac.enabled}
                    style={{flexShrink:0, padding:"5px 14px", borderRadius:6, cursor:ac.enabled?"pointer":"not-allowed", fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, border:`1px solid ${isOn?t.accent:t.border}`, background:isOn?`${t.accent}22`:t.surface2, color:isOn?t.accent:t.textSec, transition:"all 0.2s"}}>
                    {fn.on ? "ON" : "OFF"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {!ac.enabled && (
          <div style={{marginTop:12, padding:"10px 16px", background:t.orangeDim, border:`1px solid ${t.orange}44`, borderRadius:8, display:"flex", gap:10, alignItems:"center"}}>
            <span style={{fontSize:18}}>⚠️</span>
            <div style={{fontSize:12, color:t.orange, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>
              <strong>Modalità manuale attiva.</strong> L'operatore è responsabile del monitoraggio e della correzione di tutte le anomalie di processo.
            </div>
          </div>
        )}
      </div>

      <div style={{borderTop:`2px solid ${t.border}`, marginBottom:24}}/>

      {/* ── NORMATIVA ── */}
      <div style={{display:"flex", alignItems:"flex-start", justifyContent:"space-between", marginBottom:20, flexWrap:"wrap", gap:12}}>
        <div>
          <div style={{fontFamily:"'Orbitron',sans-serif", fontSize:16, fontWeight:900, color:t.accent, letterSpacing:2, marginBottom:4}}>NORMATIVA & TARGET</div>
          <div style={{fontSize:16, color:t.textSec, fontFamily:"'Rajdhani',sans-serif"}}>Configurazione limiti normativi e target operativi — D.Lgs 152/2006 Allegato 5</div>
        </div>
        <div style={{display:"flex", gap:10, alignItems:"flex-end", flexWrap:"wrap"}}>
          <select value={tipoScarico} onChange={e => handleTipoChange(e.target.value)}
            style={{background:t.surface, border:`1px solid ${t.border}`, color:t.text, padding:"7px 12px", borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontSize:12, cursor:"pointer"}}>
            {["Tab. 3 – Acque superficiali","Tab. 4 – Fognatura","Autorizzazione AIA","Personalizzato"].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={() => handleTipoChange(tipoScarico)}
            style={{background:t.surface2, border:`1px solid ${t.border}`, color:t.textSec, padding:"7px 14px", borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, cursor:"pointer"}}>↺ Default</button>
          <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }}
            style={{background:saved?`${t.green}18`:`${t.accent}18`, border:`1px solid ${saved?t.green:t.accent}`, color:saved?t.green:t.accent, padding:"7px 20px", borderRadius:7, fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:12, cursor:"pointer", transition:"all 0.3s"}}>
            {saved ? "✓ Salvato" : "💾 Salva"}
          </button>
        </div>
      </div>

      <div style={{background:`${t.accent}0D`, border:`1px solid ${t.accent}30`, borderRadius:10, padding:"12px 18px", marginBottom:20, display:"flex", gap:14, alignItems:"flex-start"}}>
        <span style={{fontSize:22, flexShrink:0}}>⚖️</span>
        <div style={{fontSize:12, color:t.textSec, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.5}}>
          <strong style={{color:t.accent}}>D.Lgs 152/2006 — {tipoScarico}</strong><br/>
          Clicca su qualsiasi valore <span style={{fontFamily:"'Share Tech Mono',monospace", background:t.surface2, padding:"1px 5px", borderRadius:3}}>✎</span> per modificarlo.
        </div>
      </div>

      {norms.map((cat, ci) => (
        <div key={cat.categoria} style={{marginBottom:16}}>
          <button onClick={() => setExpandedCat(expandedCat === ci ? null : ci)}
            style={{width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", gap:10, padding:"10px 14px", background:t.surface, border:`1px solid ${t.border}`, borderLeft:`4px solid ${cat.colore}`, borderRadius:expandedCat===ci?"10px 10px 0 0":"10px", cursor:"pointer"}}>
            <div style={{display:"flex", alignItems:"center", gap:10}}>
              <div style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:700, fontSize:14, color:t.text}}>{cat.categoria}</div>
              <Tag color={cat.colore}>{cat.params.length} param.</Tag>
            </div>
            <span style={{color:t.textMuted, fontSize:12, transform:expandedCat===ci?"rotate(180deg)":"rotate(0deg)", transition:"transform 0.2s"}}>▼</span>
          </button>
          {expandedCat === ci && (
            <div style={{background:t.surface, border:`1px solid ${t.border}`, borderTop:"none", borderRadius:"0 0 10px 10px", overflowX:"auto"}}>
              <table style={{width:"100%", borderCollapse:"collapse", minWidth:700}}>
                <thead>
                  <tr>{["Parametro","Unità","Rif.","Lim. MAX","Lim. MIN","Target MAX","Target MIN","Pre-allarme %","Stato"].map(h => <th key={h} style={thS}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {cat.params.map((p, pi) => (
                    <tr key={p.id} style={{background:pi%2===0?t.surface:`${t.surface2}88`}}>
                      <td style={{...tdS, fontWeight:700, color:t.text}}>{p.nome}</td>
                      <td style={{...tdS, fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textSec}}>{p.unita||"—"}</td>
                      <td style={{...tdS, fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted}}>{p.rif}</td>
                      <td style={tdS}><EditableCell value={p.legge_max}   onSave={v => upd(ci,pi,"legge_max",v)}   t={t}/></td>
                      <td style={tdS}><EditableCell value={p.legge_min}   onSave={v => upd(ci,pi,"legge_min",v)}   t={t}/></td>
                      <td style={tdS}><EditableCell value={p.target_max}  onSave={v => upd(ci,pi,"target_max",v)}  t={t}/></td>
                      <td style={tdS}><EditableCell value={p.target_min}  onSave={v => upd(ci,pi,"target_min",v)}  t={t}/></td>
                      <td style={tdS}><EditableCell value={p.preAllarme}  onSave={v => upd(ci,pi,"preAllarme",v)}  t={t}/></td>
                      <td style={{...tdS, color:t.green, fontFamily:"'Share Tech Mono',monospace", fontSize:11}}>✓ Attivo</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
