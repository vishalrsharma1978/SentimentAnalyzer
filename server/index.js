require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { createHash } = require('node:crypto');
const fs = require('node:fs');
const https = require('node:https');
const path = require('node:path');
const express = require('express');
const cors = require('cors');
const gplayModule = require('google-play-scraper');
const gplay = gplayModule.default || gplayModule;
const YahooFinance = require('yahoo-finance2').default;
const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

const app = express();
app.use(cors());
app.use(express.json());
app.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  next();
});

const PORT = Number(process.env.REVIEW_COLLECTOR_PORT || 3001);
const reviewsCache = new Map();
const platformRatingsCache = new Map();
const translationCache = new Map();
const translationRateLimits = new Map();
const stockQuoteCache = new Map();
const REVIEWS_CACHE_TTL_MS = 60 * 1000;
const PLATFORM_RATINGS_CACHE_TTL_MS = 5 * 60 * 1000;
const STOCK_QUOTE_CACHE_TTL_MS = 60 * 1000;
const TRANSLATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
const TRANSLATION_RATE_WINDOW_MS = 60 * 1000;
const TRANSLATION_RATE_LIMIT = 10;
const TRANSLATION_GLOBAL_RATE_LIMIT = 100;
const TRANSLATION_MAX_LENGTH = 5000;
const TRANSLATION_CACHE_MAX_ENTRIES = 1000;
let translationGlobalRateLimit = { startedAt: Date.now(), count: 0 };

const APP_PACKAGES = {
  'Western Union': 'com.westernunion.android.mtapp',
  Wise: 'com.transferwise.android',
  Remitly: 'com.remitly.androidapp',
  MoneyGram: 'com.gpshopper.moneygram',
  PayPal: 'com.paypal.android.p2pmobile',
  Xoom: 'com.xoom.android.app',
  Revolut: 'com.revolut.revolut',
  WorldRemit: 'com.worldremit.android',
  Ria: 'com.riamoneytransfer.android',
  GCash: 'com.globe.gcash.android',
  BookMyForex: 'com.bookmyforex.android',
  Skrill: 'com.paysafe.skrill',
  'Al Ansari Exchange': 'ae.alansari.mobile',
  Venmo: 'com.venmo',
  'Cash App': 'com.squareup.cash',
  Monzo: 'co.uk.getmondo',
  Chime: 'com.chimebank',
};

const COMPETITOR_STOCK_SYMBOLS = {
  'Western Union': 'WU',
  Wise: 'WISE.L',
  Remitly: 'RELY',
  PayPal: 'PYPL',
  'Al Ansari Exchange': 'ALANSARI.AE',
};

const COMPETITORS_WITHOUT_PUBLIC_LISTING = [
  'MoneyGram',
  'Xoom',
  'Revolut',
  'WorldRemit',
  'Ria Money Transfer',
  'GCash',
  'BookMyForex',
  'Skrill',
];

async function getCompetitorSharePrice(name) {
  const symbol = COMPETITOR_STOCK_SYMBOLS[name];
  if (!symbol) {
    return {
      name,
      symbol: null,
      price: null,
      currency: null,
      quoteTime: null,
      status: COMPETITORS_WITHOUT_PUBLIC_LISTING.includes(name) ? 'not-listed' : 'unavailable',
    };
  }

  const cached = stockQuoteCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < STOCK_QUOTE_CACHE_TTL_MS) {
    return { ...cached.value, name };
  }

  const quote = await fetchYahooQuote(symbol);
  if (quote) {
    const value = { name, symbol, ...quote, status: 'live' };
    stockQuoteCache.set(symbol, { cachedAt: Date.now(), value });
    return value;
  }

  return {
    name,
    symbol,
    price: null,
    currency: null,
    quoteTime: null,
    status: 'unavailable',
  };
}

// yahoo-finance2's quote() hits an endpoint that now requires crumb/cookie auth
// and is blocked from datacenter IPs. The v8 chart endpoint serves the same
// market price without auth, so use it as a resilient fallback.
async function fetchYahooQuote(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (typeof quote.regularMarketPrice === 'number' && Number.isFinite(quote.regularMarketPrice)) {
      return {
        price: quote.regularMarketPrice,
        currency: quote.currency || null,
        quoteTime: quote.regularMarketTime ? new Date(quote.regularMarketTime).toISOString() : null,
      };
    }
  } catch (error) {
    console.error(`Yahoo Finance quote failed for ${symbol}:`, error.name || 'unknown error');
  }
  return fetchYahooChartQuote(symbol);
}

