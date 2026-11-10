import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, useWindowDimensions } from 'react-native';
import { SafeView } from '../src/components/SafeView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SunburstChart, SunburstMarket } from '../src/components/SunburstChart';
import { SentimentMindMap } from '../src/components/SentimentMindMap';
import { CustomerReviewFeed } from '../src/components/CustomerReviewFeed';
import { SentimentIssueFunnel } from '../src/components/SentimentIssueFunnel';
import { AIInsightsBrief } from '../src/components/AIInsightsBrief';
import { countries } from '../src/data/demoData';
import { fetchAppleCompetitors, fetchAppleStoreRating, fetchCompetitorSharePrices, fetchPlaystoreAggregateRating, fetchRedditMentions, fetchReviewCollector } from '../src/data/liveData';
import type { CompetitorSharePrice, CustomerSentiment, LiveCompetitor } from '../src/data/liveData';
import { CORRIDOR_FEE_PERIOD, CORRIDOR_FEE_SOURCE, formatDailyVolume, formatFeeRange, getBenchmarkCostOnAmount, getBrandCorridorFee, getBrandDailyVolume, getCorridorAverageFee, getCorridorForCountry, getFeeDelta } from '../src/data/corridorData';
import { categorizeSentimentReviews } from '../src/data/sentimentCategories';
import type { SentimentCategory, SentimentCategoryId } from '../src/data/sentimentCategories';
import { sourceConfigs } from '../src/config/sourceConfig';
import { colors, fonts } from '../src/theme';

const nav = [
  ['grid-outline', 'Overview'], ['chatbubbles-outline', 'Sentiment'], ['globe-outline', 'Markets'],
  ['people-outline', 'Competitors'], ['sparkles-outline', 'AI Insights'], ['document-text-outline', 'Reports'],
  ['notifications-outline', 'Alerts'], ['people-circle-outline', 'Team'], ['server-outline', 'Sources'], ['settings-outline', 'Settings'],
];
const regions = ['Global', 'North America', 'Europe', 'Asia Pacific', 'Latin America', 'Middle East & Africa'];

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

function buildSelectedMarkets(names: unknown): SunburstMarket[] {
  const parsedNames = Array.isArray(names) ? names[0] : names;
  let selectedNames: string[] = [];
  try { selectedNames = JSON.parse(String(parsedNames || '[]')); } catch { selectedNames = []; }
  if (!selectedNames.length) return countries;
  return selectedNames.map((name, index) => {
    const existing = countries.find((country) => country.name === name);
    const metadata = COUNTRY_METADATA[name];
    return existing ? { ...existing, score: 0, positive: 0, reviews: 0, rank: 0 } : {
      name,
      code: metadata?.code ?? name.slice(0, 2).toUpperCase(),
      score: 0,
      positive: 0,
      reviews: 0,
      rank: 0,
      region: metadata?.region ?? 'Global',
      share: Math.max(4, 100 - index * 5),
    };
  });
}

const POSITIVE_TERMS = ['easy', 'fast', 'helpful', 'love', 'recommend', 'best', 'great', 'excellent', 'quick', 'reliable', 'amazing', 'smooth', 'good'];
const NEGATIVE_TERMS = ['slow', 'delay', 'problem', 'failed', 'fee', 'fees', 'scam', 'fraud', 'bad', 'terrible', 'laggy', 'stolen', 'support', 'charge', 'frustrating', 'wonky', 'sluggish'];

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

