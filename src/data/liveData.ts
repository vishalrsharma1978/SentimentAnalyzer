export type LiveCompetitor = {
  name: string;
  rating: number | null;
  reviewCount: number | null;
  source: 'Apple App Store' | 'Google Play' | 'Unavailable';
  status: 'live' | 'unavailable';
  updatedAt: string | null;
};

export type CompetitorSharePrice = {
  name: string;
  symbol: string | null;
  price: number | null;
  currency: string | null;
  quoteTime: string | null;
  status: 'live' | 'not-listed' | 'unavailable';
};

export type CustomerSentiment = {
  source: string;
  author: string;
  rating: number;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  publishedAt?: string | null;
};

export type ReviewTranslation = {
  translatedText: string;
  detectedSourceLanguage: string;
};

export async function fetchCompetitorSharePrices(names: string[]): Promise<CompetitorSharePrice[]> {
  const apiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL || 'http://localhost:3001';
  const response = await fetch(
    `${apiUrl.replace(/\/$/, '')}/api/competitor-share-prices?names=${encodeURIComponent(names.join(','))}`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' },
  );
  if (!response.ok) {
    throw new Error(`Share-price service returned HTTP ${response.status}.`);
  }

  const data: unknown = await response.json();
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw new Error('Share-price service returned an invalid response.');
  }

  return data.items.map((item) => {
    if (!isRecord(item) || typeof item.name !== 'string') {
      throw new Error('Share-price service returned an invalid competitor quote.');
    }
    return {
      name: item.name,
      symbol: typeof item.symbol === 'string' ? item.symbol : null,
      price: typeof item.price === 'number' && Number.isFinite(item.price) ? item.price : null,
      currency: typeof item.currency === 'string' ? item.currency : null,
      quoteTime: typeof item.quoteTime === 'string' ? item.quoteTime : null,
      status: item.status === 'live' || item.status === 'not-listed' ? item.status : 'unavailable',
    };
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

export async function translateReviewText(text: string): Promise<ReviewTranslation> {
  const apiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL || 'http://localhost:3001';
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 50000);

  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/translate`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    let data: {
      translatedText?: unknown;
      detectedSourceLanguage?: unknown;
      error?: unknown;
    };
    try {
      data = await response.json();
    } catch {
      throw new Error('The translation service returned an unreadable response.');
    }

    if (!response.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : 'Translation is temporarily unavailable.');
    }
    if (typeof data.translatedText !== 'string' || typeof data.detectedSourceLanguage !== 'string') {
      throw new Error('The translation service returned an invalid response.');
    }

    return {
      translatedText: data.translatedText,
      detectedSourceLanguage: data.detectedSourceLanguage,
    };
  } finally {
    clearTimeout(timeout);
  }
}

const COMPETITOR_TERMS: Record<string, string> = {
  'Western Union': 'Western Union Send Money',
  Wise: 'Wise Transfer Money',
  Remitly: 'Remitly Send Money',
  MoneyGram: 'MoneyGram Money Transfers',
  PayPal: 'PayPal Money Transfer',
  Xoom: 'Xoom Money Transfer',
  WorldRemit: 'WorldRemit Money Transfer',
  Revolut: 'Revolut Transfer Money',
  Ria: 'Ria Money Transfer',
  GCash: 'GCash Send Money',
  'BookMyForex': 'BookMyForex Money Transfer',
  'Al Ansari Exchange': 'Al Ansari Exchange Money Transfer',
  'Skrill': 'Skrill Money Transfer',
};

const COUNTRY_COMPETITOR_NAMES: Record<string, string[]> = {
  US: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'PayPal'],
  CA: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom'],
  MX: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'Ria'],
  IN: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'BookMyForex', 'Xoom'],
  PH: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'GCash', 'WorldRemit'],
  GB: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Revolut', 'WorldRemit'],
  DE: ['Western Union', 'Wise', 'Remitly', 'Revolut', 'MoneyGram', 'Skrill'],
  AE: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Al Ansari Exchange', 'WorldRemit'],
  SA: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Al Ansari Exchange', 'Ria'],
  AU: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'WorldRemit', 'Xoom'],
  SG: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Revolut', 'WorldRemit'],
  BR: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'Ria'],
};

const REGIONAL_COMPETITOR_NAMES: Record<string, string[]> = {
  'North America': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'PayPal'],
  Europe: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Revolut', 'WorldRemit', 'Skrill'],
  'Asia Pacific': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'GCash', 'WorldRemit', 'BookMyForex'],
  'Latin America': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'Ria'],
  'Middle East & Africa': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Al Ansari Exchange', 'WorldRemit'],
  Global: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'WorldRemit'],
};

const APPLE_COUNTRY: Record<string, string> = {
  US: 'us', GB: 'gb', IN: 'in', DE: 'de', PH: 'ph', MX: 'mx', AE: 'ae', FR: 'fr',
  AU: 'au', CA: 'ca', BR: 'br', JP: 'jp', SG: 'sg', SE: 'se', NO: 'no', DK: 'dk',
  FI: 'fi', IS: 'is', AR: 'ar', CL: 'cl', CO: 'co', PE: 'pe', IT: 'it', ES: 'es',
  NL: 'nl', ZA: 'za', EG: 'eg', NG: 'ng', SA: 'sa', ID: 'id', MY: 'my', KR: 'kr',
};

export async function fetchRedditMentions(brandName = 'Western Union'): Promise<CustomerSentiment[]> {
  try {
    const url = `https://www.reddit.com/search.json?q=${encodeURIComponent(brandName)}&sort=new&limit=25&type=link,comment`;
    const response = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!response.ok) return [];
    const data = await response.json();
    const posts = data?.data?.children ?? [];

    return posts.slice(0, 12).map((child: any) => {
      const post = child.data ?? {};
      const title = String(post.title ?? '').replace(/\s+/g, ' ').trim();
      const body = String(post.selftext ?? '').replace(/\s+/g, ' ').trim();
      const text = `${title}${title && body ? ' — ' : ''}${body}`.trim();
      const lower = text.toLowerCase();
      const sentiment: CustomerSentiment['sentiment'] = /scam|fraud|delay|slow|fee|failed|problem|bad|hate|terrible/i.test(lower)
        ? 'negative'
        : /good|great|excellent|fast|easy|helpful|love|recommend|best/i.test(lower)
          ? 'positive'
          : 'neutral';

      return {
        source: 'Reddit',
        author: String(post.author ? `u/${post.author}` : 'Reddit user'),
        rating: 0,
        text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
        sentiment,
        publishedAt: Number.isFinite(Number(post.created_utc))
          ? new Date(Number(post.created_utc) * 1000).toISOString()
          : null,
      };
    }).filter((review: CustomerSentiment) => review.text.length > 0);
  } catch {
    return [];
  }
}