function fetchYahooChartQuote(symbol) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const request = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' } }, (response) => {
      let body = '';
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          if (response.statusCode !== 200) {
            console.error(`Yahoo chart quote for ${symbol} returned HTTP ${response.statusCode}.`);
            resolve(null);
            return;
          }
          const meta = JSON.parse(body)?.chart?.result?.[0]?.meta;
          const price = meta?.regularMarketPrice;
          if (typeof price !== 'number' || !Number.isFinite(price)) {
            resolve(null);
            return;
          }
          resolve({
            price,
            currency: typeof meta.currency === 'string' ? meta.currency : null,
            quoteTime: typeof meta.regularMarketTime === 'number' ? new Date(meta.regularMarketTime * 1000).toISOString() : null,
          });
        } catch {
          resolve(null);
        }
      });
    });
    request.on('error', (error) => {
      console.error(`Yahoo chart quote failed for ${symbol}:`, error.message || 'unknown error');
      resolve(null);
    });
    request.setTimeout(10000, () => request.destroy());
  });
}

function decodeTranslationEntities(text) {
  const namedEntities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
  return text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (entity, code) => {
    if (Object.prototype.hasOwnProperty.call(namedEntities, code.toLowerCase())) {
      return namedEntities[code.toLowerCase()];
    }
    const numericCode = code[1].toLowerCase() === 'x'
      ? Number.parseInt(code.slice(2), 16)
      : Number.parseInt(code.slice(1), 10);
    return Number.isInteger(numericCode) && numericCode >= 0 && numericCode <= 0x10ffff
      ? String.fromCodePoint(numericCode)
      : entity;
  });
}

function classifySentiment(text, rating) {
  const lower = String(text || '').toLowerCase();
  if (/scam|fraud|delay|slow|fee|failed|problem|bad|hate|terrible|stolen/i.test(lower)) return 'negative';
  if (rating <= 2) return 'negative';
  if (/good|great|excellent|fast|easy|helpful|love|recommend|best|amazing/i.test(lower) || rating >= 4) return 'positive';
  return 'neutral';
}

async function collectGooglePlayReviews(brand, country, months = 1) {
  const appId = APP_PACKAGES[brand];
  if (!appId) return [];
  try {
    const result = await gplay.reviews({ appId, country: country.toLowerCase(), sort: gplay.sort.NEWEST, num: Math.min(500 * months, 3000) });
    return (result.data || []).map((review) => ({
      source: 'Google Play',
      author: review.userName || 'Verified customer',
      rating: Number(review.score || 0),
      text: String(review.text || '').replace(/\s+/g, ' ').trim(),
      sentiment: classifySentiment(review.text, review.score),
      appVersion: review.version || null,
      publishedAt: review.date ? new Date(review.date).toISOString() : null,
      sourceId: String(review.id || ''),
    })).filter((review) => review.text);
  } catch (error) {
    console.error(`Google Play collection failed for ${brand}:`, error.message);
    return [];
  }
}

