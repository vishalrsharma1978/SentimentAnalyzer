require("dotenv").config({
  path: require("path").join(__dirname, "..", ".env"),
});

const { createHash } = require("node:crypto");
const fs = require("node:fs");
const https = require("node:https");
const path = require("node:path");
const express = require("express");
const cors = require("cors");
const gplayModule = require("google-play-scraper");
const gplay = gplayModule.default || gplayModule;
const YahooFinance = require("yahoo-finance2").default;
const {
  brandWebsiteUrl,
  fetchLighthouse,
  probeWebsite,
  scoreWebsiteProbe,
} = require("./channelRatings");
const { westernUnionStoreIds } = require("./westernUnionApps");
const { storeBrandRating } = require("./storeBrandRating");
const { collectSocialReviews } = require("./socialReviews");
const { discoverCompetitors } = require("./competitorDiscovery");
const { discoverAppleCompetitors } = require("./appleCompetitors");
const { registerModelRoute } = require("./runtimeModel");
const { resolveStockSymbol } = require("./stockSymbol");
const {
  cleanBrandTitle,
  listedSymbol,
  regionalPeerNames,
} = require("./peerBrands");
const { wikidataProfile } = require("./wikidataProfile");
const { fallbackQuote } = require("./quoteFallback");
const { withStoreRatings } = require("./peerStoreRatings");
const { collectTransferFees } = require("./transferFees");
const { appleChartRank, playChartRank } = require("./storeChartRank");
const yahooFinance = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

const app = express();

// Never let a failed upstream fetch (Apple RSS, Google Play, Trustpilot, Yahoo)
// crash the whole process. Log and keep serving.
process.on("unhandledRejection", (reason) => {
  console.error(
    "Unhandled promise rejection:",
    reason instanceof Error ? reason.message : reason,
  );
});
process.on("uncaughtException", (error) => {
  console.error(
    "Uncaught exception:",
    error instanceof Error ? error.message : error,
  );
});

app.use(cors());
app.use(express.json());
app.use((_request, response, next) => {
  response.setHeader(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, max-age=0",
  );
  response.setHeader("Pragma", "no-cache");
  next();
});

const PORT = Number(
  process.env.REVIEW_COLLECTOR_PORT || process.env.PORT || 3001,
);
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
  "Western Union": "com.westernunion.android.mtapp",
  Wise: "com.transferwise.android",
  Remitly: "com.remitly.androidapp",
  MoneyGram: "com.gpshopper.moneygram",
  PayPal: "com.paypal.android.p2pmobile",
  Xoom: "com.xoom.android.app",
  Revolut: "com.revolut.revolut",
  WorldRemit: "com.worldremit.android",
  Ria: "com.riamoneytransfer.android",
  GCash: "com.globe.gcash.android",
  BookMyForex: "com.bookmyforex.android",
  Skrill: "com.paysafe.skrill",
  "Al Ansari Exchange": "ae.alansari.mobile",
  Venmo: "com.venmo",
  "Cash App": "com.squareup.cash",
  Monzo: "co.uk.getmondo",
  Chime: "com.onedebit.chime",
};

const COMPETITOR_STOCK_SYMBOLS = {
  "Western Union": "WU",
  Wise: "WISE.L",
  Remitly: "RELY",
  PayPal: "PYPL",
  "Al Ansari Exchange": "ALANSARI.AE",
};

// Trustpilot business-unit domains for known brands; custom brands fall back
// to a slug derived from the brand name.
const TRUSTPILOT_DOMAINS = {
  "Western Union": "westernunion.com",
  Wise: "wise.com",
  Remitly: "remitly.com",
  MoneyGram: "moneygram.com",
  PayPal: "paypal.com",
  Xoom: "xoom.com",
  Revolut: "revolut.com",
  WorldRemit: "worldremit.com",
  Ria: "riamoneytransfer.com",
  GCash: "gcash.com",
  Skrill: "skrill.com",
  Venmo: "venmo.com",
  "Cash App": "cash.app",
  Monzo: "monzo.com",
  Chime: "chime.com",
  N26: "n26.com",
  Nubank: "nubank.com.br",
};

function trustpilotDomain(brand) {
  if (TRUSTPILOT_DOMAINS[brand]) return TRUSTPILOT_DOMAINS[brand];
  const slug = brand.toLowerCase().replace(/[^a-z0-9]+/g, "");
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
    const lookup = await fetch(url, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!lookup.ok) {
      console.error(
        `Trustpilot business-unit lookup failed for ${domain}: HTTP ${lookup.status}`,
      );
      return [];
    }
    const unit = await lookup.json();
    const businessUnitId = unit?.id;
    if (!businessUnitId) return [];
    const reviewsUrl = `https://api.trustpilot.com/v1/business-units/${businessUnitId}/reviews?apikey=${encodeURIComponent(apiKey)}&perPage=100&orderBy=createdat.desc`;
    const reviewsResponse = await fetch(reviewsUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!reviewsResponse.ok) {
      console.error(
        `Trustpilot reviews failed for ${domain}: HTTP ${reviewsResponse.status}`,
      );
      return [];
    }
    const data = await reviewsResponse.json();
    const items = Array.isArray(data?.reviews) ? data.reviews : [];
    return items
      .map((item) => {
        const rating = Number(item?.stars ?? 0);
        const text =
          `${String(item?.title ?? "").trim()}${item?.title && item?.text ? " — " : ""}${String(item?.text ?? "").trim()}`
            .replace(/\s+/g, " ")
            .trim();
        return {
          source: "Trustpilot",
          author: String(item?.consumer?.displayName ?? "Verified customer"),
          rating,
          text,
          sentiment: classifySentiment(text, rating),
          appVersion: null,
          publishedAt: item?.createdAt
            ? new Date(item.createdAt).toISOString()
            : null,
          sourceId: String(item?.id ?? ""),
        };
      })
      .filter((review) => review.text);
  } catch (error) {
    console.error(`Trustpilot collection failed for ${brand}:`, error.message);
    return [];
  }
}

const COMPETITORS_WITHOUT_PUBLIC_LISTING = [
  "MoneyGram",
  "Xoom",
  "Revolut",
  "WorldRemit",
  "Ria Money Transfer",
  "GCash",
  "BookMyForex",
  "Skrill",
];

// Brands outside the curated map are looked up on Yahoo Finance, but only a stock whose company name
// is the brand is accepted, so an unrelated company is never shown. Misses are cached too.
const stockSymbolCache = new Map();
const STOCK_SYMBOL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const STOCK_SYMBOL_MISS_TTL_MS = 10 * 60 * 1000;

