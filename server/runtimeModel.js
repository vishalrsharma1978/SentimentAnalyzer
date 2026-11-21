const PLATFORMS = [
  "Web",
  "Mobile · iOS",
  "Mobile · Android",
  "Desktop app",
  "Agent network",
];
const SOURCES = [
  "App Store",
  "Google Play",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "X / Twitter",
  "YouTube",
  "Reddit",
  "Trustpilot",
  "Reviews.io",
  "Other web reviews",
];
const emptyStore = () => ({ rating: null, reviewCount: 0 });
const emptyChart = () => ({ rank: null, chartSize: 0, category: null });
const validRating = (value) =>
  Number.isFinite(value) && value >= 1 && value <= 5;

function parseModelRequest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error("Provide a model configuration.");
  const text = (key, max, optional = false) => {
    if (optional && (value[key] === undefined || value[key] === "")) return "";
    if (
      typeof value[key] !== "string" ||
      !value[key].trim() ||
      value[key].trim().length > max
    ) {
      throw new Error(`Provide a valid ${key} (maximum ${max} characters).`);
    }
    return value[key].trim();
  };
  const selection = (key, allowed) => {
    if (
      !Array.isArray(value[key]) ||
      !value[key].length ||
      value[key].length > allowed.length ||
      value[key].some((item) => !allowed.includes(item))
    )
      throw new Error(`Select valid ${key}.`);
    return [...new Set(value[key])];
  };
  const brand = text("brand", 80);
  const country = text("country", 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(country))
    throw new Error("Provide a two-letter country code.");
  const website = text("website", 2048);
  let url;
  try {
    url = new URL(website);
  } catch {
    throw new Error("Provide a valid http(s) website.");
  }
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password
  )
    throw new Error("Provide a valid http(s) website.");
  const months = value.months ?? 1;
  if (!Number.isInteger(months) || months < 1 || months > 6)
    throw new Error("Select a review window of 1–6 months.");
  return {
    brand,
    appName: text("appName", 80, true),
    website,
    businessType: text("businessType", 80, true),
    country,
    platforms: selection("platforms", PLATFORMS),
    sources: selection("sources", SOURCES),
    months,
  };
}

function summarize(reviews, ratings, competitors, brand) {
  const scores = [ratings.apple.rating, ratings.google.rating].filter(
    validRating,
  );
  const count = (sentiment) =>
    reviews.filter((review) => review.sentiment === sentiment).length;
  const positive = count("positive");
  const negative = count("negative");
  const ranked = competitors
    .filter((peer) => validRating(peer.rating))
    .sort(
      (a, b) =>
        b.rating - a.rating ||
        b.reviewCount - a.reviewCount ||
        a.name.localeCompare(b.name),
    );
  const position = ranked.findIndex((peer) => peer.name === brand);
  return {
    rating: scores.length
      ? scores.reduce((sum, score) => sum + score, 0) / scores.length
      : null,
    competitorRank: position >= 0 && ranked.length > 1 ? position + 1 : null,
    sentiment: {
      total: reviews.length,
      positive,
      neutral: count("neutral"),
      negative,
      positiveShare: reviews.length
        ? Math.round((positive / reviews.length) * 100)
        : null,
      net: reviews.length
        ? Math.round(((positive - negative) / reviews.length) * 100)
        : null,
    },
  };
}

// Transfer fees only exist for money-transfer providers in a covered corridor. Not having one is a
// finding, not a collection failure, so this never marks the model "limited" and never throws.
async function collectTransferFees(collectors, country, names) {
  if (!collectors.transferFees) return null;
  try {
    const result = await collectors.transferFees(country, names);
    if (!result) return null;
    return {
      corridor: result.corridor,
      fees: Object.fromEntries(
        Object.entries(result.fees).filter(([, fee]) => fee),
      ),
    };
  } catch (error) {
    collectors.log.error(
      `Runtime model transfer fees failed (${country}):`,
      error.message,
    );
    return null;
  }
}

