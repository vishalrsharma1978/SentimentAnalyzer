import type {
  CompetitorSharePrice,
  CustomerSentiment,
  LiveCompetitor,
  TransferFees,
} from "./liveData";
import { aggregateRating, validRating } from "./marketAnalytics.ts";
import type { MarketRating } from "./marketAnalytics.ts";
import { categorizeSentimentReviews } from "./sentimentCategories.ts";

/**
 * Everything the analyst can talk about. It is a plain snapshot of what the model produced for
 * the selected market, so every answer is computed from evidence and nothing is estimated.
 */
export type AnalystContext = {
  brand: string;
  country: string;
  months: number;
  loading: boolean;
  ratings: MarketRating | null;
  reviews: CustomerSentiment[];
  competitors: LiveCompetitor[];
  quotes: CompetitorSharePrice[];
  transferFees: TransferFees | null;
  /** Average rating per market, for "which market is best/worst" questions. */
  marketScores: { code: string; name: string; score: number }[];
};

export type AnalystAnswer = { title: string; lines: string[] };

// Whole percentages read faster than "58.3%"; tiny shares keep one decimal so they never show as 0%.
const pct = (part: number, total: number) => {
  if (!total) return 0;
  const value = (part / total) * 100;
  return value > 0 && value < 1
    ? Math.round(value * 10) / 10
    : Math.round(value);
};
const fixed = (value: number, digits = 2) => value.toFixed(digits);
const plural = (count: number, word: string) =>
  `${count.toLocaleString("en-US")} ${word}${count === 1 ? "" : "s"}`;

export const STARTER_QUESTIONS = [
  "Give me an executive summary",
  "What are customers complaining about?",
  "How do we compare with competitors?",
  "Which store rates us better?",
  "What do the transfer fees look like?",
  "Which markets perform best and worst?",
];

function sentimentCounts(reviews: CustomerSentiment[]) {
  const positive = reviews.filter((r) => r.sentiment === "positive").length;
  const negative = reviews.filter((r) => r.sentiment === "negative").length;
  const neutral = reviews.length - positive - negative;
  return { positive, neutral, negative, total: reviews.length };
}

function bySource(reviews: CustomerSentiment[]) {
  const groups = new Map<string, CustomerSentiment[]>();
  for (const review of reviews) {
    groups.set(review.source, [...(groups.get(review.source) ?? []), review]);
  }
  return [...groups.entries()].map(([source, items]) => {
    const counts = sentimentCounts(items);
    const average =
      items.reduce((sum, item) => sum + item.rating, 0) / items.length;
    return { source, items, average, ...counts };
  });
}

function weeklyTrend(reviews: CustomerSentiment[]) {
  const dated = reviews
    .map((review) => ({ review, time: Date.parse(review.publishedAt ?? "") }))
    .filter((entry) => Number.isFinite(entry.time));
  if (dated.length < 20) return null;
  const times = dated.map((entry) => entry.time);
  const midpoint = (Math.min(...times) + Math.max(...times)) / 2;
  const share = (items: typeof dated) =>
    pct(
      items.filter((entry) => entry.review.sentiment === "negative").length,
      items.length,
    );
  const early = dated.filter((entry) => entry.time < midpoint);
  const late = dated.filter((entry) => entry.time >= midpoint);
  if (early.length < 10 || late.length < 10) return null;
  return { early: share(early), late: share(late) };
}

function unavailable(context: AnalystContext): AnalystAnswer | null {
  if (context.loading && !context.reviews.length)
    return {
      title: "Still collecting data",
      lines: [
        `The model is still collecting evidence for ${context.country}. Ask again in a moment.`,
      ],
    };
  return null;
}

// Crisp answers: line 0 is the verdict in one sentence, then at most three short evidence points.
// Titles are short labels; nothing is padded and nothing is estimated.
const verdict = (
  title: string,
  headline: string,
  ...points: (string | false | null)[]
): AnalystAnswer => ({
  title,
  lines: [
    headline,
    ...points.filter((point): point is string => Boolean(point)),
  ],
});

const clip = (text: string, max = 90) =>
  text.length > max ? `${text.slice(0, max - 1)}…` : text;