async function lookupStockSymbol(rawName) {
  // Store titles are marketing text ("Remitly: Money transfer app"); reduce them to the company name.
  const name = cleanBrandTitle(rawName) || rawName;
  if (COMPETITOR_STOCK_SYMBOLS[name]) return COMPETITOR_STOCK_SYMBOLS[name];
  const known = listedSymbol(name);
  if (known) return known;
  if (COMPETITORS_WITHOUT_PUBLIC_LISTING.includes(name)) return null;
  const cached = stockSymbolCache.get(name);
  if (
    cached &&
    Date.now() - cached.cachedAt <
      (cached.symbol ? STOCK_SYMBOL_CACHE_TTL_MS : STOCK_SYMBOL_MISS_TTL_MS)
  ) {
    return cached.symbol;
  }
  try {
    const symbol = await resolveStockSymbol(name, (query) =>
      yahooFinance.search(query, { quotesCount: 6, newsCount: 0 }),
    );
    stockSymbolCache.set(name, { symbol, cachedAt: Date.now() });
    return symbol;
  } catch (error) {
    // A failed search is not a confirmed miss, so it is not cached.
    console.error(
      `Yahoo Finance symbol search failed for ${name}:`,
      error.name || "unknown error",
    );
    return null;
  }
}

async function getCompetitorSharePrice(name) {
  const symbol = await lookupStockSymbol(name);
  if (!symbol) {
    return {
      name,
      symbol: null,
      price: null,
      currency: null,
      quoteTime: null,
      status: COMPETITORS_WITHOUT_PUBLIC_LISTING.includes(name)
        ? "not-listed"
        : "unavailable",
    };
  }

  const cached = stockQuoteCache.get(symbol);
  if (cached && Date.now() - cached.cachedAt < STOCK_QUOTE_CACHE_TTL_MS) {
    return { ...cached.value, name };
  }

  const quote = await fetchYahooQuote(symbol);
  if (quote) {
    const value = { name, symbol, ...quote, status: "live" };
    stockQuoteCache.set(symbol, { cachedAt: Date.now(), value });
    return value;
  }

  return {
    name,
    symbol,
    price: null,
    currency: null,
    quoteTime: null,
    status: "unavailable",
  };
}

// yahoo-finance2's quote() hits an endpoint that now requires crumb/cookie auth
// and is blocked from datacenter IPs. The v8 chart endpoint serves the same
// market price without auth, so use it as a resilient fallback.
async function fetchYahooQuote(symbol) {
  try {
    const quote = await yahooFinance.quote(symbol);
    if (
      typeof quote.regularMarketPrice === "number" &&
      Number.isFinite(quote.regularMarketPrice)
    ) {
      return {
        price: quote.regularMarketPrice,
        currency: quote.currency || null,
        quoteTime: quote.regularMarketTime
          ? new Date(quote.regularMarketTime).toISOString()
          : null,
      };
    }
  } catch (error) {
    console.error(
      `Yahoo Finance quote failed for ${symbol}:`,
      error.name || "unknown error",
    );
  }
  const chart = await fetchYahooChartQuote(symbol);
  if (chart) return chart;
  // Yahoo rate-limits (HTTP 429) and blocks some networks; confirm the price with another source
  // rather than reporting the quote as unavailable. The fallback never estimates a price.
  return fallbackQuote(symbol);
}

