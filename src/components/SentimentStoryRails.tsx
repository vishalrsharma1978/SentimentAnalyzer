import { Ionicons } from "@expo/vector-icons";
import {
  Animated,
  Easing,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useEffect, useState } from "react";
import Svg, { Circle, Path } from "react-native-svg";

const cycleSteps = [
  {
    icon: "chatbubble-ellipses-outline",
    title: "LISTEN",
    detail: "Capture every voice",
  },
  {
    icon: "analytics-outline",
    title: "UNDERSTAND",
    detail: "Find the real feeling",
  },
  {
    icon: "flash-outline",
    title: "IMPROVE",
    detail: "Turn insight into action",
  },
  {
    icon: "heart-outline",
    title: "BUILD LOYALTY",
    detail: "Bring customers back",
  },
] as const;

const animatedDriver = Platform.OS !== "web";

export function SentimentStoryRails() {
  const [progress] = useState(() => new Animated.Value(0));
  const [glow] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const journey = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: 5200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: animatedDriver,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: 5200,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: animatedDriver,
        }),
      ]),
    );
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, {
          toValue: 1,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: animatedDriver,
        }),
        Animated.timing(glow, {
          toValue: 0,
          duration: 1100,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: animatedDriver,
        }),
      ]),
    );
    journey.start();
    pulse.start();

    return () => {
      journey.stop();
      pulse.stop();
    };
  }, [glow, progress]);

  const activeDotY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 138],
  });
  const growthX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 112],
  });
  const growthY = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [58, 3],
  });
  const customerScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.08],
  });
  const nodeGlow = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.65, 1],
  });

  return (
    <View pointerEvents="none" style={styles.rails}>
      <View style={[styles.rail, styles.leftRail]}>
        <Text style={styles.eyebrow}>THE CUSTOMER LOOP</Text>
        <Text style={styles.railTitle}>Hear. Learn. Improve.</Text>
        <View style={styles.cycle}>
          <View style={styles.cycleSpine} />
          <Animated.View
            style={[
              styles.cycleRunner,
              { transform: [{ translateY: activeDotY }] },
            ]}
          />
          {cycleSteps.map((step, index) => {
            const active = progress.interpolate({
              inputRange: [0, 0.25, 0.5, 0.75, 1],
              outputRange: [
                index === 0 ? 1 : 0.55,
                index === 1 ? 1 : 0.55,
                index === 2 ? 1 : 0.55,
                index === 3 ? 1 : 0.55,
                index === 0 ? 1 : 0.55,
              ],
            });
            return (
              <View key={step.title} style={styles.cycleStep}>
                <Animated.View
                  style={[
                    styles.cycleIcon,
                    { opacity: active, transform: [{ scale: active }] },
                  ]}
                >
                  <Ionicons
                    name={step.icon}
                    size={16}
                    color={index === 3 ? "#2563EB" : "#64769B"}
                  />
                </Animated.View>
                <View style={styles.stepCopy}>
                  <Text style={styles.stepTitle}>{step.title}</Text>
                  <Text style={styles.stepDetail}>{step.detail}</Text>
                </View>
              </View>
            );
          })}
        </View>
        <View style={styles.quote}>
          <Ionicons name="chatbox-ellipses-outline" size={14} color="#2563EB" />
          <Text style={styles.quoteText}>Every review starts a better journey.</Text>
        </View>
      </View>

      <View style={[styles.rail, styles.rightRail]}>
        <Text style={styles.eyebrow}>THE BRAND EFFECT</Text>
        <Text style={styles.railTitle}>Happy customers. Stronger brands.</Text>
        <View style={styles.customerRow}>
          {["happy-outline", "happy-outline", "happy-outline"].map(
            (icon, index) => (
              <Animated.View
                key={`${icon}-${index}`}
                style={[
                  styles.customer,
                  index === 1 && styles.customerFeatured,
                  {
                    opacity: nodeGlow,
                    transform: [
                      {
                        scale: index === 1 ? customerScale : 1,
                      },
                    ],
                  },
                ]}
              >
                <Ionicons
                  name={icon as keyof typeof Ionicons.glyphMap}
                  size={index === 1 ? 22 : 18}
                  color={index === 1 ? "#FFFFFF" : "#2563EB"}
                />
              </Animated.View>
            ),
          )}
        </View>
        <Text style={styles.customerCaption}>FEEL HEARD. CHOOSE YOU AGAIN.</Text>
        <View style={styles.growthChart}>
          <Svg width="100%" height="100%" viewBox="0 0 128 78">
            <Path
              d="M5 70 L123 70 M5 48 L123 48 M5 26 L123 26"
              stroke="rgba(80,158,227,0.15)"
              strokeWidth="1"
            />
            <Path
              d="M8 62 L37 52 L65 55 L94 29 L120 11"
              fill="none"
              stroke="#2563EB"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <Circle cx="37" cy="52" r="3" fill="#2563EB" />
            <Circle cx="65" cy="55" r="3" fill="#2563EB" />
            <Circle cx="94" cy="29" r="3" fill="#2563EB" />
            <Circle cx="120" cy="11" r="4" fill="#2563EB" />
          </Svg>
          <Animated.View
            style={[
              styles.growthRunner,
              {
                transform: [
                  { translateX: growthX },
                  { translateY: growthY },
                ],
              },
            ]}
          />
        </View>
        <View style={styles.growthFooter}>
          <View style={styles.growthIcon}>
            <Ionicons name="trending-up-outline" size={15} color="#FFFFFF" />
          </View>
          <Text style={styles.growthText}>LOYALTY IN MOTION</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  rails: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 110,
    bottom: 20,
    zIndex: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  rail: {
    width: 154,
    alignSelf: "center",
    borderWidth: 1,
    borderColor: "#E4EAF6",
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.97)",
    padding: 12,
    overflow: "hidden",
    shadowColor: "#2563EB",
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  leftRail: { minHeight: 382 },
  rightRail: { minHeight: 354 },
  eyebrow: {
    fontSize: 8,
    letterSpacing: 1.5,
    fontWeight: "900",
    color: "#2563EB",
  },
  railTitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 19,
    fontWeight: "700",
    color: "#0F2B57",
  },
  cycle: { marginTop: 18, gap: 12, position: "relative" },
  cycleSpine: {
    position: "absolute",
    left: 12,
    top: 12,
    bottom: 12,
    width: 1,
    backgroundColor: "#E4EAF6",
  },
  cycleRunner: {
    position: "absolute",
    top: 8,
    left: 7,
    zIndex: 1,
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  cycleStep: { minHeight: 34, flexDirection: "row", alignItems: "center", gap: 9 },
  cycleIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#EAF1FE",
  },
  stepCopy: { flex: 1 },
  stepTitle: {
    fontSize: 8,
    letterSpacing: 0.8,
    fontWeight: "900",
    color: "#2563EB",
  },
  stepDetail: { marginTop: 2, fontSize: 8, lineHeight: 11, color: "#93A5C8" },
  quote: {
    marginTop: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E4EAF6",
    flexDirection: "row",
    gap: 7,
    alignItems: "flex-start",
  },
  quoteText: { flex: 1, fontSize: 9, lineHeight: 13, color: "#64769B" },
  customerRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
  },
  customer: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E4EAF6",
  },
  customerFeatured: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  customerCaption: {
    marginTop: 10,
    textAlign: "center",
    fontSize: 7,
    letterSpacing: 1,
    fontWeight: "900",
    color: "#93A5C8",
  },
  growthChart: {
    height: 100,
    marginTop: 18,
    position: "relative",
    overflow: "hidden",
  },
  growthRunner: {
    position: "absolute",
    left: 4,
    top: 8,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#2563EB",
    borderWidth: 2,
    borderColor: "#BFDBFE",
  },
  growthFooter: {
    marginTop: 10,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: "#E4EAF6",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  growthIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
  },
  growthText: {
    fontSize: 8,
    letterSpacing: 1,
    fontWeight: "900",
    color: "#2563EB",
  },
});
