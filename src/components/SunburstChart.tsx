import { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Animated, Easing, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg';
import { SafeView } from './SafeView';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const GaugeLine: any = Platform.OS === 'web' ? Line : AnimatedLine;

export type SunburstMarket = {
  code: string;
  name: string;
  score: number;
  share: number;
  region: string;
  rank?: number;
};

type RatingGaugeProps = {
  label: string;
  value: number | null;
  color: string;
  icon: any;
  compact?: boolean;
  detail?: string;
};

export function RatingGauge({ label, value, color, icon, compact = false, detail }: RatingGaugeProps) {
  const fraction = value !== null ? Math.max(0, Math.min(value / 5, 1)) : 0;
  const arcLength = 207;
  const [needleProgress] = useState(() => new Animated.Value(0));
  const [cardOpacity] = useState(() => new Animated.Value(0));
  const [cardScale] = useState(() => new Animated.Value(0.92));
  const [livePulse] = useState(() => new Animated.Value(1));
  const size = compact ? 140 : 170;
  const GaugeCard: any = Platform.OS === 'web' ? View : Animated.View;
  const GaugeIcon: any = Platform.OS === 'web' ? View : Animated.View;

  useEffect(() => {
    needleProgress.stopAnimation();
    cardOpacity.stopAnimation();
    cardScale.stopAnimation();
    needleProgress.setValue(0);
    Animated.parallel([
      Animated.timing(needleProgress, { toValue: fraction, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: false }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 500, easing: Easing.out(Easing.quad), useNativeDriver: true }),
      Animated.spring(cardScale, { toValue: 1, speed: 14, bounciness: 5, useNativeDriver: true }),
    ]).start();
  }, [fraction, needleProgress, cardOpacity, cardScale]);

  useEffect(() => {
    const pulse = Animated.loop(Animated.sequence([
      Animated.timing(livePulse, { toValue: 1.12, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      Animated.timing(livePulse, { toValue: 1, duration: 850, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
    ]));
    pulse.start();
    return () => pulse.stop();
  }, [livePulse]);

  const needleInput = Array.from({ length: 21 }, (_, index) => index / 20);
  const needleX = needleInput.map((progress) => {
    const angle = Math.PI + Math.PI * progress;
    return 90 + 48 * Math.cos(angle);
  });
  const needleY = needleInput.map((progress) => {
    const angle = Math.PI + Math.PI * progress;
    return 116 + 48 * Math.sin(angle);
  });
  const animatedX = needleProgress.interpolate({ inputRange: needleInput, outputRange: needleX });
  const animatedY = needleProgress.interpolate({ inputRange: needleInput, outputRange: needleY });
  const animatedShadowX = needleProgress.interpolate({ inputRange: needleInput, outputRange: needleX.map((x) => x + 2) });
  const animatedShadowY = needleProgress.interpolate({ inputRange: needleInput, outputRange: needleY.map((y) => y + 2) });
  const finalAngle = Math.PI + Math.PI * fraction;
  const finalX = 90 + 48 * Math.cos(finalAngle);
  const finalY = 116 + 48 * Math.sin(finalAngle);

  return (
    <GaugeCard style={[styles.gaugeCard, compact && styles.gaugeCardCompact, Platform.OS !== 'web' ? { opacity: cardOpacity, transform: [{ scale: cardScale }] } : null]} >
      <GaugeIcon style={[styles.gaugeIcon, { backgroundColor: `${color}18`, borderColor: `${color}55`, ...(Platform.OS !== 'web' ? { transform: [{ scale: livePulse }] } : {}) }]}>
        <Ionicons name={icon} size={compact ? 14 : 16} color={color} />
      </GaugeIcon>
      <Svg width={size} height={compact ? 112 : 132} viewBox="0 0 180 145">
        <Circle cx="90" cy="116" r="79" fill="#FFFFFF" stroke="#E2E4E9" strokeWidth="1.5" />
        <Circle cx="90" cy="116" r="73" fill="none" stroke="#EEF0F3" strokeWidth="9" />
        <Path d="M 23 116 A 67 67 0 0 1 157 116" fill="none" stroke="#EEF0F3" strokeWidth="15" strokeLinecap="round" />
        <Path d="M 23 116 A 67 67 0 0 1 157 116" fill="none" stroke={color} strokeWidth="15" strokeLinecap="round" strokeDasharray={`${arcLength * fraction} ${arcLength}`} />
        <Path d="M 144 52 A 67 67 0 0 1 157 116" fill="none" stroke="#509EE3" strokeWidth="15" strokeLinecap="round" opacity="0.85" />
        {[0, 0.05, 0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1].map((tick, index) => {
          const tickAngle = Math.PI + Math.PI * tick;
          const major = index % 5 === 0;
          const outerX = 90 + 67 * Math.cos(tickAngle);
          const outerY = 116 + 67 * Math.sin(tickAngle);
          const innerX = 90 + (major ? 54 : 58) * Math.cos(tickAngle);
          const innerY = 116 + (major ? 54 : 58) * Math.sin(tickAngle);
          return <Line key={tick} x1={innerX} y1={innerY} x2={outerX} y2={outerY} stroke={major ? '#9499A8' : '#C9CED6'} strokeWidth={major ? 2.2 : 1.1} />;
        })}
        {[0, 1, 2, 3, 4, 5].map((tick) => {
          const tickAngle = Math.PI + Math.PI * (tick / 5);
          const textX = 90 + 74 * Math.cos(tickAngle);
          const textY = 119 + 74 * Math.sin(tickAngle);
          return <SvgText key={`label-${tick}`} x={textX} y={textY} fill="#9499A8" fontSize="8" fontWeight="900" textAnchor="middle">{tick}</SvgText>;
        })}
        {value !== null && <>
          <GaugeLine x1={90} y1={116} x2={Platform.OS === 'web' ? finalX + 2 : animatedShadowX} y2={Platform.OS === 'web' ? finalY + 2 : animatedShadowY} stroke="#000" strokeWidth="4" strokeLinecap="round" opacity="0.12" />
          <GaugeLine x1={90} y1={116} x2={Platform.OS === 'web' ? finalX : animatedX} y2={Platform.OS === 'web' ? finalY : animatedY} stroke="#22242B" strokeWidth="3" strokeLinecap="round" />
        </>}
        <Circle cx="90" cy="116" r="11" fill="#FFFFFF" stroke="#9499A8" strokeWidth="2" />
        <Circle cx="90" cy="116" r="5" fill={color} stroke="#FFFFFF" strokeWidth="1.5" />
        <SvgText x="90" y="72" fill="#9499A8" fontSize="7" fontWeight="900" textAnchor="middle">LIVE SCORE</SvgText>
        <SvgText x="90" y="99" fill="#22242B" fontSize="28" fontWeight="900" textAnchor="middle">{value !== null ? value.toFixed(1) : '—'}</SvgText>
        <SvgText x="90" y="137" fill="#9499A8" fontSize="7" fontWeight="900" textAnchor="middle">SCALE / 5</SvgText>
      </Svg>
      <Text style={[styles.gaugeLabel, compact && styles.gaugeLabelCompact]}>{label}</Text>
      {detail ? <Text style={styles.gaugeDetail}>{detail}</Text> : null}
    </GaugeCard>
  );
}

export function RatingSpeedometers({ brand, ios, android, compact = false, brandDetail, iosDetail, androidDetail }: {
  brand: number | null;
  ios: number | null;
  android: number | null;
  compact?: boolean;
  brandDetail?: string;
  iosDetail?: string;
  androidDetail?: string;
}) {
  return <SafeView style={[styles.speedometerRow, compact && styles.speedometerRowCompact]}>
    <RatingGauge label="Combined rating" value={brand} color="#509EE3" icon="ribbon-outline" compact={compact} detail={brandDetail} />
    <RatingGauge label="App Store" value={ios} color="#22242B" icon="logo-apple" compact={compact} detail={iosDetail} />
    <RatingGauge label="Playstore" value={android} color="#3B7EC2" icon="logo-google-playstore" compact={compact} detail={androidDetail} />
  </SafeView>;
}

export function SunburstChart({ markets, selected, onSelect, platformRatings, platformReviewCounts, marketPosition, leaderGap }: {
  markets: SunburstMarket[];
  selected: SunburstMarket;
  onSelect: (market: SunburstMarket) => void;
  platformRatings: { brand: number | null; ios: number | null; android: number | null };
  platformReviewCounts?: { ios: number; android: number };
  marketPosition?: number;
  leaderGap?: number | null;
}) {
  return (
    <SafeView style={styles.wrap}>
      <SafeView style={styles.dashboardHeader}>
        <SafeView style={styles.bmwStrip}><SafeView style={styles.bmwBlue}/><SafeView style={styles.bmwLight}/><SafeView style={styles.bmwRed}/></SafeView>
        <SafeView>
          <Text style={styles.dashboardLabel}>RATING SCORECARD</Text>
          <Text style={styles.dashboardMarket}>{selected.name} · {selected.code}</Text>
        </SafeView>
        <SafeView style={styles.positionPanel}>
          <Text style={styles.positionValue}>{marketPosition ? `#${marketPosition}` : '—'}</Text>
          <Text style={styles.positionLabel}>MARKET POS.</Text>
        </SafeView>
        <SafeView style={styles.dashboardStatus}><SafeView style={styles.dashboardStatusDot}/><Text style={styles.dashboardStatusText}>{leaderGap !== null && leaderGap !== undefined ? `${leaderGap >= 0 ? '+' : ''}${leaderGap.toFixed(1)} VS LEADER` : 'LIVE SYNC'}</Text></SafeView>
      </SafeView>
      <RatingSpeedometers
        brand={platformRatings.brand}
        ios={platformRatings.ios}
        android={platformRatings.android}
        iosDetail={platformReviewCounts?.ios ? `${platformReviewCounts.ios.toLocaleString()} ratings` : 'Source unavailable'}
        androidDetail={platformReviewCounts?.android ? `${platformReviewCounts.android.toLocaleString()} ratings` : 'Source unavailable'}
        brandDetail={platformRatings.brand !== null ? 'Average of live platforms' : 'No live platform rating'}
      />
      <Text style={styles.panelTitleMarket}>SELECTED MARKETS</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.marketList}>
        {markets.map((market) => (
          <Pressable key={market.code} onPress={() => onSelect(market)} style={[styles.marketChip, selected.code === market.code && styles.marketChipActive]}>
            <Text style={[styles.marketCode, selected.code === market.code && styles.marketCodeActive]}>{market.code}</Text>
            <Text style={styles.marketName} numberOfLines={1}>{market.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </SafeView>
  );
}

const styles = StyleSheet.create({
  wrap: { minHeight: 290, width: '100%', alignItems: 'stretch', paddingVertical: 10 },
  dashboardHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderTopWidth: 1, borderColor: '#E2E4E9', paddingVertical: 7, paddingHorizontal: 10, backgroundColor: '#FFFFFF', borderRadius: 12 },
  bmwStrip: { width: 7, height: 38, marginRight: 8, borderRadius: 4, overflow: 'hidden' }, bmwBlue: { flex: 1, backgroundColor: '#509EE3' }, bmwLight: { flex: 1, backgroundColor: '#B9D6F2' }, bmwRed: { flex: 1, backgroundColor: '#3B7EC2' },
  dashboardLabel: { fontSize: 8, fontWeight: '900', color: '#9499A8', letterSpacing: 1.2 }, dashboardMarket: { fontSize: 12, fontWeight: '900', color: '#22242B', marginTop: 3 },
  positionPanel: { alignItems: 'center', marginLeft: 'auto', marginRight: 12 }, positionValue: { fontSize: 22, lineHeight: 24, fontWeight: '900', color: '#22242B' }, positionLabel: { fontSize: 7, fontWeight: '900', color: '#9499A8', letterSpacing: 0.6 },
  dashboardStatus: { height: 24, paddingHorizontal: 9, borderRadius: 12, borderWidth: 1, borderColor: '#A6F4C5', backgroundColor: '#ECFDF3', flexDirection: 'row', alignItems: 'center', gap: 5 }, dashboardStatusDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#12B76A' }, dashboardStatusText: { fontSize: 8, fontWeight: '900', color: '#027A48', letterSpacing: 0.6 },
  speedometerRow: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-around', alignItems: 'center', gap: 10, marginTop: 12, paddingHorizontal: 6, paddingVertical: 9, borderRadius: 14, borderWidth: 1, borderColor: '#E2E4E9', backgroundColor: '#F9FAFB' }, speedometerRowCompact: { marginTop: 10 },
  gaugeCard: { width: 206, height: 205, alignItems: 'center', borderRadius: 103, borderWidth: 1, borderColor: '#E2E4E9', backgroundColor: '#FFFFFF', paddingTop: 9, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 1 }, gaugeCardCompact: { width: 176, height: 188, borderRadius: 88 },
  gaugeIcon: { position: 'absolute', top: 12, width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: 'center', justifyContent: 'center', zIndex: 5 }, gaugeLabel: { fontSize: 9, fontWeight: '900', color: '#22242B', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: -20 }, gaugeLabelCompact: { fontSize: 8 }, gaugeDetail: { minHeight: 18, marginTop: 3, fontSize: 8, fontWeight: '800', color: '#9499A8', textAlign: 'center' },
  panelTitleMarket: { fontSize: 9, fontWeight: '900', color: '#9499A8', marginTop: 9, marginBottom: 6, letterSpacing: 1 }, marketList: { gap: 6 },
  marketChip: { width: 74, height: 54, borderRadius: 10, borderWidth: 1, borderColor: '#E2E4E9', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', paddingHorizontal: 4 }, marketChipActive: { borderColor: '#509EE3', backgroundColor: '#EAF3FC' }, marketCode: { fontSize: 11, fontWeight: '900', color: '#5A6072' }, marketCodeActive: { color: '#3B7EC2' }, marketName: { fontSize: 8, color: '#9499A8', marginTop: 2, width: 64, textAlign: 'center' },
});
