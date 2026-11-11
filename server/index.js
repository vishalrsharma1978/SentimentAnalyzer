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

// Never let a failed upstream fetch (Apple RSS, Google Play, Trustpilot, Yahoo)
// crash the whole process. Log and keep serving.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason instanceof Error ? reason.message : reason);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error instanceof Error ? error.message : error);
});

app.use(cors());
app.use(express.json());
app.use((_request, response, next) => {
  response.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  response.setHeader('Pragma', 'no-cache');
  next();
});

const PORT = Number(process.env.REVIEW_COLLECTOR_PORT || process.env.PORT || 3001);
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

const COUNTRY_COMPETITOR_NAMES = {
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

const REGIONAL_COMPETITOR_NAMES = {
  'North America': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'PayPal'],
  Europe: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Revolut', 'WorldRemit', 'Skrill'],
  'Asia Pacific': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'GCash', 'WorldRemit', 'BookMyForex'],
  'Latin America': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'Ria'],
  'Middle East & Africa': ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Al Ansari Exchange', 'WorldRemit'],
  Global: ['Western Union', 'Wise', 'Remitly', 'MoneyGram', 'Xoom', 'WorldRemit'],
};

const COMPETITOR_STOCK_SYMBOLS = {
  'Western Union': 'WU',
  Wise: 'WISE.L',
  Remitly: 'RELY',
  PayPal: 'PYPL',
  'Al Ansari Exchange': 'ALANSARI.AE',
};

// Trustpilot business-unit domains for known brands; custom brands fall back
// to a slug derived from the brand name.
const TRUSTPILOT_DOMAINS = {
  'Western Union': 'westernunion.com',
  Wise: 'wise.com',
  Remitly: 'remitly.com',
  MoneyGram: 'moneygram.com',
  PayPal: 'paypal.com',
  Xoom: 'xoom.com',
  Revolut: 'revolut.com',
  WorldRemit: 'worldremit.com',
  Ria: 'riamoneytransfer.com',
  GCash: 'gcash.com',
  Skrill: 'skrill.com',
  Venmo: 'venmo.com',
  'Cash App': 'cash.app',
  Monzo: 'monzo.com',
  Chime: 'chime.com',
  N26: 'n26.com',
  Nubank: 'nubank.com.br',
};

function trustpilotDomain(brand) {
  if (TRUSTPILOT_DOMAINS[brand]) return TRUSTPILOT_DOMAINS[brand];
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, '');
  return slug ? `${slug}.com` : null;
}

// Trustpilot has no free public feed; this uses the Business API and only runs
// when TRUSTPILOT_API_KEY is configured. Returns [] otherwise.
async function collectTrustpilotReviews(brand) {
  const apiKey = process.env.TRUSTPILOT_API_KEY;
  const domain = trustpilotDomain(brand);
  if (!apiKey || !domain) return [];
  try {
    const url = `https://api.trustpilot.com/v1/business-units/find?name=${encodeURIComponent(domain)}&apikey=${encodeURIComponent(apiKey)}`;
    const lookup = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!lookup.ok) {
      console.error(`Trustpilot business-unit lookup failed for ${domain}: HTTP ${lookup.status}`);
      return [];
    }
    const unit = await lookup.json();
    const businessUnitId = unit?.id;
    if (!businessUnitId) return [];
    const reviewsUrl = `https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews?apikey=${encodeURIComponent(apiKey)}&perPage=100&orderBy=createdat.desc`;
    const reviewsResponse = await fetch(reviewsUrl, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!reviewsResponse.ok) {
      console.error(`Trustpilot reviews failed for ${domain}: HTTP ${reviewsResponse.status}`);
      return [];
    }
    const data = await reviewsResponse.json();
    const items = Array.isArray(data?.reviews) ? data.reviews : [];
    return items.map((item) => {
      const rating = Number(item?.stars ?? 0);
      const text = `${String(item?.title ?? '').trim()}${item?.title && item?.text ? ' — ' : ''}${String(item?.text ?? '').trim()}`.replace(/\s+/g, ' ').trim();
      return {
        source: 'Trustpilot',
        author: String(item?.consumer?.displayName ?? 'Verified customer'),
        rating,
        text,
        sentiment: classifySentiment(text, rating),
        appVersion: null,
        publishedAt: item?.createdAt ? new Date(item.createdAt).toISOString() : null,
        sourceId: String(item?.id ?? ''),
      };
    }).filter((review) => review.text);
  } catch (error) {
    console.error(`Trustpilot collection failed for ${brand}:`, error.message);
    return [];
  }
}

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

