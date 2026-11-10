import { useEffect, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { colors } from "../theme";

// Animated ECG / pulse-flow line. A glowing segment sweeps left-to-right
// across a repeating heartbeat waveform, echoing the brand pulse motif.
const WIDTH = 120;
const HEIGHT = 28;
const MID = HEIGHT / 2;
const DURATION = 2200;

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

const WAVE = wavePath();

function BaseWave({ color }: { color: string }) {
  return (
    <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
      <Path d={WAVE} fill="none" stroke={color} strokeWidth="1.5" opacity="0.18" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function SweepWave({ color }: { color: string }) {
  return (
    <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden>
      <Path d={WAVE} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

// Web: drive the sweep with an injected CSS keyframe animation. CSS animations
// are composited by the browser and reliably restart after client-side
// navigation remounts, where RN Animated / WAAPI-on-RNW-views can stall.
const KEYFRAME_ID = "pulseflow-sweep-keyframes";

function ensureKeyframes() {
  if (typeof document === "undefined" || document.getElementById(KEYFRAME_ID)) return;
  const style = document.createElement("style");
  style.id = KEYFRAME_ID;
  style.textContent =
    `@keyframes pulseflow-sweep {` +
    `0% { transform: translateX(${-WIDTH}px); }` +
    `100% { transform: translateX(${WIDTH}px); }` +
    `}`;
  document.head.appendChild(style);
}

function PulseFlowWeb({ color }: { color: string }) {
  useEffect(() => {
    ensureKeyframes();
  }, []);

  const sweepStyle: React.CSSProperties = {
    width: WIDTH,
    height: HEIGHT,
    animation: `pulseflow-sweep ${DURATION}ms ease-in-out infinite`,
    willChange: "transform",
  };

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no">
      <BaseWave color={color} />
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <div style={sweepStyle}>
          <SweepWave color={color} />
        </div>
      </View>
    </View>
  );
}

// Native: use RN Animated loop.
function PulseFlowNative({ color }: { color: string }) {
  const [sweep] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: DURATION,
        easing: Easing.inOut(Easing.ease),
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [sweep]);

  const translateX = sweep.interpolate({ inputRange: [0, 1], outputRange: [-WIDTH, WIDTH] });

  return (
    <View style={styles.wrap} accessibilityElementsHidden importantForAccessibility="no">
      <BaseWave color={color} />
      <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX }] }]}>
        <SweepWave color={color} />
      </Animated.View>
    </View>
  );
}

export function PulseFlow({ color = colors.primary }: { color?: string }) {
  return Platform.OS === "web" ? <PulseFlowWeb color={color} /> : <PulseFlowNative color={color} />;
}

const styles = StyleSheet.create({
  wrap: {
    width: WIDTH,
    height: HEIGHT,
    overflow: "hidden",
  },
});
