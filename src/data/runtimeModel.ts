import type {
  CompetitorSharePrice,
  CustomerSentiment,
  LiveCompetitor,
  PlatformRatings,
  StoreChartRanks,
  TransferFees,
} from "./liveData";
import type { ChannelScore, MarketRating } from "./marketAnalytics";

export type ModelConfiguration = {
  brand: string;
  appName: string;
  website: string;
  businessType: string;
  platforms: string[];
  sources: string[];
};
export type ModelAvailability = {
  source: string;
  status: "available" | "unavailable";
  reason: string;
};
export type RuntimeMarket = {
  country: string;
  collectedAt: string;
  status: "ready" | "limited" | "unavailable";
  ratings: MarketRating;
  reviews: CustomerSentiment[];
  competitors: LiveCompetitor[];
  competitorBasis: string;
  chart: StoreChartRanks;
  quotes: CompetitorSharePrice[];
  /** Live transfer fees for money-transfer competitors; null when the corridor is not covered. */
  transferFees: TransferFees | null;
  availability: ModelAvailability[];
};
export type RuntimeModel = {
  id: string;
  configuration: ModelConfiguration;
  markets: Record<string, RuntimeMarket>;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;
const score = (value: unknown) =>
  value === null ||
  (typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 1 &&
    value <= 5);
const count = (value: unknown) =>
  typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

export function parseRuntimeMarket(
  value: unknown,
  country: string,
): RuntimeMarket {
  const invalid = () => {
    throw new Error(
      "Model service returned invalid or mismatched country evidence.",
    );
  };
  if (
    !isRecord(value) ||
    value.country !== country ||
    typeof value.collectedAt !== "string" ||
    !Number.isFinite(Date.parse(value.collectedAt)) ||
    !["ready", "limited", "unavailable"].includes(String(value.status)) ||
    typeof value.competitorBasis !== "string"
  )
    return invalid();
  if (!isRecord(value.ratings)) return invalid();
  const parseStore = (store: unknown): PlatformRatings["apple"] => {
    if (!isRecord(store) || !score(store.rating) || !count(store.reviewCount))
      return invalid();
    return {
      rating: store.rating as number | null,
      reviewCount: store.reviewCount as number,
    };
  };
  const parseWeb = (web: unknown): ChannelScore => {
    if (web === undefined || web === null) {
      return {
        rating: null,
        sampleSize: 0,
        basis: "Website metrics are unavailable.",
        components: [],
      };
    }
    if (
      !isRecord(web) ||
      !score(web.rating) ||
      !count(web.sampleSize) ||
      typeof web.basis !== "string" ||
      !Array.isArray(web.components)
    )
      return invalid();
    const components = web.components.map((item) => {
      if (
        !isRecord(item) ||
        typeof item.label !== "string" ||
        typeof item.score !== "number" ||
        !Number.isFinite(item.score)
      )
        return invalid();
      return { label: item.label, score: item.score };
    });
    return {
      rating: web.rating as number | null,
      sampleSize: web.sampleSize as number,
      basis: web.basis,
      components,
    };
  };
  const ratings: MarketRating = {
    apple: parseStore(value.ratings.apple),
    google: parseStore(value.ratings.google),
    web: parseWeb(value.ratings.web),
  };
  if (
    !Array.isArray(value.reviews) ||
    !Array.isArray(value.competitors) ||
    !Array.isArray(value.quotes) ||
    !Array.isArray(value.availability) ||
    !isRecord(value.chart)
  )
    return invalid();
  const reviews = value.reviews.map((item): CustomerSentiment => {
    if (
      !isRecord(item) ||
      !["Google Play", "Apple App Store"].includes(String(item.source)) ||
      typeof item.author !== "string" ||
      typeof item.text !== "string" ||
      !item.text.trim() ||
      typeof item.rating !== "number" ||
      item.rating < 1 ||
      item.rating > 5 ||
      !Number.isFinite(item.rating) ||
      !["positive", "neutral", "negative"].includes(String(item.sentiment)) ||
      typeof item.publishedAt !== "string" ||
      !Number.isFinite(Date.parse(item.publishedAt))
    )
      return invalid();
    return {
      source: item.source as string,
      author: item.author,
      text: item.text,
      rating: item.rating,
      sentiment: item.sentiment as CustomerSentiment["sentiment"],
      publishedAt: item.publishedAt,
    };
  });
  const competitors = value.competitors.map((item): LiveCompetitor => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      !score(item.rating) ||
      !count(item.reviewCount) ||
      ![
        "Google Play",
        "Apple App Store",
        "Apple App Store + Google Play",
      ].includes(String(item.source)) ||
      item.status !== "live" ||
      typeof item.updatedAt !== "string"
    )
      return invalid();
    const store = (value: unknown) =>
      isRecord(value) &&
      typeof value.rating === "number" &&
      score(value.rating) &&
      count(value.reviewCount)
        ? { rating: value.rating, reviewCount: value.reviewCount as number }
        : null;
    return {
      name: item.name,
      rating: item.rating as number | null,
      reviewCount: item.reviewCount as number,
      source: item.source as LiveCompetitor["source"],
      status: "live",
      updatedAt: item.updatedAt,
      apple: store(item.apple),
      google: store(item.google),
    };
  });
  const chart = (item: unknown) => {
    if (
      !isRecord(item) ||
      !(item.rank === null || (count(item.rank) && Number(item.rank) > 0)) ||
      !count(item.chartSize) ||
      !(item.category === null || typeof item.category === "string")
    )
      return invalid();
    return {
      rank: item.rank as number | null,
      chartSize: item.chartSize as number,
      category: item.category as string | null,
    };
  };
  const quotes = value.quotes.map((item): CompetitorSharePrice => {
    if (
      !isRecord(item) ||
      typeof item.name !== "string" ||
      !["live", "not-listed", "unavailable"].includes(String(item.status)) ||
      !(
        item.price === null ||
        (typeof item.price === "number" && Number.isFinite(item.price))
      )
    )
      return invalid();
    for (const key of ["symbol", "currency", "quoteTime"]) {
      if (!(item[key] === null || typeof item[key] === "string"))
        return invalid();
    }
    return {
      name: item.name,
      symbol: item.symbol as string | null,
      price: item.price as number | null,
      currency: item.currency as string | null,
      quoteTime: item.quoteTime as string | null,
      status: item.status as CompetitorSharePrice["status"],
    };
  });
  const parseTransferFees = (raw: unknown): TransferFees | null => {
    if (raw === undefined || raw === null) return null;
    if (!isRecord(raw) || !isRecord(raw.corridor) || !isRecord(raw.fees))
      return invalid();
    const text = (item: Record<string, unknown>, key: string) =>
      typeof item[key] === "string" ? (item[key] as string) : invalid();
    const positive = (item: Record<string, unknown>, key: string) =>
      typeof item[key] === "number" &&
      Number.isFinite(item[key]) &&
      (item[key] as number) > 0
        ? (item[key] as number)
        : invalid();
    const fees: TransferFees["fees"] = {};
    for (const [name, entry] of Object.entries(raw.fees)) {
      if (!isRecord(entry)) return invalid();
      if (
        typeof entry.fee !== "number" ||
        !Number.isFinite(entry.fee) ||
        entry.fee < 0
      )
        return invalid();
      const total = entry.totalCostPercent;
      const mid = entry.midMarketRate;
      if (
        !(
          total === null ||
          (typeof total === "number" && Number.isFinite(total))
        )
      )
        return invalid();
      if (!(mid === null || (typeof mid === "number" && mid > 0)))
        return invalid();
      fees[name] = {
        provider: text(entry, "provider"),
        fee: entry.fee,
        feeCurrency: text(entry, "feeCurrency"),
        exchangeRate: positive(entry, "exchangeRate"),
        midMarketRate: mid,
        totalCostPercent: total,
        receivedAmount: positive(entry, "receivedAmount"),
        sendAmount: positive(entry, "sendAmount"),
        sendCurrency: text(entry, "sendCurrency"),
        receiveCurrency: text(entry, "receiveCurrency"),
        from: text(entry, "from"),
        to: text(entry, "to"),
        collectedAt:
          typeof entry.collectedAt === "string" ? entry.collectedAt : null,
        source: text(entry, "source"),
      };
    }
    return {
      corridor: {
        from: text(raw.corridor, "from"),
        fromCurrency: text(raw.corridor, "fromCurrency"),
        to: text(raw.corridor, "to"),
        toCurrency: text(raw.corridor, "toCurrency"),
      },
      fees,
    };
  };
  const transferFees = parseTransferFees(value.transferFees);
  const availability = value.availability.map((item): ModelAvailability => {
    if (
      !isRecord(item) ||
      typeof item.source !== "string" ||
      typeof item.reason !== "string" ||
      !["available", "unavailable"].includes(String(item.status))
    )
      return invalid();
    return {
      source: item.source,
      status: item.status as ModelAvailability["status"],
      reason: item.reason,
    };
  });
  return {
    country,
    collectedAt: value.collectedAt,
    status: value.status as RuntimeMarket["status"],
    ratings,
    reviews,
    competitors,
    competitorBasis: value.competitorBasis,
    quotes,
    transferFees,
    availability,
    chart: {
      apple: chart(value.chart.apple),
      google: chart(value.chart.google),
    },
  };
}
