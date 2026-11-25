import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Text as SvgText } from 'react-native-svg';
import {
  aggregateRating, channelLabels, channelRating, hitTestSunburst, polarPoint, ringPath, sunburstSegments,
} from '../data/marketAnalytics';
import type { Channel, Market, MarketRatings, SunburstSegment } from '../data/marketAnalytics';
import { colors, ratingShade } from '../theme';

type Props = {
  markets: Market[];
  ratings: MarketRatings;
  country: Market;
  focused: boolean;
  channel: Channel;
  onDrill: (countryCode: string, channel: Channel | null) => void;
  onReset: () => void;
};

export function RatingSunburst({ markets, ratings, country, focused, channel, onDrill, onReset }: Props) {
  const segments = sunburstSegments(markets, focused ? country.code : null);
  const [chartWidth, setChartWidth] = useState(400);
  const pressPoint = useRef<{ x: number; y: number } | null>(null);
  const score = focused ? channelRating(ratings[country.code], channel) : null;
  // Segments share the dashboard-wide rating scheme: light green 4+, light
  // amber 3+, light red below, grey when the source returned no rating.
  const ratingFor = (segment: SunburstSegment) =>
    segment.channel
      ? channelRating(ratings[segment.countryCode], segment.channel)
      : aggregateRating(ratings[segment.countryCode]);
  const colorFor = (segment: SunburstSegment) => {
    const rating = ratingFor(segment);
    return rating === null ? colors.line : ratingShade(rating);
  };
  return <View style={styles.container}>
    <View style={styles.breadcrumb}>
      <Pressable accessibilityRole="button" accessibilityLabel="Reset sunburst to all countries in region" onPress={onReset} style={styles.back}>
        <Text style={styles.backText}>All markets</Text>
      </Pressable>
      <Text style={styles.crumb}>{focused ? ` / ${country.name} / ${channelLabels[channel]}` : ' / select a country'}</Text>
    </View>
    <Pressable testID="rating-sunburst-touch-surface" accessible={false}
      onLayout={(event) => setChartWidth(event.nativeEvent.layout.width)}
      onPressIn={(event) => {
        const scale = Math.min(chartWidth, 340) / 400;
        const x = (event.nativeEvent.locationX - chartWidth / 2) / scale + 200;
        const y = (event.nativeEvent.locationY - 170) / scale + 200;
        pressPoint.current = { x, y };
      }}
      onPress={() => {
        const point = pressPoint.current;
        if (!point) return;
        const segment = hitTestSunburst(segments, point.x, point.y);
        if (segment) onDrill(segment.countryCode, segment.channel);
      }}>
    <View pointerEvents="none">
    <Svg width="100%" height={340} viewBox="0 0 400 400" accessibilityLabel="Country and platform rating sunburst; use the country and channel buttons to explore">
      <Circle cx={200} cy={200} r={190} fill={colors.primaryTint} />
      {segments.map((segment) => {
        const inner = segment.depth === 0 ? 85 : 141;
        const outer = segment.depth === 0 ? 138 : 188;
        const highlighted = focused
          ? segment.channel === channel || (!segment.channel && segment.countryCode === country.code)
          : !segment.channel && segment.countryCode === country.code;
        return <Path
          key={segment.id}
          d={ringPath(inner, outer, segment.start + 0.6, segment.end - 0.6)}
          fill={colorFor(segment)}
          opacity={segment.depth === 1 ? 0.75 : 1}
          stroke={highlighted ? colors.navy : colors.card}
          strokeWidth={highlighted ? 3 : 1}
          accessibilityLabel={`${segment.countryCode} ${segment.label}`}
        />;
      })}
      {segments.filter((segment) => segment.end - segment.start > 17).map((segment) => {
        const point = polarPoint(segment.depth === 0 ? 111 : 164, (segment.start + segment.end) / 2);
        return <SvgText key={`label-${segment.id}`} x={point.x} y={point.y + 3} textAnchor="middle"
          fill={colorFor(segment) === colors.line ? colors.muted : colors.navy}
          fontSize={segment.depth === 0 ? 11 : 9} fontWeight="700">
          {segment.label}
        </SvgText>;
      })}
      <Circle cx={200} cy={200} r={78} fill={colors.navy} />
      <SvgText x={200} y={178} textAnchor="middle" fill={colors.accent} fontSize={10} fontWeight="700">
        {focused ? country.code : 'GLOBAL LENS'}
      </SvgText>
      <SvgText x={200} y={213} textAnchor="middle" fill={colors.onDark} fontSize={30} fontWeight="700">
        {focused ? score === null ? 'N/A' : score.toFixed(2) : String(markets.length)}
      </SvgText>
      <SvgText x={200} y={236} textAnchor="middle" fill={colors.onDarkMuted} fontSize={10}>
        {focused ? `${channelLabels[channel]} / 5` : 'monitored countries'}
      </SvgText>
    </Svg>
    </View>
    </Pressable>
    <Text style={styles.hint}>Tap a country, then a channel. Equal-size sectors show navigation, not market share.</Text>
    <View style={styles.legend}>
      <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.greenLight }]} /><Text style={styles.legendText}>4.0+ strong</Text></View>
      <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.orangeLight }]} /><Text style={styles.legendText}>3.0–3.99 fair</Text></View>
      <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.redLight }]} /><Text style={styles.legendText}>Below 3.0 weak</Text></View>
      <View style={styles.legendItem}><View style={[styles.dot, { backgroundColor: colors.line }]} /><Text style={styles.legendText}>No source</Text></View>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  container: { flex: 1, minWidth: 240 },
  breadcrumb: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', minHeight: 44 },
  back: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 },
  backText: { color: colors.primary, fontWeight: '700', fontSize: 12 },
  crumb: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  hint: { color: colors.muted, fontSize: 11, lineHeight: 17, textAlign: 'center', paddingHorizontal: 12 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center', marginTop: 16 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, color: colors.text }, dot: { width: 8, height: 8, borderRadius: 4 },
});
