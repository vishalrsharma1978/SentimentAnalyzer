// Shared landing/dashboard palette: navy heroes and controls, white cards.
const NAVY = "#0F2B57";

export const colors = {
  navy: NAVY,
  text: "#3C4C6D",
  muted: "#64769B",
  faint: "#93A5C8",
  line: "#E4EAF6",
  lineSoft: "#EEF3FB",
  canvas: "#F4F8FF",
  card: "#FFFFFF",
  primary: NAVY,
  primaryDark: NAVY,
  primaryDeep: NAVY,
  accent: "#38BDF8",
  sky: "#60A5FA",
  header: "#FFFFFF",
  headerText: NAVY,
  primarySoft: "#EAF1FE",
  primaryTint: "#F5F9FF",
  primaryBorder: NAVY,
  badge: "#EFF4FD",
  onPrimary: "#FFFFFF",
  onDark: "#FFFFFF",
  onDarkMuted: "#CBDCF4",
  darkCard: NAVY,
  darkBorder: "#355278",
  backdrop: "rgba(15,43,87,0.45)",
  green: "#12B76A",
  greenSoft: "#ECFDF3",
  greenText: "#027A48",
  greenLight: "#75E0A7",
  orange: "#F79009",
  orangeSoft: "#FFFAEB",
  orangeText: "#B54708",
  orangeLight: "#FEC84B",
  red: "#F04438",
  redSoft: "#FEF3F2",
  redText: "#B42318",
  redLight: "#FDA29B",
  purple: "#7F56D9",
};

/** Light red/green/amber fill for charts that encode a 0–5 rating. */
export const ratingShade = (score: number | null | undefined): string =>
  typeof score !== "number" || !Number.isFinite(score)
    ? colors.lineSoft
    : score >= 4
      ? colors.greenLight
      : score >= 3
        ? colors.orangeLight
        : colors.redLight;

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
  shadowColor: colors.primary,
  shadowOpacity: 0.08,
  shadowRadius: 16,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};
