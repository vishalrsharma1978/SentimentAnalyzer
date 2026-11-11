import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { RatingSunburst } from './RatingSunburst';
import { channelColors, channelLabels, channelRating, channelScore, rankMarkets, storeRatingBasis } from '../data/marketAnalytics';
import type { Channel, Market, MarketRatings } from '../data/marketAnalytics';

type Props = {
  brand: string;
  markets: Market[];
  ratings: MarketRatings;
  errors: Record<string, string>;
  loading: boolean;
  region: string;
  country: Market;
  onRegion: (region: string) => void;
  onCountry: (market: Market) => void;
  onRetry: () => void;
};
const modes = ['Sunburst', 'Heatmap', 'Ranked bars'] as const;
const channels: Channel[] = ['brand', 'web', 'mobile', 'ios', 'android'];
const scoreText = (score: number | null) => score === null ? 'N/A' : score.toFixed(2);

export function GlobalRatingsExplorer({ brand, markets, ratings, errors, loading, region, country, onRegion, onCountry, onRetry }: Props) {
  const [mode, setMode] = useState<(typeof modes)[number]>('Sunburst');
  const [focused, setFocused] = useState(false);
  const [channel, setChannel] = useState<Channel>('mobile');
  const regions = ['Global', ...new Set(markets.map((market) => market.region))];
  const visible = markets.filter((market) => region === 'Global' || market.region === region);
  const ranked = rankMarkets(markets, ratings, region, channel);
  const globalRanked = rankMarkets(markets, ratings, 'Global', channel);
  const selectedRank = ranked.find((market) => market.code === country.code)?.rank;
  const covered = globalRanked.length;
  const selectCountry = (market: Market, nextChannel: Channel = 'mobile') => {
    setFocused(true);
    setChannel(nextChannel);
    onCountry(market);
  };
  const drill = (code: string, nextChannel: Channel | null) => {
    const market = visible.find((item) => item.code === code);
    if (market) selectCountry(market, nextChannel ?? 'mobile');
  };
  const selectedScore = channelRating(ratings[country.code], channel);
  const selectedData = ratings[country.code];
  const selectedDetail = channelScore(selectedData, channel);
  const sourceCount = (['brand', 'web', 'ios', 'android'] as Channel[]).filter((item) => channelRating(selectedData, item) !== null).length;
  const leader = ranked[0];
  const channelName = channelLabels[channel].toLowerCase();

  const rankingChart = () => <View style={styles.ranking}>
    <Text style={styles.panelTitle}>{region === 'Global' ? 'Global' : region} {channelName} rating ladder</Text>
    <Text style={styles.caption}>{brand}&apos;s {channelName} rating across monitored countries, not competitor or download rank.</Text>
    {ranked.length === 0 && <Text style={styles.empty}>{loading ? `Collecting ${channelName} ratings...` : `No ${channelName} ratings available in this region.`}</Text>}
    {ranked.map((market) => <Pressable key={market.code} accessibilityRole="button"
      accessibilityLabel={`Explore ${market.name}, rank ${market.rank}, rating ${market.score.toFixed(2)}`}
      onPress={() => selectCountry(market, channel)} style={[styles.rankRow, country.code === market.code && styles.selectedRow]}>
      <Text style={styles.rank}>#{market.rank}</Text>
      <View style={styles.rankCopy}><View style={styles.rankLabel}><Text style={styles.countryName}>{market.name}</Text><Text style={styles.score}>{market.score.toFixed(2)}</Text></View>
        {(channel === 'brand' || channel === 'mobile') && <Text style={styles.caption}>{storeRatingBasis(ratings[market.code])}</Text>}
        <View style={styles.track}><View style={[styles.bar, { width: `${market.score * 20}%`, backgroundColor: country.code === market.code ? '#EAB308' : '#6366F1' }]} /></View>
      </View>
    </Pressable>)}
  </View>;

  const heatmap = () => <View style={styles.heatmap}>
    <Text style={styles.panelTitle}>Country × experience heatmap</Text>
    <Text style={styles.caption}>Color intensity represents rating (1–5). Brand = provisional store-based rating; Website = live country-site checks; iOS/Android = store ratings.</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator>
      <View style={styles.matrix}>
        <View style={styles.matrixRow}><Text style={styles.matrixName}>Country</Text>{channels.map((item) => <Text key={item} style={styles.columnHeading}>{channelLabels[item]}</Text>)}</View>
        {visible.map((market) => <View key={market.code} style={styles.matrixRow}>
          <Pressable accessibilityRole="button" onPress={() => selectCountry(market)} style={styles.matrixName}><Text style={styles.countryName}>{market.name}</Text></Pressable>
          {channels.map((item) => {
            const value = channelRating(ratings[market.code], item);
            return <Pressable key={item} accessibilityRole="button" accessibilityLabel={`${market.name} ${channelLabels[item]} ${value === null ? 'unavailable' : value.toFixed(2)}`}
              onPress={() => selectCountry(market, item)}
              style={[styles.heatCell, { backgroundColor: value === null ? '#F1F5F9' : value >= 4 ? '#D1FAE5' : value >= 3 ? '#FEF3C7' : '#FEE2E2' }]}>
              <Text style={styles.heatValue}>{scoreText(value)}</Text>
            </Pressable>;
          })}
        </View>)}
      </View>
    </ScrollView>
  </View>;

  return <View style={styles.shell} testID="global-ratings-explorer">
    <View style={styles.hero}>
      <View style={styles.heroTitle}><View style={styles.brandMark}><Text style={styles.brandMarkText}>{brand === 'Western Union' ? 'WU' : brand.slice(0, 2).toUpperCase()}</Text></View>
        <View style={styles.heroCopy}><Text style={styles.eyebrow}>GLOBAL EXPERIENCE INTELLIGENCE</Text><Text style={styles.title}>{brand}</Text><Text style={styles.heroSub}>Country ratings. Channel clarity. One global lens.</Text></View>
      </View>
      <View style={styles.summary}>
        {[
          [String(covered), `of ${markets.length} markets with ${channelName} data`],
          [selectedRank ? `#${selectedRank}` : 'N/A', `${country.code} ${channelName} rank in ${region === 'Global' ? 'monitored markets' : region}`],
          [leader ? leader.code : 'N/A', `highest-rated ${channelName}`],
          [String(sourceCount), `of 4 channels rated in ${country.code}`],
        ].map(([value, label]) => <View key={label} style={styles.stat}><Text style={styles.statValue}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>)}
      </View>
    </View>

    <View style={styles.body}>
      <Text style={styles.fieldLabel}>REGION</Text>
      <View style={styles.chips}>{regions.map((item) => <Pressable key={item} accessibilityRole="button"
        accessibilityLabel={`Region ${item}`} accessibilityState={{ selected: region === item }}
        onPress={() => { setFocused(false); setChannel('mobile'); onRegion(item); }}
        style={[styles.chip, region === item && styles.activeChip]}><Text style={[styles.chipText, region === item && styles.activeChipText]}>{item}</Text></Pressable>)}</View>
      <Text style={styles.fieldLabel}>COUNTRY · SELECT TO DRILL DOWN</Text>
      <View style={styles.chips}>{visible.map((market) => <Pressable key={market.code} accessibilityRole="button"
        accessibilityLabel={`Country ${market.name}`} accessibilityState={{ selected: market.code === country.code }}
        onPress={() => selectCountry(market)} style={[styles.chip, market.code === country.code && styles.activeCountry]}>
        <Text style={styles.chipText}>{market.code} · {market.name}</Text>
      </Pressable>)}</View>
      <View style={styles.toolbar}><View style={styles.chips}>{modes.map((item) => <Pressable key={item} accessibilityRole="button"
        accessibilityLabel={`Chart ${item}`} accessibilityState={{ selected: mode === item }}
        onPress={() => setMode(item)} style={[styles.chip, mode === item && styles.activeChip]}><Text style={[styles.chipText, mode === item && styles.activeChipText]}>{item}</Text></Pressable>)}</View>
        <Pressable accessibilityRole="button" accessibilityLabel="Refresh country ratings" onPress={onRetry} style={styles.chip}><Text style={styles.chipText}>{loading ? 'Refreshing...' : 'Refresh ratings'}</Text></Pressable>
      </View>
      <Text style={styles.method}>Rank scope: {region} · {ranked.length} rated / {visible.length} monitored countries · ranked by {channelLabels[channel]} rating{channel === 'mobile' || channel === 'brand' ? ' (equal mean of available iOS + Android)' : ''}; ties share rank. Not an official global ranking.</Text>
      {Object.keys(errors).length > 0 && <Text accessibilityRole="alert" style={styles.error}>Some countries could not be loaded: {Object.keys(errors).join(', ')}. {Object.values(errors)[0]} Refresh to retry.</Text>}
      {visible.length === 0 ? <Text style={styles.empty}>No monitored countries in this region.</Text>
        : mode === 'Heatmap' ? heatmap()
        : mode === 'Ranked bars' ? rankingChart()
        : <View style={styles.chartGrid}>
          <RatingSunburst markets={visible} ratings={ratings} country={country} focused={focused} channel={channel} onDrill={drill} onReset={() => { setFocused(false); setChannel('mobile'); }} />
          {rankingChart()}
        </View>}

      <View style={styles.detailHeader}><View><Text style={styles.panelTitle}>{country.name} / {channelLabels[channel]}</Text>
        <Text style={styles.caption}>Tap an experience card to focus the sunburst and inspect its source.</Text></View><Text style={styles.detailScore}>{scoreText(selectedScore)}<Text style={styles.outOf}> / 5</Text></Text></View>
      <View style={styles.channelGrid}>{channels.map((item) => {
        const score = channelRating(selectedData, item);
        const store = item === 'ios' ? selectedData?.apple : item === 'android' ? selectedData?.google : null;
        const scoreDetail = channelScore(selectedData, item);
        const detail = item === 'brand' || item === 'mobile' ? storeRatingBasis(selectedData)
          : item === 'web' ? (score === null ? (scoreDetail?.basis || 'Probing website...') : 'Live site checks')
          : score === null ? 'Rating unavailable' : store ? `${store.reviewCount.toLocaleString()} store ratings` : 'Mean of available stores';
        return <Pressable key={item} accessibilityRole="button" accessibilityLabel={`Focus ${channelLabels[item]}`}
          accessibilityState={{ selected: channel === item && focused }} onPress={() => { setFocused(true); setChannel(item); }}
          style={[styles.channelCard, channel === item && focused && styles.channelSelected]}>
          <View style={[styles.channelAccent, { backgroundColor: channelColors[item] }]} />
          <Text style={styles.channelLabel}>{channelLabels[item]}</Text><Text style={styles.channelValue}>{scoreText(score)}</Text><Text style={styles.caption}>{detail}</Text>
        </Pressable>;
      })}</View>
      {selectedDetail && <View style={styles.breakdown} testID="channel-breakdown">
        <Text style={styles.panelTitle}>{channelLabels[channel]} breakdown · {country.name}</Text>
        <Text style={styles.caption}>{selectedDetail.basis}</Text>
        {selectedDetail.components.map((component) => <View key={component.label} style={styles.componentRow}
          accessibilityLabel={`${component.label} ${Math.round(component.score * 100)} percent`}>
          <Text style={styles.componentLabel}>{component.label}</Text>
          <View style={[styles.track, styles.componentTrack]}><View style={[styles.bar, { width: `${component.score * 100}%`, backgroundColor: channelColors[channel] }]} /></View>
          <Text style={styles.componentValue}>{Math.round(component.score * 100)}%</Text>
        </View>)}
      </View>}
      <Text style={styles.method}>Brand is a provisional proxy based only on app ratings: the equal average of Apple App Store and Google Play, or the available store alone when the other is unavailable. It is not a comprehensive brand sentiment score. Google Play aggregates may be shared across storefronts. Website is a live check of {brand}&apos;s localized country site: availability, response time, page weight, security headers and mobile/SEO markup, scaled to 1–5. Country refers to storefront or localized site, not verified customer residence.</Text>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  shell: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 20, backgroundColor: '#FFFFFF', overflow: 'hidden', marginBottom: 20, marginTop: 12 },
  hero: { backgroundColor: '#0F172A', padding: 22, gap: 24 },
  heroTitle: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  brandMark: { width: 58, height: 58, borderRadius: 16, backgroundColor: '#FACC15', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#0F172A', fontSize: 23, fontWeight: '900' }, heroCopy: { flex: 1 },
  eyebrow: { color: '#FACC15', fontSize: 9, letterSpacing: 1.8, fontWeight: '800' },
  title: { color: '#FFFFFF', fontSize: 27, fontWeight: '900', marginVertical: 5 },
  heroSub: { color: '#CBD5E1', fontSize: 12, lineHeight: 18 },
  summary: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  stat: { flex: 1, minWidth: 115, borderLeftWidth: 2, borderLeftColor: '#334155', paddingLeft: 12 },
  statValue: { color: '#FFFFFF', fontSize: 26, fontWeight: '800' }, statLabel: { color: '#94A3B8', fontSize: 10, lineHeight: 16 },
  body: { padding: 16 }, fieldLabel: { fontSize: 10, color: '#64748B', letterSpacing: 1, fontWeight: '800', marginBottom: 10 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 },
  chip: { paddingHorizontal: 12, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: '#E2E8F0', justifyContent: 'center', backgroundColor: '#F8FAFC' },
  chipText: { color: '#475569', fontSize: 12, fontWeight: '600' },
  activeChip: { backgroundColor: '#0F172A', borderColor: '#0F172A' }, activeChipText: { color: '#FFFFFF' },
  activeCountry: { backgroundColor: '#FEF9C3', borderColor: '#EAB308' },
  toolbar: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start', marginTop: 4 },
  method: { fontSize: 11, lineHeight: 18, color: '#64748B', marginVertical: 12 },
  error: { fontSize: 12, lineHeight: 18, color: '#B42318', backgroundColor: '#FEF3F2', padding: 12, borderRadius: 10 },
  empty: { fontSize: 13, lineHeight: 20, color: '#64748B', paddingVertical: 28 },
  chartGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 10, alignItems: 'flex-start' },
  ranking: { flex: 1, minWidth: 240, paddingVertical: 14 },
  panelTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' },
  caption: { color: '#64748B', fontSize: 11, lineHeight: 17, marginTop: 5 },
  rankRow: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, marginTop: 8, minHeight: 52 },
  selectedRow: { backgroundColor: '#FFFBEB' }, rank: { width: 25, fontSize: 14, color: '#64748B', fontWeight: '700' },
  rankCopy: { flex: 1 }, rankLabel: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  countryName: { fontSize: 12, fontWeight: '600', color: '#334155', flexShrink: 1 },
  score: { fontSize: 12, fontWeight: '800', color: '#0F172A' },
  track: { height: 8, backgroundColor: '#F1F5F9', borderRadius: 4, marginTop: 8, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 }, heatmap: { paddingVertical: 14 },
  matrix: { minWidth: 635, marginTop: 16 }, matrixRow: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 50, borderBottomWidth: 1, borderBottomColor: '#F1F5F9' },
  matrixName: { width: 155, minHeight: 44, justifyContent: 'center', color: '#64748B', fontSize: 11, paddingTop: 6 },
  columnHeading: { width: 88, textAlign: 'center', fontSize: 11, color: '#64748B' },
  heatCell: { width: 88, minHeight: 44, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  heatValue: { fontSize: 12, fontWeight: '700', color: '#334155' },
  detailHeader: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', borderTopWidth: 1, borderTopColor: '#E2E8F0', paddingTop: 20, marginTop: 20, gap: 10 },
  detailScore: { fontSize: 28, fontWeight: '800', color: '#0F172A' }, outOf: { fontSize: 13, color: '#64748B' },
  channelGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  channelCard: { flex: 1, minWidth: 125, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: '#E2E8F0', backgroundColor: '#F8FAFC' },
  channelSelected: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  channelAccent: { height: 4, width: 28, borderRadius: 2, marginBottom: 12 },
  channelLabel: { fontSize: 12, fontWeight: '700', color: '#475569' }, channelValue: { fontSize: 25, fontWeight: '800', color: '#0F172A', marginTop: 8 },
  breakdown: { marginTop: 18, padding: 16, borderRadius: 14, backgroundColor: '#F8FAFC', borderWidth: 1, borderColor: '#E2E8F0' },
  componentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 },
  componentLabel: { width: 170, fontSize: 12, color: '#334155', fontWeight: '600' },
  componentTrack: { flex: 1, marginTop: 0 },
  componentValue: { width: 44, textAlign: 'right', fontSize: 12, fontWeight: '800', color: '#0F172A' },
});
