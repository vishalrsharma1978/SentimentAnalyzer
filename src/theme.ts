// Metabase-inspired design tokens: clean light canvas, layered blue shades.
export const colors = {
  navy: "#1A2B4A",
  text: "#33415C",
  muted: "#5A6B8C",
  faint: "#8FA3C4",
  line: "#D9E2F0",
  canvas: "#F0F5FB",
  card: "#FFFFFF",
  primary: "#509EE3",
  primaryDark: "#2E6DB4",
  primaryDeep: "#1B4F8A",
  primarySoft: "#E3F0FC",
  primaryBorder: "#A9CDF0",
  badge: "#E4EBF5",
  green: "#12B76A",
  greenSoft: "#ECFDF3",
  greenText: "#027A48",
  orange: "#F79009",
  orangeSoft: "#FFFAEB",
  orangeText: "#B54708",
  red: "#F04438",
  redSoft: "#FEF3F2",
  redText: "#B42318",
  purple: "#7F56D9",
};

// Weight-specific Lato families loaded via expo-font (see app/_layout.tsx).
// When using one of these, omit fontWeight — the family already carries it.
export const fonts = {
  light: "Lato_300Light",
  regular: "Lato_400Regular",
  bold: "Lato_700Bold",
  black: "Lato_900Black",
};

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 999,
};

export const cardShadow = {
  shadowColor: "#1B4F8A",
  shadowOpacity: 0.08,
  shadowRadius: 6,
  shadowOffset: { width: 0, height: 2 },
  elevation: 2,
};