async function evaluateMarket(config, collectors) {
  const availability = [];
  // `byDesign` marks sources this model intentionally does not use (for example global Reddit content
  // that cannot be attributed to one country). They stay visible in the list as unavailable, but they
  // are not a collection failure, so they must not downgrade the model from "ready" to "limited".
  const byDesign = new Set();
  const record = (source, available, reason, design = false) => {
    if (design && !available) byDesign.add(source);
    availability.push({
      source,
      status: available ? "available" : "unavailable",
      reason,
    });
  };
  const attempt = async (label, work, unavailable) => {
    try {
      return await work();
    } catch (error) {
      collectors.log.error(
        `Runtime model ${label} failed (${config.country}):`,
        error.message,
      );
      record(
        label,
        false,
        `${label} could not be collected. Retry model creation.`,
      );
      return unavailable;
    }
  };
  const google = config.platforms.includes("Mobile · Android");
  const apple = config.platforms.includes("Mobile · iOS");
  const webEnabled = config.platforms.includes("Web");
  // Store ratings and the website probe are independent, so collect them together.
  const loadWeb = async () => {
    if (!webEnabled || !collectors.web) return null;
    try {
      const result = await collectors.web(config);
      return result && typeof result === "object" ? result : null;
    } catch (error) {
      collectors.log.error(
        `Runtime model Website failed (${config.country}):`,
        error.message,
      );
      return null;
    }
  };
  const [stores, webResult] = await Promise.all([
    google || apple
      ? attempt("Store ratings", () => collectors.stores(config), null)
      : null,
    loadWeb(),
  ]);
  const web = webResult ?? {
    rating: null,
    sampleSize: 0,
    basis: "Website metrics could not be measured for this model.",
    components: [],
  };
  const ratings = {
    google: google && stores ? stores.google : emptyStore(),
    apple: apple && stores ? stores.apple : emptyStore(),
    web,
  };
  for (const [enabled, key, label] of [
    [google, "google", "Google Play ratings"],
    [apple, "apple", "App Store ratings"],
  ]) {
    if (enabled)
      record(
        label,
        validRating(ratings[key].rating),
        validRating(ratings[key].rating)
          ? "Live store aggregate for the selected storefront."
          : "No verified app rating found in this storefront.",
      );
  }
  if (webEnabled)
    record(
      "Web",
      validRating(ratings.web.rating),
      validRating(ratings.web.rating)
        ? ratings.web.basis || "Live website quality measurement."
        : ratings.web.basis ||
            "Live website metrics could not be measured. No score was estimated.",
    );
  for (const platform of config.platforms.filter(
    (item) => !item.startsWith("Mobile") && item !== "Web",
  )) {
    record(
      platform,
      false,
      `A country-specific ${platform.toLowerCase()} metrics connector is not available. No score was estimated.`,
      true,
    );
  }
  const now = new Date();
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - config.months);
  const primary = google ? "google" : apple ? "apple" : null;
  // Peer discovery, store charts and reviews do not depend on each other; start them all now.
  const discoveryRequest = primary
    ? attempt("Competitors", () => collectors.peers(primary, config), null)
    : Promise.resolve(null);
  const chartRequest = Promise.all(
    [
      ["apple", apple],
      ["google", google],
    ].map(async ([platform, enabled]) => {
      if (!enabled) return [platform, emptyChart()];
      const result = await attempt(
        `${platform} chart`,
        () => collectors.chart(platform, config),
        emptyChart(),
      );
      record(
        `${platform} chart`,
        result.chartSize > 0,
        result.chartSize > 0
          ? "Live category top-free chart; no rank means outside the returned chart."
          : "Store chart evidence unavailable.",
      );
      return [platform, result];
    }),
  );
  const batches = await Promise.all(
    config.sources.map(async (source) => {
      const enabled =
        source === "Google Play"
          ? google
          : source === "App Store"
            ? apple
            : false;
      if (!enabled) {
        record(
          source,
          false,
          ["Google Play", "App Store"].includes(source)
            ? "The corresponding mobile platform is not selected."
            : ["Reddit", "Trustpilot"].includes(source)
              ? "This connector cannot verify country attribution; global content is excluded from country sentiment."
              : "A verified country-specific connector is not configured for this source.",
          true,
        );
        return [];
      }
      const label = source === "App Store" ? "Apple App Store" : source;
      const items = await attempt(
        source,
        () => collectors.reviews(label, config),
        [],
      );
      const reviews = items.filter((review) => {
        const date = new Date(review.publishedAt);
        return (
          review.source === label &&
          typeof review.text === "string" &&
          review.text.trim() &&
          validRating(review.rating) &&
          review.publishedAt &&
          !Number.isNaN(date.getTime()) &&
          date >= cutoff &&
          date <= now
        );
      });
      record(
        source,
        reviews.length > 0,
        reviews.length
          ? `${reviews.length} dated reviews from this storefront; sentiment uses review stars (4–5 positive, 3 neutral, 1–2 negative). Storefront does not establish reviewer residence.`
          : "No verified, dated reviews returned within the selected time window.",
      );
      return reviews.map((review) => ({
        ...review,
        sentiment:
          review.rating >= 4
            ? "positive"
            : review.rating <= 2
              ? "negative"
              : "neutral",
      }));
    }),
  );
  const unique = new Map(
    batches
      .flat()
      .map((review) => [
        `${review.source}:${review.sourceId || `${review.author}:${review.text}`}`,
        review,
      ]),
  );
  const reviews = [...unique.values()].sort(
    (a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt),
  );
  const discovery = await discoveryRequest;
  const discovered = (discovery?.apps || []).filter(
    (item) => validRating(item.rating) && item.name !== config.brand,
  );
  // Discovery rates peers in one store; look each peer up in the other one too so both
  // the App Store and Google Play ratings are used wherever the peer exists in both.
  const peerApps =
    collectors.peerStoreRatings && discovered.length
      ? await attempt(
          "Peer store ratings",
          () => collectors.peerStoreRatings(discovered, config, primary),
          discovered,
        )
      : discovered;
  record(
    "Competitors",
    peerApps.length > 0,
    discovery?.basis ||
      "No verified business-matched store peers available for the selected platforms.",
  );
  const storeLabel = (item) => {
    const both = item.apple && item.google;
    if (both) return "Apple App Store + Google Play";
    return item.apple ? "Apple App Store" : "Google Play";
  };
  const competitor = (item) => {
    const hasStores = item.apple !== undefined || item.google !== undefined;
    const fallbackSource =
      primary === "google" ? "Google Play" : "Apple App Store";
    return {
      ...item,
      source: hasStores ? storeLabel(item) : fallbackSource,
      status: "live",
      updatedAt: new Date().toISOString(),
    };
  };
  // The selected brand is rated the same way as its peers: the average of every store it is in.
  const ownStores = {
    google: validRating(ratings.google.rating) ? ratings.google : null,
    apple: validRating(ratings.apple.rating) ? ratings.apple : null,
  };
  const ownFound = [ownStores.google, ownStores.apple].filter(Boolean);
  const selected =
    ownFound.length && peerApps.length
      ? [
          competitor({
            name: config.brand,
            ...ownStores,
            rating:
              ownFound.reduce((sum, store) => sum + store.rating, 0) /
              ownFound.length,
            reviewCount: ownFound.reduce(
              (sum, store) => sum + store.reviewCount,
              0,
            ),
          }),
        ]
      : [];
  const competitors = [...selected, ...peerApps.map(competitor)];
  const chart = Object.fromEntries(await chartRequest);
  // The target brand always gets a quote lookup, even when no peers were found.
  const quoteNames = [
    ...new Set([config.brand, ...competitors.map((item) => item.name)]),
  ];
  // Share prices and transfer fees are independent lookups; run them together.
  const [quotes, transferFees] = await Promise.all([
    attempt("Share prices", () => collectors.quotes(quoteNames), []),
    collectTransferFees(collectors, config.country, quoteNames),
  ]);
  // A competitor with no public listing legitimately has no share price. That is a finding, not a
  // collection failure, so it must not mark the whole model "limited" (which stops the preparation
  // popup from closing on its own). Only an unconfirmed quote for an apparently listed company counts.
  for (const quote of quotes) {
    const privateCompany = quote.status === "not-listed" || !quote.symbol;
    record(
      `Share price: ${quote.name}`,
      quote.status === "live" || privateCompany,
      quote.status === "live"
        ? "Public quote; may be delayed."
        : privateCompany
          ? "No public share price: this company has no verified stock listing. No price was estimated."
          : "A public listing exists but its quote could not be confirmed. No price was estimated.",
    );
  }
  const statistics = summarize(reviews, ratings, competitors, config.brand);
  const hasData =
    statistics.rating !== null || reviews.length > 0 || peerApps.length > 0;
  return {
    country: config.country,
    collectedAt: new Date().toISOString(),
    status: !hasData
      ? "unavailable"
      : availability.some(
            (item) =>
              item.status === "unavailable" && !byDesign.has(item.source),
          )
        ? "limited"
        : "ready",
    ratings,
    reviews,
    competitors,
    competitorBasis: `${discovery?.basis || "No verified peers."} Each rating is the equal average of the App Store and Google Play ratings found for that app in ${config.country}; an app listed in only one store uses that store alone.`,
    chart,
    quotes,
    transferFees,
    statistics,
    availability,
  };
}

