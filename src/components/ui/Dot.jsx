export default function Dot({ status, t }) {
  const c = status === "ok" ? t.green : status === "warn" ? t.orange : t.red;
  return (
    <span style={{
      display:"inline-block", width:8, height:8, borderRadius:"50%",
      background:c, boxShadow:`0 0 8px ${c}`,
      animation:status==="ok"?"blink 2.5s infinite":"none",
    }}/>
  );
}
