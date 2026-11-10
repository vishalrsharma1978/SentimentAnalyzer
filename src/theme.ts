// Metabase-inspired design tokens: clean light canvas, brand blue, soft borders.
export const colors = {
  navy: "#22242B",
  text: "#3B4154",
  muted: "#5A6072",
  faint: "#9499A8",
  line: "#E2E4E9",
  canvas: "#F9FAFB",
  card: "#FFFFFF",
  primary: "#509EE3",
  primaryDark: "#3B7EC2",
  primarySoft: "#EAF3FC",
  primaryBorder: "#B9D6F2",
  badge: "#EEF0F3",
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
  shadowColor: "#000",
  shadowOpacity: 0.04,
  shadowRadius: 3,
  shadowOffset: { width: 0, height: 1 },
  elevation: 1,
};