// Identical requests (refresh, retry, second tab) reuse a recent result, and concurrent identical
// requests share one evaluation. Only complete ("ready") results are kept, so a limited or failed
// collection is always retried.
const MODEL_CACHE_TTL_MS = 5 * 60 * 1000;
const MODEL_CACHE_MAX = 100;

function registerModelRoute(app, collectors) {
  let activeRequests = 0;
  const results = new Map();
  const inFlight = new Map();
  const cached = (key) => {
    const hit = results.get(key);
    if (!hit) return null;
    if (Date.now() - hit.at >= MODEL_CACHE_TTL_MS) {
      results.delete(key);
      return null;
    }
    return hit.value;
  };
  app.post("/api/models/evaluate", async (request, response) => {
    let config;
    try {
      config = parseModelRequest(request.body);
    } catch (error) {
      response.status(400).json({ error: error.message });
      return;
    }
    const key = JSON.stringify(config);
    const hit = cached(key);
    if (hit) {
      response.json(hit);
      return;
    }
    if (inFlight.has(key)) {
      try {
        response.json(await inFlight.get(key));
      } catch {
        response
          .status(502)
          .json({ error: "Model evaluation failed. Retry model creation." });
      }
      return;
    }
    if (activeRequests >= 4) {
      response
        .status(429)
        .json({ error: "Model generation is busy. Please retry shortly." });
      return;
    }
    activeRequests += 1;
    const pending = evaluateMarket(config, collectors);
    inFlight.set(key, pending);
    pending.catch(() => {});
    try {
      const value = await pending;
      if (value.status === "ready") {
        if (results.size >= MODEL_CACHE_MAX)
          results.delete(results.keys().next().value);
        results.set(key, { at: Date.now(), value });
      }
      response.json(value);
    } catch (error) {
      collectors.log.error("Runtime model evaluation failed:", error.message);
      response
        .status(502)
        .json({ error: "Model evaluation failed. Retry model creation." });
    } finally {
      inFlight.delete(key);
      activeRequests -= 1;
    }
  });
}

module.exports = { evaluateMarket, parseModelRequest, registerModelRoute };
