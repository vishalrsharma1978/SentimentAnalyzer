// Blue & white design tokens: soft blue canvas, white cards, royal-blue accents.
export const colors = {
  navy: "#0F2B57",
  text: "#3C4C6D",
  muted: "#64769B",
  faint: "#93A5C8",
  line: "#E4EAF6",
  lineSoft: "#EEF3FB",
  canvas: "#F4F8FF",
  card: "#FFFFFF",
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  primaryDeep: "#1E3A8A",
  accent: "#38BDF8",
  sky: "#60A5FA",
  header: "#FFFFFF",
  headerText: "#0F2B57",
  primarySoft: "#EAF1FE",
  primaryTint: "#F5F9FF",
  primaryBorder: "#2563EB",
  badge: "#EFF4FD",
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
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

// Soft blue-tinted elevation used on white cards.
export const cardShadow = {
  shadowColor: "#2563EB",
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
