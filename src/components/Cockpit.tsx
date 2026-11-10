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
    title: "Stay ahead",
    text: "Benchmark your brand against competitors in every market.",
  },
  {
    icon: "shield-checkmark-outline",
    title: "Private by design",
    text: "Your sources and API keys never leave your workspace.",
  },
];

// Clean light steering-wheel motif over a subtle dot grid,
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
        <Text style={styles.eyebrow}>READY WHEN YOU ARE</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      <View pointerEvents="none" style={styles.wheelWrap}>
        <Svg width={280} height={250} viewBox="0 0 360 320" aria-hidden>
          {/* rim */}
          <Path
            d="M60 160 C60 78 112 34 180 34 C248 34 300 78 300 160 C300 222 270 262 236 270 L124 270 C90 262 60 222 60 160 Z"
            fill="#22242B"
            stroke="#3B4154"
            strokeWidth={34}
            strokeLinejoin="round"
          />
          <Path
            d="M60 160 C60 78 112 34 180 34 C248 34 300 78 300 160 C300 222 270 262 236 270 L124 270 C90 262 60 222 60 160 Z"
            fill="none"
            stroke="#509EE3"
            strokeWidth={4}
            strokeLinejoin="round"
          />
          {/* blue rev strip at 12 o'clock */}
          <Rect x={150} y={14} width={60} height={12} rx={4} fill="#509EE3" />
          <Rect x={178} y={14} width={4} height={12} fill="#22242B" />
          {/* spokes */}
          <Path
            d="M70 170 L140 188 M290 170 L220 188 M180 232 L180 266"
            stroke="#3B4154"
            strokeWidth={22}
            strokeLinecap="round"
          />
          {/* hub with brand-blue shield */}
          <Rect
            x={138}
            y={118}
            width={84}
            height={96}
            rx={14}
            fill="#509EE3"
            stroke="#22242B"
            strokeWidth={5}
          />
          <SvgText
            x={180}
            y={178}
            fontSize={46}
            fontWeight="bold"
            fill="#FFFFFF"
            textAnchor="middle"
          >
            P
          </SvgText>
          <Rect x={138} y={118} width={84} height={10} fill="#3B7EC2" />
          <Rect x={138} y={128} width={84} height={5} fill="#B9D6F2" />
          <Rect x={138} y={133} width={84} height={5} fill="#EAF3FC" />
          {/* blue engine-start button */}
          <Circle
            cx={98}
            cy={178}
            r={20}
            fill="#509EE3"
            stroke="#22242B"
            strokeWidth={4}
          />
          <SvgText
            x={98}
            y={183}
            fontSize={11}
            fontWeight="bold"
            fill="#FFFFFF"
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
              <Ionicons name={p.icon} size={18} color="#3B7EC2" />
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
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#A9CDF0",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingBottom: 24,
    shadowColor: "#1B4F8A",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
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
    color: "#2E6DB4",
  },
  message: {
    marginTop: 6,
    textAlign: "center",
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 1,
    color: "#1A2B4A",
  },
  wheelWrap: { marginTop: 110 },
  promises: {
    alignSelf: "stretch",
    marginTop: 26,
    marginHorizontal: 18,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#D9E2F0",
    gap: 14,
  },
  promisesTitle: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "800",
    color: "#2E6DB4",
  },
  promise: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  promiseIcon: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#E3F0FC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#A9CDF0",
  },
  promiseBody: { flex: 1 },
  promiseHeading: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    color: "#1A2B4A",
  },
  promiseText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: "#5A6B8C" },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "#509EE3",
  },
});
