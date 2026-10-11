import { qualitySeverity } from "../../constants/limits";

// Recharts custom dot: renders a visible marker ONLY where the point's value is
// out of its regulatory limit (an anomaly), otherwise nothing. Pass it as a
// React element to <Line dot={...}> so recharts injects cx/cy/payload/index.
//   pkey   = QUALITY_LIMITS key for this line (COD, BOD5, TSS, NH4, NO3, NTOT, O2, pH)
//   onPick = optional; called with the point payload when the marker is clicked
//            (used in the history page to reposition the panels on that event).
//   limits = active normativa-derived limit set; markers follow the selected
//            regulation instead of the static QUALITY_LIMITS default.
export default function AnomalyDot(props) {
  const { cx, cy, payload, pkey, t, onPick, limits } = props;
  if (cx == null || cy == null) return null;
  const sev = qualitySeverity(pkey, payload?.[pkey], limits);
  if (!sev) return null;
  const color = sev === "ALTO" ? t.red : t.orange;
  const clickable = typeof onPick === "function";
  return (
    <g style={{ cursor: clickable ? "pointer" : "default", pointerEvents: clickable ? "auto" : "none" }}
       onClick={clickable ? (e) => { e.stopPropagation?.(); onPick(payload); } : undefined}>
      {clickable && <circle cx={cx} cy={cy} r={10} fill="transparent" />}
      <circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
      <circle cx={cx} cy={cy} r={2.6} fill={color} stroke={t.surface || "#fff"} strokeWidth={1} />
    </g>
  );
}