function fetchYahooChartQuote(symbol) {
  return new Promise((resolve) => {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`;
    const request = https.get(
      url,
      { headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" } },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          try {
            if (response.statusCode !== 200) {
              console.error(
                `Yahoo chart quote for ${symbol} returned HTTP ${response.statusCode}.`,
              );
              resolve(null);
              return;
            }
            const meta = JSON.parse(body)?.chart?.result?.[0]?.meta;
            const price = meta?.regularMarketPrice;
            if (typeof price !== "number" || !Number.isFinite(price)) {
              resolve(null);
              return;
            }
            resolve({
              price,
              currency:
                typeof meta.currency === "string" ? meta.currency : null,
              quoteTime:
                typeof meta.regularMarketTime === "number"
                  ? new Date(meta.regularMarketTime * 1000).toISOString()
                  : null,
            });
          } catch {
            resolve(null);
          }
        });
      },
    );
    request.on("error", (error) => {
      console.error(
        `Yahoo chart quote failed for ${symbol}:`,
        error.message || "unknown error",
      );
      resolve(null);
    });
    request.setTimeout(10000, () => request.destroy());
  });
}

function decodeTranslationEntities(text) {
  const namedEntities = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" };
  return text.replace(
    /&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi,
    (entity, code) => {
      if (
        Object.prototype.hasOwnProperty.call(namedEntities, code.toLowerCase())
      ) {
        return namedEntities[code.toLowerCase()];
      }
      const numericCode =
        code[1].toLowerCase() === "x"
          ? Number.parseInt(code.slice(2), 16)
          : Number.parseInt(code.slice(1), 10);
      return Number.isInteger(numericCode) &&
        numericCode >= 0 &&
        numericCode <= 0x10ffff
        ? String.fromCodePoint(numericCode)
        : entity;
    },
  );
}

// Apple throttles bursts of requests from the same IP; the dashboard fires
// several endpoints at once on load, so serialize outbound Apple calls and
// retry with backoff before giving up.
let appleQueue = Promise.resolve();

async function appleFetchJson(url) {
  const run = appleQueue.then(async () => {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const response = await fetch(url, {
          cache: "no-store",
          signal: AbortSignal.timeout(12000),
        });
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
  const lower = String(text || "").toLowerCase();
  if (
    /scam|fraud|delay|slow|fee|failed|problem|bad|hate|terrible|stolen/i.test(
      lower,
    )
  )
    return "negative";
  if (rating <= 2) return "negative";
  if (
    /good|great|excellent|fast|easy|helpful|love|recommend|best|amazing/i.test(
      lower,
    ) ||
    rating >= 4
  )
    return "positive";
  return "neutral";
}

const resolvedAppIds = new Map();

function normalizeBrandText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Brands without a hardcoded package are resolved live via Google Play search
// so any newly selected brand still gets its own reviews.
async function resolvePlayAppId(
  brand,
  country = "US",
  propagateError = false,
  appName = "",
) {
  if (appName && normalizeBrandText(appName) === normalizeBrandText(brand))
    appName = "";
  if (!appName) {
    if (brand.trim().toLowerCase() === "western union")
      return westernUnionStoreIds(country)?.google ?? null;
    if (APP_PACKAGES[brand]) return APP_PACKAGES[brand];
  }
  const cacheKey = `${brand.toLowerCase()}:${country.toUpperCase()}:${appName.toLowerCase()}:${propagateError}`;
  if (resolvedAppIds.has(cacheKey)) return resolvedAppIds.get(cacheKey);
  let appId = null;
  try {
    const results = await gplay.search({
      term: appName || brand,
      num: 5,
      country: country.toLowerCase(),
      lang: "en",
      requestOptions: { timeout: 12000 },
    });
    const needle = normalizeBrandText(brand);
    const matches = (results || []).filter((app) => {
      const developer = typeof app.developer === "string" ? app.developer : "";
      return (
        needle &&
        normalizeBrandText(`${app.title || ""} ${developer}`).includes(needle)
      );
    });
    const best =
      matches.find((app) => normalizeBrandText(app.title).startsWith(needle)) ||
      matches[0];
    if (best?.appId) {
      appId = propagateError
        ? await verifyPlayAppBelongsToBrand(best.appId, brand, country, true)
        : best.appId;
    } else if (results?.[0]?.appId) {
      // The top hit can be a renamed app (e.g. Nubank lists as "Nu"); only
      // attribute it when the developer's website/email references the brand.
      appId = await verifyPlayAppBelongsToBrand(
        results[0].appId,
        brand,
        country,
        propagateError,
      );
    }
  } catch (error) {
    console.error(`Google Play search failed for ${brand}:`, error.message);
    if (propagateError) throw error;
  }
  if (appId) resolvedAppIds.set(cacheKey, appId);
  return appId;
}

async function verifyPlayAppBelongsToBrand(
  appId,
  brand,
  country,
  propagateError = false,
) {
  try {
    const detail = await gplay.app({
      appId,
      country: country.toLowerCase(),
      lang: "en",
      requestOptions: { timeout: 12000 },
    });
    const slug = normalizeBrandText(brand).replace(/\s+/g, "");
    if (!slug) return null;
    const signals = [
      detail.developerWebsite,
      detail.developerEmail,
      detail.developer,
    ].map((value) => String(value || "").toLowerCase());
    return signals.some((value) => value.includes(slug)) ? appId : null;
  } catch (error) {
    if (propagateError) throw error;
    return null;
  }
}

// Recently prepared brands reuse the App Store lookup instead of repeating the network call. Both
// the ratings and the reviews collectors need it, so concurrent callers also share one request.
const APPLE_APP_CACHE_TTL_MS = 10 * 60 * 1000;
const appleAppCache = new Map();

function findAppleBrandApp(brand, country, appName = "", strict = false) {
  const key = `${brand.toLowerCase()}|${country.toUpperCase()}|${String(appName).toLowerCase()}|${Boolean(strict)}`;
  const hit = appleAppCache.get(key);
  if (hit && Date.now() - hit.at < APPLE_APP_CACHE_TTL_MS) return hit.promise;
  const promise = lookupAppleBrandApp(brand, country, appName, strict);
  appleAppCache.set(key, { at: Date.now(), promise });
  // A failed lookup is not remembered, so the next attempt retries it.
  promise.catch(() => {
    if (appleAppCache.get(key)?.promise === promise) appleAppCache.delete(key);
  });
  return promise;
}

async function lookupAppleBrandApp(
  brand,
  country,
  appName = "",
  strict = false,
) {
  const countryCode = country.toLowerCase();
  if (brand.trim().toLowerCase() === "western union") {
    const ids = westernUnionStoreIds(country);
    if (!ids) return null;
    const data = await appleFetchJson(
      `https://itunes.apple.com/lookup?id=${ids.apple}&country=${countryCode}&entity=software&_ts=${Date.now()}`,
    );
    return (
      (data?.results || []).find(
        (item) =>
          String(item.trackId) === ids.apple &&
          /western union/i.test(
            `${item.sellerName || ""} ${item.artistName || ""}`,
          ),
      ) || null
    );
  }
  const data = await appleFetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(appName || brand)}&country=${countryCode}&entity=software&limit=15&_ts=${Date.now()}`,
  );
  const brandLower = brand.toLowerCase();
  const slug = normalizeBrandText(brand).replace(/\s+/g, "");
  const matches = (data?.results || []).filter((item) => {
    const named =
      `${item.trackName || ""} ${item.sellerName || item.artistName || ""}`
        .toLowerCase()
        .includes(brandLower);
    const publisher = normalizeBrandText(
      `${item.sellerName || ""} ${item.artistName || ""} ${item.sellerUrl || ""}`,
    ).replace(/\s+/g, "");
    return named && (!strict || (slug && publisher.includes(slug)));
  });
  return (
    matches.find((item) =>
      String(item.trackName || "")
        .toLowerCase()
        .startsWith(brandLower),
    ) ||
    matches[0] ||
    null
  );
}

// Review pulls are the slowest part of model preparation. A brand prepared a moment ago reuses its
// reviews; concurrent identical pulls share one request, and failures are never remembered.
const REVIEW_PULL_TTL_MS = 5 * 60 * 1000;
const reviewPullCache = new Map();

function memoizeReviewPull(key, load) {
  const hit = reviewPullCache.get(key);
  if (hit && Date.now() - hit.at < REVIEW_PULL_TTL_MS) return hit.promise;
  const promise = load();
  reviewPullCache.set(key, { at: Date.now(), promise });
  promise.catch(() => {
    if (reviewPullCache.get(key)?.promise === promise)
      reviewPullCache.delete(key);
  });
  return promise;
}

function collectGooglePlayReviews(brand, country, months = 1, options = {}) {
  return memoizeReviewPull(
    `google|${brand.toLowerCase()}|${country.toUpperCase()}|${months}|${String(options.appName || "").toLowerCase()}|${Boolean(options.strict)}`,
    () => pullGooglePlayReviews(brand, country, months, options),
  );
}

function collectAppleReviews(brand, country, options = {}) {
  return memoizeReviewPull(
    `apple|${brand.toLowerCase()}|${country.toUpperCase()}|${String(options.appName || "").toLowerCase()}|${Boolean(options.strict)}`,
    () => pullAppleReviews(brand, country, options),
  );
}

async function pullGooglePlayReviews(brand, country, months = 1, options = {}) {
  const appId = await resolvePlayAppId(
    brand,
    country,
    options.strict,
    options.appName,
  );
  if (!appId) return [];
  try {
    const result = await gplay.reviews({
      appId,
      country: country.toLowerCase(),
      sort: gplay.sort.NEWEST,
      num: Math.min(500 * months, 3000),
      requestOptions: { timeout: 12000 },
    });
    return (result.data || [])
      .map((review) => ({
        source: "Google Play",
        author: review.userName || "Verified customer",
        rating: Number(review.score || 0),
        text: String(review.text || "")
          .replace(/\s+/g, " ")
          .trim(),
        sentiment: classifySentiment(review.text, review.score),
        appVersion: review.version || null,
        reviewUrl: review.url || null,
        publishedAt: review.date ? new Date(review.date).toISOString() : null,
        sourceId: String(review.id || ""),
      }))
      .filter((review) => review.text);
  } catch (error) {
    console.error(`Google Play collection failed for ${brand}:`, error.message);
    if (options.strict) throw error;
    return [];
  }
}

// The Apple RSS feed links each review to its store page; only keep real web links.
function appleReviewLink(entry) {
  const links = Array.isArray(entry.link) ? entry.link : [entry.link];
  const href = links.map((link) => link?.attributes?.href).find(Boolean);
  return typeof href === "string" && /^https?:\/\//.test(href) ? href : null;
}

async function pullAppleReviews(brand, country, options = {}) {
  const countryCode = country.toLowerCase();
  try {
    const match = await findAppleBrandApp(
      brand,
      country,
      options.appName,
      options.strict,
    );
    if (!match?.trackId) return [];
    // The page=1 RSS path is measurably more reliable, and Apple sometimes
    // answers 200 with an empty feed under throttling — retry on empty.
    let entries = [];
    for (let attempt = 0; attempt < 4 && entries.length === 0; attempt++) {
      const data = await appleFetchJson(
        `https://itunes.apple.com/rss/customerreviews/page=1/id=${match.trackId}/sortby=mostrecent/json?l=en&cc=${countryCode}&_ts=${Date.now()}`,
      );
      if (data) {
        entries = Array.isArray(data.feed?.entry)
          ? data.feed.entry
          : data.feed?.entry
            ? [data.feed.entry]
            : [];
      }
      if (entries.length === 0)
        await new Promise((resolve) =>
          setTimeout(resolve, 700 * (attempt + 1)),
        );
    }
    return entries
      .slice(0, 100)
      .map((entry) => {
        const rating = Number(entry["im:rating"]?.label || 0);
        const text = String(entry.content?.label || "")
          .replace(/\s+/g, " ")
          .trim();
        return {
          source: "Apple App Store",
          author: String(entry.author?.name?.label || "Verified customer"),
          rating,
          text,
          sentiment: classifySentiment(text, rating),
          appVersion: String(entry["im:version"]?.label || ""),
          reviewUrl: appleReviewLink(entry),
          profileUrl: String(entry.author?.uri?.label || "") || null,
          publishedAt: entry.updated?.label || null,
          sourceId: String(entry.id?.label || ""),
        };
      })
      .filter((review) => review.text);
  } catch (error) {
    console.error(`Apple RSS collection failed for ${brand}:`, error.message);
    if (options.strict) throw error;
    return [];
  }
}

