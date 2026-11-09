import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Path, Rect, Text as SvgText } from "react-native-svg";
import { Carbon } from "./Carbon";

const promises: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: "speedometer-outline",
    title: "Real-time pulse",
    text: "Live reviews and social mentions, scored the moment they land.",
  },
  {
    icon: "flag-outline",
    title: "Beat the field",
    text: "Benchmark your brand against competitors in every market.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Private by design",
    text: "Your sources and API keys never leave your workspace.",
  },
];

// Ferrari-style steering wheel (flat bottom, yellow rev strip, red ignition button) over carbon,
// with brand promises filling the space beneath it.
export function Cockpit({
  message = "Let’s start brand review",
}: {
  message?: string;
}) {
  return (
    <View style={styles.wrap}>
      <Carbon />
      <View pointerEvents="none" style={styles.messageWrap}>
        <Text style={styles.eyebrow}>IGNITION READY</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View pointerEvents="none" style={styles.wheelWrap}>
        <Svg width={280} height={250} viewBox="0 0 360 320" aria-hidden>
          {/* rim */}
          <Path
            d="M60 160 C60 78 112 34 180 34 C248 34 300 78 300 160 C300 222 270 262 236 270 L124 270 C90 262 60 222 60 160 Z"
            fill="#0B0B0D"
            stroke="#3A3A42"
            strokeWidth={34}
            strokeLinejoin="round"
          />
          <Path
            d="M60 160 C60 78 112 34 180 34 C248 34 300 78 300 160 C300 222 270 262 236 270 L124 270 C90 262 60 222 60 160 Z"
            fill="none"
            stroke="#DC0000"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          {/* yellow rev strip at 12 o'clock */}
          <Rect x={150} y={14} width={60} height={12} rx={4} fill="#FFF200" />
          <Rect x={178} y={14} width={4} height={12} fill="#DC0000" />
          {/* spokes */}
          <Path
            d="M70 170 L140 188 M290 170 L220 188 M180 232 L180 266"
            stroke="#1E1E22"
            strokeWidth={22}
            strokeLinecap="round"
          />
          {/* hub with prancing-horse yellow shield */}
          <Rect
            x={138}
            y={118}
            width={84}
            height={96}
            rx={14}
            fill="#FFF200"
            stroke="#0B0B0D"
            strokeWidth={5}
          />
          <SvgText
            x={180}
            y={178}
            fontSize={46}
            fontWeight="bold"
            fill="#0B0B0D"
            textAnchor="middle"
          >
            F
          </SvgText>
          <Rect x={138} y={118} width={84} height={10} fill="#00843D" />
          <Rect x={138} y={128} width={84} height={5} fill="#F2F2F2" />
          <Rect x={138} y={133} width={84} height={5} fill="#DC0000" />
          {/* red engine-start button */}
          <Circle
            cx={98}
            cy={178}
            r={20}
            fill="#DC0000"
            stroke="#0B0B0D"
            strokeWidth={4}
          />
          <SvgText
            x={98}
            y={183}
            fontSize={11}
            fontWeight="bold"
            fill="#F2F2F2"
            textAnchor="middle"
          >
            START
          </SvgText>
        </Svg>
      </View>

      <View style={styles.promises}>
        <Text style={styles.promisesTitle}>WHY PULSEBOARD</Text>
        {promises.map((p) => (
          <View key={p.title} style={styles.promise}>
            <View style={styles.promiseIcon}>
              <Ionicons name={p.icon} size={18} color="#0B0B0D" />
            </View>
            <View style={styles.promiseBody}>
              <Text style={styles.promiseHeading}>{p.title}</Text>
              <Text style={styles.promiseText}>{p.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.stripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    minHeight: 540,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#DC0000",
    backgroundColor: "#0B0B0D",
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingBottom: 24,
  },
  messageWrap: {
    position: "absolute",
    left: 16,
    right: 16,
    top: 24,
    alignItems: "center",
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "800",
    color: "#DC0000",
  },
  message: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 1,
    color: "#FFF200",
  },
  wheelWrap: { marginTop: 110 },
  promises: {
    alignSelf: "stretch",
    marginTop: 26,
    marginHorizontal: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,242,0,0.3)",
    gap: 14,
  },
  promisesTitle: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "800",
    color: "#DC0000",
  },
  promise: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  promiseIcon: {
    width: 34,
    height: 34,
    borderRadius: 4,
    backgroundColor: "#FFF200",
    alignItems: "center",
    justifyContent: "center",
  },
  promiseBody: { flex: 1 },
  promiseHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#FFF200",
  },
  promiseText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: "#C4C4C8" },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 5,
    backgroundColor: "#DC0000",
  },
});