async function collectAppleReviews(brand, country) {
  const countryCode = country.toLowerCase();
  try {
    let lookupData = { results: [] };
    for (const term of [brand === 'Western Union' ? 'Western Union Send Money' : `${brand} Send Money`, brand]) {
      const lookup = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${countryCode}&entity=software&limit=15&_ts=${Date.now()}`, { cache: 'no-store' });
      if (!lookup.ok) continue;
      const candidate = await lookup.json();
      if ((candidate.results || []).length) {
        lookupData = candidate;
        break;
      }
    }
    const appNameIncludesBrand = (app) => `${app.trackName || ''} ${app.sellerName || app.artistName || ''}`.toLowerCase().includes(brand === 'Wise' ? 'wise' : brand.toLowerCase());
    const match = (lookupData.results || []).find(appNameIncludesBrand)
      || (lookupData.results || []).find((app) => /money|transfer|wallet/i.test(app.trackName || ''));
    if (!match?.trackId) return [];
    const response = await fetch(`https://itunes.apple.com/${countryCode}/rss/customerreviews/id=${match.trackId}/sortBy=mostRecent/json?_ts=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return [];
    const data = await response.json();
    const entries = Array.isArray(data.feed?.entry) ? data.feed.entry : (data.feed?.entry ? [data.feed.entry] : []);
    return entries.slice(0, 100).map((entry) => {
      const rating = Number(entry['im:rating']?.label || 0);
      const text = String(entry.content?.label || '').replace(/\s+/g, ' ').trim();
      return {
        source: 'Apple App Store',
        author: String(entry.author?.name?.label || 'Verified customer'),
        rating,
        text,
        sentiment: classifySentiment(text, rating),
        appVersion: String(entry['im:version']?.label || ''),
        publishedAt: entry.updated?.label || null,
        sourceId: String(entry.id?.label || ''),
      };
    }).filter((review) => review.text);
  } catch (error) {
    console.error(`Apple RSS collection failed for ${brand}:`, error.message);
    return [];
  }
}

const DIST_DIR = path.join(__dirname, '..', 'dist');
const hasWebBuild = fs.existsSync(path.join(DIST_DIR, 'index.html'));

if (hasWebBuild) {
  app.use(express.static(DIST_DIR));
} else {
  app.get('/', (_request, response) => {
    response.json({
      service: 'PulseBoard review collector',
      status: 'ok',
      dashboard: process.env.EXPO_PUBLIC_APP_URL || 'http://localhost:8081',
      health: '/health',
      reviews: '/api/reviews?brand=Western%20Union&country=US&limit=100',
    });
  });
}

app.get('/health', (_request, response) => response.json({ status: 'ok' }));

app.get('/api/competitor-share-prices', async (request, response) => {
  const requestedNames = String(request.query.names || '')
    .split(',')
    .map((name) => name.trim())
    .filter(Boolean);

  if (requestedNames.length === 0 || requestedNames.length > 20) {
    response.status(400).json({ error: 'Provide between 1 and 20 competitor names.' });
    return;
  }

  const names = [...new Set(requestedNames)];
  const items = await Promise.all(names.map(getCompetitorSharePrice));
  response.json({
    source: 'Yahoo Finance via yahoo-finance2 (unofficial; quotes may be delayed)',
    updatedAt: new Date().toISOString(),
    items,
  });
});

app.post('/api/translate', async (request, response) => {
  const text = typeof request.body?.text === 'string' ? request.body.text.trim() : '';
  if (!text) {
    response.status(400).json({ error: 'Comment text is required.' });
    return;
  }
  if (text.length > TRANSLATION_MAX_LENGTH) {
    response.status(413).json({ error: `Comment text must be ${TRANSLATION_MAX_LENGTH} characters or fewer.` });
    return;
  }

  const cacheKey = createHash('sha256').update(text).digest('hex');
  const cached = translationCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < TRANSLATION_CACHE_TTL_MS) {
    response.json(cached.translation);
    return;
  }

  const now = Date.now();
  for (const [ip, limit] of translationRateLimits) {
    if (now - limit.startedAt >= TRANSLATION_RATE_WINDOW_MS) {
      translationRateLimits.delete(ip);
    }
  }
  const clientIp = request.ip || request.socket.remoteAddress || 'unknown';
  const rateLimit = translationRateLimits.get(clientIp);
  if (rateLimit && now - rateLimit.startedAt < TRANSLATION_RATE_WINDOW_MS && rateLimit.count >= TRANSLATION_RATE_LIMIT) {
    response.status(429).json({ error: 'Translation limit reached. Please try again in a minute.' });
    return;
  }
  if (now - translationGlobalRateLimit.startedAt >= TRANSLATION_RATE_WINDOW_MS) {
    translationGlobalRateLimit = { startedAt: now, count: 0 };
  }
  if (translationGlobalRateLimit.count >= TRANSLATION_GLOBAL_RATE_LIMIT) {
    response.status(429).json({ error: 'Translation is busy. Please try again in a minute.' });
    return;
  }
  if (rateLimit && now - rateLimit.startedAt < TRANSLATION_RATE_WINDOW_MS) {
    rateLimit.count += 1;
  } else {
    translationRateLimits.set(clientIp, { startedAt: now, count: 1 });
  }
  translationGlobalRateLimit.count += 1;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const translationUrl = (process.env.LIBRETRANSLATE_URL || 'http://127.0.0.1:5000').replace(/\/$/, '');
    const providerResponse = await fetch(
      `${translationUrl}/translate`,
      {
        method: 'POST',
        headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text, source: 'auto', target: 'en', format: 'text' }),
        signal: controller.signal,
      },
    );
    let providerData;
    try {
      providerData = await providerResponse.json();
    } catch {
      console.error('LibreTranslate returned an unreadable response.');
      response.status(502).json({ error: 'Translation service returned an unreadable response.' });
      return;
    }
    if (!providerResponse.ok) {
      console.error(`LibreTranslate returned HTTP ${providerResponse.status}.`);
      response.status(502).json({ error: 'Translation is temporarily unavailable.' });
      return;
    }

    const translation = providerData?.translatedText;
    const detectedLanguage = providerData?.detectedLanguage?.language;
    if (typeof translation !== 'string' || typeof detectedLanguage !== 'string') {
      console.error('LibreTranslate returned an invalid response.');
      response.status(502).json({ error: 'Translation service returned an invalid response.' });
      return;
    }

    const result = {
      translatedText: decodeTranslationEntities(translation),
      detectedSourceLanguage: detectedLanguage,
    };
    if (translationCache.size >= TRANSLATION_CACHE_MAX_ENTRIES) {
      const oldestKey = translationCache.keys().next().value;
      if (oldestKey) translationCache.delete(oldestKey);
    }
    translationCache.set(cacheKey, { cachedAt: Date.now(), translation: result });
    response.json(result);
  } catch (error) {
    console.error('LibreTranslate request failed:', error.name || 'unknown error');
    response.status(502).json({ error: 'Translation is temporarily unavailable. Make sure LibreTranslate is running.' });
  } finally {
    clearTimeout(timeout);
  }
});

