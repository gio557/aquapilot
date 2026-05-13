import { useState, useEffect } from "react";

export default function SimSlider({ label, value, min, max, step=1, unit, onChange, color, t, sublabel }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));
  const pct = ((value - min) / (max - min)) * 100;

  const commit = () => {
    const n = parseFloat(draft);
    if (!isNaN(n)) onChange(Math.max(min, Math.min(max, step < 1 ? Math.round(n/step)*step : Math.round(n/step)*step)));
    else setDraft(String(value));
    setEditing(false);
  };

  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);

  return (
    <div style={{marginBottom:14}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4}}>
        <div>
          <span style={{fontFamily:"'Rajdhani',sans-serif", fontWeight:600, fontSize:13, color:t.text}}>{label}</span>
          {sublabel && <span style={{fontFamily:"'Rajdhani',sans-serif", fontSize:11, color:t.textMuted, marginLeft:5}}>{sublabel}</span>}
        </div>
        {editing ? (
          <div style={{display:"flex", alignItems:"center", gap:4}}>
            <input
              autoFocus type="number" min={min} max={max} step={step}
              value={draft}
              onChange={e => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") { setDraft(String(value)); setEditing(false); } }}
              style={{width:72, padding:"2px 6px", fontFamily:"'Share Tech Mono',monospace", fontSize:14, fontWeight:700, color, textAlign:"right", background:t.surface2, border:`2px solid ${color}`, borderRadius:5, outline:"none"}}
            />
            <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:11, color:t.textMuted}}>{unit}</span>
          </div>
        ) : (
          <span
            onClick={() => setEditing(true)}
            title="Clicca per modificare"
            style={{fontFamily:"'Share Tech Mono',monospace", fontSize:14, color, fontWeight:700, cursor:"text", padding:"2px 6px", borderRadius:4, border:`1px dashed ${color}66`, transition:"background 0.15s"}}
            onMouseEnter={e => e.currentTarget.style.background=`${color}18`}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}
          >{value}{unit} <span style={{fontSize:9, opacity:0.6}}>✎</span></span>
        )}
      </div>
      <div style={{position:"relative", height:6, background:t.surface3, borderRadius:3, marginBottom:3}}>
        <div style={{position:"absolute", left:0, top:0, height:"100%", width:`${pct}%`, background:color, borderRadius:3, transition:"width 0.1s"}}/>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{width:"100%", margin:0, accentColor:color, cursor:"pointer"}}/>
      <div style={{display:"flex", justifyContent:"space-between", fontSize:9, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace", marginTop:1}}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}