// Apple throttles bursts of requests from the same IP; the dashboard fires
// several endpoints at once on load, so serialize outbound Apple calls and
// retry with backoff before giving up.
let appleQueue = Promise.resolve();

async function appleFetchJson(url) {
  const run = appleQueue.then(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, { cache: 'no-store' });
        if (response.ok) return await response.json();
        if (response.status !== 429 && response.status < 500) return null;
      } catch {
        // fall through to retry
      }
      await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
    return null;
  });
  appleQueue = run.catch(() => {});
  return run;
}

function classifySentiment(text, rating) {
  const lower = String(text || '').toLowerCase();
  if (/scam|fraud|delay|slow|fee|failed|problem|bad|hate|terrible|stolen/i.test(lower)) return 'negative';
  if (rating <= 2) return 'negative';
  if (/good|great|excellent|fast|easy|helpful|love|recommend|best|amazing/i.test(lower) || rating >= 4) return 'positive';
  return 'neutral';
}

const resolvedAppIds = new Map();

function normalizeBrandText(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

// Brands without a hardcoded package are resolved live via Google Play search
// so any newly selected brand still gets its own reviews.
async function resolvePlayAppId(brand, country = 'US') {
  if (APP_PACKAGES[brand]) return APP_PACKAGES[brand];
  const cacheKey = brand.toLowerCase();
  if (resolvedAppIds.has(cacheKey)) return resolvedAppIds.get(cacheKey);
  let appId = null;
  try {
    const results = await gplay.search({ term: brand, num: 5, country: country.toLowerCase(), lang: 'en' });
    const needle = normalizeBrandText(brand);
    const matches = (results || []).filter((app) => {
      const developer = typeof app.developer === 'string' ? app.developer : '';
      return needle && normalizeBrandText(`${app.title || ''} ${developer} ${app.summary || ''}`).includes(needle);
    });
    const best = matches.find((app) => normalizeBrandText(app.title).startsWith(needle)) || matches[0];
    if (best?.appId) {
      appId = best.appId;
    } else if (results?.[0]?.appId) {
      // The top hit can be a renamed app (e.g. Nubank lists as "Nu"); only
      // attribute it when the developer's website/email references the brand.
      appId = await verifyPlayAppBelongsToBrand(results[0].appId, brand, country);
    }
  } catch (error) {
    console.error(`Google Play search failed for ${brand}:`, error.message);
  }
  resolvedAppIds.set(cacheKey, appId);
  return appId;
}

async function verifyPlayAppBelongsToBrand(appId, brand, country) {
  try {
    const detail = await gplay.app({ appId, country: country.toLowerCase(), lang: 'en' });
    const slug = normalizeBrandText(brand).replace(/\s+/g, '');
    if (!slug) return null;
    const signals = [detail.developerWebsite, detail.developerEmail, detail.developer]
      .map((value) => String(value || '').toLowerCase());
    return signals.some((value) => value.includes(slug)) ? appId : null;
  } catch {
    return null;
  }
}

async function collectGooglePlayReviews(brand, country, months = 1) {
  const appId = await resolvePlayAppId(brand, country);
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
    const brandLower = brand.toLowerCase();
    const candidates = [];
    for (const term of [...new Set([brand, `${brand} Send Money`])]) {
      const candidate = await appleFetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${countryCode}&entity=software&limit=15&_ts=${Date.now()}`);
      if (candidate) candidates.push(...(candidate.results || []));
    }
    const appNameIncludesBrand = (app) => `${app.trackName || ''} ${app.sellerName || app.artistName || ''}`.toLowerCase().includes(brandLower);
    const matches = candidates.filter(appNameIncludesBrand);
    const match = matches.find((app) => String(app.trackName || '').toLowerCase().startsWith(brandLower)) || matches[0];
    if (!match?.trackId) return [];
    // The page=1 RSS path is measurably more reliable, and Apple sometimes
    // answers 200 with an empty feed under throttling — retry on empty.
    let entries = [];
    for (let attempt = 0; attempt < 4 && entries.length === 0; attempt++) {
      const data = await appleFetchJson(`https://itunes.apple.com/rss/customerreviews/page=1/id=${match.trackId}/sortby=mostrecent/json?l=en&cc=${countryCode}&_ts=${Date.now()}`);
      if (data) {
        entries = Array.isArray(data.feed?.entry) ? data.feed.entry : (data.feed?.entry ? [data.feed.entry] : []);
      }
      if (entries.length === 0) await new Promise((resolve) => setTimeout(resolve, 700 * (attempt + 1)));
    }
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
  const cacheKey = `${brand}:${country}`;
  const bypassCache = request.query.refresh !== undefined && request.query.refresh !== '';
  const cached = platformRatingsCache.get(cacheKey);
  if (!bypassCache && cached && Date.now() - cached.cachedAt < PLATFORM_RATINGS_CACHE_TTL_MS) {
    response.json({ ...cached.value, collectedAt: cached.collectedAt });
    return;
  }
  try {
    const appId = await resolvePlayAppId(brand, country);
    let google = { rating: null, reviewCount: 0 };
    if (appId) {
      try {
        const app = await gplay.app({ appId, country: country.toLowerCase() });
        google = {
          rating: Number.isFinite(Number(app.score)) ? Number(app.score) : null,
          reviewCount: Math.max(Number(app.ratings || 0), Number(app.reviews || 0)),
        };
      } catch (googleError) {
        console.error(`Google Play aggregate lookup failed for ${brand} (${country}):`, googleError.message);
      }
    }
    let appleRating = null;
    let appleReviewCount = 0;
    try {
      const appleCountry = country.toLowerCase();
      const brandLower = brand.toLowerCase();
      const appleData = await appleFetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(brand)}&country=${appleCountry}&entity=software&limit=15&_ts=${Date.now()}`);
      if (appleData) {
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
      google,
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
    response.json({ google: { rating: null, reviewCount: 0 }, apple: { rating: null, reviewCount: 0 }, country, brand, error: error.message });
  }
});

// Combined Google Play + Apple rating for every competitor in a country, so the
// client can rank all brands (including the selected one) on the same basis.
app.get('/api/competitor-ratings', async (request, response) => {
  const country = String(request.query.country || 'US').toUpperCase();
  const region = String(request.query.region || 'Global');
  const names = COUNTRY_COMPETITOR_NAMES[country] || REGIONAL_COMPETITOR_NAMES[region] || REGIONAL_COMPETITOR_NAMES.Global;
  const appleCountry = country.toLowerCase();
  const items = await Promise.all(names.map(async (name) => {
    let google = null;
    let apple = null;
    let reviewCount = 0;
    try {
      const appId = await resolvePlayAppId(name, country);
      if (appId) {
        const app = await gplay.app({ appId, country: appleCountry, lang: 'en' });
        if (Number.isFinite(Number(app.score))) {
          google = Number(app.score);
          reviewCount = Math.max(Number(app.ratings || 0), Number(app.reviews || 0));
        }
      }
    } catch (error) {
      console.error(`Competitor Google rating failed for ${name}:`, error.message);
    }
    try {
      const data = await appleFetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(name)}&country=${appleCountry}&entity=software&limit=15&_ts=${Date.now()}`);
      if (data) {
        const needle = name.toLowerCase();
        const matches = (data.results || []).filter((item) =>
          `${item.trackName || ''} ${item.sellerName || item.artistName || ''}`.toLowerCase().includes(needle),
        );
        const match = matches.find((item) => String(item.trackName || '').toLowerCase().startsWith(needle)) || matches[0];
        if (match?.averageUserRating) {
          apple = Number(Number(match.averageUserRating).toFixed(2));
          reviewCount = Math.max(reviewCount, Number(match.userRatingCount || 0));
        }
      }
    } catch (error) {
      console.error(`Competitor Apple rating failed for ${name}:`, error.message);
    }
    const available = [google, apple].filter((value) => value !== null);
    const rating = available.length ? Number((available.reduce((sum, value) => sum + value, 0) / available.length).toFixed(2)) : null;
    return { name, rating, google, apple, reviewCount, status: rating !== null ? 'live' : 'unavailable' };
  }));
  response.json({ country, region, competitors: items, collectedAt: new Date().toISOString() });
});