function summary(context: AnalystContext): AnalystAnswer {
  const { reviews, brand, country, months } = context;
  const counts = sentimentCounts(reviews);
  if (!counts.total)
    return verdict("Summary", `No reviews for ${brand} in ${country} yet.`);
  const positive = pct(counts.positive, counts.total);
  const negative = pct(counts.negative, counts.total);
  const net = Math.round((positive - negative) * 10) / 10;
  const mood =
    net >= 40
      ? "strongly positive"
      : net >= 10
        ? "mostly positive"
        : net > -10
          ? "mixed"
          : "negative";
  const rating = context.ratings ? aggregateRating(context.ratings) : null;
  const ranked = context.competitors
    .filter((item) => validRating(item.rating))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const position = ranked.findIndex((item) => item.name === brand);
  const topIssue = categorizeSentimentReviews(reviews)
    .filter((category) => category.id !== "other" && category.negative > 0)
    .sort((a, b) => b.negative - a.negative)[0];
  const trendResult = weeklyTrend(reviews);
  const delta = trendResult ? trendResult.late - trendResult.early : 0;
  return verdict(
    "Summary",
    `${brand} sentiment in ${country} is ${mood}: ${positive}% positive, ${negative}% negative across ${counts.total.toLocaleString("en-US")} reviews (${plural(months, "month")}).`,
    rating !== null &&
      `Rating: ${fixed(rating, 1)}/5${position >= 0 ? `, #${position + 1} of ${ranked.length} vs competitors` : ""}.`,
    topIssue &&
      `Top issue: ${topIssue.label} (${topIssue.negative} negative, ${pct(topIssue.negative, counts.negative || 1)}% of complaints).`,
    trendResult &&
      Math.abs(delta) >= 2 &&
      `Trend: complaints ${delta > 0 ? "rising" : "falling"} (${trendResult.early}% → ${trendResult.late}%).`,
  );
}

function complaints(context: AnalystContext): AnalystAnswer {
  const negatives = context.reviews.filter((r) => r.sentiment === "negative");
  if (!negatives.length)
    return verdict("Complaints", "No negative reviews in this window.");
  const categories = categorizeSentimentReviews(context.reviews)
    .filter((category) => category.negative > 0)
    .sort((a, b) => b.negative - a.negative)
    .slice(0, 3);
  const top = categories[0];
  return verdict(
    "Complaints",
    `${pct(negatives.length, context.reviews.length)}% of reviews are negative (${negatives.length.toLocaleString("en-US")}); ${top.label} leads with ${top.negative}.`,
    ...categories.map((category, index) => {
      const sample = category.reviews.find((r) => r.sentiment === "negative");
      return `${index + 1}. ${category.label} — ${category.negative}${sample ? `, e.g. “${clip(sample.text)}”` : ""}`;
    }),
  );
}

function praise(context: AnalystContext): AnalystAnswer {
  const positives = context.reviews.filter((r) => r.sentiment === "positive");
  if (!positives.length)
    return verdict("Strengths", "No positive reviews in this window.");
  const categories = categorizeSentimentReviews(context.reviews)
    .filter((category) => category.id !== "other" && category.positive > 0)
    .sort((a, b) => b.positive - a.positive)
    .slice(0, 3);
  return verdict(
    "Strengths",
    `${pct(positives.length, context.reviews.length)}% of reviews are positive (${positives.length.toLocaleString("en-US")}).`,
    ...categories.map(
      (category, index) =>
        `${index + 1}. ${category.label} — ${category.positive} positive`,
    ),
  );
}

function stores(context: AnalystContext): AnalystAnswer {
  const ratings = context.ratings;
  const apple =
    ratings && validRating(ratings.apple.rating) ? ratings.apple : null;
  const google =
    ratings && validRating(ratings.google.rating) ? ratings.google : null;
  const groups = bySource(context.reviews);
  const sentimentPoints = groups.map(
    (group) =>
      `${group.source}: ${pct(group.positive, group.total)}% positive, ${pct(group.negative, group.total)}% negative (${group.total.toLocaleString("en-US")} reviews)`,
  );
  if (!apple && !google && !groups.length)
    return verdict("Stores", "No store data yet.");
  if (apple && google) {
    const gap = (apple.rating ?? 0) - (google.rating ?? 0);
    return verdict(
      "Stores",
      Math.abs(gap) < 0.05
        ? `Both stores rate the app about the same (${fixed(apple.rating ?? 0, 1)}).`
        : `${gap > 0 ? "Apple App Store" : "Google Play"} rates the app higher: ${fixed(Math.max(apple.rating ?? 0, google.rating ?? 0), 1)} vs ${fixed(Math.min(apple.rating ?? 0, google.rating ?? 0), 1)}.`,
      ...sentimentPoints,
    );
  }
  const only = apple ?? google;
  return verdict(
    "Stores",
    only
      ? `Only ${apple ? "Apple App Store" : "Google Play"} has a rating: ${fixed(only.rating ?? 0, 1)}.`
      : "No store listing rating yet.",
    ...sentimentPoints,
  );
}

