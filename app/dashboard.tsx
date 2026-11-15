import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions } from 'react-native';
import { SafeView } from '../src/components/SafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SunburstChart, SunburstMarket } from '../src/components/SunburstChart';
import { GlobalRatingsExplorer } from '../src/components/GlobalRatingsExplorer';
import { BrandHeadline, useStoreChartRanks } from '../src/components/BrandHeadline';
import { aggregateRating, rankMarkets, storeRatingBasis } from '../src/data/marketAnalytics';
import { buildBrandSummary, rankCompetitors } from '../src/data/brandSummary';
import type { MarketRatings } from '../src/data/marketAnalytics';
import { SentimentMindMap } from '../src/components/SentimentMindMap';
import { CustomerReviewFeed } from '../src/components/CustomerReviewFeed';
import { SentimentIssueFunnel } from '../src/components/SentimentIssueFunnel';
import { AIInsightsBrief } from '../src/components/AIInsightsBrief';
import { countries } from '../src/data/demoData';
import { fetchChannelRatings, fetchCompetitorRatings, fetchCompetitorSharePrices, fetchPlatformRatings, fetchRedditMentions, fetchReviewCollector } from '../src/data/liveData';
import type { CompetitorSharePrice, CustomerSentiment, LiveCompetitor } from '../src/data/liveData';
import { formatDailyVolume, formatFeeRange, getBenchmarkCostOnAmount, getBrandCorridorFee, getBrandDailyVolume, getCorridorAverageFee, getCorridorForCountry, getFeeDelta } from '../src/data/corridorData';
import { categorizeSentimentReviews } from '../src/data/sentimentCategories';
import type { SentimentCategory, SentimentCategoryId } from '../src/data/sentimentCategories';
import { sourceConfigs } from '../src/config/sourceConfig';
import { colors, fonts } from '../src/theme';
import { HeaderPulse } from '../src/components/HeaderPulse';
import { useModelPreparation } from '../src/components/ModelPreparation';
import { RuntimeModelStatus } from '../src/components/RuntimeModelStatus';
import { AITerminal } from '../src/components/AITerminal';
import { useRuntimeModel } from '../src/hooks/useRuntimeModel';
import type { ModelConfiguration } from '../src/data/runtimeModel';
import { platformOptions, sentimentSources } from '../src/config/brandSetup';

const nav = [
  ['grid-outline', 'Overview'], ['chatbubbles-outline', 'Sentiment'], ['globe-outline', 'Markets'],
  ['people-outline', 'Competitors'], ['sparkles-outline', 'AI Insights'], ['document-text-outline', 'Reports'],
  ['notifications-outline', 'Alerts'], ['people-circle-outline', 'Team'], ['server-outline', 'Sources'], ['settings-outline', 'Settings'],
];

const COUNTRY_METADATA: Record<string, { code: string; region: string; score: number; rank: number }> = {
  'United States': { code: 'US', region: 'North America', score: 4.1, rank: 4 },
  'United Kingdom': { code: 'GB', region: 'Europe', score: 4.0, rank: 7 },
  India: { code: 'IN', region: 'Asia Pacific', score: 3.8, rank: 11 },
  Germany: { code: 'DE', region: 'Europe', score: 3.7, rank: 14 },
  Australia: { code: 'AU', region: 'Asia Pacific', score: 4.0, rank: 5 },
  Philippines: { code: 'PH', region: 'Asia Pacific', score: 4.2, rank: 2 },
  Mexico: { code: 'MX', region: 'Latin America', score: 3.9, rank: 9 },
  UAE: { code: 'AE', region: 'Middle East & Africa', score: 4.0, rank: 6 },
  France: { code: 'FR', region: 'Europe', score: 3.7, rank: 16 },
  Canada: { code: 'CA', region: 'North America', score: 4.1, rank: 8 },
  Brazil: { code: 'BR', region: 'Latin America', score: 3.9, rank: 10 },
  Japan: { code: 'JP', region: 'Asia Pacific', score: 4.0, rank: 7 },
  Singapore: { code: 'SG', region: 'Asia Pacific', score: 4.2, rank: 3 },
  Sweden: { code: 'SE', region: 'Europe', score: 4.1, rank: 5 },
  Norway: { code: 'NO', region: 'Europe', score: 4.1, rank: 5 },
  Denmark: { code: 'DK', region: 'Europe', score: 4.1, rank: 5 },
  Finland: { code: 'FI', region: 'Europe', score: 4.1, rank: 5 },
  Iceland: { code: 'IS', region: 'Europe', score: 4.0, rank: 6 },
  Argentina: { code: 'AR', region: 'Latin America', score: 3.8, rank: 12 },
  Chile: { code: 'CL', region: 'Latin America', score: 3.9, rank: 11 },
  Colombia: { code: 'CO', region: 'Latin America', score: 3.9, rank: 10 },
  Peru: { code: 'PE', region: 'Latin America', score: 3.8, rank: 13 },
  Panama: { code: 'PA', region: 'Latin America', score: 3.9, rank: 10 },
  Italy: { code: 'IT', region: 'Europe', score: 3.8, rank: 12 },
  Spain: { code: 'ES', region: 'Europe', score: 3.9, rank: 10 },
  Netherlands: { code: 'NL', region: 'Europe', score: 4.0, rank: 7 },
  'South Africa': { code: 'ZA', region: 'Middle East & Africa', score: 3.8, rank: 12 },
  Egypt: { code: 'EG', region: 'Middle East & Africa', score: 3.7, rank: 14 },
  Nigeria: { code: 'NG', region: 'Middle East & Africa', score: 3.7, rank: 15 },
  'Saudi Arabia': { code: 'SA', region: 'Middle East & Africa', score: 4.0, rank: 7 },
  Indonesia: { code: 'ID', region: 'Asia Pacific', score: 3.9, rank: 9 },
  Malaysia: { code: 'MY', region: 'Asia Pacific', score: 4.0, rank: 7 },
  'South Korea': { code: 'KR', region: 'Asia Pacific', score: 4.0, rank: 7 },
};

function buildBrandName(value: unknown): string {
  const parsed = Array.isArray(value) ? value[0] : value;
  const name = String(parsed ?? '').trim();
  return name || 'Western Union';
}

function getBrandInitials(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  const initials = words.length > 1
    ? words.slice(0, 2).map((word) => word[0]).join('')
    : name.slice(0, 2);
  return initials.toUpperCase();
}

function buildSelectedMarkets(names: unknown, evidenceOnly = false): SunburstMarket[] {
  const parsedNames = Array.isArray(names) ? names[0] : names;
  let selectedNames: string[] = [];
  try {
    const parsed: unknown = JSON.parse(String(parsedNames || '[]'));
    if (Array.isArray(parsed) && parsed.every((name) => typeof name === 'string' && COUNTRY_METADATA[name])) selectedNames = [...new Set(parsed)];
  } catch { selectedNames = []; }
  if (!selectedNames.length) return countries.map((country) => evidenceOnly
    ? { ...country, score: 0, positive: 0, reviews: 0, rank: 0, share: 0 } : country);
  return selectedNames.map((name, index) => {
    const existing = countries.find((country) => country.name === name);
    const metadata = COUNTRY_METADATA[name];
    return existing ? { ...existing, score: 0, positive: 0, reviews: 0, rank: 0, share: evidenceOnly ? 0 : existing.share } : {
      name,
      code: metadata?.code ?? name.slice(0, 2).toUpperCase(),
      score: 0,
      positive: 0,
      reviews: 0,
      rank: 0,
      region: metadata?.region ?? 'Global',
      share: evidenceOnly ? 0 : Math.max(4, 100 - index * 5),
    };
  });
}

function runtimeConfiguration(params: Record<string, string | string[] | undefined>): { config: ModelConfiguration | null; error?: string } {
  try {
    const text = (key: string) => {
      const value = params[key];
      return (Array.isArray(value) ? value[0] : value ?? '').trim();
    };
    const list = (key: string, allowed: string[]) => {
      const values: unknown = JSON.parse(text(key));
      if (!Array.isArray(values) || !values.length || values.some((value) => typeof value !== 'string' || !allowed.includes(value))) {
        throw new Error(`Invalid model ${key}. Return to setup and select valid options.`);
      }
      return [...new Set<string>(values)];
    };
    const brand = text('brand');
    const website = text('website');
    const url = new URL(website);
    const markets: unknown = JSON.parse(text('countries'));
    if (!brand || brand.length > 80 || !['http:', 'https:'].includes(url.protocol)
      || url.username || url.password || !Array.isArray(markets) || !markets.length
      || markets.some((name) => typeof name !== 'string' || !COUNTRY_METADATA[name])) {
      throw new Error('Invalid model configuration. Return to setup to select a brand and markets.');
    }
    return { config: { brand, website, appName: text('appName'), businessType: text('businessType'),
      platforms: list('platforms', platformOptions), sources: list('sources', sentimentSources) } };
  } catch (error) {
    console.error('Invalid runtime model configuration:', error instanceof Error ? error.message : 'invalid setup');
    return { config: null, error: 'Invalid model configuration. Return to setup and review your selections.' };
  }
}

const POSITIVE_TERMS = ['easy', 'fast', 'helpful', 'love', 'recommend', 'best', 'great', 'excellent', 'quick', 'reliable', 'amazing', 'smooth', 'good'];
const NEGATIVE_TERMS = ['slow', 'delay', 'problem', 'failed', 'fee', 'fees', 'scam', 'fraud', 'bad', 'terrible', 'laggy', 'stolen', 'support', 'charge', 'frustrating', 'wonky', 'sluggish'];

// Platform filter options for the feedback section. Add an entry here when a
// new review source is enabled (e.g. Reddit, Trustpilot).
const PLATFORM_FILTER_OPTIONS = [
  { id: 'all', label: 'All platforms' },
  { id: 'Google Play', label: 'Playstore' },
  { id: 'Apple App Store', label: 'App Store' },
] as const;
type PlatformFilter = (typeof PLATFORM_FILTER_OPTIONS)[number]['id'];

function getSentimentWords(reviews: CustomerSentiment[]) {
  const counts = new Map<string, { count: number; sentiment: 'positive' | 'negative' }>();
  reviews.forEach((review) => {
    const lower = review.text.toLowerCase();
    if (review.sentiment === 'positive') {
      POSITIVE_TERMS.forEach((word) => {
        if (lower.includes(word)) counts.set(word, { count: (counts.get(word)?.count ?? 0) + 1, sentiment: 'positive' });
      });
    } else if (review.sentiment === 'negative') {
      NEGATIVE_TERMS.forEach((word) => {
        if (lower.includes(word)) counts.set(word, { count: (counts.get(word)?.count ?? 0) + 1, sentiment: 'negative' });
      });
    }
  });
  return [...counts.entries()].map(([word, value]) => ({ word, ...value })).sort((a, b) => b.count - a.count).slice(0, 16);
}

type PlatformRating = { rating: number | null; reviewCount: number; sourceCount: number };

function getReviewIdentity(review: CustomerSentiment) {
  return `${review.source}\u0000${review.author}\u0000${review.text}`;
}

function formatSharePrice(quote: CompetitorSharePrice) {
  if (quote.price === null || !quote.currency) return 'Unavailable';
  if (quote.currency === 'GBp') return `${quote.price.toFixed(2)} GBp`;
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: quote.currency,
      maximumFractionDigits: 2,
    }).format(quote.price);
  } catch {
    return `${quote.price.toFixed(2)} ${quote.currency}`;
  }
}

function formatQuoteTime(value: string | null) {
  if (!value) return 'Time unavailable';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Time unavailable'
    : `As of ${date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}`;
}

function buildCompetitorDecisionLines({
  brand, country, rank, totalRanked, brandRating, ranked, quotes, loading,
}: {
  brand: string;
  country: string;
  rank: number | undefined;
  totalRanked: number;
  brandRating: number | null;
  ranked: LiveCompetitor[];
  quotes: CompetitorSharePrice[];
  loading: boolean;
}): string[] {
  if (loading) return ['analysis pending — collecting live competitor evidence …'];
  if (!ranked.length) return [`no ranked peers for ${brand} in ${country} — decision support unavailable`];
  const lines: string[] = [];
  lines.push(rank
    ? `${brand} ranks #${rank} of ${totalRanked} by live store rating in ${country}`
    : `${brand} has no comparable store rating in ${country}`);
  const leader = ranked.find((item) => item.name !== brand);
  if (leader && leader.rating !== null) {
    lines.push(`strongest peer: ${leader.name} at ${leader.rating.toFixed(1)}/5`);
    if (brandRating !== null) {
      const gap = brandRating - leader.rating;
      lines.push(gap >= 0
        ? `${brand} leads top peer by +${gap.toFixed(1)} — defend position`
        : `${brand} trails top peer by ${Math.abs(gap).toFixed(1)} — prioritise rating recovery`);
    }
  }
  const listed = quotes.filter((quote) => quote.status === 'live').length;
  lines.push(`${listed}/${quotes.length} peers have a live public share price`);
  lines.push(rank && rank <= 3
    ? 'decision: hold lead, monitor top challengers weekly'
    : 'decision: close rating gap on review drivers before scaling spend');
  return lines;
}