// Server-side Reddit proxy: browsers block reddit.com/search.json via CORS,
// and Reddit 403-blocks unauthenticated datacenter requests, so the client
// calls this endpoint. With REDDIT_CLIENT_ID/REDDIT_CLIENT_SECRET configured
// it uses OAuth (works from datacenter IPs); otherwise it tries the public
// JSON endpoint and degrades to an empty list when Reddit blocks it.
let redditAccessToken = null;
let redditTokenExpiresAt = 0;

async function getRedditAccessToken() {
  const clientId = process.env.REDDIT_CLIENT_ID;
  const clientSecret = process.env.REDDIT_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;
  if (redditAccessToken && Date.now() < redditTokenExpiresAt) return redditAccessToken;
  const tokenResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'sentiment-analyzer/1.0 (brand sentiment dashboard)',
    },
    body: 'grant_type=client_credentials',
  });
  if (!tokenResponse.ok) throw new Error(`Reddit auth returned ${tokenResponse.status}`);
  const tokenData = await tokenResponse.json();
  redditAccessToken = tokenData.access_token;
  redditTokenExpiresAt = Date.now() + Math.max(Number(tokenData.expires_in || 3600) - 60, 60) * 1000;
  return redditAccessToken;
}

app.get('/api/reddit-mentions', async (request, response) => {
  const brand = String(request.query.brand || '').trim();
  if (!brand) {
    response.status(400).json({ error: 'brand is required', mentions: [] });
    return;
  }
  try {
    const token = await getRedditAccessToken();
    const url = token
      ? `https://oauth.reddit.com/search?q=${encodeURIComponent(brand)}&sort=new&limit=25&type=link,comment`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(brand)}&sort=new&limit=25&type=link,comment&_ts=${Date.now()}`;
    const headers = token
      ? { Authorization: `Bearer ${token}`, 'User-Agent': 'sentiment-analyzer/1.0 (brand sentiment dashboard)' }
      : { Accept: 'application/json', 'User-Agent': 'sentiment-analyzer/1.0 (brand sentiment dashboard)' };
    const redditResponse = await fetch(url, { headers, cache: 'no-store' });
    if (!redditResponse.ok) {
      console.error(`Reddit mention collection failed for ${brand}: HTTP ${redditResponse.status}`);
      response.json({ brand, mentions: [] });
      return;
    }
    const data = await redditResponse.json();
    const posts = Array.isArray(data?.data?.children) ? data.data.children : [];
    const mentions = posts.slice(0, 12).map((child) => {
      const post = child?.data ?? {};
      const title = String(post.title ?? '').replace(/\s+/g, ' ').trim();
      const body = String(post.selftext ?? '').replace(/\s+/g, ' ').trim();
      return {
        title,
        body,
        author: String(post.author ? `u/${post.author}` : 'Reddit user'),
        publishedAt: Number.isFinite(Number(post.created_utc))
          ? new Date(Number(post.created_utc) * 1000).toISOString()
          : null,
      };
    }).filter((mention) => mention.title || mention.body);
    response.json({ brand, mentions });
  } catch (error) {
    console.error(`Reddit mention collection failed for ${brand}:`, error.message);
    response.json({ brand, mentions: [] });
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
  const [googleReviews, appleReviews, trustpilotReviews] = await Promise.all([
    collectGooglePlayReviews(brand, country, months).catch((e) => { console.error(`Google Play collection failed for ${brand}:`, e.message); return []; }),
    collectAppleReviews(brand, country).catch((e) => { console.error(`Apple collection failed for ${brand}:`, e.message); return []; }),
    collectTrustpilotReviews(brand).catch((e) => { console.error(`Trustpilot collection failed for ${brand}:`, e.message); return []; }),
  ]);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const reviews = [...googleReviews, ...appleReviews, ...trustpilotReviews].filter((review) => {
    if (!review.publishedAt) return true;
    const publishedAt = new Date(review.publishedAt);
    return Number.isNaN(publishedAt.getTime()) || publishedAt >= cutoff;
  });
  reviews.sort((left, right) => {
    const leftTime = left.publishedAt ? new Date(left.publishedAt).getTime() : 0;
    const rightTime = right.publishedAt ? new Date(right.publishedAt).getTime() : 0;
    return rightTime - leftTime;
  });
  try {
    const collectedAt = new Date().toISOString();
    reviewsCache.set(cacheKey, { collectedAt, cachedAt: Date.now(), reviews });
    response.json({ brand, country, months, collectedAt, count: reviews.length, reviews: reviews.slice(0, limit) });
  } catch (error) {
    console.error('Review collection failed:', error instanceof Error ? error.message : error);
    response.status(500).json({ brand, country, months, count: 0, reviews: [], error: 'Review collection failed.' });
  }
});

// SPA fallback: client-side routes (e.g. /dashboard) must serve index.html.
if (hasWebBuild) {
  app.get(/^\/(?!api\/|health$).*/, (_request, response) => {
    response.sendFile(path.join(DIST_DIR, 'index.html'));
  });
}

app.listen(PORT, () => console.log(`Review collector listening on http://localhost:${PORT}`));
