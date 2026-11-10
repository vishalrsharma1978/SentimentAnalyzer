import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";
import { Carbon } from "./Carbon";

// Left-column brand panel shown under the gauge cluster: how it works + trust badges.
const steps: { n: string; title: string; text: string }[] = [
  {
    n: "01",
    title: "Pick your brand",
    text: "Choose the brand and competitors you want to track.",
  },
  {
    n: "02",
    title: "Connect sources",
    text: "App stores, social, forums and review sites in one model.",
  },
  {
    n: "03",
    title: "Read the pulse",
    text: "Praise, friction and trends scored live, market by market.",
  },
];

const trust: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: "lock-closed-outline", label: "Private keys" },
  { icon: "globe-outline", label: "17 markets" },
  { icon: "flash-outline", label: "Live data" },
];

export function BrandPanel() {
  return (
    <View style={styles.wrap}>
      <Carbon />
      <Text style={styles.eyebrow}>HOW IT WORKS</Text>
      <Text style={styles.title}>From setup to insight</Text>
      <View style={styles.steps}>
        {steps.map((s) => (
          <View key={s.n} style={styles.step}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{s.n}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{s.title}</Text>
              <Text style={styles.stepText}>{s.text}</Text>
            </View>
          </View>
        ))}
      </View>
      <View style={styles.trust}>
        {trust.map((t) => (
          <View key={t.label} style={styles.trustItem}>
            <Ionicons name={t.icon} size={16} color="#509EE3" />
            <Text style={styles.trustLabel}>{t.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.stripe} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: 16,
    borderWidth: 1,
    borderColor: "#E2E4E9",
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    padding: 20,
    paddingBottom: 26,
    gap: 14,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3,
    fontWeight: "800",
    color: "#509EE3",
  },
  title: {
    fontSize: 22,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "#22242B",
  },
  steps: { gap: 14, marginTop: 4 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  badge: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#EAF3FC",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { fontSize: 13, fontWeight: "800", color: "#3B7EC2" },
  stepBody: { flex: 1 },
  stepTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#22242B",
    letterSpacing: 0.5,
  },
  stepText: { marginTop: 2, fontSize: 12, lineHeight: 17, color: "#5A6072" },
  trust: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E4E9",
  },
  trustItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  trustLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.4,
    color: "#9499A8",
    textTransform: "uppercase",
  },
  stripe: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 4,
    backgroundColor: "#509EE3",
  },
});