const PLATFORM_CHART_COLORS: Record<string, string> = {
  'Google Play': colors.primaryDark,
  'Apple App Store': colors.navy,
  Reddit: colors.purple,
};

function PlatformRatingsChart({ reviews, platformRatings }: { reviews: CustomerSentiment[]; platformRatings: Record<'Google Play' | 'Apple App Store', PlatformRating> }) {
  const bySource = new Map<string, { rated: number[]; all: number }>();
  reviews.forEach((review) => {
    const entry = bySource.get(review.source) ?? { rated: [], all: 0 };
    entry.all += 1;
    if (review.rating > 0) entry.rated.push(review.rating);
    bySource.set(review.source, entry);
  });
  const rows = [...bySource.entries()].map(([source, entry]) => {
    // Align with the Rating Scorecard: store-aggregate rating when available,
    // falling back to the per-review star average for that source.
    const aggregate = source === 'Google Play' || source === 'Apple App Store' ? platformRatings[source].rating : null;
    const reviewAverage = entry.rated.length ? entry.rated.reduce((sum, rating) => sum + rating, 0) / entry.rated.length : null;
    return {
      source,
      rating: aggregate ?? reviewAverage,
      ratedCount: entry.rated.length,
      total: entry.all,
    };
  }).sort((left, right) => (right.rating ?? -1) - (left.rating ?? -1));

  if (!rows.length) {
    return <Text style={styles.emptyReviewText}>No verified sentiment records returned</Text>;
  }
  return <SafeView style={styles.chartWrap}>{rows.map((row) => {
    const percent = row.rating !== null ? (row.rating / 5) * 100 : 0;
    const color = PLATFORM_CHART_COLORS[row.source] ?? colors.primary;
    return (
      <SafeView key={row.source} style={styles.emotionRow}>
        <Text style={styles.platformLabel} numberOfLines={1}>{row.source}</Text>
        <SafeView style={styles.emotionTrack}>
          <SafeView style={[styles.emotionFill, { width: `${percent}%`, backgroundColor: color }]} />
        </SafeView>
        <Text style={styles.platformValue}>
          {row.rating !== null ? `${row.rating.toFixed(1)} / 5` : `— · ${row.total} mentions`}
        </Text>
      </SafeView>
    );
  })}</SafeView>;
}

function SentimentBreakdown({ reviews }: { reviews: CustomerSentiment[] }) {
  const total = reviews.length;
  const groups = [
    ['Positive', reviews.filter((review) => review.sentiment === 'positive').length, colors.green],
    ['Neutral', reviews.filter((review) => review.sentiment === 'neutral').length, colors.orange],
    ['Negative', reviews.filter((review) => review.sentiment === 'negative').length, colors.red],
  ] as const;
  return <SafeView style={styles.chartWrap}>{total > 0 ? groups.map(([label, count, tone]) => {
    const percent = total ? count / total * 100 : 0;
    return <SafeView key={label} style={styles.emotionRow}><SafeView style={[styles.emotionDot, { backgroundColor: tone }]}/><Text style={styles.emotionLabel}>{label}</Text><SafeView style={styles.emotionTrack}><SafeView style={[styles.emotionFill, { width: `${percent}%`, backgroundColor: tone }]}/></SafeView><Text style={styles.emotionValue}>{count}</Text></SafeView>;
  }) : <Text style={styles.emptyReviewText}>No verified sentiment records returned</Text>}</SafeView>;
}