function calculatePlatformRatings(reviews: CustomerSentiment[]) {
  const averages: Record<'Google Play' | 'Apple App Store', PlatformRating> = {
    'Google Play': { rating: null, reviewCount: 0, sourceCount: 0 },
    'Apple App Store': { rating: null, reviewCount: 0, sourceCount: 0 },
  };
  (Object.keys(averages) as ('Google Play' | 'Apple App Store')[]).forEach((source) => {
    const sourceReviews = reviews.filter((review) => review.source === source && review.rating > 0);
    if (sourceReviews.length) {
      averages[source] = {
        rating: sourceReviews.reduce((sum, review) => sum + review.rating, 0) / sourceReviews.length,
        reviewCount: sourceReviews.length,
        sourceCount: sourceReviews.length,
      };
    }
  });
  return averages;
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
  const { width } = useWindowDimensions();
  const params = useLocalSearchParams();
  const selectedMarkets = buildSelectedMarkets(params.countries);
  const brandName = buildBrandName(params.brand);
  const refreshToken = String(Array.isArray(params.refresh) ? params.refresh[0] : params.refresh ?? '');
  const brandWebsite = String(Array.isArray(params.website) ? params.website[0] : params.website ?? '').trim() || 'https://www.westernunion.com';
  const brandInitials = getBrandInitials(brandName);
  const isWide = width >= 900;
  const isNarrow = width < 560;
  const mainScrollRef = useRef<any>(null);
  const previousBrandRef = useRef(brandName);
  const consumedRefreshTokenRef = useRef('');
  const reviewFeedOffset = useRef(0);
  const feedbackListOffset = useRef(0);
  const [activeSection, setActiveSection] = useState('Overview');
  const [selectedRegion, setSelectedRegion] = useState('Global');
  const [selectedCountry, setSelectedCountry] = useState<SunburstMarket>(selectedMarkets[0]);
  const [liveCompetitors, setLiveCompetitors] = useState<LiveCompetitor[]>([]);
  const [competitorSharePrices, setCompetitorSharePrices] = useState<CompetitorSharePrice[]>([]);
  const [sharePricesLoading, setSharePricesLoading] = useState(false);
  const [customerReviews, setCustomerReviews] = useState<CustomerSentiment[]>([]);
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveError, setLiveError] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [alerts, setAlerts] = useState(true);
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [sentimentFilter, setSentimentFilter] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
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
  const [platformRatings, setPlatformRatings] = useState<Record<'Google Play' | 'Apple App Store', PlatformRating>>({
    'Google Play': { rating: null, reviewCount: 0, sourceCount: 0 },
    'Apple App Store': { rating: null, reviewCount: 0, sourceCount: 0 },
  });

  const filteredMarkets = selectedRegion === 'Global' ? selectedMarkets : selectedMarkets.filter((item) => item.region === selectedRegion);
  const sunburstMarkets = filteredMarkets.length ? filteredMarkets : selectedMarkets;

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
    setShowAllReviews(false);
  }, [brandName]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const forceFresh = dataRefreshNonce > 0 || (refreshToken !== '' && consumedRefreshTokenRef.current !== refreshToken);
      consumedRefreshTokenRef.current = refreshToken;
      setLiveLoading(true);
      setLiveError(false);
      setLiveCompetitors([]);
      setCompetitorSharePrices([]);
      setCustomerReviews([]);
      setSharePricesLoading(true);
      setPlatformRatings({
        'Google Play': { rating: null, reviewCount: 0, sourceCount: 0 },
        'Apple App Store': { rating: null, reviewCount: 0, sourceCount: 0 },
      });
      try {
        const appleRatingPromise = fetchAppleStoreRating(selectedCountry.code, brandName, forceFresh);
        const secondaryPromise = Promise.all([
          fetchAppleCompetitors(selectedCountry.code, selectedCountry.region),
          fetchRedditMentions(brandName),
          fetchReviewCollector(selectedCountry.code, brandName, durationMonths, dataRefreshNonce),
          fetchPlaystoreAggregateRating(selectedCountry.code, brandName, forceFresh),
        ]);

        const appleStoreRating = await appleRatingPromise;
        if (!active) return;
        if (appleStoreRating.rating !== null) {
          setPlatformRatings((current) => ({
            ...current,
            'Apple App Store': {
              rating: appleStoreRating.rating,
              reviewCount: appleStoreRating.reviewCount,
              sourceCount: appleStoreRating.reviewCount,
            },
          }));
        }

        const [ratings, redditMentions, collectorReviews, playstoreRating] = await secondaryPromise;
        if (!active) return;
        if (playstoreRating.rating !== null) {
          setPlatformRatings((current) => ({
            ...current,
            'Google Play': {
              rating: playstoreRating.rating,
              reviewCount: playstoreRating.reviewCount,
              sourceCount: playstoreRating.reviewCount,
            },
          }));
        }
        setLiveCompetitors(ratings);
        void fetchCompetitorSharePrices(ratings.map((item) => item.name))
          .then((quotes) => {
            if (active) setCompetitorSharePrices(quotes);
          })
          .catch((error: unknown) => {
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
        const calculatedRatings = calculatePlatformRatings(uniqueReviews);
        setPlatformRatings({
          'Google Play': playstoreRating.rating !== null
            ? { rating: playstoreRating.rating, reviewCount: playstoreRating.reviewCount, sourceCount: playstoreRating.reviewCount }
            : calculatedRatings['Google Play'],
          'Apple App Store': appleStoreRating.rating !== null
            ? { rating: appleStoreRating.rating, reviewCount: appleStoreRating.reviewCount, sourceCount: appleStoreRating.reviewCount }
            : calculatedRatings['Apple App Store'],
        });
        setLiveError(ratings.every((item) => item.status === 'unavailable') && collectorReviews.length === 0 && redditMentions.length === 0);
      } catch {
        if (active) {
          setLiveError(true);
          setSharePricesLoading(false);
        }
      } finally {
        if (active) {
          setLiveLoading(false);
          setDurationPullProgress(100);
        }
      }
    };
    load();
    return () => { active = false; };
  }, [selectedCountry.code, selectedCountry.region, durationMonths, dataRefreshNonce, brandName, refreshToken]);

  const handleCountryChange = (country: SunburstMarket) => {
    if (country.code === selectedCountry.code) return;
    setSelectedCountry(country);
    setThemeFilter(null);
    setIssueCategoryId(null);
    setIssueCategoryLabel(null);
    setIssueReviewIdentities([]);
    setTargetReview(null);
    setSentimentFilter('all');
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

  const liveBrand = liveCompetitors.find((item) => item.name === brandName && item.status === 'live');
  const ranked = liveCompetitors.filter((item) => item.status === 'live' && item.rating !== null).sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const brandRank = ranked.findIndex((item) => item.name === brandName) + 1;
  const gap = liveBrand?.rating != null && ranked.length ? Number((liveBrand.rating - ranked[0].rating!).toFixed(1)) : null;
  const availablePlatformRatings = [platformRatings['Google Play'], platformRatings['Apple App Store']].filter((item) => item.rating !== null);
  const brandRating: number | null = availablePlatformRatings.length > 0
    ? availablePlatformRatings.reduce((total, item) => total + item.rating!, 0) / availablePlatformRatings.length
    : null;
  const googlePlayRating = platformRatings['Google Play'].rating;
  const appleStoreRating = platformRatings['Apple App Store'].rating;
  const liveSelectedCountry = { ...selectedCountry, score: brandRating ?? 0 };

  const renderOverview = () => {
    const positiveMentions = customerReviews.length
      ? Math.round(customerReviews.filter((review) => review.sentiment === 'positive').length / customerReviews.length * 100)
      : null;
    return <>
    <SafeView style={styles.filterBar}><Text style={styles.filterLabel}>Market view</Text><ScrollView horizontal showsHorizontalScrollIndicator={false}><SafeView style={styles.regionRow}>{regions.map((region) => <Pressable key={region} onPress={() => chooseRegion(region)} style={[styles.regionChip, selectedRegion === region && styles.regionChipActive]}><Text style={[styles.regionText, selectedRegion === region && styles.regionTextActive]}>{region}</Text></Pressable>)}</SafeView></ScrollView></SafeView>
    <SafeView style={styles.kpiGrid}>{[
      ['Brand strength', brandRating !== null ? `${brandRating.toFixed(1)} / 5` : '— / 5', 'Arithmetic mean of live platform ratings', '#2563EB', 'ribbon-outline'],
            ['Category position', brandRank ? `#${brandRank}` : '—', gap !== null ? `${gap >= 0 ? '+' : ''}${gap.toFixed(1)} vs leader` : 'No live rank data', '#7F56D9', 'podium-outline'],
      ['Positive mentions', positiveMentions !== null ? `${positiveMentions}%` : '—', `${customerReviews.filter((review) => review.sentiment === 'positive').length} verified positive records`, '#12B76A', 'trending-up-outline'],
      ['Markets monitored', String(selectedMarkets.length), `${new Set(selectedMarkets.map((market) => market.region)).size} selected regions`, '#F79009', 'globe-outline'],
    ].map(([label, value, change, tone, icon]) => <SafeView key={String(label)} style={styles.kpi}><SafeView style={[styles.kpiIcon, { backgroundColor: `${tone}14` }]}><Ionicons name={icon as any} size={20} color={tone as string}/></SafeView><SafeView style={styles.kpiCopy}><Text style={styles.kpiLabel}>{label}</Text><Text style={styles.kpiValue}>{value}</Text><Text style={[styles.kpiChange, { color: tone as string }]}>{change}</Text></SafeView></SafeView>)}</SafeView>
    <SafeView style={[styles.card, styles.fullCard, styles.dashboardCard]}>
      <SafeView style={styles.cardHeader}>
        <SafeView style={styles.sectionCluster}><SafeView style={styles.sectionGauge}><SafeView style={styles.sectionGaugeNeedle}/></SafeView><SafeView><Text style={styles.cardTitle}>Market & platform coverage · Rating scorecard</Text>        <Text style={styles.cardSub}>{selectedCountry.name} · synchronized 5-point live platform gauges</Text></SafeView></SafeView>
        <SafeView style={styles.liveBadge}><SafeView style={styles.liveDot}/><Text style={styles.liveBadgeText}>LIVE</Text></SafeView>
      </SafeView>
      <SunburstChart
        markets={sunburstMarkets.map((market) => market.code === selectedCountry.code ? liveSelectedCountry : market) as SunburstMarket[]}
        selected={liveSelectedCountry}
        onSelect={handleCountryChange}
        platformRatings={{ brand: brandRating, ios: appleStoreRating, android: googlePlayRating }}
        platformReviewCounts={{ ios: platformRatings['Apple App Store'].reviewCount, android: platformRatings['Google Play'].reviewCount }}
        marketPosition={brandRank || undefined}
        leaderGap={gap}
      />
    </SafeView>
    {renderReviews()}
  </>;
  };

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
    const sentimentFiltered = sentimentFilter === 'all' ? customerReviews : customerReviews.filter((review) => review.sentiment === sentimentFilter);
    const filteredReviews = issueCategoryId
      ? customerReviews.filter((review) => issueReviewIdentities.includes(getReviewIdentity(review)))
      : themeFilter
        ? sentimentFiltered.filter((review) => review.text.toLowerCase().includes(themeFilter))
        : sentimentFiltered;
    const visibleReviews = showAllReviews ? filteredReviews : filteredReviews.slice(0, 4);

    return <SafeView style={[styles.card, styles.fullCard]} onLayout={(event) => { reviewFeedOffset.current = event.nativeEvent.layout.y; }}>
      <SafeView style={styles.cardHeader}><SafeView style={styles.sectionCluster}><SafeView style={styles.sectionGauge}><SafeView style={styles.sectionGaugeNeedle}/></SafeView><SafeView><Text style={styles.cardTitle}>What customers are saying</Text><Text style={styles.cardSub}>{liveLoading ? 'Connecting to verified review sources' : liveError ? 'Review source status: unavailable' : `${customerReviews.length} live sentiments · Last ${durationMonths} ${durationMonths === 1 ? 'month' : 'months'} · ${selectedCountry.name}`}</Text></SafeView></SafeView><SafeView style={[styles.liveBadge, liveError && styles.warningBadge]}><SafeView style={styles.liveDot}/><Text style={[styles.liveBadgeText, liveError && styles.warningText]}>{liveLoading ? 'LOADING' : liveError ? 'UNAVAILABLE' : 'LIVE SOURCES'}</Text></SafeView></SafeView>
      {!liveLoading && <Text style={{ marginTop: 2, marginBottom: 10, fontSize: 10, lineHeight: 15, color: '#64769B' }}>
        {`Records by source: ${reviewSourceCounts.map(({ source, count }) => `${source} ${count}`).join(' · ')}. `}
        {`Available review dates: ${reviewDateRange}. `}
        {earliestReviewDate && earliestReviewDate > requestedWindowStart
          ? `History starts after the selected window (${requestedWindowStart.toLocaleDateString()}); this is not a complete archive. `
          : ''}
        Other feeds require credentials in Sources.
      </Text>}
      {customerReviews.length > 0 && <SentimentMindMap country={selectedCountry.name} total={customerReviews.length} positive={positiveCount} neutral={neutralCount} negative={negativeCount} words={sentimentWords} onThemeSelect={handleThemeSelect} />}
      {issueCategories.length > 0 && <SentimentIssueFunnel categories={issueCategories} selectedCategory={issueCategoryId} onSelect={handleIssueCategorySelect} />}
      {liveLoading ? <SafeView style={styles.emptyReviews}><Ionicons name="sync-outline" size={24} color={colors.primary}/><Text style={styles.emptyReviewTitle}>Collecting customer feedback</Text><Text style={styles.emptyReviewText}>Retrieving recent verified reviews for {selectedCountry.name}.</Text></SafeView> : customerReviews.length ? <>
        <SafeView onLayout={(event) => { feedbackListOffset.current = event.nativeEvent.layout.y; }}>
          <SafeView style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>{(['all', 'positive', 'neutral', 'negative'] as const).map((filter) => <Pressable key={filter} onPress={() => { setSentimentFilter(filter); setThemeFilter(null); setIssueCategoryId(null); setIssueCategoryLabel(null); setIssueReviewIdentities([]); setTargetReview(null); setShowAllReviews(false); }} style={{ height: 30, paddingHorizontal: 10, borderRadius: 15, borderWidth: 1, borderColor: sentimentFilter === filter && !issueCategoryId ? '#2563EB' : '#E4EAF6', backgroundColor: sentimentFilter === filter && !issueCategoryId ? '#2563EB' : '#fff', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '800', color: sentimentFilter === filter && !issueCategoryId ? '#FFFFFF' : '#64769B' }}>{filter === 'all' ? `All · ${customerReviews.length}` : `${filter[0].toUpperCase()}${filter.slice(1)} · ${customerReviews.filter((review) => review.sentiment === filter).length}`}</Text></Pressable>)}</SafeView>
          {(themeFilter || issueCategoryId) && <Pressable accessibilityRole="button" accessibilityLabel={issueCategoryId ? `Clear ${selectedCategoryLabel} category filter` : 'Clear ' + themeFilter + ' filter'} onPress={() => { setThemeFilter(null); setIssueCategoryId(null); setIssueCategoryLabel(null); setIssueReviewIdentities([]); setTargetReview(null); setSentimentFilter('all'); setShowAllReviews(false); }} style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, height: 30, paddingHorizontal: 10, marginTop: 4, marginBottom: 6, borderRadius: 15, borderWidth: 1, borderColor: sentimentFilter === 'negative' ? '#F04438' : '#12B76A', backgroundColor: sentimentFilter === 'negative' ? '#FEF3F2' : '#ECFDF3' }}>
          <Text style={{ fontSize: 10, fontWeight: '800', color: sentimentFilter === 'negative' ? '#B42318' : '#027A48' }}>{issueCategoryId ? `${selectedCategoryLabel} · ${filteredReviews.length} comments` : '"' + themeFilter + '" · ' + filteredReviews.length + (filteredReviews.length === 1 ? ' review' : ' reviews')}</Text>
          <Ionicons name="close" size={12} color="#93A5C8" /></Pressable>}
          {issueCategoryId && <SafeView accessibilityLiveRegion="polite" style={{ marginTop: 6, marginBottom: 4, paddingHorizontal: 12, paddingVertical: 10, borderLeftWidth: 3, borderLeftColor: '#FDB022', borderRadius: 6, backgroundColor: '#FFFAEB' }}>
            <Text style={{ fontSize: 11, fontWeight: '900', color: '#7A2E0E' }}>Showing feedback for {selectedCategoryLabel}</Text>
            <Text style={{ marginTop: 3, fontSize: 9, color: '#93370D' }}>{filteredReviews.length} matching {filteredReviews.length === 1 ? 'comment' : 'comments'}</Text>
          </SafeView>}
          {filteredReviews.length === 0 && <Text style={styles.emptyReviewText}>{issueCategoryId ? `No current comments match ${selectedCategoryLabel}.` : 'No reviews mention this theme.'}</Text>}
          <CustomerReviewFeed reviews={visibleReviews} highlightedReview={selectedTargetReview} autoTranslateReview={selectedTargetReview} />
        </SafeView>
        {filteredReviews.length > 4 && <Pressable onPress={() => setShowAllReviews((current) => !current)} style={{ alignSelf: 'flex-start', marginTop: 8, height: 34, borderRadius: 10, borderWidth: 1, borderColor: '#60A5FA', paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 10, fontWeight: '900', color: '#3B82F6' }}>{showAllReviews ? 'Show less' : `View all ${filteredReviews.length} sentiments`}</Text></Pressable>}
      </> : <SafeView style={styles.emptyReviews}><Ionicons name="cloud-offline-outline" size={24} color="#93A5C8"/><Text style={styles.emptyReviewTitle}>No recent reviews returned</Text><Text style={styles.emptyReviewText}>The source did not return usable verified feedback for this market. Start the review collector with “npm run review-server” for Playstore and Apple App Store coverage.</Text></SafeView>}
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
    {renderReviews()}
  </>;

  const renderMarkets = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Country performance</Text><Text style={styles.cardSub}>Ratings and regional position · 1–5 scale</Text></SafeView></SafeView>{selectedMarkets.map((country) => <Pressable key={country.code} onPress={() => handleCountryChange(country)} style={[styles.marketRow, selectedCountry.code === country.code && styles.marketRowActive]}><SafeView style={styles.flag}><Text style={styles.flagText}>{country.code}</Text></SafeView><SafeView style={styles.marketName}><Text style={styles.marketTitle}>{country.name}</Text><Text style={styles.marketRegion}>{country.region}</Text></SafeView><SafeView style={styles.marketTrack}><SafeView style={[styles.marketFill, { width: `${country.code === selectedCountry.code && brandRating !== null ? brandRating * 20 : 0}%` }]}/></SafeView><Text style={styles.marketScore}>{country.code === selectedCountry.code ? (brandRating !== null ? `${brandRating.toFixed(1)} / 5` : '— / 5') : '— / 5'}</Text><Text style={styles.marketRank}>—</Text></Pressable>)}</SafeView>{renderReviews()}</>;

  const renderCompetitors = () => {
    const selectedBrand = brandName;
    const rankedCompetitors = liveCompetitors
      .filter((item) => item.status === 'live' && item.rating !== null)
      .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0));
    const countryRanks = new Map(rankedCompetitors.map((item, index) => [item.name, index + 1]));
    const sharePriceByName = new Map(competitorSharePrices.map((quote) => [quote.name, quote]));
    const selectedBrandRank = countryRanks.get(selectedBrand);
    const topCorridor = getCorridorForCountry(selectedCountry.code);
    const corridorAverage = getCorridorAverageFee(selectedCountry.code);
    const corridorAverageCost = corridorAverage && topCorridor
      ? getBenchmarkCostOnAmount(topCorridor.benchmarkAmount, corridorAverage.average)
      : null;
    const volumeDisclosedCount = liveCompetitors.filter((item) => getBrandDailyVolume(item.name)).length;
    const sortedCompetitors = [...liveCompetitors].sort((left, right) => {
      const leftRank = countryRanks.get(left.name) ?? Number.POSITIVE_INFINITY;
      const rightRank = countryRanks.get(right.name) ?? Number.POSITIVE_INFINITY;
      return leftRank - rightRank || left.name.localeCompare(right.name);
    });

    return <>
      <SafeView style={[styles.card, styles.fullCard]}>
        <SafeView style={styles.cardHeader}>
          <SafeView style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Competitive intelligence</Text>
            <Text style={styles.cardSub}>
              {liveLoading
                ? `Refreshing ${selectedCountry.name} competitors`
                : `${selectedCountry.name} · ${selectedCountry.region} · Country rank is by App Store rating${topCorridor ? ` · Top corridor ${topCorridor.fromCode}→${topCorridor.toCode}` : ''}`}
            </Text>
          </SafeView>
          <SafeView style={[styles.liveBadge, liveError && styles.warningBadge]}>
            <Text style={[styles.liveBadgeText, liveError && styles.warningText]}>
              {liveError ? 'SOURCE ISSUE' : 'MARKET DATA'}
            </Text>
          </SafeView>
        </SafeView>
        <Text style={styles.competitorDataNote}>
          {`Share quotes use Yahoo Finance and may be delayed. Transfer fees are the average total cost (fee + FX margin) of a ${topCorridor?.benchmarkAmount ?? '$200'} transfer on the market's top corridor${topCorridor ? ` (${topCorridor.fromName} → ${topCorridor.toName})` : ''} — ${CORRIDOR_FEE_SOURCE}, ${CORRIDOR_FEE_PERIOD}. Daily transactions are global company-reported averages; country-level volumes are not publicly disclosed.`}
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
            <Ionicons name="ribbon-outline" size={16} color="#2563EB" />
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
          <SafeView style={styles.competitorTable}>
            <SafeView style={[styles.competitorTableRow, styles.competitorTableHeader]}>
              <Text style={[styles.competitorTableHeading, styles.competitorNameColumn]}>Competitor</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorRatingColumn]}>App rating</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorReviewsColumn]}>Reviews</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorShareColumn]}>Share price</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorFeeColumn]}>Transfer fees</Text>
              <Text style={[styles.competitorTableHeading, styles.competitorVolumeColumn]}>Avg. transactions/day</Text>
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
                        {isSelectedBrand ? 'Your selected brand' : item.status === 'live' ? `Apple · ${selectedCountry.code}` : 'No App Store result'}
                      </Text>
                    </SafeView>
                  </SafeView>
                  <Text style={[styles.competitorMetricValue, styles.competitorRatingColumn]}>
                    {item.rating !== null ? `${item.rating.toFixed(1)} / 5` : '—'}
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
                  <SafeView style={[styles.competitorMetricCell, styles.competitorFeeColumn]}>
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
                  </SafeView>
                  <SafeView style={[styles.competitorMetricCell, styles.competitorVolumeColumn]}>
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
                  </SafeView>
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
                    ]}>{isSelectedBrand ? 'YOUR BRAND' : 'By App Store rating'}</Text>
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
                {liveLoading ? 'Loading competitor data…' : 'No competitor data is currently available.'}
              </Text>
            )}
          </SafeView>
        </ScrollView>
      </SafeView>
      {renderReviews()}
    </>;
  };

  const renderSources = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Sources & integrations</Text><Text style={styles.cardSub}>Review live availability and credential requirements</Text></SafeView><SafeView style={styles.liveBadge}><SafeView style={styles.liveDot}/><Text style={styles.liveBadgeText}>CONFIGURATION</Text></SafeView></SafeView><SafeView style={styles.settingsGrid}>{sourceConfigs.map((source) => { const connected = source.status === 'public' || source.status === 'connected'; return <SafeView key={source.name} style={styles.sourceSetting}><SafeView style={styles.sourceIcon}><Ionicons name={source.credential === 'public' ? 'globe-outline' : 'key-outline'} size={18} color={colors.primary}/></SafeView><SafeView style={styles.sourceSettingCopy}><Text style={styles.sourceSettingTitle}>{source.name}</Text><Text style={styles.sourceSettingDetail}>{source.detail}</Text></SafeView><SafeView style={[styles.connectionStatus, connected && styles.connectionStatusLive]}><Text style={[styles.connectionStatusText, connected && styles.connectionStatusTextLive]}>{source.status === 'connected' ? 'Connected' : source.status === 'public' ? 'Public' : 'Setup required'}</Text></SafeView></SafeView>; })}</SafeView><SafeView style={styles.integrationNotice}><Ionicons name="shield-checkmark-outline" size={20} color={colors.primary}/><SafeView style={styles.integrationNoticeCopy}><Text style={styles.integrationNoticeTitle}>Secure credential setup</Text><Text style={styles.integrationNoticeText}>Google Play and Apple App Store reviews are collected through the backend. Meta, LinkedIn, X, Trustpilot, and Reviews.io credentials must be stored server-side and must never be committed to Expo public environment variables.</Text></SafeView></SafeView><Text style={[styles.settingsLabel, { marginTop: 18 }]}>Credential workspace</Text><Text style={styles.integrationNoticeText}>Production secrets belong in a backend or secret vault. The required server-side variable names and setup template are in `.env.example`.</Text><SafeView style={styles.toggleRow}><SafeView><Text style={styles.settingsLabel}>Automatic refresh</Text><Text style={styles.settingsDetail}>Refresh live public ratings every 6 hours</Text></SafeView><Switch value={autoRefresh} onValueChange={setAutoRefresh} trackColor={{ true: '#2563EB', false: '#D0D5DD'}}/></SafeView><SafeView style={styles.toggleRow}><SafeView><Text style={styles.settingsLabel}>Sentiment alerts</Text><Text style={styles.settingsDetail}>Notify when negative sentiment exceeds a threshold</Text></SafeView><Switch value={alerts} onValueChange={setAlerts} trackColor={{ true: '#2563EB', false: '#D0D5DD'}}/></SafeView></SafeView></>;

  const renderInsights = () => {
    return (
      <SafeView style={[styles.card, styles.fullCard]}>
        <SafeView style={styles.cardHeader}>
          <SafeView>
            <Text style={styles.cardTitle}>Live data brief</Text>
            <Text style={styles.cardSub}>Evidence-led product priorities and competitive data gaps</Text>
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
          country={selectedCountry.name}
          months={durationMonths}
          loading={liveLoading}
          onSelectCategory={handleIssueCategorySelect}
          onOpenSources={() => setActiveSection('Sources')}
        />
      </SafeView>
    );
  };

  const renderReports = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Executive reports</Text><Text style={styles.cardSub}>Board-ready exports and recurring digests</Text></SafeView><Pressable style={styles.primaryButton}><Ionicons name="download-outline" size={15} color="#fff"/><Text style={styles.primaryButtonText}>Generate report</Text></Pressable></SafeView>{[['Global Sentiment Brief','Updated 12 minutes ago','PDF'],['Competitive Market Review','Updated yesterday','PPTX'],['Customer Voice Summary','Updated weekly','XLSX']].map((item,index)=><SafeView key={item[0]} style={styles.reportRow}><SafeView style={styles.reportIcon}><Ionicons name={index===0?'document-text-outline':index===1?'stats-chart-outline':'grid-outline'} size={18} color="#2563EB"/></SafeView><SafeView style={styles.reportCopy}><Text style={styles.reportTitle}>{item[0]}</Text><Text style={styles.reportMeta}>{item[1]}</Text></SafeView><SafeView style={styles.formatBadge}><Text style={styles.formatText}>{item[2]}</Text></SafeView><Pressable style={styles.reportAction}><Ionicons name="ellipsis-horizontal" size={18} color="#93A5C8"/></Pressable></SafeView>)}</SafeView></>;

  const renderAlerts = () => {
    const negative = customerReviews.filter((review) => review.sentiment === 'negative').length;
    const positive = customerReviews.filter((review) => review.sentiment === 'positive').length;
    const alertsData = negative > 0
      ? [['Negative feedback', `${negative} verified negative customer records returned`, 'Current collection', 'alert-circle-outline', '#F04438']]
      : [['Sentiment status', 'No verified negative records returned in this collection', 'Current collection', 'checkmark-circle-outline', '#12B76A']];
    if (positive > 0) alertsData.push(['Positive feedback', `${positive} verified positive customer records returned`, 'Current collection', 'trending-up-outline', '#12B76A']);
    return <SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Alert center</Text><Text style={styles.cardSub}>Live sentiment counts; no estimated anomalies</Text></SafeView></SafeView>{alertsData.map((item) => <SafeView key={item[1]} style={styles.alertRow}><SafeView style={[styles.alertIcon,{backgroundColor:`${item[4]}14`}]}><Ionicons name={item[3] as any} size={18} color={item[4]}/></SafeView><SafeView style={styles.alertCopy}><Text style={styles.alertTitle}>{item[1]}</Text><Text style={styles.alertMeta}>{item[0]} · {item[2]}</Text></SafeView></SafeView>)}</SafeView>;
  };

  const renderTeam = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Partner team</Text><Text style={styles.cardSub}>Workspace roles, access, and collaboration</Text></SafeView><Pressable style={styles.primaryButton}><Ionicons name="person-add-outline" size={15} color="#fff"/><Text style={styles.primaryButtonText}>Invite member</Text></Pressable></SafeView>{[['AV','Alex Morgan','Global Strategy','Owner','A'],['SC','Sarah Chen','Customer Insights','Admin','S'],['JM','James Miller','Regional Operations','Analyst','J']].map((member)=><SafeView key={member[1]} style={styles.memberRow}><SafeView style={[styles.memberAvatar,{backgroundColor:member[4]==='A'?'#2563EB':member[4]==='S'?'#12B76A':'#F79009'}]}><Text style={styles.memberAvatarText}>{member[0]}</Text></SafeView><SafeView style={styles.memberCopy}><Text style={styles.memberName}>{member[1]}</Text><Text style={styles.memberMeta}>{member[2]}</Text></SafeView><SafeView style={styles.roleBadge}><Text style={styles.roleText}>{member[3]}</Text></SafeView></SafeView>)}</SafeView></>;

  const renderSettings = () => <><SafeView style={[styles.card, styles.fullCard]}><SafeView style={styles.cardHeader}><SafeView><Text style={styles.cardTitle}>Workspace settings</Text><Text style={styles.cardSub}>Brand, monitoring, and reporting configuration</Text></SafeView></SafeView><SafeView style={styles.settingsGrid}><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Brand name</Text><TextInput defaultValue={brandName} style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Primary website</Text><TextInput defaultValue={brandWebsite} style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Business domain</Text><TextInput defaultValue="Money transfer" style={styles.settingsInput}/></SafeView><SafeView style={styles.settingsField}><Text style={styles.settingsLabel}>Reporting cadence</Text><TextInput defaultValue="Daily" style={styles.settingsInput}/></SafeView></SafeView><SafeView style={styles.settingsActions}><Pressable style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Discard</Text></Pressable><Pressable style={styles.primaryButton}><Text style={styles.primaryButtonText}>Save configuration</Text></Pressable></SafeView></SafeView></>;

  const renderContent = () => activeSection === 'Sentiment' ? renderSentiment() : activeSection === 'Markets' ? renderMarkets() : activeSection === 'Competitors' ? renderCompetitors() : activeSection === 'AI Insights' ? renderInsights() : activeSection === 'Reports' ? renderReports() : activeSection === 'Alerts' ? renderAlerts() : activeSection === 'Team' ? renderTeam() : activeSection === 'Sources' ? renderSources() : activeSection === 'Settings' ? renderSettings() : renderOverview();

  return <SafeAreaView style={styles.safe}><Animated.View style={{ flex: 1, opacity: screenEntrance, transform: [{ translateY: screenEntrance.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }] }}><Modal visible={durationPullVisible} transparent animationType="fade" onRequestClose={() => setDurationPullVisible(false)}><Pressable onPress={() => setDurationPullVisible(false)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(16,24,40,0.38)', padding: 20 }}><Pressable style={{ width: 390, maxWidth: '100%', borderRadius: 16, backgroundColor: '#FFFFFF', padding: 22, borderWidth: 1, borderColor: '#E4EAF6', shadowColor: '#101828', shadowOpacity: 0.16, shadowRadius: 20, elevation: 12 }}><SafeView style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}><SafeView style={{ width: 42, height: 42, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: '#EAF1FE', marginRight: 12 }}><Ionicons name="cloud-download-outline" size={22} color="#2563EB" /></SafeView><SafeView style={{ flex: 1 }}><Text style={{ fontSize: 16, fontFamily: fonts.black, color: '#0F2B57' }}>Pulling review feeds</Text><Text style={{ marginTop: 3, fontSize: 11, color: '#64769B' }}>Last {durationMonths} {durationMonths === 1 ? 'month' : 'months'} for {selectedCountry.name}</Text></SafeView><Text style={{ fontSize: 13, fontFamily: fonts.black, color: '#2563EB' }}>{durationPullProgress}%</Text></SafeView><SafeView style={{ height: 8, borderRadius: 8, backgroundColor: '#EEF3FB', overflow: 'hidden' }}><SafeView style={{ height: 8, width: `${durationPullProgress}%`, borderRadius: 8, backgroundColor: '#2563EB' }} /></SafeView><SafeView style={{ marginTop: 16, gap: 10 }}>{[['logo-google', 'Google Play', durationPullProgress < 55], ['logo-apple', 'App Store', durationPullProgress < 82]].map(([icon, source, pending]) => <SafeView key={String(source)} style={{ flexDirection: 'row', alignItems: 'center' }}><Ionicons name={icon as any} size={17} color={pending ? '#93A5C8' : '#12B76A'} /><Text style={{ flex: 1, marginLeft: 9, fontSize: 12, fontFamily: fonts.bold, color: '#3B4154' }}>{source}</Text><Text style={{ fontSize: 11, fontFamily: fonts.bold, color: pending ? '#93A5C8' : '#027A48' }}>{durationPullProgress >= 100 ? 'Complete' : pending ? 'Pulling…' : 'Verified'}</Text></SafeView>)}</SafeView></Pressable></Pressable></Modal><SafeView style={styles.appShell}>{isWide && <SafeView style={styles.sidebar}><Pressable onPress={() => router.replace('/')} style={styles.brandRow}><SafeView style={styles.logo}><Ionicons name="pulse" size={19} color="#FFFFFF"/></SafeView><SafeView><Text style={styles.brand}>PulseBoard</Text><Text style={styles.brandSubtitle}>Brand intelligence</Text></SafeView></Pressable><SafeView style={styles.workspace}><Text style={styles.workspaceLabel}>WORKSPACE</Text><SafeView style={styles.workspaceRow}><SafeView style={styles.wuMark}><Text style={styles.wuMarkText}>{brandInitials}</Text></SafeView><SafeView><Text style={styles.workspaceName}>{brandName}</Text><Text style={styles.workspaceMeta}>Global intelligence</Text></SafeView></SafeView></SafeView><SafeView style={styles.nav}>{nav.map(([icon,label]) => <Pressable key={label} onPress={() => setActiveSection(label)} style={[styles.navItem, activeSection === label && styles.navActive]}><Ionicons name={icon as any} size={18} color={activeSection === label ? '#2563EB' : '#93A5C8'}/><Text style={[styles.navText, activeSection === label && styles.navTextActive]}>{label}</Text>{label === 'Sources' && <SafeView style={styles.navCount}><Text style={styles.navCountText}>1</Text></SafeView>}</Pressable>)}</SafeView><SafeView style={styles.engineCard}><SafeView style={styles.engineHeader}><Ionicons name="sparkles" size={16} color="#FFFFFF"/><Text style={styles.engineTitle}>AI intelligence</Text></SafeView><Text style={styles.engineText}>{liveLoading ? 'Collecting verified sources' : liveError ? 'Public sources need attention' : 'Live collection active'}</Text><SafeView style={styles.engineFooter}><SafeView style={styles.liveDot}/><Text style={styles.engineStatus}>{liveError ? 'Limited coverage' : 'Operational'}</Text></SafeView></SafeView></SafeView>}<ScrollView ref={mainScrollRef} style={styles.main} contentContainerStyle={styles.content}><SafeView style={styles.header}><SafeView style={styles.headerIdentity}>{!isNarrow && <SafeView style={styles.headerBezel}><SafeView style={styles.headerGauge}><Ionicons name="speedometer-outline" size={20} color="#FFFFFF" /></SafeView></SafeView>}<SafeView style={styles.headerTitleCopy}><Text style={styles.eyebrow}>{`${brandName.toUpperCase()} · GLOBAL BRAND INTELLIGENCE`}</Text><Text style={[styles.title, isNarrow && styles.titleNarrow]} numberOfLines={2}>{activeSection === 'Sources' ? 'Data sources' : activeSection === 'Settings' ? 'Workspace settings' : activeSection === 'Overview' ? 'Executive overview' : activeSection === 'Competitors' ? 'Competitive analysis' : activeSection === 'Markets' ? 'Global market performance' : activeSection === 'AI Insights' ? 'AI executive brief' : activeSection === 'Reports' ? 'Executive reports' : activeSection === 'Alerts' ? 'Alert center' : activeSection === 'Team' ? 'Partner team' : 'Sentiment intelligence'}</Text></SafeView></SafeView><SafeView style={styles.headerActions}>{!isNarrow && <Pressable onPress={() => setActiveSection('Alerts')} style={styles.iconButton}><Ionicons name="notifications-outline" size={18} color="#2563EB"/><SafeView style={styles.notificationDot}/></Pressable>}<SafeView style={{ position: 'relative' }}><Pressable onPress={() => setDurationPickerVisible(true)} style={styles.period}><Ionicons name="calendar-outline" size={16} color="#2563EB"/><Text style={styles.periodText}>Last {durationMonths} {durationMonths === 1 ? 'month' : 'months'}</Text><Ionicons name="chevron-down-outline" size={14} color="#2563EB"/></Pressable><Modal visible={durationPickerVisible} transparent animationType="fade" onRequestClose={() => setDurationPickerVisible(false)}><Pressable onPress={() => setDurationPickerVisible(false)} style={{ flex: 1, justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 72, paddingRight: 88, backgroundColor: 'rgba(16,24,40,0.08)' }}><SafeView style={{ width: 170, padding: 8, borderRadius: 12, borderWidth: 1, borderColor: '#E4EAF6', backgroundColor: '#FFFFFF', shadowColor: '#101828', shadowOpacity: 0.12, shadowRadius: 12, elevation: 8 }}>{[1,2,3,4,5,6].map((month) => <Pressable key={month} onPress={() => selectDuration(month)} style={{ height: 40, paddingHorizontal: 10, borderRadius: 8, justifyContent: 'center', backgroundColor: durationMonths === month ? '#EAF1FE' : '#fff' }}><Text style={{ fontSize: 12, fontFamily: durationMonths === month ? fonts.black : fonts.bold, color: durationMonths === month ? '#2563EB' : '#64769B' }}>Last {month} {month === 1 ? 'month' : 'months'}</Text></Pressable>)}</SafeView></Pressable></Modal></SafeView><Pressable style={styles.avatar}><Text style={styles.avatarText}>{brandInitials}</Text></Pressable></SafeView></SafeView>{!isWide && <ScrollView horizontal showsHorizontalScrollIndicator={false}><SafeView style={styles.mobileNav}>{nav.map(([icon,label]) => <Pressable key={label} onPress={() => setActiveSection(label)} style={[styles.mobileNavItem, activeSection === label && styles.mobileNavActive]}><Ionicons name={icon as any} size={14} color={activeSection === label ? '#FFFFFF' : '#93A5C8'}/><Text style={[styles.mobileNavText, activeSection === label && styles.mobileNavTextActive]}>{label}</Text></Pressable>)}</SafeView></ScrollView>}{renderContent()}</ScrollView></SafeView></Animated.View></SafeAreaView>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F4F8FF'},appShell:{flex:1,flexDirection:'row',overflow:'hidden'},sidebar:{zIndex:1,width:236,padding:18,borderRightWidth:1,borderRightColor:'#E4EAF6',backgroundColor:'#FFFFFF'},brandRow:{height:58,flexDirection:'row',alignItems:'center'},logo:{width:38,height:38,borderRadius:12,backgroundColor:'#2563EB',alignItems:'center',justifyContent:'center',marginRight:10,shadowColor:'#1D4ED8',shadowOpacity:0.25,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:3},brand:{fontSize:17,fontFamily:fonts.black,color:'#0F2B57'},brandSubtitle:{fontSize:10,color:'#93A5C8',marginTop:2},workspace:{marginTop:18,padding:12,borderRadius:14,backgroundColor:'#F5F9FF',borderWidth:1,borderColor:'#E4EAF6'},workspaceLabel:{fontSize:9,fontFamily:fonts.black,letterSpacing:1.4,color:'#2563EB',marginBottom:9},workspaceRow:{flexDirection:'row',alignItems:'center'},wuMark:{width:34,height:34,borderRadius:17,backgroundColor:'#2563EB',alignItems:'center',justifyContent:'center',marginRight:8},wuMarkText:{fontSize:10,fontFamily:fonts.black,color:'#FFFFFF'},workspaceName:{fontSize:12,fontFamily:fonts.bold,color:'#0F2B57'},workspaceMeta:{fontSize:9,color:'#93A5C8',marginTop:2},nav:{marginTop:22,gap:5},navItem:{height:44,borderRadius:12,flexDirection:'row',alignItems:'center',paddingHorizontal:12,gap:10,borderWidth:1,borderColor:'transparent'},navActive:{backgroundColor:'#EAF1FE',borderColor:'#EAF1FE'},navText:{flex:1,fontSize:12,fontFamily:fonts.bold,color:'#64769B'},navTextActive:{color:'#2563EB'},navCount:{width:20,height:20,borderRadius:10,backgroundColor:'#2563EB',alignItems:'center',justifyContent:'center'},navCountText:{fontSize:9,fontFamily:fonts.black,color:'#FFFFFF'},engineCard:{marginTop:'auto',padding:14,borderRadius:16,backgroundColor:'#2563EB',shadowColor:'#1D4ED8',shadowOpacity:0.3,shadowRadius:12,shadowOffset:{width:0,height:6},elevation:4},engineHeader:{flexDirection:'row',alignItems:'center',gap:7},engineTitle:{fontSize:11,fontFamily:fonts.bold,color:'#FFFFFF'},engineText:{fontSize:10,lineHeight:15,color:'#DBEAFE',marginTop:9},engineFooter:{flexDirection:'row',alignItems:'center',gap:6,marginTop:9},liveDot:{width:7,height:7,borderRadius:4,backgroundColor:'#34D399'},engineStatus:{fontSize:9,fontFamily:fonts.bold,color:'#A7F3D0'},
  main:{flex:1,backgroundColor:'#F4F8FF',zIndex:1},content:{padding:14,paddingBottom:50,maxWidth:1320,width:'100%',alignSelf:'center'},header:{minHeight:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:8,paddingHorizontal:16,paddingVertical:10,borderRadius:18,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',overflow:'hidden',shadowColor:'#2563EB',shadowOpacity:0.07,shadowRadius:16,shadowOffset:{width:0,height:6},elevation:3},headerIdentity:{flexDirection:'row',alignItems:'center',flex:1},headerBezel:{width:48,height:48,borderRadius:24,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF1FE'},headerGauge:{width:32,height:32,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:'#2563EB'},headerTitleCopy:{flex:1},eyebrow:{fontSize:9,fontFamily:fonts.black,letterSpacing:1.5,color:'#2563EB',marginBottom:3},title:{fontSize:24,fontFamily:fonts.black,color:'#0F2B57',letterSpacing:-0.4},titleNarrow:{fontSize:17,lineHeight:22},headerActions:{flexDirection:'row',alignItems:'center',gap:8},period:{height:38,borderRadius:19,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',paddingHorizontal:12,flexDirection:'row',alignItems:'center'},periodText:{fontSize:11,fontFamily:fonts.bold,color:'#2563EB',marginLeft:6},avatar:{width:38,height:38,borderRadius:19,backgroundColor:'#2563EB',alignItems:'center',justifyContent:'center',shadowColor:'#1D4ED8',shadowOpacity:0.25,shadowRadius:8,shadowOffset:{width:0,height:3},elevation:3},avatarText:{fontSize:10,fontFamily:fonts.black,color:'#FFFFFF'},mobileNav:{flexDirection:'row',gap:6,paddingBottom:10},mobileNavItem:{height:36,paddingHorizontal:10,borderRadius:18,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',gap:5},mobileNavActive:{backgroundColor:'#2563EB',borderColor:'#2563EB'},mobileNavText:{fontSize:10,fontFamily:fonts.bold,color:'#64769B'},mobileNavTextActive:{color:'#FFFFFF'},
  filterBar:{minHeight:48,borderRadius:14,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',paddingHorizontal:12,flexDirection:'row',alignItems:'center',marginBottom:12,shadowColor:'#2563EB',shadowOpacity:0.06,shadowRadius:10,shadowOffset:{width:0,height:3},elevation:2},filterLabel:{fontSize:10,fontFamily:fonts.black,color:'#64769B',width:78},regionRow:{flexDirection:'row',gap:6},regionChip:{height:32,paddingHorizontal:12,borderRadius:16,borderWidth:1,borderColor:'#E4EAF6',alignItems:'center',justifyContent:'center',backgroundColor:'#FFFFFF'},regionChipActive:{borderColor:'#2563EB',backgroundColor:'#2563EB'},regionText:{fontSize:10,fontFamily:fonts.bold,color:'#64769B'},regionTextActive:{color:'#FFFFFF'},
  kpiGrid:{flexDirection:'row',flexWrap:'wrap',gap:12,marginBottom:12},kpi:{minWidth:210,flexGrow:1,flexBasis:210,height:108,borderRadius:18,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',padding:15,flexDirection:'row',alignItems:'center',shadowColor:'#2563EB',shadowOpacity:0.07,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2},kpiIcon:{width:42,height:42,borderRadius:14,alignItems:'center',justifyContent:'center',marginRight:11,backgroundColor:'#EAF1FE'},kpiCopy:{flex:1},kpiLabel:{fontSize:10,fontFamily:fonts.bold,color:'#64769B',textTransform:'uppercase',letterSpacing:0.5},kpiValue:{fontSize:22,fontFamily:fonts.black,color:'#0F2B57',marginTop:3},kpiChange:{fontSize:9,fontFamily:fonts.bold,marginTop:3},
  grid:{gap:12},gridWide:{flexDirection:'row'},  card:{borderRadius:18,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',padding:16,minWidth:280,shadowColor:'#2563EB',shadowOpacity:0.07,shadowRadius:14,shadowOffset:{width:0,height:5},elevation:2},dashboardCard:{borderColor:'#E4EAF6',backgroundColor:'#FFFFFF'},cardWide:{flex:1.35},cardNarrow:{flex:1},fullCard:{marginTop:12,width:'100%'},scorecardGauges:{marginTop:8,alignItems:'center'},sectionCluster:{flexDirection:'row',alignItems:'center',flex:1},sectionGauge:{width:44,height:44,borderRadius:14,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:'#EAF1FE'},sectionGaugeNeedle:{width:20,height:3,borderRadius:2,backgroundColor:'#2563EB',transform:[{rotate:'-35deg'}]},cardHeader:{minHeight:64,marginHorizontal:-16,marginTop:-16,marginBottom:12,paddingHorizontal:16,paddingVertical:10,borderTopLeftRadius:18,borderTopRightRadius:18,borderBottomWidth:1,borderBottomColor:'#EEF3FB',flexDirection:'row',justifyContent:'space-between',alignItems:'center',backgroundColor:'#FFFFFF',overflow:'hidden'},cardTitle:{fontSize:14,fontFamily:fonts.black,color:'#0F2B57',letterSpacing:0.35,textTransform:'uppercase'},cardSub:{fontSize:10,lineHeight:15,color:'#93A5C8',marginTop:4,letterSpacing:0.15},liveBadge:{height:26,paddingHorizontal:9,borderRadius:13,backgroundColor:'#ECFDF3',borderWidth:1,borderColor:'#A6F4C5',flexDirection:'row',alignItems:'center',gap:5},liveBadgeText:{fontSize:8,fontFamily:fonts.black,color:'#027A48',letterSpacing:0.5},warningBadge:{backgroundColor:'#FFFAEB',borderColor:'#FEDF89'},warningText:{color:'#B54708'},countryPills:{flexDirection:'row',gap:6,paddingTop:8},countryPill:{height:34,paddingHorizontal:10,borderRadius:17,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',justifyContent:'center'},countryPillActive:{backgroundColor:'#2563EB',borderColor:'#2563EB'},countryPillText:{fontSize:10,fontFamily:fonts.bold,color:'#64769B'},countryPillTextActive:{color:'#FFFFFF'},chartWrap:{marginTop:5,backgroundColor:'#FFFFFF',borderRadius:12,padding:10,borderWidth:1,borderColor:'#E4EAF6'},rankHero:{height:82,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#E4EAF6'},rankValue:{fontSize:42,fontFamily:fonts.black,color:'#0F2B57'},rankCaption:{fontSize:9,color:'#93A5C8',marginTop:-4},rankBadge:{height:28,paddingHorizontal:8,borderRadius:14,backgroundColor:'#ECFDF3',borderWidth:1,borderColor:'#A6F4C5',flexDirection:'row',alignItems:'center',gap:3},rankBadgeNegative:{backgroundColor:'#FEF3F2',borderColor:'#FECDCA'},rankBadgeText:{fontSize:9,fontFamily:fonts.bold,color:'#027A48'},rankBarRow:{marginTop:10},rankBarLabel:{flexDirection:'row',justifyContent:'space-between',marginBottom:5},rankBarName:{fontSize:10,fontFamily:fonts.bold,color:'#64769B'},rankBarValue:{fontSize:10,fontFamily:fonts.black,color:'#0F2B57'},rankTrack:{height:7,borderRadius:4,backgroundColor:'#E9EEF8'},rankFill:{height:7,borderRadius:4},
  emotionList:{marginTop:18,gap:10},emotionRow:{height:32,flexDirection:'row',alignItems:'center'},emotionDot:{width:8,height:8,borderRadius:4,marginRight:7},emotionLabel:{width:82,fontSize:11,color:'#64769B',fontFamily:fonts.bold},emotionTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#E9EEF8',marginRight:8},emotionFill:{height:7,borderRadius:4},emotionValue:{width:34,textAlign:'right',fontSize:10,fontFamily:fonts.black,color:'#0F2B57'},
  reviewRow:{flexDirection:'row',gap:10,paddingVertical:12,borderTopWidth:1,borderTopColor:'#E4EAF6'},sentimentIcon:{width:34,height:34,borderRadius:17,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E4EAF6'},sentimentPositive:{backgroundColor:'#ECFDF3'},sentimentNegative:{backgroundColor:'#FEF3F2'},sentimentNeutral:{backgroundColor:'#FFFAEB'},reviewContent:{flex:1},reviewMeta:{flexDirection:'row',justifyContent:'space-between'},reviewAuthor:{fontSize:11,fontFamily:fonts.black,color:'#0F2B57'},reviewRating:{fontSize:10,fontFamily:fonts.bold,color:'#F79009'},reviewText:{fontSize:11,lineHeight:17,color:'#3C4C6D',marginTop:4},reviewSource:{fontSize:9,fontFamily:fonts.bold,color:'#93A5C8',marginTop:5},emptyReviews:{minHeight:120,alignItems:'center',justifyContent:'center',padding:20,borderRadius:12,backgroundColor:'#F5F9FF',borderWidth:1,borderColor:'#E4EAF6'},emptyReviewTitle:{fontSize:12,fontFamily:fonts.black,color:'#0F2B57',marginTop:8},emptyReviewText:{fontSize:10,lineHeight:16,color:'#64769B',textAlign:'center',maxWidth:440,marginTop:4},
  marketRow:{minHeight:58,flexDirection:'row',alignItems:'center',borderTopWidth:1,borderTopColor:'#E4EAF6',paddingHorizontal:4,borderRadius:6},marketRowActive:{backgroundColor:'#EAF1FE'},flag:{width:34,height:25,borderRadius:5,backgroundColor:'#E9EEF8',alignItems:'center',justifyContent:'center'},flagText:{fontSize:8,fontFamily:fonts.black,color:'#1D4ED8'},marketName:{width:150,marginLeft:10},marketTitle:{fontSize:11,fontFamily:fonts.bold,color:'#0F2B57'},marketRegion:{fontSize:9,color:'#93A5C8',marginTop:2},marketTrack:{flex:1,height:7,borderRadius:4,backgroundColor:'#E9EEF8',marginHorizontal:12},marketFill:{height:7,borderRadius:4,backgroundColor:'#2563EB'},marketScore:{width:62,fontSize:11,fontFamily:fonts.black,color:'#0F2B57'},marketRank:{width:40,fontSize:11,fontFamily:fonts.black,color:'#1D4ED8',textAlign:'right'},
  competitorDataNote:{fontSize:9,lineHeight:15,color:'#64769B',marginBottom:10},corridorBenchmark:{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:12,paddingHorizontal:12,paddingVertical:10,borderRadius:12,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#F5F9FF'},corridorBenchmarkCell:{flexGrow:1,minWidth:180},corridorBenchmarkLabel:{fontSize:8,fontFamily:fonts.black,letterSpacing:0.35,color:'#93A5C8',textTransform:'uppercase'},corridorBenchmarkValue:{marginTop:3,fontSize:13,fontFamily:fonts.black,color:'#0F2B57'},corridorBenchmarkMeta:{marginTop:3,fontSize:8,lineHeight:12,color:'#93A5C8'},feeDeltaBelow:{color:'#027A48',fontFamily:fonts.bold},feeDeltaAbove:{color:'#F04438',fontFamily:fonts.bold},competitorTable:{width:1029},competitorTableRow:{minHeight:58,flexDirection:'row',alignItems:'center'},competitorTableHeader:{minHeight:38,borderBottomWidth:1,borderBottomColor:'#E4EAF6',backgroundColor:'#F5F9FF'},competitorTableHeading:{paddingHorizontal:7,fontSize:8,fontFamily:fonts.black,letterSpacing:0.35,color:'#64769B',textTransform:'uppercase'},competitorNameColumn:{width:180},competitorRatingColumn:{width:90},competitorReviewsColumn:{width:90},competitorShareColumn:{width:160},competitorFeeColumn:{width:145},competitorVolumeColumn:{width:165},competitorRankColumn:{width:115},competitorStatusColumn:{width:84},competitorRow:{borderTopWidth:1,borderTopColor:'#E4EAF6',paddingHorizontal:0,borderRadius:6},competitorSelected:{backgroundColor:'#F5F9FF'},competitorNameCell:{flexDirection:'row',alignItems:'center',paddingLeft:8,paddingRight:6},appMark:{width:34,height:34,borderRadius:17,backgroundColor:'#EFF4FD',alignItems:'center',justifyContent:'center'},appMarkPrimary:{backgroundColor:'#2563EB',borderWidth:1,borderColor:'#2563EB'},appMarkText:{fontSize:11,fontFamily:fonts.black,color:'#64769B'},appMarkTextPrimary:{color:'#FFFFFF'},competitorName:{flex:1,minWidth:0,marginLeft:10},appName:{fontSize:12,fontFamily:fonts.black,color:'#0F2B57'},sourceMeta:{fontSize:9,color:'#93A5C8',marginTop:3},competitorRating:{width:86,fontSize:12,fontFamily:fonts.black,color:'#0F2B57'},competitorReviews:{width:120,fontSize:11,fontFamily:fonts.bold,color:'#64769B'},competitorMetricCell:{justifyContent:'center',paddingHorizontal:7},competitorMetricValue:{fontSize:10,fontFamily:fonts.black,color:'#0F2B57'},competitorMetricMuted:{fontSize:9,fontFamily:fonts.bold,color:'#93A5C8'},competitorMetricNote:{marginTop:3,fontSize:8,color:'#93A5C8'},competitorRankValue:{fontSize:12,fontFamily:fonts.black,color:'#2563EB'},competitorStatus:{height:26,borderRadius:13,textAlign:'center',textAlignVertical:'center',fontSize:9,fontFamily:fonts.black,overflow:'hidden'},competitorEmpty:{paddingVertical:20,textAlign:'center',fontSize:11,color:'#93A5C8'},verified:{backgroundColor:'#ECFDF3',color:'#027A48'},unavailable:{backgroundColor:'#EFF4FD',color:'#64769B'},
  settingsGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},sourceSetting:{width:310,minHeight:72,flexGrow:1,borderWidth:1,borderColor:'#E4EAF6',borderRadius:12,padding:10,flexDirection:'row',alignItems:'center',backgroundColor:'#FFFFFF'},sourceIcon:{width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#2563EB',alignItems:'center',justifyContent:'center'},sourceSettingCopy:{flex:1,marginHorizontal:10},sourceSettingTitle:{fontSize:11,fontFamily:fonts.black,color:'#0F2B57'},sourceSettingDetail:{fontSize:9,lineHeight:14,color:'#64769B',marginTop:2},connectionStatus:{height:26,paddingHorizontal:8,borderRadius:13,backgroundColor:'#EFF4FD',justifyContent:'center'},connectionStatusLive:{backgroundColor:'#ECFDF3',borderWidth:1,borderColor:'#A6F4C5'},connectionStatusText:{fontSize:9,fontFamily:fonts.black,color:'#64769B'},connectionStatusTextLive:{color:'#027A48'},integrationNotice:{marginTop:12,minHeight:76,borderRadius:12,borderWidth:1,borderColor:'#2563EB',backgroundColor:'#FFFFFF',padding:12,flexDirection:'row',alignItems:'flex-start',gap:10},integrationNoticeCopy:{flex:1},integrationNoticeTitle:{fontSize:11,fontFamily:fonts.black,color:'#0F2B57'},integrationNoticeText:{fontSize:10,lineHeight:15,color:'#64769B',marginTop:3},iconButton:{width:38,height:38,borderRadius:19,borderWidth:1,borderColor:'#E4EAF6',backgroundColor:'#FFFFFF',alignItems:'center',justifyContent:'center'},notificationDot:{position:'absolute',right:8,top:8,width:6,height:6,borderRadius:3,backgroundColor:'#F04438'},insightGrid:{flexDirection:'row',flexWrap:'wrap',gap:10,marginTop:4},insightCard:{width:280,minHeight:170,flexGrow:1,borderRadius:12,borderWidth:1,borderColor:'#E4EAF6',padding:14,backgroundColor:'#FFFFFF'},insightIcon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',marginBottom:12,borderWidth:1,borderColor:'#E4EAF6'},insightTitle:{fontSize:12,fontFamily:fonts.black,color:'#0F2B57'},insightBody:{fontSize:11,lineHeight:17,color:'#64769B',marginTop:7},severityBadge:{alignSelf:'flex-start',height:22,borderRadius:11,borderWidth:1,paddingHorizontal:8,justifyContent:'center',marginTop:10},severityText:{fontSize:9,fontFamily:fonts.black,textTransform:'uppercase'},reportRow:{minHeight:64,borderTopWidth:1,borderTopColor:'#E4EAF6',flexDirection:'row',alignItems:'center'},reportIcon:{width:38,height:38,borderRadius:19,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#2563EB',alignItems:'center',justifyContent:'center'},reportCopy:{flex:1,marginLeft:10},reportTitle:{fontSize:12,fontFamily:fonts.black,color:'#0F2B57'},reportMeta:{fontSize:9,color:'#93A5C8',marginTop:3},formatBadge:{height:24,borderRadius:12,backgroundColor:'#EFF4FD',paddingHorizontal:9,justifyContent:'center'},formatText:{fontSize:9,fontFamily:fonts.black,color:'#64769B'},reportAction:{width:34,height:34,alignItems:'center',justifyContent:'center'},alertRow:{minHeight:68,borderTopWidth:1,borderTopColor:'#E4EAF6',flexDirection:'row',alignItems:'center'},alertIcon:{width:38,height:38,borderRadius:19,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#E4EAF6'},alertCopy:{flex:1,marginLeft:10},alertTitle:{fontSize:11,fontFamily:fonts.black,color:'#0F2B57'},alertMeta:{fontSize:9,color:'#93A5C8',marginTop:4},memberRow:{minHeight:68,borderTopWidth:1,borderTopColor:'#E4EAF6',flexDirection:'row',alignItems:'center'},memberAvatar:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center',borderWidth:1,borderColor:'#2563EB'},memberAvatarText:{fontSize:11,fontFamily:fonts.black,color:'#FFFFFF'},memberCopy:{flex:1,marginLeft:10},memberName:{fontSize:12,fontFamily:fonts.black,color:'#0F2B57'},memberMeta:{fontSize:9,color:'#93A5C8',marginTop:3},roleBadge:{height:26,borderRadius:13,paddingHorizontal:9,backgroundColor:'#EFF4FD',justifyContent:'center'},roleText:{fontSize:9,fontFamily:fonts.black,color:'#64769B'},settingsLabel:{fontSize:11,fontFamily:fonts.black,color:'#64769B',marginBottom:7},settingsDetail:{fontSize:9,color:'#93A5C8',marginTop:2},settingsInput:{height:44,borderWidth:1,borderColor:'#E4EAF6',borderRadius:10,backgroundColor:'#FFFFFF',paddingHorizontal:12,color:'#0F2B57'},toggleRow:{height:68,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderTopWidth:1,borderTopColor:'#E4EAF6'},settingsField:{width:310,flexGrow:1,gap:1},settingsActions:{marginTop:18,flexDirection:'row',justifyContent:'flex-end',gap:8},secondaryButton:{height:40,paddingHorizontal:14,borderRadius:12,borderWidth:1,borderColor:'#2563EB',backgroundColor:'#FFFFFF',justifyContent:'center'},secondaryButtonText:{fontSize:11,fontFamily:fonts.bold,color:'#2563EB'},primaryButton:{height:40,paddingHorizontal:14,borderRadius:12,backgroundColor:'#2563EB',justifyContent:'center',flexDirection:'row',alignItems:'center',gap:6,borderWidth:1,borderColor:'#2563EB',shadowColor:'#1E3A8A',shadowOpacity:0.3,shadowRadius:8,shadowOffset:{width:0,height:2},elevation:3},primaryButtonText:{fontSize:11,fontFamily:fonts.bold,color:'#FFFFFF'},
  selectedBrandSummary:{minHeight:64,marginBottom:12,paddingHorizontal:12,paddingVertical:9,borderRadius:12,borderWidth:1,borderColor:'#2563EB',backgroundColor:'#FFFFFF',flexDirection:'row',alignItems:'center',shadowColor:'#2563EB',shadowOpacity:0.12,shadowRadius:6,shadowOffset:{width:0,height:2},elevation:2},
  selectedBrandSummaryMark:{width:34,height:34,borderRadius:17,marginRight:10,alignItems:'center',justifyContent:'center',backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#2563EB'},
  selectedBrandSummaryCopy:{flex:1},
  selectedBrandSummaryLabel:{fontSize:9,fontFamily:fonts.black,letterSpacing:0.6,color:'#2563EB'},
  selectedBrandSummaryRank:{marginTop:4,fontSize:10,fontFamily:fonts.bold,color:'#64769B'},
  selectedBrandSummaryValue:{marginLeft:8,fontSize:22,fontFamily:fonts.black,color:'#0F2B57'},
  competitorSelectedStrong:{backgroundColor:'#F5F9FF',borderLeftWidth:3,borderLeftColor:'#2563EB'},
  selectedBrandRankCell:{minHeight:46,marginVertical:6,paddingVertical:5,borderRadius:7,backgroundColor:'#FFFFFF',borderWidth:1,borderColor:'#2563EB'},
  selectedBrandRankValue:{color:'#2563EB',fontSize:15},
  selectedBrandRankNote:{color:'#2563EB',fontFamily:fonts.black},
});
