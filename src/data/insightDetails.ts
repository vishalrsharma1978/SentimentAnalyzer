import type { CustomerSentiment, LiveCompetitor } from "./liveData";
import type { SentimentCategory } from "./sentimentCategories";
import {
  buildFeatureInsights,
  coverageScore,
  featureLevels,
  matchBrandKey,
} from "./featureMap";

/** One row of an expanded insight card. */
export type DetailRow = { label: string; value: string };
/** A short customer comment shown as evidence under a card. */
export type Quote = {
  source: string;
  rating: number;
  text: string;
  date: string | null;
};
/** The detail shown when an insight card is opened. */
export type InsightDetail = {
  /** What the number means and how it was calculated. */
  explanation: string;
  rows: DetailRow[];
  quotes: Quote[];
  /** A concrete next step; null when the data does not support one. */
  nextStep: string | null;
};

const MAX_QUOTES = 3;
const MAX_QUOTE_LENGTH = 220;

const percent = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;

const shorten = (text: string) => {
  const clean = text.replace(/\s+/g, " ").trim();
  return clean.length > MAX_QUOTE_LENGTH
    ? `${clean.slice(0, MAX_QUOTE_LENGTH - 1).trimEnd()}…`
    : clean;
};

const dateOf = (review: CustomerSentiment) => {
  if (!review.publishedAt) return null;
  const time = Date.parse(review.publishedAt);
  return Number.isFinite(time)
    ? new Date(time).toISOString().slice(0, 10)
    : null;
};

/**
 * Picks the most recent comments of one sentiment, longest first on ties, so the examples shown are
 * current and readable. Comments are never rewritten beyond trimming length.
 */
export function pickQuotes(
  reviews: CustomerSentiment[],
  sentiment: CustomerSentiment["sentiment"],
  limit = MAX_QUOTES,
): Quote[] {
  return reviews
    .filter((review) => review.sentiment === sentiment && review.text.trim())
    .sort((left, right) => {
      const byDate =
        (Date.parse(right.publishedAt ?? "") || 0) -
        (Date.parse(left.publishedAt ?? "") || 0);
      return byDate || right.text.length - left.text.length;
    })
    .slice(0, limit)
    .map((review) => ({
      source: review.source,
      rating: review.rating,
      text: shorten(review.text),
      date: dateOf(review),
    }));
}

function countBySource(reviews: CustomerSentiment[]) {
  const counts = new Map<string, number>();
  for (const review of reviews)
    counts.set(review.source, (counts.get(review.source) ?? 0) + 1);
  return [...counts.entries()].sort((left, right) => right[1] - left[1]);
}

const sourceRows = (reviews: CustomerSentiment[]): DetailRow[] =>
  countBySource(reviews).map(([source, count]) => ({
    label: source,
    value: `${count} (${percent(count, reviews.length)}%)`,
  }));

/** Detail for the "Negative feedback" / "Positive feedback" cards. */
export function sentimentDetail(
  reviews: CustomerSentiment[],
  sentiment: "positive" | "negative",
  categories: SentimentCategory[],
): InsightDetail {
  const matching = reviews.filter((review) => review.sentiment === sentiment);
  const word = sentiment === "negative" ? "negative" : "positive";
  const stars = sentiment === "negative" ? "1–2 star" : "4–5 star";
  const topCategories = categories
    .map((category) => ({
      label: category.label,
      count: category[sentiment],
    }))
    .filter((item) => item.count > 0)
    .sort((left, right) => right.count - left.count)
    .slice(0, 4);
  return {
    explanation: `${matching.length} of ${reviews.length} collected comments are ${word} (${percent(matching.length, reviews.length)}%). Sentiment comes from the review star rating (${stars}), not from reading the text.`,
    rows: [
      ...sourceRows(matching).map((row) => ({
        ...row,
        label: `${row.label} · ${word}`,
      })),
      ...topCategories.map((item) => ({
        label: `Theme · ${item.label}`,
        value: `${item.count} comment${item.count === 1 ? "" : "s"}`,
      })),
    ],
    quotes: pickQuotes(reviews, sentiment),
    nextStep:
      sentiment === "negative" && topCategories.length
        ? `Start with ${topCategories[0].label.toLowerCase()}: it has the most negative comments (${topCategories[0].count}).`
        : null,
  };
}

/** Detail for the "Highest-priority signal" card. */
export function prioritySignalDetail(
  category: SentimentCategory | undefined,
  totalNegative: number,
): InsightDetail {
  if (!category)
    return {
      explanation:
        "No negative comment matched an issue category in this sample.",
      rows: [],
      quotes: [],
      nextStep: null,
    };
  return {
    explanation: `${category.label} has the most negative comments: ${category.negative} of ${totalNegative} negative comments (${percent(category.negative, totalNegative)}%). A comment can belong to more than one category.`,
    rows: [
      { label: "Matching comments", value: String(category.reviews.length) },
      { label: "Negative", value: String(category.negative) },
      { label: "Neutral", value: String(category.neutral) },
      { label: "Positive", value: String(category.positive) },
    ],
    quotes: pickQuotes(category.reviews, "negative"),
    nextStep: `Read the matching comments for ${category.label.toLowerCase()} and confirm the cause before changing the product.`,
  };
}

