import { qualitySeverity } from "../../constants/limits";

// Recharts custom dot: renders a visible marker ONLY where the point's value is
// out of its regulatory limit (an anomaly), otherwise nothing. Pass it as a
// React element to <Line dot={...}> so recharts injects cx/cy/payload/index.
//   pkey = QUALITY_LIMITS key for this line (COD, BOD5, TSS, NH4, NO3, NTOT, O2, pH)
export default function AnomalyDot(props) {
  const { cx, cy, payload, pkey, t } = props;
  if (cx == null || cy == null) return null;
  const sev = qualitySeverity(pkey, payload?.[pkey]);
  if (!sev) return null;
  const color = sev === "ALTO" ? t.red : t.orange;
  return (
    <g style={{ pointerEvents: "none" }}>
      <circle cx={cx} cy={cy} r={5} fill="none" stroke={color} strokeWidth={1.5} opacity={0.55} />
      <circle cx={cx} cy={cy} r={2.6} fill={color} stroke={t.surface || "#fff"} strokeWidth={1} />
    </g>
  );
}