const DIST_DIR = path.join(__dirname, "..", "dist");
const hasWebBuild = fs.existsSync(path.join(DIST_DIR, "index.html"));

if (hasWebBuild) {
  // Hashed bundles under _expo/static never change; keep index.html fresh.
  app.use(
    express.static(DIST_DIR, {
      setHeaders: (response, filePath) => {
        if (filePath.includes(`${path.sep}_expo${path.sep}static${path.sep}`)) {
          response.setHeader(
            "Cache-Control",
            "public, max-age=31536000, immutable",
          );
        }
      },
    }),
  );
} else {
  app.get("/", (_request, response) => {
    response.json({
      service: "PulseBoard review collector",
      status: "ok",
      dashboard: process.env.EXPO_PUBLIC_APP_URL || "http://localhost:8081",
      health: "/health",
      reviews: "/api/reviews?brand=Western%20Union&country=US&limit=100",
    });
  });
}

app.get("/health", (_request, response) => response.json({ status: "ok" }));

// ---- Customer experience: live provider comparison for one money transfer ----
const COMPARE_PAY_IN = {
  BANK_TRANSFER: "Bank transfer",
  DEBIT: "Debit card",
  CREDIT: "Credit card",
};
const COMPARE_CACHE_TTL_MS = 5 * 60 * 1000;
const COMPARE_MAX_QUOTE_AGE_MS = 6 * 60 * 60 * 1000;
const compareCache = new Map();
const FX_RATE_CACHE_TTL_MS = 60 * 1000;
const fxRateCache = new Map();

function compareDurationHours(iso) {
  const m = /^P(?:(\d+)D)?T?(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(
    String(iso || ""),
  );
  if (!m) return null;
  const [, d = 0, h = 0, mi = 0, s = 0] = m;
  const total = Number(d) * 24 + Number(h) + Number(mi) / 60 + Number(s) / 3600;
  return total > 0 ? total : null;
}
function compareDeliveryLabel(h) {
  if (h < 0.1) return "Within seconds";
  if (h < 1) return `About ${Math.round(h * 60)} min`;
  if (h < 24) return `About ${Math.round(h)} h`;
  const days = Math.round(h / 24);
  return `About ${days} ${days === 1 ? "day" : "days"}`;
}
function compareDelivery(quote) {
  const e = quote?.deliveryEstimation;
  if (!e?.providerGivesEstimate) return null;
  const h =
    compareDurationHours(e?.duration?.max) ??
    compareDurationHours(e?.duration?.min);
  return h === null ? null : { hours: h, label: compareDeliveryLabel(h) };
}
function compareUsableQuote(provider) {
  return (provider?.quotes ?? [])
    .filter((q) => {
      const t = Date.parse(q?.dateCollected);
      return (
        Number.isFinite(q?.fee) &&
        q.fee >= 0 &&
        Number.isFinite(q?.rate) &&
        q.rate > 0 &&
        Number.isFinite(q?.receivedAmount) &&
        q.receivedAmount > 0 &&
        Number.isFinite(t) &&
        Date.now() - t <= COMPARE_MAX_QUOTE_AGE_MS
      );
    })
    .sort((a, b) => b.receivedAmount - a.receivedAmount)[0];
}
function compareRank(options) {
  if (!options.length) return options;
  const amounts = options.map((o) => o.receivedAmount);
  const best = Math.max(...amounts),
    worst = Math.min(...amounts);
  return options
    .map((o) => {
      const amountScore =
        best === worst
          ? 1
          : 0.2 + 0.8 * ((o.receivedAmount - worst) / (best - worst));
      let speed = null;
      if (o.delivery) {
        const h = o.delivery.hours;
        speed = h <= 1 ? 1 : h >= 72 ? 0 : 1 - (h - 1) / 71;
      }
      const combined =
        speed === null ? amountScore : 0.7 * amountScore + 0.3 * speed;
      return {
        ...o,
        rating: Number((combined * 5).toFixed(1)),
        ratingBasis:
          speed === null
            ? "Amount in hand"
            : "Amount in hand and delivery speed",
        lessThanBest: Number((best - o.receivedAmount).toFixed(2)),
      };
    })
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.receivedAmount - a.receivedAmount ||
        a.provider.localeCompare(b.provider),
    )
    .map((o, i) => ({ ...o, rank: i + 1, best: i === 0 }));
}

// Live mid-market rate for one currency pair, used to preview the converted
// amount before the user runs a full provider comparison.
app.get("/api/fx-rate", async (request, response) => {
  const from = String(request.query.from ?? "")
    .trim()
    .toUpperCase();
  const to = String(request.query.to ?? "")
    .trim()
    .toUpperCase();
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to))
    return response.status(400).json({
      error: "from and to must be three-letter currency codes.",
    });
  const key = `${from}:${to}`;
  const hit = fxRateCache.get(key);
  if (hit && Date.now() - hit.storedAt < FX_RATE_CACHE_TTL_MS)
    return response.json(hit.body);
  try {
    const r = await fetch(
      `https://wise.com/rates/live?source=${from}&target=${to}`,
      { signal: AbortSignal.timeout(10000) },
    );
    if (!r.ok) throw new Error(`Rate feed returned HTTP ${r.status}`);
    const data = await r.json();
    const rate = Number(data?.value);
    if (!(rate > 0)) throw new Error("Rate feed returned no usable rate.");
    const body = {
      from,
      to,
      rate,
      source: "Wise mid-market rate",
      fetchedAt: new Date().toISOString(),
    };
    fxRateCache.set(key, { storedAt: Date.now(), body });
    response.json(body);
  } catch (error) {
    console.error(`FX rate lookup failed (${from}->${to}):`, error.message);
    response.status(502).json({
      error: "Live exchange rate is temporarily unavailable.",
    });
  }
});

