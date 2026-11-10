import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Defs, LinearGradient, Path, Stop } from "react-native-svg";
import { colors } from "../theme";

// Animated ECG / pulse-flow line. A glowing segment sweeps left-to-right
// across a repeating heartbeat waveform, echoing the brand pulse motif.
const WIDTH = 120;
const HEIGHT = 28;
const MID = HEIGHT / 2;

// Build the full path by repeating one heartbeat cycle (P wave, QRS spike, T wave).
function wavePath(): string {
  const segments: string[] = [];
  for (let x = 0; x < WIDTH; x += 60) {
    segments.push(
      `M ${x} ${MID} ` +
        `L ${x + 14} ${MID} Q ${x + 18} ${MID - 5} ${x + 22} ${MID} ` +
        `L ${x + 26} ${MID} L ${x + 30} ${MID + 9} L ${x + 34} ${MID - 14} L ${x + 38} ${MID + 4} L ${x + 42} ${MID} ` +
        `Q ${x + 48} ${MID + 6} ${x + 54} ${MID} L ${x + 60} ${MID}`,
    );
  }
  return segments.join(" ");
}

const DRIVER = Platform.OS !== "web";

export function PulseFlow({ color = colors.primary }: { color?: string }) {
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: 2200,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: DRIVER,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-WIDTH, WIDTH],
  });

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no">
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
        <Defs>
          <LinearGradient id="pulseFlow" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={color} stopOpacity="0.15" />
            <Stop offset="0.5" stopColor={color} stopOpacity="1" />
            <Stop offset="1" stopColor={color} stopOpacity="0.15" />
          </LinearGradient>
        </Defs>
        {/* faint baseline wave */}
        <Path d={wavePath()} fill="none" stroke={color} strokeWidth="1.5" opacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
      {/* sweeping bright segment */}
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { transform: [{ translateX }] },
        ]}
      >
        <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
          <Path d={wavePath()} fill="none" stroke="url(#pulseFlow)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH,
    height: HEIGHT,
    overflow: "hidden",
  },
});