export default function Dashboard() {
  const { report: reportPreparation } = useModelPreparation();
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const runtimeEnabled = params.runtime === '1';
  const runtimeSetup = runtimeEnabled ? runtimeConfiguration(params) : { config: null };
  const selectedMarkets = buildSelectedMarkets(params.countries, runtimeEnabled);
  const brandName = buildBrandName(params.brand);
  const refreshToken = String(Array.isArray(params.refresh) ? params.refresh[0] : params.refresh ?? '');
  const brandWebsite = String(Array.isArray(params.website) ? params.website[0] : params.website ?? '').trim() || 'https://www.westernunion.com';
  const brandInitials = getBrandInitials(brandName);
  const isWide = width >= 900;
  const isNarrow = width < 560;
  const mainScrollRef = useRef<ComponentRef<typeof ScrollView>>(null);
  const previousBrandRef = useRef(brandName);
  const consumedRefreshTokenRef = useRef('');
  const reviewFeedOffset = useRef(0);
  const feedbackListOffset = useRef(0);
  const [activeSection, setSection] = useState('Overview');
  const setActiveSection = (section: string) => {
    mainScrollRef.current?.scrollTo({ y: 0, animated: false });
    setSection(section);
  };
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [countrySelection, setSelectedCountry] = useState<SunburstMarket>(selectedMarkets[0]);
  const selectedCountry = selectedMarkets.find((market) => market.code === countrySelection.code) ?? selectedMarkets[0];
  const [legacyCompetitors, setLiveCompetitors] = useState<LiveCompetitor[]>([]);
  const [legacyQuotes, setCompetitorSharePrices] = useState<CompetitorSharePrice[]>([]);
  const [legacyQuotesLoading, setSharePricesLoading] = useState(false);
  const [legacyReviews, setCustomerReviews] = useState<CustomerSentiment[]>([]);
  const [legacyLoading, setLiveLoading] = useState(false);
  const [legacyError, setLiveError] = useState(false);
  const [competitorError, setCompetitorError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformFilter>('all');
  const [durationMonths, setDurationMonths] = useState(1);
  const [durationPickerVisible, setDurationPickerVisible] = useState(false);
  const [durationPullVisible, setDurationPullVisible] = useState(false);
  const [durationPullProgress, setDurationPullProgress] = useState(8);
  const [dataRefreshNonce, setDataRefreshNonce] = useState(0);
  const [themeFilter, setThemeFilter] = useState<string | null>(null);
  const [issueCategoryId, setIssueCategoryId] = useState<SentimentCategoryId | null>(null);
  const [issueCategoryLabel, setIssueCategoryLabel] = useState<string | null>(null);
  const [issueReviewIdentities, setIssueReviewIdentities] = useState<string[]>([]);
  const [targetReview, setTargetReview] = useState<CustomerSentiment | null>(null);
  const [screenEntrance] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const entrance = Animated.timing(screenEntrance, {
      toValue: 1,
      duration: 520,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    entrance.start();
    return () => entrance.stop();
  }, [screenEntrance]);
  const handleThemeSelect = (sentiment: 'positive' | 'negative', word: string) => {
    setIssueCategoryId(null);
    setIssueCategoryLabel(null);
    setIssueReviewIdentities([]);
    setTargetReview(null);
    setThemeFilter(word);
    setActiveSection('Overview');
    setSentimentFilter(sentiment);
    setShowAllReviews(false);
    setTimeout(() => mainScrollRef.current?.scrollTo({ y: reviewFeedOffset.current, animated: true }), 120);
  };
  const handleIssueCategorySelect = (category: SentimentCategory) => {
    const firstMatchingReview = category.reviews[0] ?? null;
    setIssueCategoryId(category.id);
    setIssueCategoryLabel(category.label);
    setIssueReviewIdentities(category.reviews.map(getReviewIdentity));
    setTargetReview(firstMatchingReview);
    setActiveSection('Overview');
    setSentimentFilter('all');
    setThemeFilter(null);
    setShowAllReviews(true);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      const feedbackOffset = reviewFeedOffset.current + feedbackListOffset.current;
      mainScrollRef.current?.scrollTo({ y: Math.max(0, feedbackOffset - 12), animated: true });
    }));
  };
  const [legacyPlatformRatings, setPlatformRatings] = useState<Record<'Google Play' | 'Apple App Store', PlatformRating>>({
    'Google Play': { rating: null, reviewCount: 0, sourceCount: 0 },
    'Apple App Store': { rating: null, reviewCount: 0, sourceCount: 0 },
  });
  const [legacyMarketRatings, setMarketRatings] = useState<MarketRatings>({});
  const [legacyMarketErrors, setMarketRatingErrors] = useState<Record<string, string>>({});
  const [legacyMarketLoading, setMarketRatingsLoading] = useState(false);
  const runtime = useRuntimeModel(runtimeSetup.config, selectedMarkets, refreshToken, durationMonths, dataRefreshNonce, reportPreparation);
  const modelMarket = runtime.model?.markets[selectedCountry.code];
  const customerReviews = runtimeEnabled ? modelMarket?.reviews ?? [] : legacyReviews;
  const liveCompetitors = runtimeEnabled ? modelMarket?.competitors ?? [] : legacyCompetitors;
  const competitorSharePrices = runtimeEnabled ? modelMarket?.quotes ?? [] : legacyQuotes;
  const liveLoading = runtimeEnabled ? runtime.loading && !modelMarket : legacyLoading;
  const liveError = runtimeEnabled ? Boolean(runtime.errors[selectedCountry.code]) || modelMarket?.status === 'unavailable' : legacyError;
  const sharePricesLoading = runtimeEnabled ? liveLoading : legacyQuotesLoading;
  const modelStore = (key: 'apple' | 'google'): PlatformRating => {
    const store = modelMarket?.ratings[key];
    return { rating: store?.rating ?? null, reviewCount: store?.reviewCount ?? 0, sourceCount: store?.reviewCount ?? 0 };
  };
  const platformRatings = runtimeEnabled ? { 'Google Play': modelStore('google'), 'Apple App Store': modelStore('apple') } : legacyPlatformRatings;
  const marketRatings: MarketRatings = runtimeEnabled
    ? Object.fromEntries(Object.entries(runtime.model?.markets ?? {}).map(([code, market]) => [code, market.ratings])) : legacyMarketRatings;
  const marketRatingErrors = runtimeEnabled ? runtime.errors : legacyMarketErrors;
  const marketRatingsLoading = runtimeEnabled ? runtime.loading : legacyMarketLoading;

  const filteredMarkets = selectedRegion === 'Global' ? selectedMarkets : selectedMarkets.filter((item) => item.region === selectedRegion);
  const sunburstMarkets = filteredMarkets;

  useEffect(() => {
    if (!durationPullVisible) return;
    const timer = setInterval(() => {
      setDurationPullProgress((current) => liveLoading
        ? Math.min(current + (current < 85 ? 7 : 3), 92)
        : Math.min(current + 16, 100));
    }, 280);
    return () => clearInterval(timer);
  }, [durationPullVisible, liveLoading]);

  useEffect(() => {
    if (!durationPullVisible || durationPullProgress < 100) return;
    const timer = setTimeout(() => setDurationPullVisible(false), 450);
    return () => clearTimeout(timer);
  }, [durationPullVisible, durationPullProgress]);

  const selectDuration = (month: number) => {
    setDurationPickerVisible(false);
    setDurationPullProgress(8);
    setDurationPullVisible(true);
    setDurationMonths(month);
    setDataRefreshNonce((current) => current + 1);
  };

  useEffect(() => {
    if (previousBrandRef.current === brandName) return;
    previousBrandRef.current = brandName;
    setCustomerReviews([]);
    setThemeFilter(null);
    setIssueCategoryId(null);
    setIssueCategoryLabel(null);
    setIssueReviewIdentities([]);
    setTargetReview(null);
    setSentimentFilter('all');
    setPlatformFilter('all');
    setShowAllReviews(false);
  }, [brandName]);

  useEffect(() => {
    if (runtimeEnabled) return;
    let active = true;
    const load = async () => {
      let sourceFailed = false;
      const forceFresh = dataRefreshNonce > 0 || (refreshToken !== '' && consumedRefreshTokenRef.current !== refreshToken);
      consumedRefreshTokenRef.current = refreshToken;
      setLiveLoading(true);
      setLiveError(false);
      setCompetitorError(false);
      setLiveCompetitors([]);
      setCompetitorSharePrices([]);
      setCustomerReviews([]);
      setSharePricesLoading(true);
      setPlatformRatings({
        'Google Play': { rating: null, reviewCount: 0, sourceCount: 0 },
        'Apple App Store': { rating: null, reviewCount: 0, sourceCount: 0 },
      });
      try {
        const platformPromise = fetchPlatformRatings(selectedCountry.code, brandName, forceFresh).catch((error: unknown) => {
          sourceFailed = true;
          console.error('Platform rating lookup failed:', error instanceof Error ? error.message : 'unknown error');
          return { apple: { rating: null, reviewCount: 0 }, google: { rating: null, reviewCount: 0 } };
        });
        const competitorRatingsPromise = fetchCompetitorRatings(selectedCountry.code, selectedCountry.region, brandName);
        const secondaryPromise = Promise.allSettled([
          competitorRatingsPromise,
          fetchRedditMentions(brandName),
          fetchReviewCollector(selectedCountry.code, brandName, durationMonths, dataRefreshNonce),
        ]);

        const stores = await platformPromise;
        if (!active) return;
        setPlatformRatings({
          'Google Play': { ...stores.google, sourceCount: stores.google.reviewCount },
          'Apple App Store': { ...stores.apple, sourceCount: stores.apple.reviewCount },
        });

        const secondaryResults = await secondaryPromise;
        const [competitorResult, redditResult, reviewResult] = secondaryResults;
        sourceFailed = sourceFailed || secondaryResults.some((result) => result.status === 'rejected');
        for (const result of secondaryResults) {
          if (result.status === 'rejected') console.error('Customer source lookup failed:', result.reason);
        }
        const ratings = competitorResult.status === 'fulfilled' ? competitorResult.value : [];
        const redditMentions = redditResult.status === 'fulfilled' ? redditResult.value : [];
        const collectorReviews = reviewResult.status === 'fulfilled' ? reviewResult.value : [];
        if (!active) return;
        setCompetitorError(competitorResult.status === 'rejected');
        setLiveCompetitors(ratings);
        const sharePricePromise = (ratings.length ? fetchCompetitorSharePrices(ratings.map((item) => item.name)) : Promise.resolve([]))
          .then((quotes) => {
            sourceFailed = sourceFailed || quotes.some((quote) => quote.status === 'unavailable');
            if (active) setCompetitorSharePrices(quotes);
          })
          .catch((error: unknown) => {
            sourceFailed = true;
            console.error('Competitor share-price lookup failed:', error instanceof Error ? error.message : 'unknown error');
            if (active) {
              setCompetitorSharePrices(ratings.map((item) => ({
                name: item.name,
                symbol: null,
                price: null,
                currency: null,
                quoteTime: null,
                status: 'unavailable',
              })));
            }
          })
          .finally(() => {
            if (active) setSharePricesLoading(false);
          });
        const combined = [...collectorReviews, ...redditMentions];
        const uniqueReviews = combined.filter((review, index) =>
          combined.findIndex((item) => item.source === review.source && item.text === review.text) === index,
        );
        uniqueReviews.sort((left, right) => {
          const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
          const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
          return rightTime - leftTime;
        });
        setCustomerReviews(uniqueReviews);
        sourceFailed = sourceFailed || (ratings.every((item) => item.status === 'unavailable') && collectorReviews.length === 0 && redditMentions.length === 0);
        setLiveError(sourceFailed);
        await sharePricePromise;
        if (active && sourceFailed) setLiveError(true);
      } catch (error) {
        sourceFailed = true;
        console.error('Dashboard source collection failed:', error instanceof Error ? error.message : 'unknown error');
        if (active) {
          setLiveError(true);
          setSharePricesLoading(false);
        }
      } finally {
        if (active) {
          setLiveLoading(false);
          setDurationPullProgress(100);
          reportPreparation(refreshToken, 'sources', sourceFailed);
        }
      }
    };
    load();
    return () => { active = false; };
  }, [selectedCountry.code, selectedCountry.region, durationMonths, dataRefreshNonce, brandName, refreshToken, reportPreparation, runtimeEnabled]);

  // Fetch the accurate per-country store rating for every selected market so the
  // Markets tab shows real data for all countries, not just the selected one.
  const selectedMarketsKey = selectedMarkets.map((market) => market.code).join(',');
  useEffect(() => {
    if (runtimeEnabled) return;
    let active = true;
    const loadMarketRatings = async () => {
      setMarketRatingsLoading(true);
      setMarketRatings({});
      setMarketRatingErrors({});
      // Bound country requests so selecting many markets does not flood the collector.
      for (let index = 0; index < selectedMarkets.length && active; index += 4) {
        const results = await Promise.all(selectedMarkets.slice(index, index + 4).map(async (market) => {
          let channelFailed = false;
          try {
            const unavailable = (basis: string) => ({ rating: null, sampleSize: 0, basis, components: [] });
            const [rating, channels] = await Promise.all([
              fetchPlatformRatings(market.code, brandName, dataRefreshNonce > 0),
              // Brand/website failures must not hide the app-store data for the country.
              fetchChannelRatings(market.code, brandName, dataRefreshNonce > 0)
                .catch((error: unknown) => {
                  channelFailed = true;
                  console.error('Market channel lookup failed:', error instanceof Error ? error.message : 'unknown error');
                  return { brand: unavailable('Collector unavailable'), web: unavailable('Collector unavailable') };
                }),
            ]);
            return { code: market.code, name: market.name, rating: { ...rating, ...channels }, error: channelFailed ? 'Brand and website collector unavailable.' : null };
          } catch (error) {
            return { code: market.code, name: market.name, rating: undefined, error: error instanceof Error ? error.message : 'Country rating request failed.' };
          }
        }));
        if (!active) return;
        results.forEach((result) => reportPreparation(refreshToken, `market:${result.name}`, result.error !== null));
        setMarketRatings((current) => ({ ...current, ...Object.fromEntries(results.map((result) => [result.code, result.rating])) }));
        setMarketRatingErrors((current) => ({
          ...current,
          ...Object.fromEntries(results.filter((result) => result.error !== null).map((result) => [result.code, result.error!])),
        }));
      }
      if (active) setMarketRatingsLoading(false);
    };
    loadMarketRatings();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedMarketsKey, brandName, dataRefreshNonce, refreshToken, runtimeEnabled]);

  const handleCountryChange = (country: SunburstMarket) => {
    if (country.code === selectedCountry.code) return;
    setSelectedCountry(country);
    setThemeFilter(null);
    setIssueCategoryId(null);
    setIssueCategoryLabel(null);
    setIssueReviewIdentities([]);
    setTargetReview(null);
    setSentimentFilter('all');
    setPlatformFilter('all');
    setShowAllReviews(false);
    mainScrollRef.current?.scrollTo({ y: 0, animated: true });
  };

  const chooseRegion = (region: string) => {
    setSelectedRegion(region);
    const next = region === 'Global' ? selectedMarkets : selectedMarkets.filter((item) => item.region === region);
    if (next.length) handleCountryChange(next[0]);
  };

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => setDataRefreshNonce((current) => current + 1), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [autoRefresh]);

  const storeData = { apple: platformRatings['Apple App Store'], google: platformRatings['Google Play'] };
  const brandRating = aggregateRating(storeData);
  const comparisonRating = runtimeEnabled ? liveCompetitors.find((item) => item.name === brandName)?.rating ?? null : brandRating;
  const googlePlayRating = platformRatings['Google Play'].rating;
  const appleStoreRating = platformRatings['Apple App Store'].rating;
  const liveSelectedCountry = { ...selectedCountry, score: brandRating ?? 0 };
  const topIssue = categorizeSentimentReviews(customerReviews)
    .filter((category) => category.negative > 0)
    .sort((left, right) => right.negative - left.negative)[0] ?? null;
  const brandSummary = buildBrandSummary({
    brand: brandName,
    countryName: selectedCountry.name,
    brandRating: comparisonRating,
    competitors: liveCompetitors,
    reviews: customerReviews,
    topIssue: topIssue ? { label: topIssue.label, negative: topIssue.negative } : null,
    marketLadder: rankMarkets(selectedMarkets, marketRatings, 'Global', 'mobile'),
  });
  const legacyChart = useStoreChartRanks(brandName, selectedCountry.code, !runtimeEnabled);
  const storeChart = runtimeEnabled
    ? modelMarket ? { key: `${brandName}:${selectedCountry.code}`, ranks: modelMarket.chart }
      : runtime.loading ? null : { key: `${brandName}:${selectedCountry.code}`, ranks: null }
    : legacyChart;
  useEffect(() => {
    if (runtimeEnabled) return;
    if (legacyChart) reportPreparation(refreshToken, 'chart', legacyChart.ranks === null);
  }, [legacyChart, refreshToken, reportPreparation, runtimeEnabled]);
  const renderHeadline = (section: string) => <BrandHeadline
    brand={brandName}
    countryCode={selectedCountry.code}
    countryName={selectedCountry.name}
    section={section}
    brandRating={brandRating}
    ratingBasis={storeRatingBasis(storeData)}
    summary={brandSummary}
    loading={liveLoading}
    chart={storeChart}
  />;

  const renderGlobalRatings = () => <GlobalRatingsExplorer
    key={brandName}
    brand={brandName}
    markets={selectedMarkets}
    ratings={marketRatings}
    errors={marketRatingErrors}
    loading={marketRatingsLoading}
    region={selectedRegion}
    country={selectedCountry}
    onRegion={chooseRegion}
    onCountry={(market) => {
      const country = selectedMarkets.find((item) => item.code === market.code);
      if (country) handleCountryChange(country);
    }}
    onRetry={() => setDataRefreshNonce((current) => current + 1)}
  />;

  const renderRuntimeStatus = () => <RuntimeModelStatus
      configuration={runtimeSetup.config} market={modelMarket} loading={runtime.loading}
      completed={Object.keys(runtime.model?.markets ?? {}).length + Object.keys(runtime.errors).length}
      total={selectedMarkets.length} error={runtimeSetup.error ?? runtime.errors[selectedCountry.code]}
      onRetry={() => setDataRefreshNonce((current) => current + 1)}
    />;

  const renderTerminal = (title: string, decisionLines?: string[], defaultCollapsed?: boolean) => <AITerminal
      title={title}
      configuration={runtimeSetup.config}
      market={modelMarket}
      loading={runtime.loading}
      completed={Object.keys(runtime.model?.markets ?? {}).length + Object.keys(runtime.errors).length}
      total={selectedMarkets.length}
      error={runtimeSetup.error ?? runtime.errors[selectedCountry.code]}
      country={selectedCountry.name}
      decisionLines={decisionLines}
      defaultCollapsed={defaultCollapsed}
    />;

  const renderOverview = () => <>
    {renderHeadline('Overview')}
    {renderGlobalRatings()}
    <SafeView style={[styles.card, styles.fullCard, styles.dashboardCard]}>
      <SafeView style={styles.cardHeader}>
        <SafeView style={styles.sectionCluster}><SafeView style={styles.sectionGauge}><SafeView style={styles.sectionGaugeNeedle}/></SafeView><SafeView><Text style={styles.cardTitle}>Rating scorecard</Text><Text style={styles.cardSub}>{selectedCountry.name} · brand, iOS and Android on a 5-point scale</Text></SafeView></SafeView>
        <SafeView style={styles.liveBadge}><SafeView style={styles.liveDot}/><Text style={styles.liveBadgeText}>LIVE</Text></SafeView>
      </SafeView>
      <SunburstChart
        markets={sunburstMarkets.map((market) => market.code === selectedCountry.code ? liveSelectedCountry : market) as SunburstMarket[]}
        selected={liveSelectedCountry}
        onSelect={handleCountryChange}
        platformRatings={{ brand: brandRating, ios: appleStoreRating, android: googlePlayRating }}
        platformReviewCounts={{ ios: platformRatings['Apple App Store'].reviewCount, android: platformRatings['Google Play'].reviewCount }}
        marketPosition={brandSummary.competitorRank ?? undefined}
        leaderGap={brandSummary.gapToLeader}
      />
    </SafeView>
    {renderReviews()}
  </>;

  const renderReviews = () => {
    const positiveCount = customerReviews.filter((review) => review.sentiment === 'positive').length;
    const neutralCount = customerReviews.filter((review) => review.sentiment === 'neutral').length;
    const negativeCount = customerReviews.filter((review) => review.sentiment === 'negative').length;
    const sentimentWords = getSentimentWords(customerReviews);
    const issueCategories = categorizeSentimentReviews(customerReviews);
    const selectedIssueCategory = issueCategories.find((category) => category.id === issueCategoryId) ?? null;
    const selectedCategoryLabel = issueCategoryLabel ?? selectedIssueCategory?.label ?? 'Selected category';
    const selectedTargetReview = issueCategoryId
      ? customerReviews.find((review) => getReviewIdentity(review) === (targetReview ? getReviewIdentity(targetReview) : ''))
        ?? customerReviews.find((review) => issueReviewIdentities.includes(getReviewIdentity(review)))
        ?? null
      : null;
    const reviewSourceCounts = ['Google Play', 'Apple App Store', 'Reddit'].map((source) => ({
      source,
      count: customerReviews.filter((review) => review.source === source).length,
    }));
    const datedReviews = customerReviews
      .map((review) => review.publishedAt ? new Date(review.publishedAt) : null)
      .filter((date): date is Date => date !== null && !Number.isNaN(date.getTime()));
    const earliestReviewDate = datedReviews.length
      ? new Date(Math.min(...datedReviews.map((date) => date.getTime())))
      : null;
    const latestReviewDate = datedReviews.length
      ? new Date(Math.max(...datedReviews.map((date) => date.getTime())))
      : null;
    const requestedWindowStart = new Date();
    requestedWindowStart.setMonth(requestedWindowStart.getMonth() - durationMonths);
    const reviewDateRange = earliestReviewDate && latestReviewDate
      ? `${earliestReviewDate.toLocaleDateString()} – ${latestReviewDate.toLocaleDateString()}`
      : 'dates unavailable';
    const platformFiltered = platformFilter === 'all' ? customerReviews : customerReviews.filter((review) => review.source === platformFilter);
    const sentimentFiltered = sentimentFilter === 'all' ? platformFiltered : platformFiltered.filter((review) => review.sentiment === sentimentFilter);
    const filteredReviews = issueCategoryId
      ? platformFiltered.filter((review) => issueReviewIdentities.includes(getReviewIdentity(review)))
      : themeFilter
        ? sentimentFiltered.filter((review) => review.text.toLowerCase().includes(themeFilter))
        : sentimentFiltered;
    const visibleReviews = showAllReviews ? filteredReviews : filteredReviews.slice(0, 4);

    return <SafeView style={[styles.card, styles.fullCard]} onLayout={(event) => { reviewFeedOffset.current = event.nativeEvent.layout.y; }}>
      <SafeView style={styles.cardHeader}><SafeView style={styles.sectionCluster}><SafeView style={styles.sectionGauge}><SafeView style={styles.sectionGaugeNeedle}/></SafeView><SafeView><Text style={styles.cardTitle}>What customers are saying</Text><Text style={styles.cardSub}>{liveLoading ? 'Connecting to verified review sources' : liveError ? 'Review source status: unavailable' : `${customerReviews.length} live sentiments · Last ${durationMonths} ${durationMonths === 1 ? 'month' : 'months'} · ${selectedCountry.name}`}</Text></SafeView></SafeView><SafeView style={[styles.liveBadge, liveError && styles.warningBadge]}><SafeView style={styles.liveDot}/><Text style={[styles.liveBadgeText, liveError && styles.warningText]}>{liveLoading ? 'LOADING' : liveError ? 'UNAVAILABLE' : 'LIVE SOURCES'}</Text></SafeView></SafeView>
      {!liveLoading && <Text style={{ marginTop: 2, marginBottom: 10, fontSize: 10, lineHeight: 15, color: colors.muted }}>
        {`${reviewSourceCounts.map(({ source, count }) => `${source} ${count}`).join(' · ')} · ${reviewDateRange}`}
        {earliestReviewDate && earliestReviewDate > requestedWindowStart ? ' · partial history' : ''}
      </Text>}
      {customerReviews.length > 0 && <SentimentMindMap country={selectedCountry.name} total={customerReviews.length} positive={positiveCount} neutral={neutralCount} negative={negativeCount} words={sentimentWords} onThemeSelect={handleThemeSelect} />}
      {issueCategories.length > 0 && <SentimentIssueFunnel categories={issueCategories} selectedCategory={issueCategoryId} onSelect={handleIssueCategorySelect} />}
      {liveLoading ? <SafeView style={styles.emptyReviews}><Ionicons name="sync-outline" size={24} color={colors.primary}/><Text style={styles.emptyReviewTitle}>Collecting customer feedback</Text><Text style={styles.emptyReviewText}>Retrieving recent verified reviews for {selectedCountry.name}.</Text></SafeView> : customerReviews.length ? <>
        <SafeView onLayout={(event) => { feedbackListOffset.current = event.nativeEvent.layout.y; }}>
          <SafeView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4, justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <SafeView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flex: 1 }}>{(['all', 'positive', 'neutral', 'negative'] as const).map((filter) => <Pressable key={filter} onPress={() => { setSentimentFilter(filter); setThemeFilter(null); setIssueCategoryId(null); setIssueCategoryLabel(null); setIssueReviewIdentities([]); setTargetReview(null); setShowAllReviews(false); }} style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: sentimentFilter === filter && !issueCategoryId ? colors.primary : colors.line, backgroundColor: sentimentFilter === filter && !issueCategoryId ? colors.primary : '#fff', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: sentimentFilter === filter && !issueCategoryId ? colors.card : colors.muted }}>{filter === 'all' ? `All · ${platformFiltered.length}` : `${filter[0].toUpperCase()}${filter.slice(1)} · ${platformFiltered.filter((review) => review.sentiment === filter).length}`}</Text></Pressable>)}</SafeView>
            <SafeView accessibilityRole="radiogroup" accessibilityLabel="Filter feedback by platform" style={{ flexDirection: 'row', borderWidth: 1, borderColor: colors.line, borderRadius: 15, overflow: 'hidden', height: 30, backgroundColor: '#fff' }}>
              {PLATFORM_FILTER_OPTIONS.map((option, index) => {
                const isActive = platformFilter === option.id;
                const count = option.id === 'all' ? customerReviews.length : customerReviews.filter((review) => review.source === option.id).length;
                return <Pressable key={option.id} accessibilityRole="radio" accessibilityState={{ selected: isActive }} onPress={() => { setPlatformFilter(option.id); setShowAllReviews(false); }} style={{ paddingHorizontal: 10, justifyContent: 'center', backgroundColor: isActive ? colors.primary : colors.card, borderLeftWidth: index === 0 ? 0 : 1, borderLeftColor: colors.line }}><Text style={{ fontSize: 10, fontWeight: '800', color: isActive ? colors.card : colors.muted }}>{`${option.label} · ${count}`}</Text></Pressable>;
              })}
            </SafeView>
          </SafeView>
          {(themeFilter || issueCategoryId) && <Pressable accessibilityRole="button" accessibilityLabel={issueCategoryId ? `Clear ${selectedCategoryLabel} category filter` : 'Clear ' + themeFilter + ' filter'} onPress={() => { setThemeFilter(null); setIssueCategoryId(null); setIssueCategoryLabel(null); setIssueReviewIdentities([]); setTargetReview(null); setSentimentFilter('all'); setShowAllReviews(false); }} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, marginTop: 4, marginBottom: 6, borderRadius: 15, borderWidth: 1, borderColor: sentimentFilter === 'negative' ? colors.red : colors.green, backgroundColor: sentimentFilter === 'negative' ? colors.redSoft : colors.greenSoft }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: sentimentFilter === 'negative' ? colors.redText : colors.greenText }}>{issueCategoryId ? `${selectedCategoryLabel} · ${filteredReviews.length} comments` : '"' + themeFilter + '" · ' + filteredReviews.length + (filteredReviews.length === 1 ? ' review' : ' reviews')}</Text>
          <Ionicons name="close" size={12} color={colors.faint} /></Pressable>}
          {issueCategoryId && <SafeView accessibilityLiveRegion="polite" style={{ marginTop: 6, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#FDB022', borderRadius: 6, backgroundColor: colors.orangeSoft }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#7A2E0E' }}>Showing feedback for {selectedCategoryLabel}</Text>
            <Text style={{ marginTop: 3, fontSize: 9, color: '#93370D' }}>{filteredReviews.length} matching {filteredReviews.length === 1 ? 'comment' : 'comments'}</Text>
          </SafeView>}
          {filteredReviews.length === 0 && <Text style={styles.emptyReviewText}>{issueCategoryId ? `No current comments match ${selectedCategoryLabel}.` : themeFilter ? 'No reviews mention this theme.' : platformFilter !== 'all' ? `No ${PLATFORM_FILTER_OPTIONS.find((option) => option.id === platformFilter)?.label ?? 'platform'} feedback returned for this market.` : 'No reviews match the current filters.'}</Text>}
          <CustomerReviewFeed reviews={visibleReviews} highlightedReview={selectedTargetReview} autoTranslateReview={selectedTargetReview} />
        </SafeView>
        {filteredReviews.length > 4 && <Pressable onPress={() => setShowAllReviews((current) => !current)} style={{ alignSelf: 'flex-start', marginTop: 8, height: 34, borderRadius: 10, borderWidth: 1, borderColor: colors.sky, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '900', color: '#3B82F6' }}>{showAllReviews ? 'Show less' : `View all ${filteredReviews.length} sentiments`}</Text></Pressable>}
      </> : <SafeView style={styles.emptyReviews}><Ionicons name="cloud-offline-outline" size={24} color={colors.faint}/><Text style={styles.emptyReviewTitle}>No recent reviews returned</Text><Text style={styles.emptyReviewText}>The source did not return usable verified feedback for this market. Start the review collector with “npm run review-server” for Playstore and Apple App Store coverage.</Text></SafeView>}
    </SafeView>;
  };

  const renderSentiment = () => <>
    <SafeView style={[styles.grid, isWide && styles.gridWide]}>
      <SafeView style={[styles.card, isWide && styles.cardWide]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Verified sentiment distribution</Text><Text style={styles.cardSub}>Counts from currently returned customer records</Text></SafeView></SafeView><SentimentBreakdown reviews={customerReviews}/></SafeView>
      <SafeView style={[styles.card, isWide && styles.cardNarrow]}><Text style={styles.cardTitle}>Actual sentiment totals</Text><SafeView style={styles.emotionList}>{[
        ['Positive', customerReviews.filter((review) => review.sentiment === 'positive').length, colors.green],
        ['Neutral', customerReviews.filter((review) => review.sentiment === 'neutral').length, colors.orange],
        ['Negative', customerReviews.filter((review) => review.sentiment === 'negative').length, colors.red],
      ].map(([label, value, tone]) => <SafeView key={String(label)} style={styles.emotionRow}><SafeView style={[styles.emotionDot, { backgroundColor: tone as string }]}/><Text style={styles.emotionLabel}>{label}</Text><Text style={styles.emotionValue}>{value}</Text></SafeView>)}</SafeView></SafeView>
    </SafeView>
    <SafeView style={[styles.card, styles.fullCard]}>
      <SafeView style={styles.cardHeader}>
        <SafeView>
          <Text style={styles.cardTitle}>Ratings by platform</Text>
          <Text style={styles.cardSub}>{`Average verified rating per source · 1–5 scale · ${selectedCountry.name}`}</Text>
        </SafeView>
        <SafeView style={[styles.liveBadge, liveError && styles.warningBadge]}><SafeView style={styles.liveDot}/><Text style={[styles.liveBadgeText, liveError && styles.warningText]}>{liveLoading ? 'LOADING' : liveError ? 'UNAVAILABLE' : 'LIVE'}</Text></SafeView>
      </SafeView>
      <PlatformRatingsChart reviews={customerReviews} platformRatings={platformRatings}/>
    </SafeView>
    {renderReviews()}
  </>;

  const renderMarkets = () => <>{renderHeadline('Markets')}{renderGlobalRatings()}{renderReviews()}</>;

  const renderCompetitors = () => {
    const selectedBrand = brandName;
    const competitorsForRanking = liveCompetitors.map((item) =>
      item.name === selectedBrand && comparisonRating !== null
        ? { ...item, rating: comparisonRating, status: 'live' as const }
        : item,
    );
    const rankedCompetitors = rankCompetitors(liveCompetitors, selectedBrand, comparisonRating);
    const countryRanks = new Map(rankedCompetitors.map((item, index) => [item.name, index + 1]));
    const sharePriceByName = new Map(competitorSharePrices.map((quote) => [quote.name, quote]));
    const selectedBrandRank = countryRanks.get(selectedBrand);
    // Corridor fees and transfer volumes only describe money-transfer brands.
    const isRemittanceBrand = !runtimeEnabled && Boolean(getBrandDailyVolume(selectedBrand) || getBrandCorridorFee(selectedCountry.code, selectedBrand));
    const topCorridor = isRemittanceBrand ? getCorridorForCountry(selectedCountry.code) : null;
    const corridorAverage = isRemittanceBrand ? getCorridorAverageFee(selectedCountry.code) : null;
    const corridorAverageCost = corridorAverage && topCorridor
      ? getBenchmarkCostOnAmount(topCorridor.benchmarkAmount, corridorAverage.average)
      : null;
    const volumeDisclosedCount = liveCompetitors.filter((item) => getBrandDailyVolume(item.name)).length;
    const sortedCompetitors = [...competitorsForRanking].sort((left, right) => {
      const leftRank = countryRanks.get(left.name) ?? Number.POSITIVE_INFINITY;
      const rightRank = countryRanks.get(right.name) ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank || left.name.localeCompare(right.name);
    });

    return <>
      {renderHeadline('Competitors')}
      {runtimeEnabled && renderTerminal('AI Terminal · competitor analysis', buildCompetitorDecisionLines({
        brand: selectedBrand,
        country: selectedCountry.name,
        rank: selectedBrandRank,
        totalRanked: rankedCompetitors.length,
        brandRating: comparisonRating,
        ranked: rankedCompetitors,
        quotes: competitorSharePrices,
        loading: liveLoading,
      }), true)}
      <SafeView style={[styles.card, styles.fullCard]}>
        <SafeView style={styles.cardHeader}>
          <SafeView style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Competitive intelligence</Text>
            <Text style={styles.cardSub}>
              {liveLoading
                ? `Refreshing ${selectedCountry.name} competitors`
                : `${selectedCountry.name} · ${selectedCountry.region} · Ranked by live store rating${topCorridor ? ` · Top corridor ${topCorridor.fromCode}→${topCorridor.toCode}` : ''}`}
            </Text>
          </SafeView>
          <SafeView style={[styles.liveBadge, liveError && styles.warningBadge]}>
            <Text style={[styles.liveBadgeText, liveError && styles.warningText]}>
              {liveError ? 'SOURCE ISSUE' : 'MARKET DATA'}
            </Text>
          </SafeView>
        </SafeView>
        <Text style={styles.competitorDataNote}>
          {runtimeEnabled ? `${modelMarket?.competitorBasis ?? 'Peer evidence unavailable.'} Suggested apps are not verified business competitors or a market-wide ranking. Share prices may be delayed.` :
            `Suggested peers are live Google Play apps from businesses in ${brandName}'s category in ${selectedCountry.name}, not verified business competitors. Peer ratings are Google Play scores; the selected brand uses available store ratings.${isRemittanceBrand ? ' Fees and volumes apply only where disclosed.' : ''} Share prices may be delayed.`}
        </Text>
        {topCorridor && corridorAverage && (
          <SafeView style={styles.corridorBenchmark}>
            <SafeView style={styles.corridorBenchmarkCell}>
              <Text style={styles.corridorBenchmarkLabel}>TOP CORRIDOR</Text>
              <Text style={styles.corridorBenchmarkValue}>{`${topCorridor.fromName} → ${topCorridor.toName}`}</Text>
              <Text style={styles.corridorBenchmarkMeta}>{`${topCorridor.direction === 'inbound' ? 'Inbound to' : 'Outbound from'} ${selectedCountry.name} · ${topCorridor.benchmarkAmount} benchmark`}</Text>
            </SafeView>
            <SafeView style={styles.corridorBenchmarkCell}>
              <Text style={styles.corridorBenchmarkLabel}>AVG TRANSACTION FEE</Text>
              <Text style={styles.corridorBenchmarkValue}>{`${corridorAverage.average.toFixed(1)}%`}</Text>
              <Text style={styles.corridorBenchmarkMeta}>{`${corridorAverageCost ?? ''} · ${corridorAverage.coveredBrands} brands covered`}</Text>
            </SafeView>
            <SafeView style={styles.corridorBenchmarkCell}>
              <Text style={styles.corridorBenchmarkLabel}>DAILY VOLUME DISCLOSURE</Text>
              <Text style={styles.corridorBenchmarkValue}>{`${volumeDisclosedCount} of ${liveCompetitors.length || '—'}`}</Text>
              <Text style={styles.corridorBenchmarkMeta}>Brands reporting global avg. transactions/day</Text>
            </SafeView>
          </SafeView>
        )}
        <SafeView style={styles.selectedBrandSummary}>
          <SafeView style={styles.selectedBrandSummaryMark}>
            <Ionicons name="ribbon-outline" size={16} color={colors.primary} />
          </SafeView>
          <SafeView style={styles.selectedBrandSummaryCopy}>
            <Text style={styles.selectedBrandSummaryLabel}>YOUR BRAND · {selectedBrand}</Text>
            <Text style={styles.selectedBrandSummaryRank}>
              {selectedBrandRank
                ? `Ranked #${selectedBrandRank} of ${rankedCompetitors.length} in ${selectedCountry.name} · ${selectedCountry.region}`
                : `Country rank unavailable for ${selectedCountry.name} · ${selectedCountry.region}`}
            </Text>
          </SafeView>
          <Text style={styles.selectedBrandSummaryValue}>
            {selectedBrandRank ? `#${selectedBrandRank}` : '—'}
          </Text>
        </SafeView>
        <ScrollView horizontal showsHorizontalScrollIndicator>
          <SafeView style={[styles.competitorTable, !isRemittanceBrand && styles.competitorTableCompact]}>
            <SafeView style={[styles.competitorTableRow, styles.competitorTableHeader]}>
              <Text style={[styles.competitorTableHeading, styles.competitorNameColumn]}>Competitor</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorRatingColumn]}>App rating</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorReviewsColumn]}>Reviews</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorShareColumn]}>Share price</Text>
              {isRemittanceBrand && <Text style={[styles.competitorTableHeading, styles.competitorFeeColumn]}>Transfer fees</Text>}
              {isRemittanceBrand && <Text style={[styles.competitorTableHeading, styles.competitorVolumeColumn]}>Avg. transactions/day</Text>}
              <Text style={[styles.competitorTableHeading, styles.competitorRankColumn]}>Country rank</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorStatusColumn]}>Status</Text>
            </SafeView>
            {sortedCompetitors.map((item) => {
              const quote = sharePriceByName.get(item.name);
              const rank = countryRanks.get(item.name);
              const isSelectedBrand = item.name === selectedBrand;
              const corridorFee = getBrandCorridorFee(selectedCountry.code, item.name);
              const dailyVolume = getBrandDailyVolume(item.name);
              return (
                <SafeView
                  key={item.name}
                  style={[
                    styles.competitorTableRow,
                    styles.competitorRow,
                    isSelectedBrand && styles.competitorSelectedStrong,
                  ]}
                >
                  <SafeView style={[styles.competitorNameCell, styles.competitorNameColumn]}>
                    <SafeView style={[styles.appMark, isSelectedBrand && styles.appMarkPrimary]}>
                      <Text style={[styles.appMarkText, isSelectedBrand && styles.appMarkTextPrimary]}>{item.name[0]}</Text>
                    </SafeView>
                    <SafeView style={styles.competitorName}>
                      <Text numberOfLines={1} style={styles.appName}>{item.name}</Text>
                      <Text numberOfLines={1} style={styles.sourceMeta}>
                        {isSelectedBrand ? 'Your selected brand' : item.status === 'live' ? `Stores · ${selectedCountry.code}` : 'No store result'}
                      </Text>
                    </SafeView>
                  </SafeView>
                  <Text style={[styles.competitorMetricValue, styles.competitorRatingColumn]}>
                    {isSelectedBrand && comparisonRating !== null ? `${comparisonRating.toFixed(1)} / 5` : item.rating !== null ? `${item.rating.toFixed(1)} / 5` : '—'}
                  </Text>
                  <Text style={[styles.competitorMetricValue, styles.competitorReviewsColumn]}>
                    {item.reviewCount !== null ? item.reviewCount.toLocaleString() : '—'}
                  </Text>
                  <SafeView style={[styles.competitorMetricCell, styles.competitorShareColumn]}>
                    <Text style={styles.competitorMetricValue}>
                      {sharePricesLoading
                        ? 'Loading…'
                        : quote?.status === 'not-listed'
                          ? 'Not listed'
                          : quote?.status === 'live'
                            ? formatSharePrice(quote)
                            : 'Unavailable'}
                    </Text>
                    <Text numberOfLines={1} style={styles.competitorMetricNote}>
                      {quote?.status === 'live'
                        ? `${quote.symbol} · ${formatQuoteTime(quote.quoteTime)}`
                        : quote?.status === 'not-listed'
                          ? 'No separate public listing'
                          : 'Quote feed unavailable'}
                    </Text>
                  </SafeView>
                  {isRemittanceBrand && <SafeView style={[styles.competitorMetricCell, styles.competitorFeeColumn]}>
                    {corridorFee && topCorridor ? (
                      <>
                        <Text style={styles.competitorMetricValue}>{formatFeeRange(corridorFee)}</Text>
                        <Text numberOfLines={1} style={styles.competitorMetricNote}>
                          {`${topCorridor.fromCode}→${topCorridor.toCode} · ${topCorridor.benchmarkAmount}`}
                        </Text>
                        {corridorAverage && (() => {
                          const delta = getFeeDelta(corridorFee, corridorAverage.average);
                          return (
                            <Text numberOfLines={1} style={[
                              styles.competitorMetricNote,
                              delta.direction === 'below' && styles.feeDeltaBelow,
                              delta.direction === 'above' && styles.feeDeltaAbove,
                            ]}>
                              {delta.text}
                            </Text>
                          );
                        })()}
                      </>
                    ) : (
                      <>
                        <Text style={styles.competitorMetricMuted}>Not covered</Text>
                        <Text style={styles.competitorMetricNote}>No corridor fee data</Text>
                      </>
                    )}
                  </SafeView>}
                  {isRemittanceBrand && <SafeView style={[styles.competitorMetricCell, styles.competitorVolumeColumn]}>
                    {dailyVolume ? (
                      <>
                        <Text style={styles.competitorMetricValue}>{`~${formatDailyVolume(dailyVolume.avgPerDay)}`}</Text>
                        <Text numberOfLines={1} style={styles.competitorMetricNote}>
                          {`Global · ${dailyVolume.basis}`}
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.competitorMetricMuted}>Not reported</Text>
                        <Text style={styles.competitorMetricNote}>No public disclosure</Text>
                      </>
                    )}
                  </SafeView>}
                  <SafeView style={[
                    styles.competitorMetricCell,
                    styles.competitorRankColumn,
                    isSelectedBrand && styles.selectedBrandRankCell,
                  ]}>
                    <Text style={[
                      styles.competitorRankValue,
                      isSelectedBrand && styles.selectedBrandRankValue,
                    ]}>{rank ? `#${rank}` : '—'}</Text>
                    <Text style={[
                      styles.competitorMetricNote,
                      isSelectedBrand && styles.selectedBrandRankNote,
                    ]}>{isSelectedBrand ? 'YOUR BRAND' : 'By store rating'}</Text>
                  </SafeView>
                  <Text style={[
                    styles.competitorStatus,
                    styles.competitorStatusColumn,
                    item.status === 'live' ? styles.verified : styles.unavailable,
                  ]}>
                    {item.status === 'live' ? 'Live' : 'Unavailable'}
                  </Text>
                </SafeView>
              );
            })}
            {!liveCompetitors.length && (
              <Text style={styles.competitorEmpty}>
                {liveLoading ? 'Loading competitor data…' : competitorError
                  ? 'Live peer discovery is temporarily unavailable. Refresh ratings to retry.'
                  : `No live category peers found for ${brandName} in ${selectedCountry.name}. No preset competitors are substituted.`}
              </Text>
            )}
          </SafeView>
        </ScrollView>
      </SafeView>
      {renderReviews()}
    </>;
  };

  const renderSources = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Sources & integrations</Text><Text style={styles.cardSub}>Review live availability and credential requirements</Text></SafeView><SafeView style={styles.liveBadge}><SafeView style={styles.liveDot}/><Text style={styles.liveBadgeText}>CONFIGURATION</Text></SafeView></SafeView><SafeView style={styles.settingsGrid}>{sourceConfigs.map((source) => { const connected = source.status === 'public' || source.status === 'connected'; return <SafeView key={source.name} style={styles.sourceSetting}><SafeView style={styles.sourceIcon}><Ionicons name={source.credential === 'public' ? 'globe-outline' : 'key-outline'} size={18} color={colors.primary}/></SafeView><SafeView style={styles.sourceSettingCopy}><Text style={styles.sourceSettingTitle}>{source.name}</Text><Text style={styles.sourceSettingDetail}>{source.detail}</Text></SafeView><SafeView style={[styles.connectionStatus, connected && styles.connectionStatusLive]}><Text style={[styles.connectionStatusText, connected && styles.connectionStatusTextLive]}>{source.status === 'connected' ? 'Connected' : source.status === 'public' ? 'Public' : 'Setup required'}</Text></SafeView></SafeView>; })}</SafeView><SafeView style={styles.integrationNotice}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary}/><SafeView style={styles.integrationNoticeCopy}><Text style={styles.integrationNoticeTitle}>Secure credential setup</Text><Text style={styles.integrationNoticeText}>Google Play and Apple App Store reviews are collected through the backend. Meta, LinkedIn, X, Trustpilot, and Reviews.io credentials must be stored server-side and must never be committed to Expo public environment variables.</Text></SafeView></SafeView><Text style={[styles.settingsLabel, { marginTop: 18 }]}>Credential workspace</Text><Text style={styles.integrationNoticeText}>Production secrets belong in a backend or secret vault. The required server-side variable names and setup template are in `.env.example`.</Text><SafeView style={styles.toggleRow}><SafeView><Text style={styles.settingsLabel}>Automatic refresh</Text><Text style={styles.settingsDetail}>Refresh live public ratings every 6 hours</Text></SafeView><Switch value={autoRefresh} onValueChange={setAutoRefresh} trackColor={{ true: colors.primary, false: '#D0D5DD'}}/></SafeView><SafeView style={styles.toggleRow}><SafeView><Text style={styles.settingsLabel}>Sentiment alerts</Text><Text style={styles.settingsDetail}>Notify when negative sentiment exceeds a threshold</Text></SafeView><Switch value={alerts} onValueChange={setAlerts} trackColor={{ true: colors.primary, false: '#D0D5DD'}}/></SafeView></SafeView></>;

  const renderInsights = () => {
    return <>
      {renderHeadline('AI Insights')}
      {runtimeEnabled && renderTerminal('AI Terminal · runtime feed', undefined, true)}
      <SafeView style={[styles.card, styles.fullCard]}>
        <SafeView style={styles.cardHeader}>
          <SafeView>
            <Text style={styles.cardTitle}>Live data brief</Text>
            <Text style={styles.cardSub}>What to fix, what is working, how you compare</Text>
          </SafeView>
          <SafeView style={styles.liveBadge}>
            <SafeView style={styles.liveDot} />
            <Text style={styles.liveBadgeText}>{liveLoading ? 'UPDATING' : 'LIVE REVIEW SIGNALS'}</Text>
          </SafeView>
        </SafeView>
        <AIInsightsBrief
          reviews={customerReviews}
          competitors={liveCompetitors}
          brand={brandName}
          brandRating={comparisonRating}
          country={selectedCountry.name}
          months={durationMonths}
          loading={liveLoading}
          onSelectCategory={handleIssueCategorySelect}
          onOpenSources={() => setActiveSection('Sources')}
        />
      </SafeView>
    </>;
  };

  const renderReports = () => runtimeEnabled
    ? <SafeView style={[styles.card, styles.fullCard]}><Text style={styles.cardTitle}>Executive reports</Text><Text style={styles.cardSub}>Report export is not available for runtime models. No sample reports are presented as generated results.</Text></SafeView>
    : <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Executive reports</Text><Text style={styles.cardSub}>Board-ready exports and recurring digests</Text></SafeView><Pressable style={styles.primaryButton}><Ionicons name="download-outline" size={15} color="#fff"/><Text style={styles.primaryButtonText}>Generate report</Text></Pressable></SafeView>{[['Global Sentiment Brief','Updated 12 minutes ago','PDF'],['Competitive Market Review','Updated yesterday','PPTX'],['Customer Voice Summary','Updated weekly','XLSX']].map((item,index)=><SafeView key={item[0]} style={styles.reportRow}><SafeView style={styles.reportIcon}><Ionicons name={index===0?'document-text-outline':index===1?'stats-chart-outline':'grid-outline'} size={18} color={colors.primary}/></SafeView><SafeView style={styles.reportCopy}><Text style={styles.reportTitle}>{item[0]}</Text><Text style={styles.reportMeta}>{item[1]}</Text></SafeView><SafeView style={styles.formatBadge}><Text style={styles.formatText}>{item[2]}</Text></SafeView><Pressable style={styles.reportAction}><Ionicons name="ellipsis-horizontal" size={18} color={colors.faint}/></Pressable></SafeView>)}</SafeView></>;

  const renderAlerts = () => {
    const negative = customerReviews.filter((review) => review.sentiment === 'negative').length;
    const positive = customerReviews.filter((review) => review.sentiment === 'positive').length;
    const alertsData = negative > 0
      ? [['Negative feedback', `${negative} verified negative customer records returned`, 'Current collection', 'alert-circle-outline', colors.red]]
      : [['Sentiment status', 'No verified negative records returned in this collection', 'Current collection', 'checkmark-circle-outline', colors.green]];
    if (positive > 0) alertsData.push(['Positive feedback', `${positive} verified positive customer records returned`, 'Current collection', 'trending-up-outline', colors.green]);
    return <SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Alert center</Text><Text style={styles.cardSub}>Live sentiment counts; no estimated anomalies</Text></SafeView></SafeView>{alertsData.map((item) => <SafeView key={item[1]} style={styles.alertRow}><SafeView style={[styles.alertIcon,{backgroundColor:`${item[4]}14`}]}><Ionicons name={item[3] as any} size={18} color={item[4]}/></SafeView><SafeView style={styles.alertCopy}><Text style={styles.alertTitle}>{item[1]}</Text><Text style={styles.alertMeta}>{item[0]} · {item[2]}</Text></SafeView></SafeView>)}</SafeView>;
  };

  const renderTeam = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Partner team</Text><Text style={styles.cardSub}>Workspace roles, access, and collaboration</Text></SafeView><Pressable style={styles.primaryButton}><Ionicons name="person-add-outline" size={15} color="#fff"/><Text style={styles.primaryButtonText}>Invite member</Text></Pressable></SafeView>{[['AV','Alex Morgan','Global Strategy','Owner','A'],['SC','Sarah Chen','Customer Insights','Admin','S'],['JM','James Miller','Regional Operations','Analyst','J']].map((member)=><SafeView key={member[1]} style={styles.memberRow}><SafeView style={[styles.memberAvatar,{backgroundColor:member[4]==='A'?colors.primary:member[4]==='S'?colors.green:colors.orange}]}><Text style={styles.memberAvatarText}>{member[0]}</Text></SafeView><SafeView style={styles.memberCopy}><Text style={styles.memberName}>{member[1]}</Text><Text style={styles.memberMeta}>{member[2]}</Text></SafeView><SafeView style={styles.roleBadge}><Text style={styles.roleText}>{member[3]}</Text></SafeView></SafeView>)}</SafeView></>;

  const renderSettings = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Workspace settings</Text><Text style={styles.cardSub}>Brand, monitoring, and reporting configuration</Text></SafeView></SafeView><SafeView style={styles.settingsGrid}><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Brand name</Text><TextInput defaultValue={brandName} style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Primary website</Text><TextInput defaultValue={brandWebsite} style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Business domain</Text><TextInput defaultValue="Money transfer" style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Reporting cadence</Text><TextInput defaultValue="Daily" style={styles.settingsInput}/></SafeView></SafeView><SafeView style={styles.settingsActions}><Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Discard</Text></Pressable><Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Save configuration</Text></Pressable></SafeView></SafeView></>;

  const renderContent = () => {
    if (runtimeEnabled && ['Sources', 'Settings'].includes(activeSection)) return <>
      {renderRuntimeStatus()}
      <SafeView style={[styles.card, styles.fullCard]}>
        <Text style={styles.cardTitle}>Monitoring configuration</Text>
        <Text style={styles.cardSub}>{runtimeSetup.config?.website} · {runtimeSetup.config?.businessType || 'Industry not specified'}</Text>
        <Text style={styles.cardSub}>Selected markets: {selectedMarkets.map((market) => market.name).join(', ')}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/')} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Create a different model</Text>
        </Pressable>
      </SafeView>
    </>;
    if (runtimeEnabled && activeSection === 'Team') return <SafeView style={[styles.card, styles.fullCard]}>
      <Text style={styles.cardTitle}>Team</Text><Text style={styles.cardSub}>Team management is not configured for this runtime model.</Text>
    </SafeView>;
    return activeSection === 'Sentiment' ? renderSentiment() : activeSection === 'Markets' ? renderMarkets() : activeSection === 'Competitors' ? renderCompetitors() : activeSection === 'AI Insights' ? renderInsights() : activeSection === 'Reports' ? renderReports() : activeSection === 'Alerts' ? renderAlerts() : activeSection === 'Team' ? renderTeam() : activeSection === 'Sources' ? renderSources() : activeSection === 'Settings' ? renderSettings() : renderOverview();
  };

  return <SafeAreaView style={styles.safe}><Animated.View style={{ flex: 1, opacity: screenEntrance, transform: [{ translateY: screenEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}><Modal visible={durationPullVisible} transparent animationType="fade" onRequestClose={() => setDurationPullVisible(false)}><Pressable onPress={() => setDurationPullVisible(false)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,24,40,0.38)', padding: 20 }}><Pressable style={{ width: 390, maxWidth: '100%', borderRadius: 16, backgroundColor: colors.card, padding: 22, borderWidth: 1, borderColor: colors.line, shadowColor: '#101828', shadowOpacity: 0.16, shadowRadius: 20, elevation: 12 }}><SafeView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><SafeView style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primarySoft, marginRight: 12 }}><Ionicons name="cloud-download-outline" size={22} color={colors.primary} /></SafeView><SafeView style={{ flex: 1 }}><Text style={{ fontSize: 16, fontFamily: fonts.black, color: colors.navy }}>Pulling review feeds</Text><Text style={{ marginTop: 3, fontSize: 11, color: colors.muted }}>Last {durationMonths} {durationMonths === 1 ? 'month' : 'months'} for {selectedCountry.name}</Text></SafeView><Text style={{ fontSize: 13, fontFamily: fonts.black, color: colors.primary }}>{durationPullProgress}%</Text></SafeView><SafeView style={{ height: 8, borderRadius: 8, backgroundColor: colors.lineSoft, overflow: 'hidden' }}><SafeView style={{ height: 8, width: `${durationPullProgress}%`, borderRadius: 8, backgroundColor: colors.primary }} /></SafeView><SafeView style={{ marginTop: 16, gap: 10 }}>{[['logo-google', 'Google Play', durationPullProgress < 55], ['logo-apple', 'App Store', durationPullProgress < 82]].map(([icon, source, pending]) => <SafeView key={String(source)} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={icon as any} size={17} color={pending ? colors.faint : colors.green} /><Text style={{ flex: 1, marginLeft: 9, fontSize: 12, fontFamily: fonts.bold, color: '#3B4154' }}>{source}</Text><Text style={{ fontSize: 11, fontFamily: fonts.bold, color: pending ? colors.faint : colors.greenText }}>{durationPullProgress >= 100 ? 'Complete' : pending ? 'Pulling…' : 'Verified'}</Text></SafeView>)}</SafeView></Pressable></Pressable></Modal><SafeView style={styles.appShell}>{isWide && <SafeView style={styles.sidebar}><Pressable onPress={() => router.replace('/')} style={styles.brandRow}><SafeView style={styles.logo}><Ionicons name="pulse" size={19} color={colors.card}/></SafeView><SafeView><Text style={styles.brand}>PulseBoard</Text><Text style={styles.brandSubtitle}>Brand intelligence</Text></SafeView></Pressable><SafeView style={styles.workspace}><Text style={styles.workspaceLabel}>WORKSPACE</Text><SafeView style={styles.workspaceRow}><SafeView style={styles.wuMark}><Text style={styles.wuMarkText}>{brandInitials}</Text></SafeView><SafeView><Text style={styles.workspaceName}>{brandName}</Text><Text style={styles.workspaceMeta}>Global intelligence</Text></SafeView></SafeView></SafeView><SafeView style={styles.nav}>{nav.map(([icon,label]) => <Pressable key={label} onPress={() => setActiveSection(label)} style={[styles.navItem, activeSection === label && styles.navActive]}><Ionicons name={icon as any} size={18} color={activeSection === label ? colors.primary : colors.faint}/><Text style={[styles.navText, activeSection === label && styles.navTextActive]}>{label}</Text>{label === 'Sources' && <SafeView style={styles.navCount}><Text style={styles.navCountText}>1</Text></SafeView>}</Pressable>)}</SafeView><SafeView style={styles.engineCard}><SafeView style={styles.engineHeader}><Ionicons name="sparkles" size={16} color={colors.card}/><Text style={styles.engineTitle}>AI intelligence</Text></SafeView><Text style={styles.engineText}>{liveLoading ? 'Collecting verified sources' : liveError ? 'Public sources need attention' : 'Live collection active'}</Text><SafeView style={styles.engineFooter}><SafeView style={styles.liveDot}/><Text style={styles.engineStatus}>{liveError ? 'Limited coverage' : 'Operational'}</Text></SafeView></SafeView></SafeView>}<ScrollView ref={mainScrollRef} style={styles.main} contentContainerStyle={styles.content}><SafeView style={styles.header}><SafeView style={styles.headerIdentity}>{!isNarrow && <SafeView style={styles.headerBezel}><SafeView style={styles.headerGauge}><Ionicons name="speedometer-outline" size={20} color={colors.card} /></SafeView></SafeView>}<SafeView style={styles.headerTitleCopy}><Text style={styles.eyebrow}>{`${brandName.toUpperCase()} · GLOBAL BRAND INTELLIGENCE`}</Text><Text style={[styles.title, isNarrow && styles.titleNarrow]} numberOfLines={2}>{activeSection === 'Sources' ? 'Data sources' : activeSection === 'Settings' ? 'Workspace settings' : activeSection === 'Overview' ? 'Executive overview' : activeSection === 'Competitors' ? 'Competitive analysis' : activeSection === 'Markets' ? 'Global market performance' : activeSection === 'AI Insights' ? 'AI executive brief' : activeSection === 'Reports' ? 'Executive reports' : activeSection === 'Alerts' ? 'Alert center' : activeSection === 'Team' ? 'Partner team' : 'Sentiment intelligence'}</Text></SafeView></SafeView><SafeView style={styles.headerActions}>{!isNarrow && <Pressable onPress={() => setActiveSection('Alerts')} style={styles.iconButton}><Ionicons name="notifications-outline" size={18} color={colors.primary}/><SafeView style={styles.notificationDot}/></Pressable>}<SafeView style={{ position: 'relative' }}><Pressable onPress={() => setDurationPickerVisible(true)} style={styles.period}><Ionicons name="calendar-outline" size={16} color={colors.primary}/><Text style={styles.periodText}>Last {durationMonths} {durationMonths === 1 ? 'month' : 'months'}</Text><Ionicons name="chevron-down-outline" size={14} color={colors.primary}/></Pressable><Modal visible={durationPickerVisible} transparent animationType="fade" onRequestClose={() => setDurationPickerVisible(false)}><Pressable onPress={() => setDurationPickerVisible(false)} style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 72, paddingRight: 88, backgroundColor: 'rgba(16,24,40,0.08)' }}><SafeView style={{ width: 170, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.card, shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>{[1,2,3,4,5,6].map((month) => <Pressable key={month} onPress={() => selectDuration(month)} style={{ height: 40, paddingHorizontal: 10, borderRadius: 8, justifyContent: 'center', backgroundColor: durationMonths === month ? colors.primarySoft : '#fff' }}><Text style={{ fontSize: 12, fontFamily: durationMonths === month ? fonts.black : fonts.bold, color: durationMonths === month ? colors.primary : colors.muted }}>Last {month} {month === 1 ? 'month' : 'months'}</Text></Pressable>)}</SafeView></Pressable></Modal></SafeView><Pressable style={styles.avatar}><Text style={styles.avatarText}>{brandInitials}</Text></Pressable><HeaderPulse /></SafeView></SafeView>{!isWide && <ScrollView horizontal showsHorizontalScrollIndicator={false}><SafeView style={styles.mobileNav}>{nav.map(([icon,label]) => <Pressable key={label} onPress={() => setActiveSection(label)} style={[styles.mobileNavItem, activeSection === label && styles.mobileNavActive]}><Ionicons name={icon as any} size={14} color={activeSection === label ? colors.card : colors.faint}/><Text style={[styles.mobileNavText, activeSection === label && styles.mobileNavTextActive]}>{label}</Text></Pressable>)}</SafeView></ScrollView>}{renderContent()}</ScrollView></SafeView></Animated.View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:colors.canvas},appShell:{flex:1,flexDirection:'row',overflow:'hidden'},sidebar:{zIndex:1,width:236,padding:18,borderRightWidth:1,borderRightColor:colors.line,backgroundColor:colors.card},brandRow:{height:58,flexDirection:'row',alignItems:'center'},logo:{width:38,height:38,borderRadius:12,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',marginRight:10,shadowColor:colors.primaryDark,shadowOpacity:0.25,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:3},brand:{fontSize:17,fontFamily:fonts.black,color:colors.navy},brandSubtitle:{fontSize:10,color:colors.faint,marginTop:2},workspace:{marginTop:18,padding:12,borderRadius:14,backgroundColor:colors.primaryTint,borderWidth:1,borderColor:colors.line},workspaceLabel:{fontSize:9,fontFamily:fonts.black,letterSpacing:1.4,color:colors.primary,marginBottom:9},workspaceRow:{flexDirection:'row',alignItems:'center'},wuMark:{width:34,height:34,borderRadius:17,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',marginRight:8},wuMarkText:{fontSize:10,fontFamily:fonts.black,color:colors.onPrimary},workspaceName:{fontSize:12,fontFamily:fonts.bold,color:colors.navy},workspaceMeta:{fontSize:9,color:colors.faint,marginTop:2},nav:{marginTop:22,gap:5},navItem:{height:44,borderRadius:12,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:10,borderWidth:1,borderColor:'transparent'},navActive:{backgroundColor:colors.primarySoft,borderColor:colors.primarySoft},navText:{flex:1,fontSize:12,fontFamily:fonts.bold,color:colors.muted},navTextActive:{color:colors.primary},navCount:{width:20,height:20,borderRadius:10,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center'},navCountText:{fontSize:9,fontFamily:fonts.black,color:colors.onPrimary},engineCard:{marginTop:'auto',padding:14,borderRadius:16,backgroundColor:colors.primary,shadowColor:colors.primaryDark,shadowOpacity:0.3,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:4},engineHeader:{flexDirection:'row',alignItems:'center',gap:7},engineTitle:{fontSize:11,fontFamily:fonts.bold,color:colors.onPrimary},engineText:{fontSize:10,lineHeight:15,color:'#DBEAFE',marginTop:9},engineFooter:{flexDirection:'row',alignItems:'center',gap:6,marginTop:9},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:'#34D399'},engineStatus:{fontSize:9,fontFamily:fonts.bold,color:'#A7F3D0'},
  main:{flex:1,backgroundColor:colors.canvas,zIndex:1},content:{padding:14,paddingBottom:50,maxWidth:1320,width:'100%',alignSelf:'center'},header:{minHeight:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,paddingHorizontal:16,paddingVertical:10,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,overflow:'hidden',shadowColor:colors.primary,shadowOpacity:0.07,shadowRadius:16,shadowOffset:{width:0,height:6},elevation:3},headerIdentity:{flexDirection:'row',alignItems:'center',flex:1},headerBezel:{width:48,height:48,borderRadius:24,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},headerGauge:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:colors.primary},headerTitleCopy:{flex:1},eyebrow:{fontSize:9,fontFamily:fonts.black,letterSpacing:1.5,color:colors.primary,marginBottom:3},title:{fontSize:24,fontFamily:fonts.black,color:colors.navy,letterSpacing:-0.4},titleNarrow:{fontSize:17,lineHeight:22},headerActions:{flexDirection:'row',alignItems:'center',gap:8},period:{height:38,borderRadius:19,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,paddingHorizontal:12,flexDirection:'row',alignItems:'center'},periodText:{fontSize:11,fontFamily:fonts.bold,color:colors.primary,marginLeft:6},avatar:{width:38,height:38,borderRadius:19,backgroundColor:colors.primary,alignItems:'center',justifyContent:'center',shadowColor:colors.primaryDark,shadowOpacity:0.25,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:3},avatarText:{fontSize:10,fontFamily:fonts.black,color:colors.onPrimary},mobileNav:{flexDirection:'row',gap:6,paddingBottom:10},mobileNavItem:{height:36,paddingHorizontal:10,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,flexDirection:'row',alignItems:'center',gap:5},mobileNavActive:{backgroundColor:colors.primary,borderColor:colors.primary},mobileNavText:{fontSize:10,fontFamily:fonts.bold,color:colors.muted},mobileNavTextActive:{color:colors.onPrimary},
  filterBar:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,paddingHorizontal:12,flexDirection:'row',alignItems:'center',marginBottom:12,shadowColor:colors.primary,shadowOpacity:0.06,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:2},filterLabel:{fontSize:10,fontFamily:fonts.black,color:colors.muted,width:78},regionRow:{flexDirection:'row',gap:6},regionChip:{height:32,paddingHorizontal:12,borderRadius:16,borderWidth:1,borderColor:colors.line,alignItems:'center',justifyContent:'center',backgroundColor:colors.card},regionChipActive:{borderColor:colors.primary,backgroundColor:colors.primary},regionText:{fontSize:10,fontFamily:fonts.bold,color:colors.muted},regionTextActive:{color:colors.onPrimary},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:12},kpi:{minWidth:210,flexGrow:1,flexBasis:210,height:108,borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,padding:15,flexDirection:'row',alignItems:'center',shadowColor:colors.primary,shadowOpacity:0.07,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2},kpiIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',marginRight:11,backgroundColor:colors.primarySoft},kpiCopy:{flex:1},kpiLabel:{fontSize:10,fontFamily:fonts.bold,color:colors.muted,textTransform:'uppercase',letterSpacing:0.5},kpiValue:{fontSize:22,fontFamily:fonts.black,color:colors.navy,marginTop:3},kpiChange:{fontSize:9,fontFamily:fonts.bold,marginTop:3},
  grid:{gap:12},gridWide:{flexDirection:'row'},  card:{borderRadius:18,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,padding:16,minWidth:280,shadowColor:colors.primary,shadowOpacity:0.07,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2},dashboardCard:{borderColor:colors.line,backgroundColor:colors.card},cardWide:{flex:1.35},cardNarrow:{flex:1},fullCard:{marginTop:12,width:'100%'},scorecardGauges:{marginTop:8,alignItems:'center'},sectionCluster:{flexDirection:'row',alignItems:'center',flex:1},sectionGauge:{width:44,height:44,borderRadius:14,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.primarySoft},sectionGaugeNeedle:{width:20,height:3,borderRadius:2,backgroundColor:colors.primary,transform:[{rotate:'-35deg'}]},cardHeader:{minHeight:64,marginHorizontal:-16,marginTop:-16,marginBottom:12,paddingHorizontal:16,paddingVertical:10,borderTopLeftRadius:18,borderTopRightRadius:18,borderBottomWidth:1,borderBottomColor:colors.lineSoft,flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:colors.card,overflow:'hidden'},cardTitle:{fontSize:14,fontFamily:fonts.black,color:colors.navy,letterSpacing:0.35,textTransform:'uppercase'},cardSub:{fontSize:10,lineHeight:15,color:colors.faint,marginTop:4,letterSpacing:0.15},liveBadge:{height:26,paddingHorizontal:9,borderRadius:13,backgroundColor:colors.greenSoft,borderWidth:1,borderColor:'#A6F4C5',flexDirection:'row',alignItems:'center',gap:5},liveBadgeText:{fontSize:8,fontFamily:fonts.black,color:colors.greenText,letterSpacing:0.5},warningBadge:{backgroundColor:colors.orangeSoft,borderColor:'#FEDF89'},warningText:{color:colors.orangeText},countryPills:{flexDirection:'row',gap:6,paddingTop:8},countryPill:{height:34,paddingHorizontal:10,borderRadius:17,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,justifyContent:'center'},countryPillActive:{backgroundColor:colors.primary,borderColor:colors.primary},countryPillText:{fontSize:10,fontFamily:fonts.bold,color:colors.muted},countryPillTextActive:{color:colors.onPrimary},chartWrap:{marginTop:5,backgroundColor:colors.card,borderRadius:12,padding:10,borderWidth:1,borderColor:colors.line},rankHero:{height:82,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:colors.line},rankValue:{fontSize:42,fontFamily:fonts.black,color:colors.navy},rankCaption:{fontSize:9,color:colors.faint,marginTop:-4},rankBadge:{height:28,paddingHorizontal:8,borderRadius:14,backgroundColor:colors.greenSoft,borderWidth:1,borderColor:'#A6F4C5',flexDirection:'row',alignItems:'center',gap:3},rankBadgeNegative:{backgroundColor:colors.redSoft,borderColor:'#FECDCA'},rankBadgeText:{fontSize:9,fontFamily:fonts.bold,color:colors.greenText},rankBarRow:{marginTop:10},rankBarLabel:{flexDirection:'row',justifyContent:'space-between',marginBottom:5},rankBarName:{fontSize:10,fontFamily:fonts.bold,color:colors.muted},rankBarValue:{fontSize:10,fontFamily:fonts.black,color:colors.navy},rankTrack:{height:7,borderRadius:4,backgroundColor:'#E9EEF8'},rankFill:{height:7,borderRadius:4},
  emotionList:{marginTop:18,gap:10},emotionRow:{height:32,flexDirection:'row',alignItems:'center'},emotionDot:{width:8,height:8,borderRadius:4,marginRight:7},emotionLabel:{width:82,fontSize:11,color:colors.muted,fontFamily:fonts.bold},emotionTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#E9EEF8',marginRight:8},emotionFill:{height:7,borderRadius:4},emotionValue:{width:34,textAlign:'right',fontSize:10,fontFamily:fonts.black,color:colors.navy},
  platformLabel:{width:96,fontSize:11,color:colors.muted,fontFamily:fonts.bold,marginRight:8},platformValue:{width:110,textAlign:'right',fontSize:10,fontFamily:fonts.black,color:colors.navy},
  reviewRow:{flexDirection:'row',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:colors.line},sentimentIcon:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},sentimentPositive:{backgroundColor:colors.greenSoft},sentimentNegative:{backgroundColor:colors.redSoft},sentimentNeutral:{backgroundColor:colors.orangeSoft},reviewContent:{flex:1},reviewMeta:{flexDirection:'row',justifyContent:'space-between'},reviewAuthor:{fontSize:11,fontFamily:fonts.black,color:colors.navy},reviewRating:{fontSize:10,fontFamily:fonts.bold,color:colors.orange},reviewText:{fontSize:11,lineHeight:17,color:colors.text,marginTop:4},reviewSource:{fontSize:9,fontFamily:fonts.bold,color:colors.faint,marginTop:5},emptyReviews:{minHeight:120,alignItems:'center',justifyContent:'center',padding:20,borderRadius:12,backgroundColor:colors.primaryTint,borderWidth:1,borderColor:colors.line},emptyReviewTitle:{fontSize:12,fontFamily:fonts.black,color:colors.navy,marginTop:8},emptyReviewText:{fontSize:10,lineHeight:16,color:colors.muted,textAlign:'center',maxWidth:440,marginTop:4},
  marketRow:{minHeight:58,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:colors.line,paddingHorizontal:4,borderRadius:6},marketRowActive:{backgroundColor:colors.primarySoft},flag:{width:34,height:25,borderRadius:5,backgroundColor:'#E9EEF8',alignItems:'center',justifyContent:'center'},flagText:{fontSize:8,fontFamily:fonts.black,color:colors.primaryDark},marketName:{width:150,marginLeft:10},marketTitle:{fontSize:11,fontFamily:fonts.bold,color:colors.navy},marketRegion:{fontSize:9,color:colors.faint,marginTop:2},marketTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#E9EEF8',marginHorizontal:12},marketFill:{height:7,borderRadius:4,backgroundColor:colors.primary},marketScore:{width:62,fontSize:11,fontFamily:fonts.black,color:colors.navy},marketRank:{width:40,fontSize:11,fontFamily:fonts.black,color:colors.primaryDark,textAlign:'right'},
  competitorDataNote:{fontSize:9,lineHeight:15,color:colors.muted,marginBottom:10},corridorBenchmark:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:12,paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:colors.line,backgroundColor:colors.primaryTint},corridorBenchmarkCell:{flexGrow:1,minWidth:180},corridorBenchmarkLabel:{fontSize:8,fontFamily:fonts.black,letterSpacing:0.35,color:colors.faint,textTransform:'uppercase'},corridorBenchmarkValue:{marginTop:3,fontSize:13,fontFamily:fonts.black,color:colors.navy},corridorBenchmarkMeta:{marginTop:3,fontSize:8,lineHeight:12,color:colors.faint},feeDeltaBelow:{color:colors.greenText,fontFamily:fonts.bold},feeDeltaAbove:{color:colors.red,fontFamily:fonts.bold},competitorTable:{width:1029},competitorTableCompact:{width:719},competitorTableRow:{minHeight:58,flexDirection:'row',alignItems:'center'},competitorTableHeader:{minHeight:38,borderBottomWidth:1,borderBottomColor:colors.line,backgroundColor:colors.primaryTint},competitorTableHeading:{paddingHorizontal:7,fontSize:8,fontFamily:fonts.black,letterSpacing:0.35,color:colors.muted,textTransform:'uppercase'},competitorNameColumn:{width:180},competitorRatingColumn:{width:90},competitorReviewsColumn:{width:90},competitorShareColumn:{width:160},competitorFeeColumn:{width:145},competitorVolumeColumn:{width:165},competitorRankColumn:{width:115},competitorStatusColumn:{width:84},competitorRow:{borderTopWidth:1,borderTopColor:colors.line,paddingHorizontal:0,borderRadius:6},competitorSelected:{backgroundColor:colors.primaryTint},competitorNameCell:{flexDirection:'row',alignItems:'center',paddingLeft:8,paddingRight:6},appMark:{width:34,height:34,borderRadius:17,backgroundColor:colors.badge,alignItems:'center',justifyContent:'center'},appMarkPrimary:{backgroundColor:colors.primary,borderWidth:1,borderColor:colors.primary},appMarkText:{fontSize:11,fontFamily:fonts.black,color:colors.muted},appMarkTextPrimary:{color:colors.onPrimary},competitorName:{flex:1,minWidth:0,marginLeft:10},appName:{fontSize:12,fontFamily:fonts.black,color:colors.navy},sourceMeta:{fontSize:9,color:colors.faint,marginTop:3},competitorRating:{width:86,fontSize:12,fontFamily:fonts.black,color:colors.navy},competitorReviews:{width:120,fontSize:11,fontFamily:fonts.bold,color:colors.muted},competitorMetricCell:{justifyContent:'center',paddingHorizontal:7},competitorMetricValue:{fontSize:10,fontFamily:fonts.black,color:colors.navy},competitorMetricMuted:{fontSize:9,fontFamily:fonts.bold,color:colors.faint},competitorMetricNote:{marginTop:3,fontSize:8,color:colors.faint},competitorRankValue:{fontSize:12,fontFamily:fonts.black,color:colors.primary},competitorStatus:{height:26,borderRadius:13,textAlign:'center',textAlignVertical:'center',fontSize:9,fontFamily:fonts.black,overflow:'hidden'},competitorEmpty:{paddingVertical:20,textAlign:'center',fontSize:11,color:colors.faint},verified:{backgroundColor:colors.greenSoft,color:colors.greenText},unavailable:{backgroundColor:colors.badge,color:colors.muted},
  settingsGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},sourceSetting:{width:310,minHeight:72,flexGrow:1,borderWidth:1,borderColor:colors.line,borderRadius:12,padding:10,flexDirection:'row',alignItems:'center',backgroundColor:colors.card},sourceIcon:{width:38,height:38,borderRadius:19,backgroundColor:colors.card,borderWidth:1,borderColor:colors.primary,alignItems:'center',justifyContent:'center'},sourceSettingCopy:{flex:1,marginHorizontal:10},sourceSettingTitle:{fontSize:11,fontFamily:fonts.black,color:colors.navy},sourceSettingDetail:{fontSize:9,lineHeight:14,color:colors.muted,marginTop:2},connectionStatus:{height:26,paddingHorizontal:8,borderRadius:13,backgroundColor:colors.badge,justifyContent:'center'},connectionStatusLive:{backgroundColor:colors.greenSoft,borderWidth:1,borderColor:'#A6F4C5'},connectionStatusText:{fontSize:9,fontFamily:fonts.black,color:colors.muted},connectionStatusTextLive:{color:colors.greenText},integrationNotice:{marginTop:12,minHeight:76,borderRadius:12,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.card,padding:12,flexDirection:'row',alignItems:'flex-start',gap:10},integrationNoticeCopy:{flex:1},integrationNoticeTitle:{fontSize:11,fontFamily:fonts.black,color:colors.navy},integrationNoticeText:{fontSize:10,lineHeight:15,color:colors.muted,marginTop:3},iconButton:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:colors.line,backgroundColor:colors.card,alignItems:'center',justifyContent:'center'},notificationDot:{position:'absolute',right:8,top:8,width:6,height:6,borderRadius:3,backgroundColor:colors.red},insightGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},insightCard:{width:280,minHeight:170,flexGrow:1,borderRadius:12,borderWidth:1,borderColor:colors.line,padding:14,backgroundColor:colors.card},insightIcon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',marginBottom:12,borderWidth:1,borderColor:colors.line},insightTitle:{fontSize:12,fontFamily:fonts.black,color:colors.navy},insightBody:{fontSize:11,lineHeight:17,color:colors.muted,marginTop:7},severityBadge:{alignSelf:'flex-start',height:22,borderRadius:11,borderWidth:1,paddingHorizontal:8,justifyContent:'center',marginTop:10},severityText:{fontSize:9,fontFamily:fonts.black,textTransform:'uppercase'},reportRow:{minHeight:64,borderTopWidth:1,borderTopColor:colors.line,flexDirection:'row',alignItems:'center'},reportIcon:{width:38,height:38,borderRadius:19,backgroundColor:colors.card,borderWidth:1,borderColor:colors.primary,alignItems:'center',justifyContent:'center'},reportCopy:{flex:1,marginLeft:10},reportTitle:{fontSize:12,fontFamily:fonts.black,color:colors.navy},reportMeta:{fontSize:9,color:colors.faint,marginTop:3},formatBadge:{height:24,borderRadius:12,backgroundColor:colors.badge,paddingHorizontal:9,justifyContent:'center'},formatText:{fontSize:9,fontFamily:fonts.black,color:colors.muted},reportAction:{width:34,height:34,alignItems:'center',justifyContent:'center'},alertRow:{minHeight:68,borderTopWidth:1,borderTopColor:colors.line,flexDirection:'row',alignItems:'center'},alertIcon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.line},alertCopy:{flex:1,marginLeft:10},alertTitle:{fontSize:11,fontFamily:fonts.black,color:colors.navy},alertMeta:{fontSize:9,color:colors.faint,marginTop:4},memberRow:{minHeight:68,borderTopWidth:1,borderTopColor:colors.line,flexDirection:'row',alignItems:'center'},memberAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:colors.primary},memberAvatarText:{fontSize:11,fontFamily:fonts.black,color:colors.onPrimary},memberCopy:{flex:1,marginLeft:10},memberName:{fontSize:12,fontFamily:fonts.black,color:colors.navy},memberMeta:{fontSize:9,color:colors.faint,marginTop:3},roleBadge:{height:26,borderRadius:13,paddingHorizontal:9,backgroundColor:colors.badge,justifyContent:'center'},roleText:{fontSize:9,fontFamily:fonts.black,color:colors.muted},settingsLabel:{fontSize:11,fontFamily:fonts.black,color:colors.muted,marginBottom:7},settingsDetail:{fontSize:9,color:colors.faint,marginTop:2},settingsInput:{height:44,borderWidth:1,borderColor:colors.line,borderRadius:10,backgroundColor:colors.card,paddingHorizontal:12,color:colors.navy},toggleRow:{height:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:colors.line},settingsField:{width:310,flexGrow:1,gap:1},settingsActions:{marginTop:18,flexDirection:'row',justifyContent:'flex-end',gap:8},secondaryButton:{height:40,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.card,justifyContent:'center'},secondaryButtonText:{fontSize:11,fontFamily:fonts.bold,color:colors.primary},primaryButton:{height:40,paddingHorizontal:14,borderRadius:12,backgroundColor:colors.primary,justifyContent:'center',flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:colors.primary,shadowColor:colors.primaryDeep,shadowOpacity:0.3,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:3},primaryButtonText:{fontSize:11,fontFamily:fonts.bold,color:colors.onPrimary},
  selectedBrandSummary:{minHeight:64,marginBottom:12,paddingHorizontal:12,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:colors.primary,backgroundColor:colors.card,flexDirection:'row',alignItems:'center',shadowColor:colors.primary,shadowOpacity:0.12,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:2},
  selectedBrandSummaryMark:{width:34,height:34,borderRadius:17,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:colors.card,borderWidth:1,borderColor:colors.primary},
  selectedBrandSummaryCopy:{flex:1},
  selectedBrandSummaryLabel:{fontSize:9,fontFamily:fonts.black,letterSpacing:0.6,color:colors.primary},
  selectedBrandSummaryRank:{marginTop:4,fontSize:10,fontFamily:fonts.bold,color:colors.muted},
  selectedBrandSummaryValue:{marginLeft:8,fontSize:22,fontFamily:fonts.black,color:colors.navy},
  competitorSelectedStrong:{backgroundColor:colors.primaryTint,borderLeftWidth:3,borderLeftColor:colors.primary},
  selectedBrandRankCell:{minHeight:46,marginVertical:6,paddingVertical:5,borderRadius:7,backgroundColor:colors.card,borderWidth:1,borderColor:colors.primary},
  selectedBrandRankValue:{color:colors.primary,fontSize:15},
  selectedBrandRankNote:{color:colors.primary,fontFamily:fonts.black},
});