app.get("/api/transfer-compare", async (request, response) => {
  const read = (k) =>
    String(request.query[k] ?? "")
      .trim()
      .toUpperCase();
  const fromCountry = read("fromCountry"),
    toCountry = read("toCountry");
  const fromCurrency = read("fromCurrency"),
    toCurrency = read("toCurrency");
  const payIn = read("payIn") || "BANK_TRANSFER";
  const amount = Number(request.query.amount ?? 500);
  if (!/^[A-Z]{2}$/.test(fromCountry) || !/^[A-Z]{2}$/.test(toCountry))
    return response.status(400).json({
      error: "fromCountry and toCountry must be two-letter ISO codes.",
    });
  if (!/^[A-Z]{3}$/.test(fromCurrency) || !/^[A-Z]{3}$/.test(toCurrency))
    return response.status(400).json({
      error: "fromCurrency and toCurrency must be three-letter currency codes.",
    });
  if (!COMPARE_PAY_IN[payIn])
    return response.status(400).json({
      error: `payIn must be one of ${Object.keys(COMPARE_PAY_IN).join(", ")}.`,
    });
  if (!Number.isFinite(amount) || amount < 10 || amount > 100000)
    return response
      .status(400)
      .json({ error: "amount must be between 10 and 100000." });
  const key = `${fromCountry}:${toCountry}:${fromCurrency}:${toCurrency}:${payIn}:${amount}`;
  const hit = compareCache.get(key);
  if (hit && Date.now() - hit.storedAt < COMPARE_CACHE_TTL_MS)
    return response.json(hit.body);
  try {
    const params = new URLSearchParams({
      sourceCurrency: fromCurrency,
      targetCurrency: toCurrency,
      sourceCountry: fromCountry,
      targetCountry: toCountry,
      sendAmount: String(amount),
      payInMethod: payIn,
    });
    const getJson = async (url) => {
      const r = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!r.ok) throw new Error(`Comparison feed returned HTTP ${r.status}`);
      return r.json();
    };
    const [comparison, rate] = await Promise.all([
      getJson(`https://api.wise.com/v4/comparisons/?${params}`),
      getJson(
        `https://wise.com/rates/live?source=${fromCurrency}&target=${toCurrency}`,
      ).catch(() => null),
    ]);
    const midRate = Number(rate?.value) > 0 ? Number(rate.value) : null;
    const options = [];
    for (const provider of Array.isArray(comparison?.providers)
      ? comparison.providers
      : []) {
      const quote = compareUsableQuote(provider);
      if (!quote) continue;
      const delivered = midRate ? quote.receivedAmount / midRate : null;
      const cost = delivered === null ? null : amount - delivered;
      options.push({
        provider: provider.name,
        kind: provider.type === "bank" ? "Bank" : "Money transfer",
        logo: provider.logos?.normal?.pngUrl ?? null,
        sendAmount: amount,
        fee: quote.fee,
        exchangeRate: quote.rate,
        midMarketRate: midRate,
        receivedAmount: quote.receivedAmount,
        totalCost: cost === null ? null : Number(cost.toFixed(2)),
        totalCostPercent:
          cost === null ? null : Number(((cost / amount) * 100).toFixed(2)),
        delivery: compareDelivery(quote),
        collectedAt: quote.dateCollected ?? null,
      });
    }
    const body = {
      request: {
        fromCountry,
        toCountry,
        fromCurrency,
        toCurrency,
        payIn,
        payInLabel: COMPARE_PAY_IN[payIn],
        amount,
      },
      midMarketRate: midRate,
      providers: compareRank(options),
      source: "Wise price comparison",
      fetchedAt: new Date().toISOString(),
    };
    compareCache.set(key, { storedAt: Date.now(), body });
    response.json(body);
  } catch (error) {
    console.error(
      `Transfer comparison failed (${fromCountry}->${toCountry}):`,
      error.message,
    );
    response.status(502).json({
      error: "Provider comparison is temporarily unavailable. Try again.",
    });
  }
});

app.get("/api/competitor-share-prices", async (request, response) => {
  const requestedNames = String(request.query.names || "")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  if (requestedNames.length === 0 || requestedNames.length > 20) {
    response
      .status(400)
      .json({ error: "Provide between 1 and 20 competitor names." });
    return;
  }

  const names = [...new Set(requestedNames)];
  const items = await Promise.all(names.map(getCompetitorSharePrice));
  response.json({
    source:
      "Yahoo Finance via yahoo-finance2 (unofficial; quotes may be delayed)",
    updatedAt: new Date().toISOString(),
    items,
  });
});

app.post("/api/translate", async (request, response) => {
  const text =
    typeof request.body?.text === "string" ? request.body.text.trim() : "";
  if (!text) {
    response.status(400).json({ error: "Comment text is required." });
    return;
  }
  if (text.length > TRANSLATION_MAX_LENGTH) {
    response.status(413).json({
      error: `Comment text must be ${TRANSLATION_MAX_LENGTH} characters or fewer.`,
    });
    return;
  }

  const cacheKey = createHash("sha256").update(text).digest("hex");
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
  const clientIp = request.ip || request.socket.remoteAddress || "unknown";
  const rateLimit = translationRateLimits.get(clientIp);
  if (
    rateLimit &&
    now - rateLimit.startedAt < TRANSLATION_RATE_WINDOW_MS &&
    rateLimit.count >= TRANSLATION_RATE_LIMIT
  ) {
    response.status(429).json({
      error: "Translation limit reached. Please try again in a minute.",
    });
    return;
  }
  if (
    now - translationGlobalRateLimit.startedAt >=
    TRANSLATION_RATE_WINDOW_MS
  ) {
    translationGlobalRateLimit = { startedAt: now, count: 0 };
  }
  if (translationGlobalRateLimit.count >= TRANSLATION_GLOBAL_RATE_LIMIT) {
    response
      .status(429)
      .json({ error: "Translation is busy. Please try again in a minute." });
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
    const translationUrl = (
      process.env.LIBRETRANSLATE_URL || "http://127.0.0.1:5000"
    ).replace(/\/$/, "");
    const providerResponse = await fetch(`${translationUrl}/translate`, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        q: text,
        source: "auto",
        target: "en",
        format: "text",
      }),
      signal: controller.signal,
    });
    let providerData;
    try {
      providerData = await providerResponse.json();
    } catch {
      console.error("LibreTranslate returned an unreadable response.");
      response.status(502).json({
        error: "Translation service returned an unreadable response.",
      });
      return;
    }
    if (!providerResponse.ok) {
      console.error(`LibreTranslate returned HTTP ${providerResponse.status}.`);
      response
        .status(502)
        .json({ error: "Translation is temporarily unavailable." });
      return;
    }

    const translation = providerData?.translatedText;
    const detectedLanguage = providerData?.detectedLanguage?.language;
    if (
      typeof translation !== "string" ||
      typeof detectedLanguage !== "string"
    ) {
      console.error("LibreTranslate returned an invalid response.");
      response
        .status(502)
        .json({ error: "Translation service returned an invalid response." });
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
    translationCache.set(cacheKey, {
      cachedAt: Date.now(),
      translation: result,
    });
    response.json(result);
  } catch (error) {
    console.error(
      "LibreTranslate request failed:",
      error.name || "unknown error",
    );
    response.status(502).json({
      error:
        "Translation is temporarily unavailable. Make sure LibreTranslate is running.",
    });
  } finally {
    clearTimeout(timeout);
  }
});

