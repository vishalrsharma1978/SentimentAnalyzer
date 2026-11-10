import { StyleSheet, Text, View } from "react-native";
import Svg, { Circle, Defs, Path, Rect, Stop, LinearGradient } from "react-native-svg";

export function CustomerSentimentBanner({ compact = false }: { compact?: boolean }) {
  return (
    <View style={[styles.banner, compact && styles.bannerCompact]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100" aria-hidden>
          <Defs>
            <LinearGradient id="heroBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1D4ED8" />
              <Stop offset="0.55" stopColor="#2563EB" />
              <Stop offset="1" stopColor="#3B82F6" />
            </LinearGradient>
          </Defs>
          <Rect width="100" height="100" fill="url(#heroBg)" />
        </Svg>
      </View>
      <View style={[styles.copy, compact && styles.copyCompact]}>
        <View style={styles.eyebrowRow}>
          <View style={styles.liveDot} />
          <Text style={styles.eyebrow}>CUSTOMER SENTIMENT INTELLIGENCE</Text>
        </View>
        <Text style={[styles.title, compact && styles.titleCompact]}>LET’S ELEVATE YOUR BRAND</Text>
        <Text style={[styles.subtitle, compact && styles.subtitleCompact]}>
          Listen closer. Understand every voice. Build lasting loyalty.
        </Text>
      </View>

      <View pointerEvents="none" style={[styles.visual, compact && styles.visualCompact]}>
        <Svg
          width="100%"
          height="100%"
          viewBox="0 0 540 260"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden
        >
          <Defs>
            <LinearGradient id="brandJourney" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" stopOpacity="0.2" />
              <Stop offset="0.55" stopColor="#FFFFFF" stopOpacity="0.65" />
              <Stop offset="1" stopColor="#BAE6FD" stopOpacity="1" />
            </LinearGradient>
            <LinearGradient id="brandCore" x1="0" y1="1" x2="1" y2="0">
              <Stop offset="0" stopColor="#FFFFFF" />
              <Stop offset="1" stopColor="#BAE6FD" />
            </LinearGradient>
          </Defs>

          {[56, 108, 160, 212].map((y) => (
            <Path
              key={y}
              d={`M 0 ${y} L 540 ${y}`}
              stroke="#FFFFFF"
              strokeWidth="1"
              opacity="0.08"
            />
          ))}
          {[120, 220, 320, 420, 520].map((x) => (
            <Path
              key={x}
              d={`M ${x} 22 L ${x} 238`}
              stroke="#FFFFFF"
              strokeWidth="1"
              opacity="0.07"
            />
          ))}

          <Circle cx="365" cy="130" r="95" fill="#FFFFFF" opacity="0.08" />
          <Circle cx="365" cy="130" r="76" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.2" />
          <Circle cx="365" cy="130" r="64" fill="none" stroke="#FFFFFF" strokeWidth="1" strokeDasharray="2 8" opacity="0.3" />

          <Path
            d="M 190 190 C 240 184 261 172 293 157 C 329 140 343 160 374 144 C 407 127 429 105 458 75"
            fill="none"
            stroke="url(#brandJourney)"
            strokeWidth="2"
            strokeDasharray="4 7"
            opacity="0.65"
          />
          <Path
            d="M 226 153 C 264 174 294 177 321 158 C 345 141 358 134 378 130 C 404 124 429 100 461 66"
            fill="none"
            stroke="url(#brandJourney)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <Path d="M 448 69 L 463 62 L 462 79" fill="none" stroke="#BAE6FD" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          <Circle cx="364" cy="130" r="49" fill="#FFFFFF" opacity="0.14" />
          <Circle cx="364" cy="130" r="44" fill="none" stroke="url(#brandCore)" strokeWidth="2" opacity="0.9" />
          <Circle cx="364" cy="130" r="36" fill="#FFFFFF" opacity="0.92" />
          <Path
            d="M 332 131 L 343 131 L 350 119 L 359 143 L 369 112 L 378 131 L 387 131 L 395 123"
            fill="none"
            stroke="#2563EB"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <Circle cx="364" cy="130" r="4" fill="#2563EB" />

          <Path d="M 222 80 C 222 70 230 63 240 63 C 250 63 258 70 258 80 C 258 90 250 97 240 97 L 230 97 L 223 104 L 225 94 C 223 90 222 85 222 80 Z" fill="#FFFFFF" opacity="0.95" />
          <Circle cx="233" cy="80" r="2" fill="#2563EB" />
          <Circle cx="240" cy="80" r="2" fill="#2563EB" />
          <Circle cx="247" cy="80" r="2" fill="#2563EB" />

          <Path d="M 273 204 C 273 195 280 188 289 188 C 298 188 305 195 305 204 C 305 213 298 220 289 220 L 281 220 L 275 226 L 276 217 C 274 213 273 209 273 204 Z" fill="#FFFFFF" opacity="0.9" />
          <Path d="M 284 205 C 284 202 288 201 289 204 C 291 201 295 202 295 205 C 295 209 289 213 289 213 C 289 213 284 209 284 205 Z" fill="#2563EB" />

          <Circle cx="464" cy="64" r="17" fill="#FFFFFF" opacity="0.95" />
          <Path d="M 457 64 L 462 69 L 472 57" fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <Circle cx="464" cy="64" r="25" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.35" />

          <Circle cx="292" cy="97" r="3" fill="#FFFFFF" opacity="0.7" />
          <Circle cx="428" cy="173" r="4" fill="#BAE6FD" opacity="0.9" />
          <Circle cx="317" cy="76" r="2.5" fill="#FFFFFF" opacity="0.6" />
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flex: 1,
    minHeight: 172,
    borderRadius: 24,
    overflow: "hidden",
    backgroundColor: "#2563EB",
    justifyContent: "center",
    shadowColor: "#1D4ED8",
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6,
  },
  bannerCompact: { minHeight: 180 },
  copy: {
    position: "relative",
    zIndex: 1,
    alignSelf: "flex-start",
    maxWidth: "62%",
    paddingVertical: 28,
    paddingHorizontal: 30,
  },
  copyCompact: { maxWidth: "100%", paddingVertical: 22, paddingHorizontal: 20 },
  eyebrowRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#7DD3FC",
  },
  eyebrow: {
    fontSize: 9,
    fontWeight: "900",
    letterSpacing: 2,
    color: "#BFDBFE",
  },
  title: {
    marginTop: 12,
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  titleCompact: { maxWidth: 280, fontSize: 21, lineHeight: 27 },
  subtitle: {
    marginTop: 8,
    color: "#DBEAFE",
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: 0.3,
  },
  subtitleCompact: { maxWidth: 250, fontSize: 11 },
  visual: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    width: "55%",
    opacity: 0.95,
  },
  visualCompact: { width: "58%", opacity: 0.58 },
});
