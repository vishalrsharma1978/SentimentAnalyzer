import { Ionicons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { SafeView } from './SafeView';

export type MindMapWord = {
  word: string;
  count: number;
  sentiment: 'positive' | 'negative';
};

type SentimentMindMapProps = {
  country: string;
  total: number;
  positive: number;
  neutral: number;
  negative: number;
  words: MindMapWord[];
  onThemeSelect: (sentiment: 'positive' | 'negative', word: string) => void;
};

const NODE_ROW_HEIGHT = 39;

export function SentimentMindMap({
  country,
  total,
  positive,
  neutral,
  negative,
  words,
  onThemeSelect,
}: SentimentMindMapProps) {
  const [pulse] = useState(() => new Animated.Value(0));
  const [stageWidth, setStageWidth] = useState(0);
  const positiveWords = words.filter((item) => item.sentiment === 'positive').slice(0, 7);
  const negativeWords = words.filter((item) => item.sentiment === 'negative').slice(0, 5);
  const maxNodes = Math.max(positiveWords.length, negativeWords.length, 1);
  const compact = stageWidth > 0 && stageWidth < 720;
  const stageHeight = compact
    ? 278 + maxNodes * NODE_ROW_HEIGHT
    : Math.max(360, 150 + maxNodes * NODE_ROW_HEIGHT);
  const centerX = (stageWidth || 900) / 2;
  const centerY = compact ? 130 : stageHeight / 2;
  const hubSize = compact ? 134 : 174;
  const ringRadius = compact ? 55 : 72;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const positivePercent = total > 0 ? Math.round((positive / total) * 100) : 0;
  const neutralPercent = total > 0 ? Math.round((neutral / total) * 100) : 0;
  const negativePercent = total > 0 ? Math.round((negative / total) * 100) : 0;
  const positiveArc = total > 0 ? (positive / total) * ringCircumference : 0;
  const neutralArc = total > 0 ? (neutral / total) * ringCircumference : 0;
  const negativeArc = total > 0 ? (negative / total) * ringCircumference : 0;
  const topicCount = positiveWords.length + negativeWords.length;
  const topicsTop = compact
    ? 238
    : Math.max(26, centerY - ((maxNodes - 1) * NODE_ROW_HEIGHT) / 2 - 18);
  const leftNodeX = compact ? stageWidth * 0.47 + 10 : Math.min(196, centerX * 0.32);
  const rightNodeX = compact ? stageWidth * 0.53 - 10 : stageWidth - leftNodeX;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 3600,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [pulse]);

  const hubScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.035],
  });
  const connectionOpacity = pulse.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.48, 0.9, 0.48],
  });

  const topicY = (index: number) => topicsTop + 35 + index * NODE_ROW_HEIGHT;
  const topicAnimation = (index: number) => {
    const phase = topicCount > 1 ? 0.08 + (index / (topicCount - 1)) * 0.84 : 0.5;
    return {
      opacity: pulse.interpolate({
        inputRange: [0, Math.max(0.01, phase - 0.1), phase, Math.min(0.99, phase + 0.1), 1],
        outputRange: [0.72, 0.72, 1, 0.72, 0.72],
      }),
      scale: pulse.interpolate({
        inputRange: [0, Math.max(0.01, phase - 0.1), phase, Math.min(0.99, phase + 0.1), 1],
        outputRange: [0.98, 0.98, 1.035, 0.98, 0.98],
      }),
    };
  };

  const renderTopic = (
    item: MindMapWord,
    sentiment: 'positive' | 'negative',
    index: number,
  ) => {
    const positiveTopic = sentiment === 'positive';
    const animation = topicAnimation(index);
    return (
      <Animated.View
        key={`${sentiment}-${item.word}`}
        style={[
          styles.topicMotion,
          { opacity: animation.opacity, transform: [{ scale: animation.scale }] },
        ]}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${item.word} ${positiveTopic ? 'positive' : 'negative'} reviews`}
          onPress={() => onThemeSelect(sentiment, item.word)}
          style={[
            styles.topicCloud,
            positiveTopic ? styles.positiveCloud : styles.negativeCloud,
          ]}
        >
          <View
            style={[
              styles.cloudSatellite,
              styles.satelliteTop,
              positiveTopic ? styles.positiveSatellite : styles.negativeSatellite,
            ]}
          />
          <View
            style={[
              styles.cloudSatellite,
              styles.satelliteBottom,
              positiveTopic ? styles.positiveSatellite : styles.negativeSatellite,
            ]}
          />
          <View
            style={[
              styles.topicDot,
              positiveTopic ? styles.positiveDot : styles.negativeDot,
            ]}
          />
          <Text
            numberOfLines={1}
            style={[
              styles.topicWord,
              positiveTopic ? styles.positiveText : styles.negativeText,
            ]}
          >
            {item.word}
          </Text>
          <Text style={styles.topicCount}>{item.count}</Text>
        </Pressable>
      </Animated.View>
    );
  };

  return (
    <SafeView style={styles.card}>
      <SafeView style={styles.header}>
        <SafeView style={styles.headerCopy}>
          <SafeView style={styles.kickerRow}>
            <View style={styles.kickerMark} />
            <Text style={styles.kicker}>CUSTOMER VOICE MAP</Text>
          </SafeView>
          <Text style={styles.title}>{country} sentiment atmosphere</Text>
        </SafeView>
        <SafeView style={styles.headerMeta}>
          <SafeView style={styles.marketBadge}>
            <Ionicons name="location" size={11} color="#3B7EC2" />
            <Text style={styles.marketBadgeText}>
              {country === 'United States' ? 'US MARKET' : `${country.toUpperCase()} MARKET`}
            </Text>
          </SafeView>
          <Text style={styles.voiceCount}>{total}</Text>
          <Text style={styles.voiceLabel}>LIVE VOICES</Text>
        </SafeView>
      </SafeView>

      <SafeView
        onLayout={(event) => {
          const nextWidth = Math.round(event.nativeEvent.layout.width);
          if (nextWidth !== stageWidth) setStageWidth(nextWidth);
        }}
        style={[styles.stage, { height: stageHeight }]}
      >
        {compact && (
          <View style={styles.compactLegend}>
            <SentimentPercent label="POS" value={positivePercent} tone="positive" />
            <SentimentPercent label="NEU" value={neutralPercent} tone="neutral" />
            <SentimentPercent label="NEG" value={negativePercent} tone="negative" />
          </View>
        )}

        <Animated.View
          pointerEvents="none"
          style={[styles.connectionLayer, { opacity: connectionOpacity }]}
        >
          <Svg
            width="100%"
            height="100%"
            viewBox={`0 0 ${stageWidth || 900} ${stageHeight}`}
            preserveAspectRatio="none"
          >
            <Defs>
              <LinearGradient id="mindMapFlow" x1="0" y1="0" x2="1" y2="0">
                <Stop offset="0" stopColor="#12B76A" stopOpacity="0.9" />
                <Stop offset="0.5" stopColor="#9499A8" stopOpacity="0.45" />
                <Stop offset="1" stopColor="#F04438" stopOpacity="0.9" />
              </LinearGradient>
            </Defs>
            {positiveWords.map((item, index) => {
              const y = topicY(index);
              return (
                <Path
                  key={`positive-branch-${item.word}`}
                  d={compact
                    ? `M ${centerX - 40} ${centerY + 52} C ${centerX - 76} ${centerY + 84}, ${leftNodeX + 40} ${y}, ${leftNodeX} ${y}`
                    : `M ${centerX - 78} ${centerY} C ${centerX - 130} ${centerY}, ${leftNodeX + 44} ${y}, ${leftNodeX} ${y}`}
                  fill="none"
                  stroke="#12B76A"
                  strokeWidth="1.25"
                  strokeDasharray="4 7"
                />
              );
            })}
            {negativeWords.map((item, index) => {
              const y = topicY(index);
              return (
                <Path
                  key={`negative-branch-${item.word}`}
                  d={compact
                    ? `M ${centerX + 40} ${centerY + 52} C ${centerX + 76} ${centerY + 84}, ${rightNodeX - 40} ${y}, ${rightNodeX} ${y}`
                    : `M ${centerX + 78} ${centerY} C ${centerX + 130} ${centerY}, ${rightNodeX - 44} ${y}, ${rightNodeX} ${y}`}
                  fill="none"
                  stroke="#F04438"
                  strokeWidth="1.25"
                  strokeDasharray="4 7"
                />
              );
            })}
            {compact ? (
              <>
                <Path
                  d={`M ${centerX} ${centerY + 58} C ${centerX - 26} ${centerY + 82}, ${centerX - 28} ${centerY + 96}, ${centerX - 42} ${centerY + 112}`}
                  fill="none"
                  stroke="#12B76A"
                  strokeWidth="2"
                />
                <Path
                  d={`M ${centerX} ${centerY + 58} C ${centerX + 26} ${centerY + 82}, ${centerX + 28} ${centerY + 96}, ${centerX + 42} ${centerY + 112}`}
                  fill="none"
                  stroke="#F04438"
                  strokeWidth="2"
                />
              </>
            ) : (
              <Path
                d={`M ${centerX - 86} ${centerY} C ${centerX - 42} ${centerY - 55}, ${centerX + 42} ${centerY - 55}, ${centerX + 86} ${centerY}`}
                fill="none"
                stroke="url(#mindMapFlow)"
                strokeWidth="2"
              />
            )}
            <Circle cx={centerX} cy={centerY} r={hubSize / 2 + 20} fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.05" />
          </Svg>
        </Animated.View>

        <Animated.View
          style={[
            styles.hub,
            {
              width: hubSize,
              height: hubSize,
              left: centerX - hubSize / 2,
              top: centerY - hubSize / 2,
              transform: [{ scale: hubScale }],
            },
          ]}
        >
          <Svg
            width={hubSize}
            height={hubSize}
            style={styles.hubRing}
            viewBox={`0 0 ${hubSize} ${hubSize}`}
          >
            <Circle
              cx={hubSize / 2}
              cy={hubSize / 2}
              r={ringRadius}
              fill="none"
              stroke="#E2E4E9"
              strokeWidth="5"
            />
            <SentimentArc
              center={hubSize / 2}
              radius={ringRadius}
              circumference={ringCircumference}
              length={positiveArc}
              offset={0}
              color="#12B76A"
            />
            <SentimentArc
              center={hubSize / 2}
              radius={ringRadius}
              circumference={ringCircumference}
              length={neutralArc}
              offset={positiveArc}
              color="#F79009"
            />
            <SentimentArc
              center={hubSize / 2}
              radius={ringRadius}
              circumference={ringCircumference}
              length={negativeArc}
              offset={positiveArc + neutralArc}
              color="#F04438"
            />
          </Svg>
          <View style={[styles.hubHalo, compact && styles.hubHaloCompact]}>
            <View style={[styles.hubCore, compact && styles.hubCoreCompact]}>
              <Ionicons name="bulb" size={compact ? 17 : 20} color="#F79009" />
              <Text style={[styles.hubValue, compact && styles.hubValueCompact]}>
                {positivePercent}%
              </Text>
              <Text style={styles.hubLabel}>POSITIVE</Text>
            </View>
          </View>
        </Animated.View>

        {!compact && (
          <>
            <View
              style={[
                styles.desktopStat,
                styles.neutralStat,
                { top: centerY - hubSize / 2 - 38 },
              ]}
            >
              <SentimentPercent label="NEUTRAL" value={neutralPercent} tone="neutral" />
            </View>
            <View
              style={[
                styles.desktopStat,
                styles.negativeStat,
                { top: centerY + hubSize / 2 + 10 },
              ]}
            >
              <SentimentPercent label="NEGATIVE" value={negativePercent} tone="negative" />
            </View>
          </>
        )}

        <View
          style={[
            styles.topicGroup,
            styles.positiveGroup,
            compact && styles.topicGroupCompact,
            compact && { top: topicsTop, left: 10, width: '47%' },
            !compact && { top: topicsTop, left: 24, width: 172 },
          ]}
        >
          <Text style={[styles.groupLabel, styles.positiveText]}>PRAISE</Text>
          {positiveWords.map((item, index) => renderTopic(item, 'positive', index))}
        </View>

        <View
          style={[
            styles.topicGroup,
            styles.negativeGroup,
            compact && styles.topicGroupCompact,
            compact && { top: topicsTop, right: 10, width: '47%' },
            !compact && { top: topicsTop, right: 24, width: 172 },
          ]}
        >
          <Text style={[styles.groupLabel, styles.negativeText]}>FRICTION</Text>
          {negativeWords.map((item, index) =>
            renderTopic(item, 'negative', positiveWords.length + index),
          )}
        </View>
      </SafeView>

      <SafeView style={styles.metricRail}>
        <SentimentMetric label="POSITIVE" value={positive} tone="positive" />
        <SentimentMetric label="NEUTRAL" value={neutral} tone="neutral" />
        <SentimentMetric label="NEGATIVE" value={negative} tone="negative" />
      </SafeView>
    </SafeView>
  );
}

function SentimentArc({
  center,
  radius,
  circumference,
  length,
  offset,
  color,
}: {
  center: number;
  radius: number;
  circumference: number;
  length: number;
  offset: number;
  color: string;
}) {
  if (length <= 0) return null;
  return (
    <Circle
      cx={center}
      cy={center}
      r={radius}
      fill="none"
      stroke={color}
      strokeWidth="5"
      strokeLinecap="round"
      strokeDasharray={`${length} ${circumference - length}`}
      strokeDashoffset={-offset}
      transform={`rotate(-90 ${center} ${center})`}
    />
  );
}

function SentimentPercent({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'neutral' | 'negative';
}) {
  return (
    <View style={[styles.percentPill, styles[`${tone}PercentPill`]]}>
      <View style={[styles.percentDot, styles[`${tone}Dot`]]} />
      <Text style={[styles.percentValue, styles[`${tone}Text`]]}>{value}%</Text>
      <Text style={styles.percentLabel}>{label}</Text>
    </View>
  );
}

function SentimentMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: 'positive' | 'neutral' | 'negative';
}) {
  const icon = tone === 'positive' ? 'happy-outline' : tone === 'neutral' ? 'remove-outline' : 'sad-outline';
  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, styles[`${tone}MetricIcon`]]}>
        <Ionicons
          name={icon}
          size={16}
          color={tone === 'positive' ? '#12B76A' : tone === 'neutral' ? '#F79009' : '#F04438'}
        />
      </View>
      <View>
        <Text style={styles.metricValue}>{value}</Text>
        <Text style={[styles.metricLabel, styles[`${tone}Text`]]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    overflow: 'hidden',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#A9CDF0',
    backgroundColor: '#FFFFFF',
    shadowColor: '#1B4F8A',
    shadowOpacity: 0.08,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  header: {
    minHeight: 78,
    paddingHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#1B4F8A',
    backgroundColor: '#12325E',
  },
  headerCopy: { flex: 1, paddingRight: 12 },
  kickerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kickerMark: { width: 22, height: 2, borderRadius: 1, backgroundColor: '#509EE3' },
  kicker: { fontSize: 9, fontWeight: '900', letterSpacing: 1.7, color: '#A9CDF0' },
  title: { marginTop: 5, fontSize: 16, fontWeight: '800', color: '#FFFFFF' },
  headerMeta: { alignItems: 'flex-end' },
  marketBadge: {
    height: 20,
    paddingHorizontal: 7,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1B4F8A',
    borderWidth: 1,
    borderColor: '#509EE3',
  },
  marketBadgeText: { fontSize: 7, fontWeight: '900', letterSpacing: 0.8, color: '#A9CDF0' },
  voiceCount: { marginTop: 2, fontSize: 20, fontWeight: '900', color: '#FFFFFF' },
  voiceLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 1, color: '#A9CDF0' },
  stage: { position: 'relative', overflow: 'hidden', backgroundColor: '#F0F5FB' },
  connectionLayer: { ...StyleSheet.absoluteFill },
  hub: {
    position: 'absolute',
    zIndex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hubRing: { position: 'absolute', left: 0, top: 0 },
  hubHalo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A6F4C5',
    backgroundColor: '#ECFDF3',
  },
  hubHaloCompact: { width: 112, height: 112, borderRadius: 56 },
  hubCore: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A6F4C5',
    backgroundColor: '#FFFFFF',
    shadowColor: '#12B76A',
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 5,
  },
  hubCoreCompact: { width: 94, height: 94, borderRadius: 47 },
  hubValue: { marginTop: 3, fontSize: 25, fontWeight: '900', color: '#1A2B4A' },
  hubValueCompact: { fontSize: 21 },
  hubLabel: { marginTop: 1, fontSize: 8, fontWeight: '900', letterSpacing: 1.3, color: '#027A48' },
  compactLegend: {
    position: 'absolute',
    zIndex: 3,
    top: 12,
    left: 10,
    right: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  percentPill: {
    minHeight: 27,
    paddingHorizontal: 7,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    backgroundColor: '#FFFFFF',
  },
  positivePercentPill: { borderColor: '#A6F4C5' },
  neutralPercentPill: { borderColor: '#FEDF89' },
  negativePercentPill: { borderColor: '#FECDCA' },
  percentDot: { width: 5, height: 5, borderRadius: 3 },
  positiveDot: { backgroundColor: '#12B76A' },
  neutralDot: { backgroundColor: '#F79009' },
  negativeDot: { backgroundColor: '#F04438' },
  percentValue: { fontSize: 9, fontWeight: '900' },
  percentLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.4, color: '#9499A8' },
  positiveText: { color: '#027A48' },
  neutralText: { color: '#B54708' },
  negativeText: { color: '#B42318' },
  desktopStat: { position: 'absolute', zIndex: 3, left: '50%', marginLeft: -48 },
  neutralStat: {},
  negativeStat: {},
  topicGroup: { position: 'absolute', zIndex: 2, gap: 5 },
  topicGroupCompact: { gap: 5 },
  positiveGroup: { alignItems: 'flex-start' },
  negativeGroup: { alignItems: 'flex-end' },
  groupLabel: { marginBottom: 2, paddingHorizontal: 8, fontSize: 8, fontWeight: '900', letterSpacing: 1.5 },
  topicMotion: { width: '100%' },
  topicCloud: {
    position: 'relative',
    width: '100%',
    minHeight: 32,
    paddingHorizontal: 9,
    borderRadius: 17,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'visible',
  },
  positiveCloud: { backgroundColor: '#ECFDF3', borderColor: '#A6F4C5' },
  negativeCloud: { backgroundColor: '#FEF3F2', borderColor: '#FECDCA' },
  cloudSatellite: { position: 'absolute', zIndex: -1, width: 16, height: 16, borderRadius: 8 },
  satelliteTop: { top: -4, left: 18 },
  satelliteBottom: { bottom: -3, right: 22 },
  positiveSatellite: { backgroundColor: '#A6F4C5' },
  negativeSatellite: { backgroundColor: '#FECDCA' },
  topicDot: { width: 6, height: 6, marginRight: 6, borderRadius: 3 },
  topicWord: { flex: 1, fontSize: 10, fontWeight: '800', textTransform: 'capitalize' },
  topicCount: {
    minWidth: 21,
    height: 21,
    marginLeft: 5,
    paddingHorizontal: 4,
    borderRadius: 11,
    overflow: 'hidden',
    textAlign: 'center',
    textAlignVertical: 'center',
    backgroundColor: '#E4EBF5',
    color: '#1A2B4A',
    fontSize: 8,
    fontWeight: '900',
    lineHeight: 21,
  },
  metricRail: {
    minHeight: 70,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#D9E2F0',
    backgroundColor: '#F0F5FB',
  },
  metric: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  metricIcon: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  positiveMetricIcon: { backgroundColor: '#ECFDF3' },
  neutralMetricIcon: { backgroundColor: '#FFFAEB' },
  negativeMetricIcon: { backgroundColor: '#FEF3F2' },
  metricValue: { fontSize: 15, fontWeight: '900', color: '#1A2B4A' },
  metricLabel: { fontSize: 7, fontWeight: '900', letterSpacing: 0.7 },
});
