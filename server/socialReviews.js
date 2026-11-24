// Connectors for LinkedIn, Facebook, X / Twitter and Reviews.io.
// Each connector tries the official API when credentials exist, then falls back to the optional
// Scrapy service (scraper/) for public pages. Results use the same shape as the store reviews.
// A connector with no credentials and no scraper returns [] so the model reports it unavailable.

const SOCIAL_SOURCES = [
  "Facebook",
  "LinkedIn",
  "X / Twitter",
  "Reviews.io",
  "Trustpilot",
];
// Trustpilot's robots.txt disallows all crawlers (User-agent: * / Disallow: /) and its public pages
// return 403, so it is collected only through the official Business API, never the Scrapy service.
const NO_SCRAPER = new Set(["Trustpilot"]);
const SCRAPER_URL = () =>
  (process.env.SCRAPY_SERVICE_URL || "").replace(/\/$/, "");

const clean = (value) =>
  String(value ?? "")
    .replace(/\s+/g, " ")
    .trim();
const isoOrNull = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Social posts carry no star rating. Map text polarity to a 1-5 value so the shared
// star-based scoring in the runtime model can be reused; it is marked as derived.
const POSITIVE =
  /\b(love|great|excellent|amazing|fast|easy|good|best|thank|recommend|happy|reliable)\b/i;
const NEGATIVE =
  /\b(scam|fraud|delay|slow|fee|fees|failed|problem|bad|hate|terrible|stolen|worst|refund|complaint|awful)\b/i;
function derivedRating(text) {
  const negative = NEGATIVE.test(text);
  const positive = POSITIVE.test(text);
  if (negative && !positive) return 1;
  if (positive && !negative) return 5;
  return 3;
}

async function getJson(fetchImpl, url, options = {}) {
  const response = await fetchImpl(url, {
    headers: { Accept: "application/json", ...(options.headers || {}) },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function normalize(source, item) {
  const text = clean(item.text);
  if (!text) return null;
  const hasStars =
    Number.isFinite(Number(item.rating)) && Number(item.rating) >= 1;
  const rating = hasStars ? Number(item.rating) : derivedRating(text);
  return {
    source,
    author: clean(item.author) || `${source} user`,
    rating,
    ratingDerived: !hasStars,
    text,
    appVersion: null,
    publishedAt: isoOrNull(item.publishedAt),
    sourceId: String(item.id ?? ""),
  };
}

async function viaScraper(source, brand, fetchImpl) {
  const base = SCRAPER_URL();
  if (!base || NO_SCRAPER.has(source)) return [];
  const data = await getJson(
    fetchImpl,
    `${base}/scrape?source=${encodeURIComponent(source)}&brand=${encodeURIComponent(brand)}`,
  );
  return Array.isArray(data?.reviews) ? data.reviews : [];
}

const connectors = {
  async Trustpilot(brand, fetchImpl, options = {}) {
    const apiKey = process.env.TRUSTPILOT_API_KEY;
    const domain = options.trustpilotDomain
      ? options.trustpilotDomain(brand)
      : null;
    if (!apiKey || !domain) return null;
    const unit = await getJson(
      fetchImpl,
      `https://api.trustpilot.com/v1/business-units/find?name=${encodeURIComponent(domain)}&apikey=${encodeURIComponent(apiKey)}`,
    );
    if (!unit?.id) return [];
    const data = await getJson(
      fetchImpl,
      `https://api.trustpilot.com/v1/business-units/${unit.id}/reviews?apikey=${encodeURIComponent(apiKey)}&perPage=100&orderBy=createdat.desc`,
    );
    return (data?.reviews || []).map((entry) => ({
      id: entry.id,
      author: entry.consumer?.displayName,
      rating: entry.stars,
      text: [entry.title, entry.text].filter(Boolean).join(" — "),
      publishedAt: entry.createdAt,
    }));
  },
  async Facebook(brand, fetchImpl) {
    const token = process.env.META_ACCESS_TOKEN;
    const pageId = process.env.FACEBOOK_PAGE_ID;
    if (!token || !pageId) return null;
    const data = await getJson(
      fetchImpl,
      `https://graph.facebook.com/v19.0/${encodeURIComponent(pageId)}/ratings?fields=review_text,rating,created_time,reviewer&limit=100&access_token=${encodeURIComponent(token)}`,
    );
    return (data?.data || []).map((entry) => ({
      id: `${pageId}:${entry.created_time}:${entry.reviewer?.id ?? ""}`,
      author: entry.reviewer?.name,
      rating: entry.rating,
      text: entry.review_text,
      publishedAt: entry.created_time,
    }));
  },
  async LinkedIn(brand, fetchImpl) {
    const token = process.env.LINKEDIN_ACCESS_TOKEN;
    const organization = process.env.LINKEDIN_ORGANIZATION_URN;
    if (!token || !organization) return null;
    // Organization social actions (comments on the brand's own posts) need an approved Partner app.
    const data = await getJson(
      fetchImpl,
      `https://api.linkedin.com/rest/socialActions/${encodeURIComponent(organization)}/comments?count=100`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          "LinkedIn-Version": "202401",
        },
      },
    );
    return (data?.elements || []).map((entry) => ({
      id: entry.id || entry["$URN"],
      author: entry.actor,
      text: entry.message?.text,
      publishedAt: entry.created?.time,
    }));
  },
  async "X / Twitter"(brand, fetchImpl) {
    const token = process.env.TWITTER_BEARER_TOKEN;
    if (!token) return null;
    const query = encodeURIComponent(`"${brand}" -is:retweet lang:en`);
    const data = await getJson(
      fetchImpl,
      `https://api.twitter.com/2/tweets/search/recent?query=${query}&max_results=100&tweet.fields=created_at,author_id`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return (data?.data || []).map((entry) => ({
      id: entry.id,
      author: entry.author_id ? `@${entry.author_id}` : "X user",
      text: entry.text,
      publishedAt: entry.created_at,
    }));
  },
  async "Reviews.io"(brand, fetchImpl) {
    const key = process.env.REVIEWS_IO_API_KEY;
    const store = process.env.REVIEWS_IO_STORE;
    if (!key || !store) return null;
    const data = await getJson(
      fetchImpl,
      `https://api.reviews.co.uk/merchant/reviews?store=${encodeURIComponent(store)}&per_page=100`,
      { headers: { apikey: key } },
    );
    return (data?.reviews || []).map((entry) => ({
      id: entry.store_review_id,
      author: entry.reviewer?.first_name,
      rating: entry.rating,
      text: entry.comments,
      publishedAt: entry.date_created,
    }));
  },
};

// Collect one social source. Official API results win; the scraper only fills in when the API is
// not configured or returned nothing. Errors propagate so the model can mark the source unavailable.
async function collectSocialReviews(source, brand, options = {}) {
  const fetchImpl = options.fetchImpl || fetch;
  const connector = connectors[source];
  if (!connector) return [];
  let raw = await connector(brand, fetchImpl, options);
  if (!raw || !raw.length) raw = await viaScraper(source, brand, fetchImpl);
  return raw.map((item) => normalize(source, item)).filter(Boolean);
}

module.exports = {
  SOCIAL_SOURCES,
  collectSocialReviews,
  derivedRating,
  normalize,
};
