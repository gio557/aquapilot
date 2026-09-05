export default function Tag({ children, color }) {
  return (
    <span style={{
      fontSize:12, padding:"2px 9px", borderRadius:4,
      background:`${color}22`, color,
      border:`1px solid ${color}44`,
      fontFamily:"'Share Tech Mono',monospace", letterSpacing:1,
    }}>
      {children}
    </span>
  );
}
