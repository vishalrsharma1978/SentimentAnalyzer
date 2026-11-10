import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, View } from "react-native";
import { colors } from "../theme";

// Small pulsing dot: a solid core with an expanding soft ring.
export function PulseDot({ color = colors.primary, size = 8 }: { color?: string; size?: number }) {
  const [progress] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(progress, {
        toValue: 1,
        duration: 1600,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [progress]);

  const ringScale = progress.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] });
  const ringOpacity = progress.interpolate({ inputRange: [0, 0.7, 1], outputRange: [0.5, 0.15, 0] });

  return (
    <View style={[styles.wrap, { width: size * 2.6, height: size * 2.6 }]} accessibilityElementsHidden>
      <Animated.View
        style={[
          styles.ring,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: color,
            opacity: ringOpacity,
            transform: [{ scale: ringScale }],
          },
        ]}
      />
      <View
        style={[
          styles.core,
          { width: size, height: size, borderRadius: size / 2, backgroundColor: color },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: "center", justifyContent: "center" },
  ring: { position: "absolute" },
  core: {},
});