async function getPlatformRatings(
  brand,
  country,
  bypassCache = false,
  options = {},
) {
  const useGoogle =
    !options.platforms || options.platforms.includes("Mobile · Android");
  const useApple =
    !options.platforms || options.platforms.includes("Mobile · iOS");
  const cacheKey = `${brand}:${country}:${options.appName || ""}:${useGoogle}:${useApple}:${Boolean(options.strict)}`;
  const cached = platformRatingsCache.get(cacheKey);
  if (
    !bypassCache &&
    cached &&
    Date.now() - cached.cachedAt < PLATFORM_RATINGS_CACHE_TTL_MS
  ) {
    return { ...cached.value, collectedAt: cached.collectedAt };
  }
  try {
    const appId = useGoogle
      ? await resolvePlayAppId(brand, country, options.strict, options.appName)
      : null;
    let google = { rating: null, reviewCount: 0 };
    if (appId) {
      try {
        const app = await gplay.app({
          appId,
          country: country.toLowerCase(),
          requestOptions: { timeout: 12000 },
        });
        google = {
          rating:
            typeof app.score === "number" && app.score >= 1 && app.score <= 5
              ? app.score
              : null,
          reviewCount: Math.max(
            Number(app.ratings || 0),
            Number(app.reviews || 0),
          ),
        };
      } catch (googleError) {
        console.error(
          `Google Play aggregate lookup failed for ${brand} (${country}):`,
          googleError.message,
        );
      }
    }
    let appleRating = null;
    let appleReviewCount = 0;
    try {
      const match = useApple
        ? await findAppleBrandApp(
            brand,
            country,
            options.appName,
            options.strict,
          )
        : null;
      if (match?.averageUserRating) {
        appleRating = Number(Number(match.averageUserRating).toFixed(2));
        appleReviewCount = Number(match.userRatingCount || 0);
      }
    } catch (appleError) {
      console.error(
        `Apple App Store aggregate lookup failed for ${country}:`,
        appleError.message,
      );
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
    platformRatingsCache.set(cacheKey, {
      cachedAt: Date.now(),
      collectedAt,
      value,
    });
    return { ...value, collectedAt };
  } catch (error) {
    console.error(
      `Platform ratings failed for ${brand} (${country}):`,
      error.message,
    );
    throw error;
  }
}

app.get("/api/platform-ratings", async (request, response) => {
  const brand = String(request.query.brand || "Western Union");
  const country = String(request.query.country || "US").toUpperCase();
  const bypass =
    request.query.refresh !== undefined && request.query.refresh !== "";
  try {
    response.json(await getPlatformRatings(brand, country, bypass));
  } catch {
    response.status(502).json({ error: "Platform ratings are unavailable." });
  }
});

const chartRanksCache = new Map();
const CHART_RANKS_CACHE_TTL_MS = 60 * 60 * 1000;

async function appleTopChartRank(brand, country, appName = "", strict = false) {
  const match = await findAppleBrandApp(brand, country, appName, strict);
  if (!match?.trackId)
    return { rank: null, chartSize: 0, category: null, appId: null };
  const genreId = Number(match.primaryGenreId);
  if (!Number.isInteger(genreId))
    return {
      rank: null,
      chartSize: 0,
      category: null,
      appId: String(match.trackId),
    };
  const feed = await appleFetchJson(
    `https://itunes.apple.com/${country.toLowerCase()}/rss/topfreeapplications/limit=200/genre=${genreId}/json`,
  );
  return {
    ...appleChartRank(feed, match.trackId),
    category: match.primaryGenreName || null,
    appId: String(match.trackId),
  };
}

async function playTopChartRank(brand, country, appName = "", strict = false) {
  const appId = await resolvePlayAppId(brand, country, strict, appName);
  if (!appId) return { rank: null, chartSize: 0, category: null, appId: null };
  const detail = await gplay.app({
    appId,
    country: country.toLowerCase(),
    lang: "en",
    requestOptions: { timeout: 12000 },
  });
  const category = Object.values(gplay.category).includes(detail.genreId)
    ? detail.genreId
    : null;
  if (!category)
    return { rank: null, chartSize: 0, category: detail.genre || null, appId };
  const list = await gplay.list({
    category,
    collection: gplay.collection.TOP_FREE,
    country: country.toLowerCase(),
    lang: "en",
    num: 200,
    requestOptions: { timeout: 12000 },
  });
  return {
    ...playChartRank(list, appId),
    category: detail.genre || category,
    appId,
  };
}

// Position of the brand's app in each store's top-free chart for its own category.
app.get("/api/store-chart-ranks", async (request, response) => {
  const brand = String(request.query.brand || "Western Union").slice(0, 80);
  const country = String(request.query.country || "US").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    response
      .status(400)
      .json({ error: "country must be a two-letter ISO code" });
    return;
  }
  const cacheKey = `${brand}:${country}`;
  const cached = chartRanksCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CHART_RANKS_CACHE_TTL_MS) {
    response.json(cached.value);
    return;
  }
  const unavailable = (label, error) => {
    console.error(
      `${label} chart rank failed for ${brand} (${country}):`,
      error.message,
    );
    return {
      rank: null,
      chartSize: 0,
      category: null,
      appId: null,
      error: `${label} chart unavailable`,
    };
  };
  const [apple, google] = await Promise.all([
    appleTopChartRank(brand, country).catch((error) =>
      unavailable("App Store", error),
    ),
    playTopChartRank(brand, country).catch((error) =>
      unavailable("Google Play", error),
    ),
  ]);
  const value = {
    brand,
    country,
    collection: "Top free",
    apple,
    google,
    collectedAt: new Date().toISOString(),
  };
  if (!apple.error && !google.error)
    chartRanksCache.set(cacheKey, { cachedAt: Date.now(), value });
  response.json(value);
});

const channelRatingsCache = new Map();
const BRAND_CHANNEL_CACHE_TTL_MS = 30 * 60 * 1000;
const WEB_CHANNEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function cachedChannel(key, ttl, bypass, compute) {
  const cached = channelRatingsCache.get(key);
  if (!bypass && cached && Date.now() - cached.cachedAt < ttl)
    return cached.value;
  const value = await compute();
  channelRatingsCache.set(key, { cachedAt: Date.now(), value });
  return value;
}

async function computeBrandChannel(brand, country, bypass) {
  return storeBrandRating(await getPlatformRatings(brand, country, bypass));
}

