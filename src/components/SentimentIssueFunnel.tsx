import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { SentimentCategory, SentimentCategoryId } from '../data/sentimentCategories';
import { SafeView } from './SafeView';

type SentimentIssueFunnelProps = {
  categories: SentimentCategory[];
  selectedCategory: SentimentCategoryId | null;
  onSelect: (category: SentimentCategory) => void;
};

const categoryColors: Record<SentimentCategoryId, string> = {
  stability: '#F04438',
  performance: '#FDB022',
  fees: '#F79009',
  access: '#A78BFA',
  transfers: '#6DAAFF',
  support: '#12B76A',
  other: '#93A5C8',
};

export function SentimentIssueFunnel({
  categories,
  selectedCategory,
  onSelect,
}: SentimentIssueFunnelProps) {
  const maxCount = Math.max(...categories.map((category) => category.reviews.length), 1);
  const totalCategorizedReviews = new Set(
    categories.flatMap((category) => category.reviews),
  ).size;
  const selectedCategoryInfo = categories.find((category) => category.id === selectedCategory);

  return (
    <SafeView style={styles.card}>
      <SafeView style={styles.header}>
        <SafeView style={styles.iconFrame}>
          <Ionicons name="filter-outline" size={17} color="#2563EB" />
        </SafeView>
        <SafeView style={styles.headerCopy}>
          <Text style={styles.title}>What’s shaping sentiment?</Text>
          <Text style={styles.subtitle}>
            Select a theme to jump to matching customer comments.
          </Text>
        </SafeView>
        <Text style={styles.total}>{totalCategorizedReviews}</Text>
      </SafeView>

      <SafeView style={styles.funnel}>
        {categories.map((category, index) => {
          const tone = categoryColors[category.id];
          const selected = selectedCategory === category.id;
          const barWidth = `${Math.max(58, (category.reviews.length / maxCount) * 100)}%` as `${number}%`;
          const total = category.reviews.length;
          return (
            <Pressable
              key={category.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={`${category.label}, ${total} comments. Show matching comments.`}
              onPress={() => onSelect(category)}
              style={({ pressed }) => [
                styles.categoryRow,
                { width: barWidth },
                selected && styles.categorySelected,
                pressed && styles.categoryPressed,
              ]}
            >
              <View
                style={[
                  styles.categoryEdge,
                  { backgroundColor: tone, opacity: selected ? 1 : 0.65 },
                ]}
              />
              <View style={styles.categoryContent}>
                <View style={styles.categoryTop}>
                  <View style={styles.categoryName}>
                    <Ionicons name={category.icon} size={14} color={tone} />
                    <Text numberOfLines={1} style={styles.categoryLabel}>
                      {category.label}
                    </Text>
                  </View>
                  <Text style={styles.categoryCount}>{total}</Text>
                </View>
                <View
                  accessibilityLabel={`${category.positive} positive, ${category.neutral} neutral, ${category.negative} negative`}
                  style={styles.sentimentTrack}
                >
                  {category.positive > 0 && (
                    <View
                      style={[
                        styles.sentimentSegment,
                        styles.positiveSegment,
                        { flex: category.positive },
                      ]}
                    />
                  )}
                  {category.neutral > 0 && (
                    <View
                      style={[
                        styles.sentimentSegment,
                        styles.neutralSegment,
                        { flex: category.neutral },
                      ]}
                    />
                  )}
                  {category.negative > 0 && (
                    <View
                      style={[
                        styles.sentimentSegment,
                        styles.negativeSegment,
                        { flex: category.negative },
                      ]}
                    />
                  )}
                </View>
                <View style={styles.categoryFooter}>
                  <Text style={styles.sentimentMix}>
                    <Text style={styles.positiveText}>+{category.positive}</Text>
                    <Text>  ·  </Text>
                    <Text style={styles.neutralText}>~{category.neutral}</Text>
                    <Text>  ·  </Text>
                    <Text style={styles.negativeText}>-{category.negative}</Text>
                  </Text>
                  <Text style={styles.viewComments}>
                    {selected ? 'Showing comments' : 'View comments'}
                  </Text>
                </View>
              </View>
              {index < categories.length - 1 && <View style={styles.flowNotch} />}
            </Pressable>
          );
        })}
      </SafeView>

      {selectedCategoryInfo && (
        <SafeView accessibilityLiveRegion="polite" style={styles.selectionNotice}>
          <Ionicons name="checkmark-circle" size={15} color="#12B76A" />
          <Text style={styles.selectionText}>
            {selectedCategoryInfo.label}: {selectedCategoryInfo.reviews.length} matching comments below
          </Text>
        </SafeView>
      )}

      <SafeView style={styles.legend}>
        <LegendDot label="Positive" tone="positive" />
        <LegendDot label="Neutral" tone="neutral" />
        <LegendDot label="Negative" tone="negative" />
        <Text style={styles.multiTagNote}>Comments can match multiple themes</Text>
      </SafeView>
    </SafeView>
  );
}

function LegendDot({
  label,
  tone,
}: {
  label: string;
  tone: 'positive' | 'neutral' | 'negative';
}) {
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, styles[`${tone}LegendDot`]]} />
      <Text style={styles.legendLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#E4EAF6',
    backgroundColor: '#FFFFFF',
    shadowColor: '#2563EB',
    shadowOpacity: 0.07,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 5 },
    elevation: 2,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconFrame: {
    width: 36,
    height: 36,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF1FE',
  },
  headerCopy: { flex: 1 },
  title: { fontSize: 13, fontWeight: '900', color: '#0F2B57' },
  subtitle: { marginTop: 3, fontSize: 10, lineHeight: 15, color: '#64769B' },
  total: { fontSize: 20, fontWeight: '900', color: '#0F2B57' },
  funnel: { alignItems: 'center', gap: 7 },
  categoryRow: {
    minHeight: 72,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E4EAF6',
    backgroundColor: '#FFFFFF',
  },
  categorySelected: { borderColor: '#2563EB', backgroundColor: '#F5F9FF' },
  categoryPressed: { opacity: 0.78 },
  categoryEdge: { position: 'absolute', top: 0, bottom: 0, left: 0, width: 3 },
  categoryContent: { flex: 1, paddingHorizontal: 12, paddingVertical: 8 },
  categoryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  categoryName: { flexDirection: 'row', alignItems: 'center', gap: 7, flex: 1 },
  categoryLabel: { fontSize: 11, fontWeight: '800', color: '#0F2B57', flexShrink: 1 },
  categoryCount: { fontSize: 12, fontWeight: '900', color: '#0F2B57' },
  sentimentTrack: {
    height: 5,
    marginTop: 7,
    borderRadius: 3,
    flexDirection: 'row',
    overflow: 'hidden',
    backgroundColor: '#E9EEF8',
  },
  sentimentSegment: { height: '100%' },
  positiveSegment: { backgroundColor: '#12B76A' },
  neutralSegment: { backgroundColor: '#F79009' },
  negativeSegment: { backgroundColor: '#F04438' },
  categoryFooter: { marginTop: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sentimentMix: { fontSize: 9, fontWeight: '800', color: '#93A5C8' },
  positiveText: { color: '#027A48' },
  neutralText: { color: '#B54708' },
  negativeText: { color: '#B42318' },
  viewComments: { fontSize: 8, fontWeight: '800', color: '#93A5C8' },
  flowNotch: {
    position: 'absolute',
    zIndex: -1,
    bottom: -7,
    left: '50%',
    width: 14,
    height: 14,
    marginLeft: -7,
    transform: [{ rotate: '45deg' }],
    backgroundColor: '#FFFFFF',
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E4EAF6',
  },
  selectionNotice: {
    marginTop: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A6F4C5',
    backgroundColor: '#ECFDF3',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  selectionText: { flex: 1, fontSize: 10, fontWeight: '800', color: '#027A48' },
  legend: { marginTop: 12, flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  positiveLegendDot: { backgroundColor: '#12B76A' },
  neutralLegendDot: { backgroundColor: '#F79009' },
  negativeLegendDot: { backgroundColor: '#F04438' },
  legendLabel: { fontSize: 8, fontWeight: '700', color: '#98A2B3' },
  multiTagNote: { marginLeft: 'auto', fontSize: 8, color: '#667085' },
});
