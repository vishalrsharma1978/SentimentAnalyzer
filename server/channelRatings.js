// Country-level Brand and Website ratings for a monitored brand.
//
// Brand  = mean star rating of that country's customer reviews that talk about
//          the service itself (fees, FX rates, agents, payouts, support, trust)
//          rather than the app UI. Sourced from Apple App Store + Google Play.
// Website = live, measured quality of the brand's localized country website
//          (availability, speed, page weight, security headers, mobile/SEO
//          markup), optionally blended with Google Lighthouse via PageSpeed.

const BRAND_SITES = {
  'Western Union': (country) => `https://www.westernunion.com/${country.toLowerCase()}/en/home.html`,
};

const BRAND_THEME = new RegExp([
  'fees?', 'charges?', 'charged', 'commission', 'exchange', 'rates?', 'fx',
  'agents?', 'locations?', 'branch(es)?', 'pick ?up', 'payout',
  'customer (service|support|care)', 'support', 'help ?desk', 'call cent(er|re)',
  'refund(ed)?', 'trust(ed|worthy)?', 'reliable', 'scam', 'fraud',
  'on hold', 'held', 'blocked', 'cancel+ed', 'recipient', 'receiver',
  'deliver(ed|y)?', 'arrived', 'company',
].map((term) => `\\b${term}\\b`).join('|'), 'i');

const MIN_BRAND_REVIEWS = 5;