async function computeWebChannel(brand, country) {
  const url = brandWebsiteUrl(brand, country);
  if (!url)
    return {
      rating: null,
      sampleSize: 0,
      basis: `No country website configured for ${brand}`,
      components: [],
    };
  let probe = null;
  try {
    probe = await probeWebsite(url, country);
  } catch (error) {
    console.error(
      `Website probe failed for ${brand} (${country}):`,
      error.name === "AbortError" ? "timeout" : error.message,
    );
  }
  if (probe && process.env.GOOGLE_PAGESPEED_API_KEY) {
    probe.lighthouse = await fetchLighthouse(
      probe.finalUrl,
      process.env.GOOGLE_PAGESPEED_API_KEY,
    ).catch(() => null);
  }
  return scoreWebsiteProbe(probe);
}

// Runtime models supply their own website URL, so probe it directly for any
// brand rather than relying on the per-brand localized URL map.
async function computeRuntimeWebChannel(website, country) {
  if (!website)
    return {
      rating: null,
      sampleSize: 0,
      basis: "No website provided for this model",
      components: [],
    };
  let probe = null;
  try {
    probe = await probeWebsite(website, country);
  } catch (error) {
    console.error(
      `Runtime website probe failed (${country}):`,
      error.name === "AbortError" ? "timeout" : error.message,
    );
  }
  if (probe && process.env.GOOGLE_PAGESPEED_API_KEY) {
    probe.lighthouse = await fetchLighthouse(
      probe.finalUrl,
      process.env.GOOGLE_PAGESPEED_API_KEY,
    ).catch(() => null);
  }
  return scoreWebsiteProbe(probe);
}

// The brand score is a provisional proxy based on available app-store ratings.
app.get("/api/channel-ratings", async (request, response) => {
  const brand = String(request.query.brand || "Western Union").slice(0, 80);
  const country = String(request.query.country || "US").toUpperCase();
  if (!/^[A-Z]{2}$/.test(country)) {
    response
      .status(400)
      .json({ error: "country must be a two-letter ISO code" });
    return;
  }
  const bypass =
    request.query.refresh !== undefined && request.query.refresh !== "";
  const unavailable = (label) => ({
    rating: null,
    sampleSize: 0,
    basis: `${label} source temporarily unavailable`,
    components: [],
  });
  const [brandChannel, web] = await Promise.all([
    cachedChannel(
      `brand:${brand}:${country}`,
      BRAND_CHANNEL_CACHE_TTL_MS,
      bypass,
      () => computeBrandChannel(brand, country, bypass),
    ).catch((error) => {
      console.error(
        `Brand channel failed for ${brand} (${country}):`,
        error.message,
      );
      return unavailable("Brand");
    }),
    cachedChannel(
      `web:${brand}:${country}`,
      WEB_CHANNEL_CACHE_TTL_MS,
      bypass,
      () => computeWebChannel(brand, country),
    ).catch((error) => {
      console.error(
        `Website channel failed for ${brand} (${country}):`,
        error.message,
      );
      return unavailable("Website");
    }),
  ]);
  response.json({
    brand: brandChannel,
    web,
    country,
    collectedAt: new Date().toISOString(),
  });
});

// Combined Google Play + Apple rating for every competitor in a country, so the
// client can rank all brands (including the selected one) on the same basis.
// Discovery makes ~100 store/Wikidata requests, so successful results are reused.
const COMPETITOR_CACHE_TTL_MS = 6 * 60 * 60 * 1000;
const competitorCache = new Map();

app.get("/api/competitor-ratings", async (request, response) => {
  const brand = String(request.query.brand || "").trim();
  const country = String(request.query.country || "US").toUpperCase();
  const region = String(request.query.region || "Global");
  if (!brand || brand.length > 80 || !/^[A-Z]{2}$/.test(country)) {
    response.status(400).json({
      error:
        "Provide a brand of 1–80 characters and a two-letter country code.",
    });
    return;
  }
  const cacheKey = `${brand.toLowerCase()}|${country}`;
  const cached = competitorCache.get(cacheKey);
  if (cached && Date.now() - cached.storedAt < COMPETITOR_CACHE_TTL_MS) {
    response.json({ ...cached.payload, region });
    return;
  }
  try {
    const discovery = await discoverCompetitors({
      brand,
      country,
      gplay,
      resolveAppId: (name, code) => resolvePlayAppId(name, code, true),
    });
    const peers = discovery.apps.map((item) => ({
      ...item,
      source: "Google Play",
      status: item.rating === null ? "unavailable" : "live",
    }));
    // Include the searched brand only when real peers exist; a lone brand is not a category leader.
    const stores = peers.some((peer) => peer.rating !== null)
      ? await getPlatformRatings(brand, country)
      : null;
    const rating = stores ? storeBrandRating(stores).rating : null;
    const selected = stores
      ? [
          {
            name: brand,
            rating,
            reviewCount: Math.max(
              stores.google.reviewCount,
              stores.apple.reviewCount,
            ),
            source: "Apple App Store + Google Play",
            status: rating === null ? "unavailable" : "live",
          },
        ]
      : [];
    const payload = {
      brand,
      country,
      region,
      basis: discovery.basis,
      competitors: [...selected, ...peers],
      collectedAt: new Date().toISOString(),
    };
    if (peers.length)
      competitorCache.set(cacheKey, { storedAt: Date.now(), payload });
    response.json(payload);
  } catch (error) {
    console.error(
      `Competitor discovery failed for ${brand} (${country}):`,
      error.message,
    );
    response.status(502).json({
      error:
        "Live competitor discovery is temporarily unavailable. Refresh to retry.",
    });
  }
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
  if (redditAccessToken && Date.now() < redditTokenExpiresAt)
    return redditAccessToken;
  const tokenResponse = await fetch(
    "https://www.reddit.com/api/v1/access_token",
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "sentiment-analyzer/1.0 (brand sentiment dashboard)",
      },
      body: "grant_type=client_credentials",
    },
  );
  if (!tokenResponse.ok)
    throw new Error(`Reddit auth returned ${tokenResponse.status}`);
  const tokenData = await tokenResponse.json();
  redditAccessToken = tokenData.access_token;
  redditTokenExpiresAt =
    Date.now() + Math.max(Number(tokenData.expires_in || 3600) - 60, 60) * 1000;
  return redditAccessToken;
}

