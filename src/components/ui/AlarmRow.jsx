import Tag from "./Tag";

export default function AlarmRow({ alarm, t }) {
  const colors = { ALTO:t.red, MEDIO:t.orange, BASSO:t.yellow };
  const c = colors[alarm.sev] || t.textSec;
  return (
    <div style={{display:"flex", gap:10, padding:"7px 10px", borderLeft:`3px solid ${c}`, background:`${c}10`, borderRadius:"0 8px 8px 0", marginBottom:5}}>
      <div style={{flex:1}}>
        <div style={{display:"flex", gap:8, alignItems:"center", marginBottom:2}}>
          <Tag color={c}>{alarm.sev}</Tag>
          {alarm.auto && <Tag color={t.textMuted}>AUTO</Tag>}
          <span style={{fontSize:12, color:t.textMuted, fontFamily:"'Share Tech Mono',monospace"}}>{alarm.time}</span>
        </div>
        <div style={{fontSize:9, color:t.text, fontFamily:"'Rajdhani',sans-serif", lineHeight:1.4}}>{alarm.msg}</div>
        <div style={{fontSize:12, color:t.textMuted, marginTop:2, fontFamily:"'Rajdhani',sans-serif"}}>Causa: {alarm.causa}</div>
      </div>
    </div>
  );
}