function competitors(context: AnalystContext): AnalystAnswer {
  const rated = context.competitors
    .filter((item) => validRating(item.rating))
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  if (!rated.length)
    return verdict(
      "Competitors",
      "No rated competitors found for this market.",
    );
  const own = rated.find((item) => item.name === context.brand);
  const leader = rated[0];
  const board = rated
    .slice(0, 4)
    .map((item) => `${item.name} ${fixed(item.rating ?? 0, 1)}`)
    .join(" · ");
  if (!own)
    return verdict(
      "Competitors",
      `${context.brand} has no store rating in this peer set; ${leader.name} leads at ${fixed(leader.rating ?? 0, 1)}.`,
      `Top: ${board}`,
    );
  if (leader.name === own.name)
    return verdict(
      "Competitors",
      `${context.brand} leads ${rated.length} rated apps at ${fixed(own.rating ?? 0, 1)}.`,
      `Top: ${board}`,
    );
  const behind = rated.indexOf(own);
  return verdict(
    "Competitors",
    `${context.brand} ranks #${behind + 1} of ${rated.length} (${fixed(own.rating ?? 0, 1)}), ${fixed((leader.rating ?? 0) - (own.rating ?? 0), 1)} behind ${leader.name}.`,
    `Top: ${board}`,
    `Ahead of ${rated.length - 1 - behind} of ${rated.length - 1} competitors.`,
  );
}

function fees(context: AnalystContext): AnalystAnswer {
  const quotes = context.transferFees
    ? Object.values(context.transferFees.fees)
    : [];
  if (!quotes.length)
    return verdict(
      "Fees",
      "No live fee quotes for this market's corridor, so I won't estimate any.",
    );
  const corridor = context.transferFees?.corridor;
  const sorted = [...quotes].sort(
    (a, b) =>
      (a.totalCostPercent ?? Number.POSITIVE_INFINITY) -
      (b.totalCostPercent ?? Number.POSITIVE_INFINITY),
  );
  const cheapest = sorted[0];
  const own = sorted.findIndex((quote) => quote.provider === context.brand);
  const cost = (quote: (typeof sorted)[number]) =>
    quote.totalCostPercent === null
      ? "n/a"
      : `${fixed(quote.totalCostPercent, 1)}%`;
  const headline =
    own === 0
      ? `${context.brand} is the cheapest of ${sorted.length} providers at ${cost(cheapest)} total cost.`
      : own > 0 &&
          sorted[own].totalCostPercent !== null &&
          cheapest.totalCostPercent !== null
        ? `${context.brand} ranks #${own + 1} of ${sorted.length} on cost (${cost(sorted[own])}), ${fixed(sorted[own].totalCostPercent! - cheapest.totalCostPercent, 1)} pts above ${cheapest.provider}.`
        : `${cheapest.provider} is cheapest at ${cost(cheapest)} total cost.`;
  return verdict(
    "Fees",
    headline,
    `Per ${cheapest.sendAmount} ${cheapest.sendCurrency} (${corridor?.from}→${corridor?.to}); total cost = fee + exchange-rate margin.`,
    ...sorted
      .slice(0, 4)
      .map(
        (quote, index) =>
          `${index + 1}. ${quote.provider} — ${cost(quote)} (fee ${quote.fee} ${quote.feeCurrency})`,
      ),
  );
}

function markets(context: AnalystContext): AnalystAnswer {
  const scores = [...context.marketScores].sort((a, b) => b.score - a.score);
  if (!scores.length) return verdict("Markets", "No market ratings yet.");
  const best = scores[0];
  const worst = scores[scores.length - 1];
  const line = (market: (typeof scores)[number]) =>
    `${market.name} ${fixed(market.score, 1)}`;
  if (scores.length === 1)
    return verdict("Markets", `Only ${line(best)} is rated so far.`);
  return verdict(
    "Markets",
    `Best: ${line(best)}; weakest: ${line(worst)} (${fixed(best.score - worst.score, 1)}-star spread across ${scores.length} markets).`,
    // Top and bottom never share a market: the list is split at the middle first.
    scores.length > 2 &&
      `Top: ${scores
        .slice(0, Math.min(3, Math.ceil(scores.length / 2)))
        .map(line)
        .join(" · ")}`,
    scores.length > 3 &&
      `Bottom: ${scores
        .slice(Math.ceil(scores.length / 2))
        .slice(-3)
        .reverse()
        .map(line)
        .join(" · ")}`,
  );
}

