import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { BrandSummary, Takeaway } from '../data/brandSummary';
import { fetchStoreChartRanks } from '../data/liveData';
import type { StoreChartRank, StoreChartRanks } from '../data/liveData';

type Props = {
  brand: string;
  countryCode: string;
  countryName: string;
  section: string;
  brandRating: number | null;
  ratingBasis: string;
  summary: BrandSummary;
  loading: boolean;
};

const chartRankText = (store: StoreChartRank) => store.rank !== null ? `#${store.rank}` : store.chartSize > 0 ? `>${store.chartSize}` : 'N/A';
const toneColors: Record<Takeaway['tone'], { bg: string; fg: string; dot: string }> = {
  good: { bg: '#052E1A', fg: '#A7F3D0', dot: '#34D399' },
  watch: { bg: '#3A2A05', fg: '#FDE68A', dot: '#FBBF24' },
  risk: { bg: '#3B0D0D', fg: '#FECACA', dot: '#F87171' },
};

function useStoreChartRanks(brand: string, countryCode: string) {
  const [state, setState] = useState<{ key: string; ranks: StoreChartRanks | null } | null>(null);
  const key = `${brand}:${countryCode}`;
  useEffect(() => {
    let active = true;
    fetchStoreChartRanks(countryCode, brand)
      .then((ranks) => { if (active) setState({ key, ranks }); })
      .catch(() => { if (active) setState({ key, ranks: null }); });
    return () => { active = false; };
  }, [brand, countryCode, key]);
  return state?.key === key ? state : null;
}

export function BrandHeadline({ brand, countryCode, countryName, section, brandRating, ratingBasis, summary, loading }: Props) {
  const chart = useStoreChartRanks(brand, countryCode);
  const ranks = chart?.ranks;
  const category = ranks?.apple.category ?? ranks?.google.category ?? null;
  const { sentiment, competitorRank, competitorCount, leader, gapToLeader } = summary;
  const tiles = [
    { value: brandRating !== null ? brandRating.toFixed(1) : '—', unit: '/5', label: 'Brand rating', note: ratingBasis },
    { value: competitorRank !== null ? `#${competitorRank}` : '—', unit: competitorRank !== null ? `of ${competitorCount}` : '', label: 'Vs competitors',
      note: gapToLeader === null || !leader ? 'Peer ratings loading' : competitorRank === 1 ? `+${gapToLeader.toFixed(1)} ahead of ${leader.name}` : `${gapToLeader.toFixed(1)} vs ${leader.name}` },
    { value: !chart ? '…' : ranks ? `${chartRankText(ranks.apple)} · ${chartRankText(ranks.google)}` : 'N/A', unit: '', label: 'Store chart rank',
      note: `${category ? `${category} · ` : ''}top free · iOS · Android` },
    { value: sentiment.positiveShare !== null ? `${sentiment.positiveShare}%` : '—', unit: 'positive', label: 'Customer sentiment',
      note: sentiment.net !== null ? `Net ${sentiment.net > 0 ? '+' : ''}${sentiment.net} · ${sentiment.total} reviews` : loading ? 'Collecting reviews' : 'No reviews yet' },
  ];
  const bar = sentiment.total ? [
    { share: sentiment.positive / sentiment.total, color: '#34D399' },
    { share: sentiment.neutral / sentiment.total, color: '#94A3B8' },
    { share: sentiment.negative / sentiment.total, color: '#F87171' },
  ] : [];

  return <View style={styles.hero} testID="brand-headline">
    <View style={styles.titleRow}>
      <View style={styles.mark}><Text style={styles.markText}>{brand === 'Western Union' ? 'WU' : brand.slice(0, 2).toUpperCase()}</Text></View>
      <View style={styles.titleCopy}>
        <Text style={styles.eyebrow}>{section.toUpperCase()} · {countryName.toUpperCase()}</Text>
        <Text style={styles.title}>{brand}</Text>
      </View>
    </View>
    <View style={styles.tiles}>{tiles.map((tile) => <View key={tile.label} style={styles.tile} accessibilityLabel={`${tile.label} ${tile.value} ${tile.unit}`}>
      <Text style={styles.tileLabel}>{tile.label}</Text>
      <Text style={styles.tileValue}>{tile.value}<Text style={styles.tileUnit}> {tile.unit}</Text></Text>
      <Text style={styles.tileNote} numberOfLines={2}>{tile.note}</Text>
    </View>)}</View>
    {bar.length > 0 && <View style={styles.bar} accessibilityLabel={`Sentiment split ${sentiment.positive} positive, ${sentiment.neutral} neutral, ${sentiment.negative} negative`}>
      {bar.map((item) => <View key={item.color} style={{ flex: item.share, backgroundColor: item.color }} />)}
    </View>}
    {summary.takeaways.length > 0 && <View style={styles.takeaways} testID="key-takeaways">
      <Text style={styles.takeawayTitle}>KEY TAKEAWAYS</Text>
      <View style={styles.takeawayList}>{summary.takeaways.map((item) => <View key={item.text} style={[styles.takeaway, { backgroundColor: toneColors[item.tone].bg }]}>
        <View style={[styles.dot, { backgroundColor: toneColors[item.tone].dot }]} />
        <Text style={[styles.takeawayText, { color: toneColors[item.tone].fg }]}>{item.text}</Text>
      </View>)}</View>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  hero: { backgroundColor: '#0F172A', borderRadius: 20, padding: 20, gap: 16, marginTop: 12, marginBottom: 16 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mark: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  markText: { color: '#0F172A', fontSize: 19, fontWeight: '900' },
  titleCopy: { flex: 1 },
  eyebrow: { color: '#FACC15', fontSize: 9, letterSpacing: 1.6, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 24, fontWeight: '900', marginTop: 3 },
  tiles: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: { flex: 1, minWidth: 140, borderLeftWidth: 2, borderLeftColor: '#334155', paddingLeft: 12 },
  tileLabel: { color: '#94A3B8', fontSize: 10, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase' },
  tileValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800', marginTop: 4 },
  tileUnit: { color: '#94A3B8', fontSize: 12, fontWeight: '600' },
  tileNote: { color: '#CBD5E1', fontSize: 10, lineHeight: 15, marginTop: 2 },
  bar: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: '#1E293B' },
  takeaways: { gap: 8 },
  takeawayTitle: { color: '#94A3B8', fontSize: 9, fontWeight: '800', letterSpacing: 1.4 },
  takeawayList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  takeaway: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, flexGrow: 1, flexBasis: 220 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  takeawayText: { fontSize: 12, fontWeight: '600', lineHeight: 17, flexShrink: 1 },
});
