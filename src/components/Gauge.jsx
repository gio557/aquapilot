export default function Gauge({ stageOutput, t }) {
  const R = 36, C = 2 * Math.PI * R;
  const { value, target, higherIsBetter } = stageOutput;

  let score, color, label, displayVal, modeLabel;

  if (higherIsBetter) {
    score = Math.max(0, Math.min(100, Math.round(value / target * 100)));
    displayVal = Math.round(value) + "%";
    color = score >= 90 ? t.green : score >= 65 ? t.orange : t.red;
    label = score >= 90 ? "EFFICIENTE" : score >= 65 ? "RIDOTTO" : "INTASATO?";
    modeLabel = "RENDIMENTO";
  } else {
    const raw = Math.round(value / target * 100);
    score = Math.min(100, raw);
    displayVal = raw + "%";
    color = raw >= 100 ? t.red : raw >= 80 ? t.orange : raw >= 60 ? t.orange : t.green;
    label = raw >= 100 ? "FUORI LIMITE" : raw >= 80 ? "ATTENZIONE" : raw >= 60 ? "OK" : "OTTIMALE";
    modeLabel = "DEL LIMITE";
  }

  const filled = (score / 100) * C;
  return (
    <div>
      <svg width={86} height={86} viewBox="0 0 86 86">
        <circle cx="43" cy="43" r={R} fill="none" stroke={t.border} strokeWidth="4"/>
        <circle cx="43" cy="43" r={R} fill="none" stroke={color} strokeWidth="4"
          strokeDasharray={`${filled} ${C - filled}`}
          transform="rotate(-90, 43, 43)"
          strokeLinecap="round"
          style={{filter:`drop-shadow(0 0 5px ${color}88)`, transition:"stroke-dasharray 0.6s ease,stroke 0.5s ease"}}/>
        <text x="43" y="36" textAnchor="middle" dominantBaseline="middle"
          fontSize="15" fontWeight="700" fill={color} fontFamily="'Share Tech Mono',monospace">{displayVal}</text>
        <text x="43" y="49" textAnchor="middle" dominantBaseline="middle"
          fontSize="11" fill={t.textSec} fontFamily="'Share Tech Mono',monospace">{modeLabel}</text>
        <text x="43" y="60" textAnchor="middle" dominantBaseline="middle"
          fontSize="8.5" fill={color} fontFamily="'Rajdhani',sans-serif" letterSpacing="1">{label}</text>
      </svg>
      <div style={{textAlign:"center", marginTop:-2}}>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:9, color, fontWeight:700}}>{value}</span>
        <span style={{fontFamily:"'Share Tech Mono',monospace", fontSize:9, color:t.textMuted}}> / {target} {stageOutput.unit}</span>
      </div>
      <div style={{textAlign:"center", fontSize:9, color:t.textMuted, fontFamily:"'Rajdhani',sans-serif", marginTop:1, lineHeight:1.2}}>{stageOutput.label}</div>
    </div>
  );
}