/** Detail for the "App rating gap" card. */
export function ratingGapDetail(
  brand: string,
  brandRating: number | null | undefined,
  competitors: LiveCompetitor[],
): InsightDetail {
  const rated = competitors
    .filter(
      (item): item is LiveCompetitor & { rating: number } =>
        item.name !== brand && typeof item.rating === "number",
    )
    .sort((left, right) => right.rating - left.rating);
  if (typeof brandRating !== "number" || !rated.length)
    return {
      explanation:
        "The gap needs both a rating for this brand and at least one rated peer. At least one is missing from the live data.",
      rows: [],
      quotes: [],
      nextStep: null,
    };
  const leader = rated[0];
  const gap = Number((brandRating - leader.rating).toFixed(1));
  return {
    explanation: `${brand} is rated ${brandRating.toFixed(1)} / 5 and the highest-rated peer, ${leader.name}, is ${leader.rating.toFixed(1)} / 5, a gap of ${gap > 0 ? "+" : ""}${gap.toFixed(1)}. Each rating is the average of the store ratings found for that app.`,
    rows: [
      { label: brand, value: `${brandRating.toFixed(1)} / 5` },
      ...rated.slice(0, 5).map((item) => ({
        label: item.name,
        value: `${item.rating.toFixed(1)} / 5${item.reviewCount ? ` · ${item.reviewCount.toLocaleString("en-US")} ratings` : ""}`,
      })),
    ],
    quotes: [],
    nextStep:
      gap < 0
        ? `Closing the ${Math.abs(gap).toFixed(1)} point gap to ${leader.name} starts with the biggest negative theme in the improvement actions below.`
        : null,
  };
}

/** Detail for the Feature-coverage card: how the curated capability map compares. */
export function featureMapDetail(
  brand: string,
  competitors: LiveCompetitor[],
): InsightDetail {
  const brandLevels = featureLevels(brand);
  if (!brandLevels)
    return {
      explanation: `${brand} is not in the curated feature map yet, so no capability comparison is available. The full matrix is in the Competitors tab under Feature map.`,
      rows: [],
      quotes: [],
      nextStep: null,
    };
  const peers: { name: string; levels: NonNullable<typeof brandLevels> }[] = [];
  const seen = new Set([matchBrandKey(brand) as string]);
  for (const competitor of competitors) {
    const key = matchBrandKey(competitor.name);
    const levels = featureLevels(competitor.name);
    if (!key || !levels || seen.has(key)) continue;
    seen.add(key);
    peers.push({ name: key, levels });
    if (peers.length === 5) break;
  }
  const insights = buildFeatureInsights(
    brandLevels,
    peers.map((peer) => peer.levels),
  );
  const coverage = Math.round(coverageScore(brandLevels) * 100);
  const topGap = insights.gaps[0] ?? insights.partials[0] ?? null;
  return {
    explanation: peers.length
      ? `${brand} covers ${coverage}% of the curated capability set, compared feature by feature against ${peers.length} mapped competitor${peers.length === 1 ? "" : "s"}. Leads are features most mapped peers lack; gaps are features most of them fully offer. Data is curated from public product pages, not live feeds.`
      : `${brand} covers ${coverage}% of the curated capability set, but none of the current competitors are mapped yet, so no lead or gap comparison is possible.`,
    rows: [
      {
        label: `${brand} coverage`,
        value: `${coverage}% of the feature set`,
      },
      ...peers.map((peer) => ({
        label: `${peer.name} coverage`,
        value: `${Math.round(coverageScore(peer.levels) * 100)}% of the feature set`,
      })),
      ...(insights.leads.length
        ? [
            {
              label: "Your edge",
              value: insights.leads.map((feature) => feature.label).join(", "),
            },
          ]
        : []),
      ...(insights.gaps.length
        ? [
            {
              label: "Gaps to close",
              value: insights.gaps.map((feature) => feature.label).join(", "),
            },
          ]
        : []),
      ...(insights.partials.length
        ? [
            {
              label: "Partial today",
              value: insights.partials
                .map((feature) => feature.label)
                .join(", "),
            },
          ]
        : []),
    ],
    quotes: [],
    nextStep: topGap
      ? `Prioritise ${topGap.label.toLowerCase()} — most mapped competitors already offer it fully. See the Feature map in the Competitors tab for the full matrix.`
      : null,
  };
}

/** Detail for one Improvement-actions row. */
export function actionDetail(
  category: SentimentCategory,
  totalNegative: number,
): InsightDetail {
  const negatives = category.reviews.filter(
    (review) => review.sentiment === "negative",
  );
  return {
    explanation: `${category.negative} of ${totalNegative} negative comments (${percent(category.negative, totalNegative)}%) mention ${category.label.toLowerCase()}. These are signals to investigate, not confirmed defects.`,
    rows: [
      ...sourceRows(negatives).map((row) => ({
        ...row,
        label: `${row.label} · negative`,
      })),
      {
        label: "Positive mentions",
        value: `${category.positive} of ${category.reviews.length}`,
      },
    ],
    quotes: pickQuotes(category.reviews, "negative"),
    nextStep: null,
  };
}