app.get('/api/platform-ratings', async (request, response) => {
  const brand = String(request.query.brand || 'Western Union');
  const country = String(request.query.country || 'US').toUpperCase();
  const appId = APP_PACKAGES[brand];
  if (!appId) {
    response.json({ google: { rating: null, reviewCount: 0 }, apple: { rating: null, reviewCount: 0 }, country, brand });
    return;
  }
  const cacheKey = `${brand}:${country}`;
  const bypassCache = request.query.refresh !== undefined && request.query.refresh !== '';
  const cached = platformRatingsCache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.cachedAt < PLATFORM_RATINGS_CACHE_TTL_MS) {
    response.json({ ...cached.value, collectedAt: cached.collectedAt });
    return;
  }
  try {
    const app = await gplay.app({ appId, country: country.toLowerCase() });
    let appleRating = null;
    let appleReviewCount = 0;
    try {
      const appleCountry = country.toLowerCase();
      const brandLower = brand.toLowerCase();
      const lookup = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(brand)}&country=${appleCountry}&entity=software&limit=15&_ts=${Date.now()}`, { cache: 'no-store' });
      if (lookup.ok) {
        const appleData = await lookup.json();
        const matches = (appleData.results || []).filter((item) =>
          `${item.trackName || ''} ${item.sellerName || item.artistName || ''}`.toLowerCase().includes(brandLower),
        );
        const match = matches.find((item) => String(item.trackName || '').toLowerCase().startsWith(brandLower))
          || matches[0];
        if (match?.averageUserRating) {
          appleRating = Number(Number(match.averageUserRating).toFixed(2));
          appleReviewCount = Number(match.userRatingCount || 0);
        }
      }
    } catch (appleError) {
      console.error(`Apple App Store aggregate lookup failed for ${country}:`, appleError.message);
    }
    const value = {
      google: {
        rating: Number.isFinite(Number(app.score)) ? Number(app.score) : null,
        reviewCount: Math.max(Number(app.ratings || 0), Number(app.reviews || 0)),
      },
      apple: {
        rating: appleRating,
        reviewCount: appleReviewCount,
      },
      country,
      brand,
    };
    const collectedAt = new Date().toISOString();
    platformRatingsCache.set(cacheKey, { cachedAt: Date.now(), collectedAt, value });
    response.json({ ...value, collectedAt });
  } catch (error) {
    response.json({ google: { rating: null, reviewCount: 0 }, country, brand, error: error.message });
  }
});

app.get('/api/reviews', async (request, response) => {
  const brand = String(request.query.brand || 'Western Union');
  const country = String(request.query.country || 'US').toUpperCase();
  const limit = Math.min(Math.max(Number(request.query.limit || 100), 1), 3600);
  const months = Math.min(Math.max(Number(request.query.months || 1), 1), 6);
  const cacheKey = `${brand}:${country}:${months}`;
  const bypassCache = request.query.refresh !== undefined && request.query.refresh !== '';
  const cached = reviewsCache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.cachedAt < REVIEWS_CACHE_TTL_MS) {
    response.json({ brand, country, months, collectedAt: cached.collectedAt, count: cached.reviews.length, reviews: cached.reviews.slice(0, limit) });
    return;
  }
  const [googleReviews, appleReviews] = await Promise.all([
    collectGooglePlayReviews(brand, country, months),
    collectAppleReviews(brand, country),
  ]);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const reviews = [...googleReviews, ...appleReviews].filter((review) => {
    if (!review.publishedAt) return true;
    const publishedAt = new Date(review.publishedAt);
    return Number.isNaN(publishedAt.getTime()) || publishedAt >= cutoff;
  });
  reviews.sort((left, right) => {
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    return rightTime - leftTime;
  });
  const collectedAt = new Date().toISOString();
  reviewsCache.set(cacheKey, { collectedAt, cachedAt: Date.now(), reviews });
  response.json({ brand, country, months, collectedAt, count: reviews.length, reviews: reviews.slice(0, limit) });
});

// SPA fallback: client-side routes (e.g. /dashboard) must serve index.html.
if (hasWebBuild) {
  app.get(/^\/(?!api\/|health$).*/, (_request, response) => {
    response.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Review collector listening on http://localhost:${PORT}`));
