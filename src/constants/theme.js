export const DARK = {
  bg:"#030B16", surface:"#071525", surface2:"#0C1E35", surface3:"#102540",
  border:"#2A5285", text:"#D8EEFF", textSec:"#5A8CB8", textMuted:"#2A5070",
  accent:"#00CFFF", accentDim:"rgba(0,207,255,0.12)",
  green:"#00E599", greenDim:"rgba(0,229,153,0.12)",
  orange:"#FF9422", orangeDim:"rgba(255,148,34,0.12)",
  red:"#FF3B5C", redDim:"rgba(255,59,92,0.12)",
  yellow:"#FFD060", purple:"#BB66FF", chartGrid:"#142840",
  cardShadow:"0 3px 14px rgba(0,0,0,0.55)",
};

export const LIGHT = {
  bg:"#C8D8EA", surface:"#FFFFFF", surface2:"#E0EAF5", surface3:"#C8D8E8",
  border:"#4A7A9B", text:"#08192E", textSec:"#1E3D5C", textMuted:"#507088",
  accent:"#0044AA", accentDim:"rgba(0,68,170,0.08)",
  green:"#005A2E", greenDim:"rgba(0,90,46,0.08)",
  orange:"#9A4200", orangeDim:"rgba(154,66,0,0.08)",
  red:"#99001F", redDim:"rgba(153,0,31,0.08)",
  yellow:"#6A4800", purple:"#551199", chartGrid:"#B0C8DE",
  cardShadow:"0 3px 14px rgba(0,40,100,0.18)",
};

// Tema "Martes": dark neutro quasi nero con accento lime, ispirato ai dashboard
// SaaS moderni. I colori di stato (verde/arancio/rosso) restano nettamente
// distinti dall'accento lime per non compromettere la leggibilità degli allarmi.
export const MARTES = {
  bg:"#0A0B0D", surface:"#141518", surface2:"#1B1D22", surface3:"#23262C",
  border:"#2D3138", text:"#F2F3F5", textSec:"#9CA1AB", textMuted:"#5C616B",
  accent:"#C5F82A", accentDim:"rgba(197,248,42,0.12)",
  green:"#34D399", greenDim:"rgba(52,211,153,0.12)",
  orange:"#FF8A3D", orangeDim:"rgba(255,138,61,0.12)",
  red:"#FF4D5E", redDim:"rgba(255,77,94,0.12)",
  yellow:"#FBBF24", purple:"#A78BFA", chartGrid:"#20232A",
  cardShadow:"0 4px 22px rgba(0,0,0,0.6)",
};

export const THEMES = { light: LIGHT, dark: DARK, martes: MARTES };
