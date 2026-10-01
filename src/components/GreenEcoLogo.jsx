export default function GreenEcoLogo({ height = 40 }) {
  return (
    <div style={{
      background: "#fff",
      borderRadius: 8,
      padding: "2px 8px",
      display: "flex",
      alignItems: "center",
    }}>
      <img
        src={`${import.meta.env.BASE_URL}greeneco-logo.png`}
        alt="GreenEco Wastewater"
        height={height}
        style={{ display: "block", width: "auto" }}
      />
    </div>
  );
}
