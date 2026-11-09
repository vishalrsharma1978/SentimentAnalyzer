import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

// Branding strip shown under the car: tagline, proof points and source badges.
const stats: {
  value: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}[] = [
  { value: "11+", label: "Review sources", icon: "layers-outline" },
  { value: "17", label: "Global markets", icon: "globe-outline" },
  { value: "24/7", label: "Live monitoring", icon: "pulse-outline" },
  { value: "AI", label: "Sentiment engine", icon: "sparkles-outline" },
];

export function BrandStrip({ isWide }: { isWide: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.taglineBlock}>
        <Text style={styles.eyebrow}>
          PULSEBOARD · CUSTOMER SENTIMENT ANALYZER
        </Text>
        <Text style={[styles.tagline, !isWide && styles.taglineSmall]}>
          Know what your customers feel. Move faster than the competition.
        </Text>
      </View>
      <View style={[styles.stats, !isWide && styles.statsWrap]}>
        {stats.map((s) => (
          <View key={s.label} style={[styles.stat, !isWide && styles.statHalf]}>
            <View style={styles.statIcon}>
              <Ionicons name={s.icon} size={18} color="#0B0B0D" />
            </View>
            <View>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

export function BrandFooter() {
  return (
    <View style={styles.footer}>
      <View style={styles.footerStripe} />
      <View style={styles.footerRow}>
        <View style={styles.footerBrand}>
          <View style={styles.footerMark}>
            <Ionicons name="pulse" size={16} color="#0B0B0D" />
          </View>
          <Text style={styles.footerName}>PULSEBOARD</Text>
        </View>
        <Text style={styles.footerText}>
          Customer Sentiment Analyzer · Scuderia Edition
        </Text>
        <View style={styles.footerBadges}>
          {["App Store", "Google Play", "Trustpilot", "Reddit", "X"].map(
            (b) => (
              <View key={b} style={styles.badge}>
                <Text style={styles.badgeText}>{b}</Text>
              </View>
            ),
          )}
        </View>
      </View>
      <Text style={styles.copy}>
        © {new Date().getFullYear()} PulseBoard. Built for brands that demand
        performance.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderWidth: 1,
    borderColor: "#3A1A1A",
    borderRadius: 6,
    backgroundColor: "#101012",
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 18,
    gap: 16,
  },
  taglineBlock: { alignItems: "center" },
  eyebrow: {
    fontSize: 10,
    letterSpacing: 3.5,
    fontWeight: "800",
    color: "#DC0000",
    textAlign: "center",
  },
  tagline: {
    marginTop: 8,
    fontSize: 24,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "#F2F2F2",
    textAlign: "center",
  },
  taglineSmall: { fontSize: 18 },
  stats: {
    flexDirection: "row",
    justifyContent: "space-around",
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,242,0,0.3)",
    paddingTop: 16,
  },
  statsWrap: { flexWrap: "wrap" },
  stat: { flexDirection: "row", alignItems: "center", gap: 10 },
  statHalf: { width: "46%" },
  statIcon: {
    width: 36,
    height: 36,
    borderRadius: 4,
    backgroundColor: "#FFF200",
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: { fontSize: 20, fontWeight: "300", color: "#FFF200" },
  statLabel: {
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.6,
    color: "#A0A0A6",
    textTransform: "uppercase",
  },
  footer: { marginTop: 28, paddingBottom: 6 },
  footerStripe: { height: 5, backgroundColor: "#DC0000", marginBottom: 14 },
  footerRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  footerBrand: { flexDirection: "row", alignItems: "center", gap: 8 },
  footerMark: {
    width: 28,
    height: 28,
    borderRadius: 4,
    backgroundColor: "#FFF200",
    alignItems: "center",
    justifyContent: "center",
  },
  footerName: {
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 5,
    color: "#F2F2F2",
  },
  footerText: {
    fontSize: 11,
    letterSpacing: 1.4,
    color: "#A0A0A6",
    textTransform: "uppercase",
  },
  footerBadges: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  badge: {
    borderWidth: 1,
    borderColor: "#2A2A30",
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "#141417",
  },
  badgeText: { fontSize: 10, fontWeight: "700", color: "#C4C4C8" },
  copy: { marginTop: 12, fontSize: 10, color: "#6F6F76", textAlign: "center" },
});