function trend(context: AnalystContext): AnalystAnswer {
  const result = weeklyTrend(context.reviews);
  if (!result)
    return verdict(
      "Trend",
      "Not enough dated reviews to compare the two halves reliably.",
    );
  const delta = result.late - result.early;
  return verdict(
    "Trend",
    Math.abs(delta) < 2
      ? `Sentiment is flat: ${result.late}% negative now vs ${result.early}% earlier.`
      : delta > 0
        ? `Sentiment is worsening: negative share rose from ${result.early}% to ${result.late}%.`
        : `Sentiment is improving: negative share fell from ${result.early}% to ${result.late}%.`,
    "Compares the first and second half of the selected window.",
  );
}

function shares(context: AnalystContext): AnalystAnswer {
  const live = context.quotes.filter(
    (quote) => quote.status === "live" && quote.price !== null,
  );
  if (!live.length)
    return verdict(
      "Share prices",
      "No live share-price quotes for this peer set.",
    );
  return verdict(
    "Share prices",
    `${live.length} live quote${live.length === 1 ? "" : "s"} (may be delayed).`,
    ...live
      .slice(0, 4)
      .map((quote) =>
        `${quote.name} (${quote.symbol ?? "n/a"}) — ${quote.price} ${quote.currency ?? ""}`.trim(),
      ),
  );
}

function find(context: AnalystContext, question: string): AnalystAnswer {
  const words = question
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word) => word.length > 3);
  const matches = context.reviews.filter((review) =>
    words.some((word) => review.text.toLowerCase().includes(word)),
  );
  if (!words.length || !matches.length)
    return verdict(
      "Not sure",
      "I can't answer that from the model's data.",
      "Try: summary, complaints, competitors, stores, fees, markets or trend.",
    );
  const counts = sentimentCounts(matches);
  return verdict(
    "Review search",
    `${matches.length.toLocaleString("en-US")} reviews mention it (${pct(matches.length, context.reviews.length)}%): ${pct(counts.negative, counts.total)}% negative, ${pct(counts.positive, counts.total)}% positive.`,
    ...[...new Map(matches.map((review) => [review.text, review])).values()]
      .slice(0, 2)
      .map(
        (review) =>
          `“${clip(review.text, 100)}” — ${review.source}, ${review.rating}★`,
      ),
  );
}

type Intent = {
  test: RegExp;
  answer: (context: AnalystContext) => AnalystAnswer;
};

// The first matching intent wins, so the most specific topics come first and every pattern is
// anchored on word starts: a bare "like" would otherwise match "what do the fees look like".
const INTENTS: Intent[] = [
  {
    test: /\b(fees?|pricing|cost|costs|cheap|cheapest|exchange rate|corridor)/,
    answer: fees,
  },
  { test: /\b(share price|stock|ticker|equity)/, answer: shares },
  // Competitor words beat the generic word "market" ("who is the market leader"), and
  // "markets" beats the complaint words so "which markets are worst" is not read as bad reviews.
  {
    test: /\b(compet|rival|peers?|rank|versus|vs|compare|leader)/,
    answer: competitors,
  },
  { test: /\b(markets?|countr|region)/, answer: markets },
  {
    test: /\b(summar|overview|executive|brief|tl;?dr|how are we|status)/,
    answer: summary,
  },
  {
    test: /\b(complain|issues?|problems?|pain|negative|unhappy|worst|why)/,
    answer: complaints,
  },
  {
    test: /\b(praise|love|loved|positive|strengths?|likes?d?\b(?! like)|good)/,
    answer: praise,
  },
  {
    test: /\b(trend|improv|deteriorat|over time|getting|changed?)/,
    answer: trend,
  },
  { test: /\b(stores?|apple|ios|google|android|play)\b/, answer: stores },
  { test: /\b(best|weak)/, answer: markets },
];

export function answerQuestion(
  context: AnalystContext,
  question: string,
): AnalystAnswer {
  const wait = unavailable(context);
  if (wait) return wait;
  const text = question.toLowerCase();
  const intent = INTENTS.find((entry) => entry.test.test(text));
  return intent ? intent.answer(context) : find(context, question);
}
