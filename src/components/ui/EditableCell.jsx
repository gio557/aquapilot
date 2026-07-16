import { useState, useEffect } from "react";

export default function EditableCell({ value, onSave, t }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(String(value ?? "-"));

  useEffect(() => { if (!editing) setVal(String(value ?? "-")); }, [value, editing]);

  const commit = () => { onSave(val); setEditing(false); };

  if (editing) return (
    <input autoFocus type="text" value={val}
      onChange={e => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key==="Enter") commit(); if (e.key==="Escape") setEditing(false); }}
      style={{width:88, padding:"3px 7px", fontSize:14, fontFamily:"'Share Tech Mono',monospace", background:t.accentDim, border:`1px solid ${t.accent}`, borderRadius:4, color:t.accent, outline:"none"}}
    />
  );

  return (
    <span onClick={() => setEditing(true)}
      style={{cursor:"pointer", display:"inline-flex", alignItems:"center", gap:4, padding:"3px 9px", borderRadius:4, background:t.surface2, border:`1px solid ${t.border}`, fontFamily:"'Share Tech Mono',monospace", fontSize:13, color:value===null?t.textMuted:t.text, whiteSpace:"nowrap", userSelect:"none"}}>
      {value === null ? "N/D" : val}
      <span style={{fontSize:12, color:t.textMuted, marginLeft:2}}>✎</span>
    </span>
  );
}