function isBrandReview(review) {
  return BRAND_THEME.test(String(review?.text || ''));
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function scoreBrandReviews(reviews) {
  const themed = (Array.isArray(reviews) ? reviews : [])
    .filter((review) => Number.isFinite(review?.rating) && review.rating >= 1 && review.rating <= 5)
    .filter(isBrandReview);
  if (themed.length < MIN_BRAND_REVIEWS) {
    return {
      rating: null,
      sampleSize: themed.length,
      basis: `Fewer than ${MIN_BRAND_REVIEWS} service-related customer reviews in this storefront`,
      components: [],
    };
  }
  const mean = themed.reduce((sum, review) => sum + review.rating, 0) / themed.length;
  const share = (predicate) => themed.filter(predicate).length / themed.length;
  return {
    rating: round(mean),
    sampleSize: themed.length,
    basis: `Mean star rating of ${themed.length} customer reviews about fees, rates, payouts, agents, support and trust`,
    components: [
      { label: 'Promoters (4–5★)', score: round(share((review) => review.rating >= 4)) },
      { label: 'Passive (3★)', score: round(share((review) => review.rating === 3)) },
      { label: 'Detractors (1–2★)', score: round(share((review) => review.rating <= 2)) },
    ],
  };
}

function band(value, thresholds) {
  for (const [limit, score] of thresholds) if (value <= limit) return score;
  return 0;
}

const SECURITY_HEADERS = [
  ['HSTS', (h) => Boolean(h['strict-transport-security'])],
  ['Content-Security-Policy', (h) => Boolean(h['content-security-policy'])],
  ['X-Content-Type-Options', (h) => /nosniff/i.test(h['x-content-type-options'] || '')],
  ['Clickjacking protection', (h) => Boolean(h['x-frame-options']) || /frame-ancestors/i.test(h['content-security-policy'] || '')],
  ['Referrer-Policy', (h) => Boolean(h['referrer-policy'])],
];

const MARKUP_CHECKS = [
  ['Mobile viewport', (html) => /<meta[^>]+name=["']viewport["']/i.test(html)],
  ['Language declared', (html) => /<html[^>]*\blang=["'][^"']+["']/i.test(html)],
  ['Page title', (html) => /<title[^>]*>\s*[^<\s][^<]*<\/title>/i.test(html)],
  ['Meta description', (html) => /<meta[^>]+name=["']description["']/i.test(html)],
  ['Canonical URL', (html) => /<link[^>]+rel=["']canonical["']/i.test(html)],
];

// probe: { status, finalUrl, country, headersMs, totalMs, bytes, headers, html, lighthouse? }
function scoreWebsiteProbe(probe) {
  if (!probe || !probe.status) {
    return { rating: null, sampleSize: 0, basis: 'Country website could not be reached', components: [] };
  }
  const headers = Object.fromEntries(Object.entries(probe.headers || {}).map(([key, value]) => [key.toLowerCase(), String(value)]));
  const html = String(probe.html || '');
  const localized = new RegExp(`/${String(probe.country || '').toLowerCase()}/`, 'i').test(String(probe.finalUrl || ''));
  const available = probe.status >= 200 && probe.status < 300 ? (localized ? 1 : 0.5) : 0;
  const passedSecurity = SECURITY_HEADERS.filter(([, check]) => check(headers));
  const passedMarkup = MARKUP_CHECKS.filter(([, check]) => check(html));
  const components = [
    { label: 'Availability & localization', score: available, weight: 2 },
    { label: 'Server response', score: band(probe.headersMs, [[300, 1], [600, 0.8], [1000, 0.6], [2000, 0.4], [4000, 0.2]]), weight: 1.5 },
    { label: 'Full page load', score: band(probe.totalMs, [[800, 1], [1500, 0.8], [3000, 0.6], [5000, 0.4], [8000, 0.2]]), weight: 1 },
    { label: 'Page weight', score: band(probe.bytes / 1024, [[150, 1], [300, 0.8], [600, 0.6], [1200, 0.4], [Infinity, 0.2]]), weight: 0.5 },
    { label: 'Security headers', score: passedSecurity.length / SECURITY_HEADERS.length, weight: 1.5 },
    { label: 'Mobile & SEO markup', score: passedMarkup.length / MARKUP_CHECKS.length, weight: 1.5 },
  ];
  if (available === 0) {
    return {
      rating: 1,
      sampleSize: 1,
      basis: `Country website returned HTTP ${probe.status}`,
      components: components.map(({ label, score }) => ({ label, score: round(score) })),
    };
  }
  const totalWeight = components.reduce((sum, item) => sum + item.weight, 0);
  let quality = components.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight;
  let basis = `Live check of ${probe.finalUrl}: ${passedSecurity.length}/${SECURITY_HEADERS.length} security headers, ${passedMarkup.length}/${MARKUP_CHECKS.length} mobile/SEO checks, ${Math.round(probe.headersMs)} ms response`;
  const lighthouse = probe.lighthouse && Object.values(probe.lighthouse).filter((value) => Number.isFinite(value));
  if (lighthouse && lighthouse.length) {
    const lighthouseScore = lighthouse.reduce((sum, value) => sum + value, 0) / lighthouse.length;
    components.push({ label: 'Google Lighthouse (mobile)', score: lighthouseScore, weight: 0 });
    quality = (quality + lighthouseScore) / 2;
    basis += '; blended 50/50 with Google Lighthouse';
  }
  return {
    rating: round(1 + 4 * quality),
    sampleSize: SECURITY_HEADERS.length + MARKUP_CHECKS.length + 4,
    basis,
    components: components.map(({ label, score }) => ({ label, score: round(score) })),
  };
}

function brandWebsiteUrl(brand, country) {
  const builder = BRAND_SITES[brand];
  return builder ? builder(country) : null;
}

async function probeWebsite(url, country, { timeoutMs = 15000, fetchImpl = fetch } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const started = Date.now();
  try {
    const response = await fetchImpl(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; SentimentAnalyzer-SiteProbe/1.0)', Accept: 'text/html' },
    });
    const headersMs = Date.now() - started;
    const html = await response.text();
    return {
      status: response.status,
      finalUrl: response.url || url,
      country,
      headersMs,
      totalMs: Date.now() - started,
      bytes: Buffer.byteLength(html),
      headers: Object.fromEntries(response.headers.entries()),
      html,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchLighthouse(url, apiKey, fetchImpl = fetch) {
  if (!apiKey) return null;
  const categories = ['performance', 'accessibility', 'best-practices', 'seo'];
  const query = categories.map((category) => `category=${category}`).join('&');
  const response = await fetchImpl(`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=mobile&${query}&key=${encodeURIComponent(apiKey)}`);
  if (!response.ok) return null;
  const data = await response.json();
  const result = data?.lighthouseResult?.categories || {};
  return Object.fromEntries(categories.map((category) => [category, Number(result[category]?.score)]));
}

module.exports = {
  BRAND_THEME,
  MIN_BRAND_REVIEWS,
  brandWebsiteUrl,
  fetchLighthouse,
  isBrandReview,
  probeWebsite,
  scoreBrandReviews,
  scoreWebsiteProbe,
};
