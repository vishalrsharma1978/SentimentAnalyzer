import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";

// Left rail: a rotating "customer sentiment analysis cycle" that moves customers from
// frustrated to happy. Stages light up in turn, a ring of dots orbits the loop, and the
// face in the centre changes mood as the cycle progresses.
const STAGES: { label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { label: "Collect", icon: "cloud-download-outline" },
  { label: "Analyse", icon: "analytics-outline" },
  { label: "Act", icon: "construct-outline" },
  { label: "Delight", icon: "happy-outline" },
];

const CX = 110;
const CY = 110;
const R = 78;

const point = (deg: number, r = R) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: CX + r * Math.cos(a), y: CY + r * Math.sin(a) };
};

function Face({ mood }: { mood: number }) {
  // mood 0 = upset, 1 = happy. Mouth is a quadratic curve whose control point moves.
  const mouthY = 128 - mood * 2;
  const control = 112 + (1 - mood) * 28 + mood * 28 * 0;
  const curve = 118 + mood * 22 - (1 - mood) * 8;
  const face = mood > 0.66 ? "#FFF200" : mood > 0.33 ? "#FFC400" : "#FF7A59";
  return (
    <G>
      <Circle
        cx={CX}
        cy={CY}
        r={34}
        fill={face}
        stroke="#0B0B0D"
        strokeWidth={4}
      />
      <Circle cx={CX - 12} cy={CY - 8} r={4} fill="#0B0B0D" />
      <Circle cx={CX + 12} cy={CY - 8} r={4} fill="#0B0B0D" />
      <Path
        d={`M ${CX - 16} ${mouthY - 2} Q ${CX} ${curve + (control - 112) * 0} ${CX + 16} ${mouthY - 2}`}
        stroke="#0B0B0D"
        strokeWidth={4}
        strokeLinecap="round"
        fill="none"
      />
    </G>
  );
}

export function SentimentCycle() {
  const [t, setT] = useState(0);

  useEffect(() => {
    let frame = 0;
    const id = setInterval(() => {
      frame += 1;
      setT(frame);
    }, 50);
    return () => clearInterval(id);
  }, []);

  const seconds = t * 0.05;
  const period = 8; // seconds for a full cycle
  const progress = (seconds % period) / period; // 0..1
  const active = Math.floor(progress * STAGES.length);
  const orbit = progress * 360;
  // mood climbs through the cycle then resets
  const mood = Math.min(1, progress * 1.15);
  const pulse = (Math.sin(seconds * 5) + 1) / 2;
  const sat = Math.round(35 + progress * 60);

  return (
    <View style={styles.wrap}>
      <Text style={styles.eyebrow}>SENTIMENT CYCLE</Text>
      <Text style={styles.title}>From frustrated to delighted</Text>

      <View style={styles.diagram}>
        <Svg width={220} height={220} viewBox="0 0 220 220" aria-hidden>
          {/* loop ring */}
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#2A2A30"
            strokeWidth={10}
          />
          <Circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#DC0000"
            strokeWidth={10}
            strokeDasharray={`${progress * 2 * Math.PI * R} ${2 * Math.PI * R}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          {/* orbiting dots */}
          {[0, 120, 240].map((o) => {
            const p = point(orbit + o, R);
            return <Circle key={o} cx={p.x} cy={p.y} r={5} fill="#FFF200" />;
          })}
          {/* stage nodes */}
          {STAGES.map((s, i) => {
            const p = point(i * 90, R);
            const on = i === active;
            return (
              <G key={s.label}>
                <Circle
                  cx={p.x}
                  cy={p.y}
                  r={on ? 17 + pulse * 3 : 14}
                  fill={on ? "#FFF200" : "#141417"}
                  stroke={on ? "#DC0000" : "#3A3A42"}
                  strokeWidth={3}
                />
                <SvgText
                  x={p.x}
                  y={p.y + 4}
                  fontSize={11}
                  fontWeight="bold"
                  fill={on ? "#0B0B0D" : "#C4C4C8"}
                  textAnchor="middle"
                >
                  {i + 1}
                </SvgText>
              </G>
            );
          })}
          <Line
            x1={CX}
            y1={CY - 46}
            x2={CX}
            y2={CY - 40}
            stroke="#DC0000"
            strokeWidth={2}
          />
          <Face mood={mood} />
        </Svg>
      </View>

      <View style={styles.legend}>
        {STAGES.map((s, i) => (
          <View
            key={s.label}
            style={[styles.legendRow, i === active && styles.legendRowOn]}
          >
            <View
              style={[styles.legendIcon, i === active && styles.legendIconOn]}
            >
              <Ionicons
                name={s.icon}
                size={14}
                color={i === active ? "#0B0B0D" : "#A0A0A6"}
              />
            </View>
            <Text
              style={[styles.legendText, i === active && styles.legendTextOn]}
            >
              {i + 1}. {s.label}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.meter}>
        <Text style={styles.meterLabel}>HAPPY CUSTOMERS</Text>
        <View style={styles.meterTrack}>
          <View style={[styles.meterFill, { width: `${sat}%` }]} />
        </View>
        <Text style={styles.meterValue}>{sat}%</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  eyebrow: {
    fontSize: 9,
    letterSpacing: 3,
    fontWeight: "800",
    color: "#DC0000",
  },
  title: {
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 0.5,
    color: "#FFF200",
    textAlign: "center",
  },
  diagram: { alignItems: "center" },
  legend: { alignSelf: "stretch", gap: 6 },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  legendRowOn: { backgroundColor: "rgba(255,242,0,0.12)" },
  legendIcon: {
    width: 22,
    height: 22,
    borderRadius: 4,
    backgroundColor: "#1E1E22",
    alignItems: "center",
    justifyContent: "center",
  },
  legendIconOn: { backgroundColor: "#FFF200" },
  legendText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    color: "#A0A0A6",
  },
  legendTextOn: { color: "#FFF200" },
  meter: { alignSelf: "stretch", gap: 4 },
  meterLabel: {
    fontSize: 9,
    letterSpacing: 2,
    fontWeight: "800",
    color: "#A0A0A6",
  },
  meterTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "#1E1E22",
    overflow: "hidden",
  },
  meterFill: { height: 8, backgroundColor: "#DC0000" },
  meterValue: { fontSize: 16, fontWeight: "300", color: "#FFF200" },
});
