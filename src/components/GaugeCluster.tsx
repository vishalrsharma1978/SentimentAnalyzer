import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, G, Line, Path, Text as SvgText } from "react-native-svg";
import { Carbon } from "./Carbon";

type Props = {
  brand: string;
  score: string;
  status: string;
  sources: number;
  markets: number;
  platforms: number;
  isError?: boolean;
};

const polar = (cx: number, cy: number, r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
};

// Clean light gauge: white face, blue accent arc, tick marks and a needle.
function RevCounter({ value, size }: { value: number; size: number }) {
  const c = 100;
  const start = -135;
  const end = 135;
  const needle = polar(c, c, 70, start + (end - start) * value);
  const redFrom = polar(c, c, 84, start + (end - start) * 0.78);
  const redTo = polar(c, c, 84, end);
  return (
    <Svg width={size} height={size} viewBox="0 0 200 200" aria-hidden>
      <Circle
        cx={c}
        cy={c}
        r={96}
        fill="#FFFFFF"
        stroke="#E4EAF6"
        strokeWidth={8}
      />
      <Circle
        cx={c}
        cy={c}
        r={96}
        fill="none"
        stroke="#BFDBFE"
        strokeWidth={2}
      />
      <Path
        d={`M ${redFrom.x} ${redFrom.y} A 84 84 0 0 1 ${redTo.x} ${redTo.y}`}
        stroke="#2563EB"
        strokeWidth={8}
        fill="none"
      />
      {Array.from({ length: 11 }).map((_, i) => {
        const deg = start + ((end - start) / 10) * i;
        const o = polar(c, c, 88, deg);
        const n = polar(c, c, i % 2 === 0 ? 72 : 78, deg);
        return (
          <Line
            key={i}
            x1={o.x}
            y1={o.y}
            x2={n.x}
            y2={n.y}
            stroke="#93A5C8"
            strokeWidth={i % 2 === 0 ? 4 : 2}
          />
        );
      })}
      {[0, 2, 4, 6, 8, 10].map((i) => {
        const p = polar(c, c, 58, start + ((end - start) / 10) * i);
        return (
          <SvgText
            key={i}
            x={p.x}
            y={p.y + 5}
            fontSize={15}
            fontWeight="bold"
            fill="#0F2B57"
            textAnchor="middle"
          >
            {i}
          </SvgText>
        );
      })}
      <G>
        <Line
          x1={c}
          y1={c}
          x2={needle.x}
          y2={needle.y}
          stroke="#2563EB"
          strokeWidth={5}
          strokeLinecap="round"
        />
        <Circle cx={c} cy={c} r={11} fill="#0F2B57" />
        <Circle cx={c} cy={c} r={4} fill="#2563EB" />
      </G>
    </Svg>
  );
}

export function GaugeCluster({
  brand,
  score,
  status,
  sources,
  markets,
  platforms,
  isError,
}: Props) {
  return (
    <View style={styles.wrap}>
      <Carbon />
      <View style={styles.topline}>
        <View style={styles.dot} />
        <Text style={styles.toplineText}>LIVE BRAND METRICS</Text>
      </View>
      <View style={styles.gauges}>
        <RevCounter value={Math.min(1, Math.max(0, markets / 17))} size={140} />
        <RevCounter value={Math.min(1, Math.max(0, sources / 11))} size={140} />
      </View>
      <View style={styles.centerReadout}>
        <Text style={styles.label}>AI SENTIMENT ENGINE</Text>
        <Text style={styles.brand} numberOfLines={1}>
          {brand}
        </Text>
        <Text style={styles.score}>{score}</Text>
        <Text style={[styles.status, isError && styles.statusError]}>
          {status}
        </Text>
      </View>
      <View style={styles.meta}>
        <View>
          <Text style={styles.metaValue}>{sources}</Text>
          <Text style={styles.metaLabel}>SOURCES</Text>
        </View>
        <View>
          <Text style={styles.metaValue}>{markets}</Text>
          <Text style={styles.metaLabel}>MARKETS</Text>
        </View>
        <View>
          <Text style={styles.metaValue}>{platforms}</Text>
          <Text style={styles.metaLabel}>PLATFORM</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 220,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#E4EAF6",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
    padding: 20,
    justifyContent: "center",
    shadowColor: "#2563EB",
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  topline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 18,
  },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#2563EB" },
  toplineText: {
    fontSize: 9,
    letterSpacing: 2.4,
    fontWeight: "800",
    color: "#2563EB",
  },
  gauges: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  centerReadout: { alignItems: "center", marginTop: 14 },
  label: {
    fontSize: 9,
    letterSpacing: 2.2,
    fontWeight: "800",
    color: "#2563EB",
  },
  brand: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: "300",
    letterSpacing: 2,
    color: "#0F2B57",
  },
  score: { fontSize: 56, lineHeight: 62, fontWeight: "200", color: "#0F2B57" },
  status: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64769B",
    textAlign: "center",
  },
  statusError: { color: "#F04438" },
  meta: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 18,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#EEF3FB",
  },
  metaValue: {
    fontSize: 18,
    fontWeight: "300",
    color: "#0F2B57",
    textAlign: "center",
  },
  metaLabel: {
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 1.8,
    color: "#93A5C8",
    textAlign: "center",
    marginTop: 2,
  },
});