app.get("/api/reddit-mentions", async (request, response) => {
  const brand = String(request.query.brand || "").trim();
  if (!brand) {
    response.status(400).json({ error: "brand is required", mentions: [] });
    return;
  }
  try {
    const token = await getRedditAccessToken();
    const url = token
      ? `https://oauth.reddit.com/search?q=${encodeURIComponent(brand)}&sort=new&limit=25&type=link,comment`
      : `https://www.reddit.com/search.json?q=${encodeURIComponent(brand)}&sort=new&limit=25&type=link,comment&_ts=${Date.now()}`;
    const headers = token
      ? {
          Authorization: `Bearer ${token}`,
          "User-Agent": "sentiment-analyzer/1.0 (brand sentiment dashboard)",
        }
      : {
          Accept: "application/json",
          "User-Agent": "sentiment-analyzer/1.0 (brand sentiment dashboard)",
        };
    const redditResponse = await fetch(url, { headers, cache: "no-store" });
    if (!redditResponse.ok) {
      console.error(
        `Reddit mention collection failed for ${brand}: HTTP ${redditResponse.status}`,
      );
      response.json({ brand, mentions: [] });
      return;
    }
    const data = await redditResponse.json();
    const posts = Array.isArray(data?.data?.children) ? data.data.children : [];
    const mentions = posts
      .slice(0, 12)
      .map((child) => {
        const post = child?.data ?? {};
        const title = String(post.title ?? "")
          .replace(/\s+/g, " ")
          .trim();
        const body = String(post.selftext ?? "")
          .replace(/\s+/g, " ")
          .trim();
        return {
          title,
          body,
          author: String(post.author ? `u/${post.author}` : "Reddit user"),
          publishedAt: Number.isFinite(Number(post.created_utc))
            ? new Date(Number(post.created_utc) * 1000).toISOString()
            : null,
        };
      })
      .filter((mention) => mention.title || mention.body);
    response.json({ brand, mentions });
  } catch (error) {
    console.error(
      `Reddit mention collection failed for ${brand}:`,
      error.message,
    );
    response.json({ brand, mentions: [] });
  }
});

app.get("/api/reviews", async (request, response) => {
  const brand = String(request.query.brand || "Western Union");
  const country = String(request.query.country || "US").toUpperCase();
  const limit = Math.min(Math.max(Number(request.query.limit || 100), 1), 3600);
  const months = Math.min(Math.max(Number(request.query.months || 1), 1), 6);
  const cacheKey = `${brand}:${country}:${months}`;
  const bypassCache =
    request.query.refresh !== undefined && request.query.refresh !== "";
  const cached = reviewsCache.get(cacheKey);
  if (
    !bypassCache &&
    cached &&
    Date.now() - cached.cachedAt < REVIEWS_CACHE_TTL_MS
  ) {
    response.json({
      brand,
      country,
      months,
      collectedAt: cached.collectedAt,
      count: cached.reviews.length,
      reviews: cached.reviews.slice(0, limit),
    });
    return;
  }
  const [googleReviews, appleReviews, trustpilotReviews] = await Promise.all([
    collectGooglePlayReviews(brand, country, months).catch((e) => {
      console.error(`Google Play collection failed for ${brand}:`, e.message);
      return [];
    }),
    collectAppleReviews(brand, country).catch((e) => {
      console.error(`Apple collection failed for ${brand}:`, e.message);
      return [];
    }),
    collectTrustpilotReviews(brand).catch((e) => {
      console.error(`Trustpilot collection failed for ${brand}:`, e.message);
      return [];
    }),
  ]);
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - months);
  const reviews = [
    ...googleReviews,
    ...appleReviews,
    ...trustpilotReviews,
  ].filter((review) => {
    if (!review.publishedAt) return true;
    const publishedAt = new Date(review.publishedAt);
    return Number.isNaN(publishedAt.getTime()) || publishedAt >= cutoff;
  });
  reviews.sort((left, right) => {
    const leftTime = left.publishedAt
      ? new Date(left.publishedAt).getTime()
      : 0;
    const rightTime = right.publishedAt
      ? new Date(right.publishedAt).getTime()
      : 0;
    return rightTime - leftTime;
  });
  try {
    const collectedAt = new Date().toISOString();
    reviewsCache.set(cacheKey, { collectedAt, cachedAt: Date.now(), reviews });
    response.json({
      brand,
      country,
      months,
      collectedAt,
      count: reviews.length,
      reviews: reviews.slice(0, limit),
    });
  } catch (error) {
    console.error(
      "Review collection failed:",
      error instanceof Error ? error.message : error,
    );
    response.status(500).json({
      brand,
      country,
      months,
      count: 0,
      reviews: [],
      error: "Review collection failed.",
    });
  }
});

// Wikidata names global peers; regional peers for the selected country are added so the comparison
// covers the competitors that actually operate in that market (each is still looked up in that
// country's own store and must pass the same rating and publisher checks).
const profileWithRegionalPeers = (country) => async (brand) => {
  const regional = regionalPeerNames(brand, country);
  let base = { terms: [], peers: [] };
  try {
    base = await wikidataProfile(brand);
  } catch (error) {
    if (!regional.length) throw error;
    console.error(
      `Business profile lookup failed for ${brand}:`,
      error.message,
    );
  }
  const peers = [...new Set([...regional, ...base.peers])].filter(
    (name) => name.toLowerCase() !== String(brand).trim().toLowerCase(),
  );
  return { ...base, peers };
};

registerModelRoute(app, {
  // Discovery rates each peer in one store; add the same peer's rating from the other store.
  peerStoreRatings: async (peers, config, primary) => {
    if (primary === "google") {
      return withStoreRatings(peers, {
        country: config.country,
        fetchJson: appleFetchJson,
      });
    }
    // Apple-first discovery: the rating on each peer is the App Store one.
    return peers.map((peer) => ({
      ...peer,
      apple: { rating: peer.rating, reviewCount: peer.reviewCount ?? 0 },
      google: null,
    }));
  },
  stores: (config) =>
    getPlatformRatings(config.brand, config.country, false, {
      ...config,
      strict: true,
    }),
  reviews: (source, config) =>
    source === "Google Play"
      ? collectGooglePlayReviews(config.brand, config.country, config.months, {
          ...config,
          strict: true,
        })
      : collectAppleReviews(config.brand, config.country, {
          ...config,
          strict: true,
        }),
  social: (source, config) =>
    collectSocialReviews(source, config.brand, { trustpilotDomain }),
  peers: (platform, config) =>
    platform === "google"
      ? discoverCompetitors({
          brand: config.brand,
          country: config.country,
          gplay,
          resolveAppId: (name, code) =>
            resolvePlayAppId(name, code, true, config.appName),
          profile: profileWithRegionalPeers(config.country),
        })
      : discoverAppleCompetitors({
          brand: config.brand,
          country: config.country,
          appName: config.appName,
          findApp: (brand, country, appName) =>
            findAppleBrandApp(brand, country, appName, true),
          fetchJson: appleFetchJson,
          profile: profileWithRegionalPeers(config.country),
        }),
  chart: (platform, config) =>
    platform === "google"
      ? playTopChartRank(config.brand, config.country, config.appName, true)
      : appleTopChartRank(config.brand, config.country, config.appName, true),
  quotes: (names) => Promise.all(names.map(getCompetitorSharePrice)),
  transferFees: (country, names) =>
    collectTransferFees(country, names, { log: console }),
  web: (config) => computeRuntimeWebChannel(config.website, config.country),
  log: console,
});

// SPA fallback: client-side routes (e.g. /dashboard) must serve index.html.
if (hasWebBuild) {
  app.get(/^\/(?!api\/|health$).*/, (_request, response) => {
    response.sendFile(path.join(DIST_DIR, "index.html"));
  });
}

app.listen(PORT, () =>
  console.log(`Review collector listening on http://localhost:${PORT}`),
);