export async function fetchPlaystoreAggregateRating(countryCode: string, brandName = 'Western Union'): Promise<{ rating: number | null; reviewCount: number }> {
  const apiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL || 'http://localhost:3001';
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/platform-ratings?brand=${encodeURIComponent(brandName)}&country=${encodeURIComponent(countryCode)}&_ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return { rating: null, reviewCount: 0 };
    const data = await response.json();
    return {
      rating: data.google?.rating !== null && data.google?.rating !== undefined ? Number(data.google.rating) : null,
      reviewCount: Number(data.google?.reviewCount ?? 0),
    };
  } catch {
    return { rating: null, reviewCount: 0 };
  }
}

export async function fetchReviewCollector(countryCode: string, brandName = 'Western Union', months = 1, refreshNonce = 0): Promise<CustomerSentiment[]> {
  const apiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL || 'http://localhost:3001';
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/api/reviews?brand=${encodeURIComponent(brandName)}&country=${encodeURIComponent(countryCode)}&limit=3600&months=${months}&refresh=${refreshNonce}_${Date.now()}`, {
      headers: { Accept: 'application/json' },
      cache: 'no-store',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return (data.reviews ?? []).map((review: any) => ({
      source: String(review.source ?? 'Review source'),
      author: String(review.author ?? 'Verified customer'),
      rating: Number(review.rating ?? 0),
      text: String(review.text ?? '').replace(/\s+/g, ' ').trim(),
      sentiment: review.sentiment === 'positive' || review.sentiment === 'negative' ? review.sentiment : 'neutral',
      publishedAt: typeof review.publishedAt === 'string' ? review.publishedAt : null,
    })).filter((review: CustomerSentiment) => review.text.length > 0);
  } catch {
    return [];
  }
}

async function appleLookup(term: string, countryCode: string): Promise<any[]> {
  const country = APPLE_COUNTRY[countryCode] ?? 'us';
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country}&entity=software&limit=15&_ts=${Date.now()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    const response = await fetch(url, { cache: 'no-store', signal: controller.signal });
    if (!response.ok) throw new Error(`Apple App Store returned ${response.status}`);
    const data = await response.json();
    return data.results ?? [];
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchAppleCompetitors(countryCode: string, region = 'Global'): Promise<LiveCompetitor[]> {
  const competitorNames = COUNTRY_COMPETITOR_NAMES[countryCode.toUpperCase()] ??
    REGIONAL_COMPETITOR_NAMES[region] ?? REGIONAL_COMPETITOR_NAMES.Global;
  const competitors = competitorNames.map((name) => [name, COMPETITOR_TERMS[name]] as const);
  return Promise.all(competitors.map(async ([name, term]) => {
    try {
      const results = await appleLookup(term, countryCode);
      const expected = name.toLowerCase();
      const match = results.find((item) =>
        `${item.trackName ?? ''} ${item.sellerName ?? item.artistName ?? ''}`.toLowerCase().includes(name === 'Wise' ? 'wise' : expected),
      );
      if (!match?.averageUserRating) throw new Error(`No Apple result for ${name}`);
      return {
        name,
        rating: Number(match.averageUserRating.toFixed(1)),
        reviewCount: Number(match.userRatingCount ?? 0),
        source: 'Apple App Store' as const,
        status: 'live' as const,
        updatedAt: new Date().toISOString(),
      };
    } catch {
      return { name, rating: null, reviewCount: null, source: 'Unavailable' as const, status: 'unavailable' as const, updatedAt: null };
    }
  }));
}

const appleRatingCache = new Map<string, { expiresAt: number; value: { rating: number | null; reviewCount: number } }>();

export async function fetchAppleStoreRating(countryCode: string, brandName = 'Western Union'): Promise<{ rating: number | null; reviewCount: number }> {
  const cacheKey = `${countryCode.toUpperCase()}:${brandName}`;
  const cached = appleRatingCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const apiUrl = process.env.EXPO_PUBLIC_REVIEW_API_URL || 'http://localhost:3001';
  try {
    const platformResponse = await fetch(`${apiUrl.replace(/\/$/, '')}/api/platform-ratings?brand=${encodeURIComponent(brandName)}&country=${encodeURIComponent(countryCode.toUpperCase())}&_ts=${Date.now()}`, { cache: 'no-store' });
    if (platformResponse.ok) {
      const platformData = await platformResponse.json();
      const serverRating = platformData.apple?.rating !== null && platformData.apple?.rating !== undefined
        ? Number(platformData.apple.rating)
        : null;
      const serverReviewCount = Number(platformData.apple?.reviewCount ?? 0);
      if (serverRating !== null) {
        const value = { rating: serverRating, reviewCount: serverReviewCount };
        appleRatingCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, value });
        return value;
      }
    }

    const searchTerms = [COMPETITOR_TERMS[brandName] ?? brandName, brandName];
    let results: any[] = [];
    for (const term of searchTerms) {
      results = await appleLookup(term, countryCode);
      if (results.length) break;
    }
    const matches = results.filter((item) =>
      `${item.trackName ?? ''} ${item.sellerName ?? ''}`.toLowerCase().includes('western union'),
    );
    const match = matches.find((item) => String(item.trackName ?? '').toLowerCase().startsWith('western union'))
      ?? matches.find((item) => String(item.trackName ?? '').toLowerCase().includes('western union'));
    const value = match?.averageUserRating
      ? { rating: Number(Number(match.averageUserRating).toFixed(2)), reviewCount: Number(match.userRatingCount ?? 0) }
      : { rating: null as number | null, reviewCount: 0 };
    appleRatingCache.set(cacheKey, { expiresAt: Date.now() + 5 * 60 * 1000, value });
    return value;
  } catch {
    return { rating: null, reviewCount: 0 };
  }
}

export async function fetchAppleReviews(countryCode: string, brandName = 'Western Union', months = 1, refreshNonce = 0): Promise<CustomerSentiment[]> {
  try {
    const results = await appleLookup(COMPETITOR_TERMS[brandName] ?? brandName, countryCode);
    const match = results.find((item) => `${item.trackName ?? ''} ${item.sellerName ?? ''}`.toLowerCase().includes('western union'))
      ?? results[0];
    if (!match?.trackId) return [];

    const country = APPLE_COUNTRY[countryCode] ?? 'us';
    const response = await fetch(`https://itunes.apple.com/${country}/rss/customerreviews/id=${match.trackId}/sortBy=mostRecent/json?_ts=${refreshNonce}_${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const entries = data.feed?.entry ?? [];
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - months);
    return entries.slice(0, 100).filter((entry: any) => {
      if (!entry['im:rating'] || !entry.content) return false;
      const updated = new Date(entry.updated?.label ?? 0);
      return Number.isNaN(updated.getTime()) || updated >= cutoff;
    }).map((entry: any) => {
      const rating = Number(entry['im:rating']?.label ?? 3);
      const text = String(entry.content?.label ?? '').replace(/\s+/g, ' ').trim();
      const lower = text.toLowerCase();
      const sentiment: CustomerSentiment['sentiment'] = rating >= 4
        ? 'positive'
        : rating <= 2 || /delay|slow|problem|scam|charge|fee|failed|support/i.test(lower)
          ? 'negative'
          : 'neutral';
      return {
        source: 'Apple App Store',
        author: String(entry.author?.name?.label ?? 'Verified customer'),
        rating,
        text: text.length > 180 ? `${text.slice(0, 177)}…` : text,
        sentiment,
      };
    });
  } catch {
    return [];
  }
}
