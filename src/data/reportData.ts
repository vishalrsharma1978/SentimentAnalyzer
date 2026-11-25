import type {
  CompetitorSharePrice,
  CustomerSentiment,
  LiveCompetitor,
  TransferFees,
} from "./liveData";
import type { MarketRatings } from "./marketAnalytics";
import type { SentimentCategory } from "./sentimentCategories";
import {
  FEATURES,
  buildFeatureInsights,
  coverageScore,
  featureLevels,
  matchBrandKey,
} from "./featureMap.ts";
import type { FeatureLevel } from "./featureMap.ts";

// The report builder keeps its rating helpers local and takes the theme categoriser as an argument;
// its only runtime import is the pure curated feature map, so it loads unchanged in plain Node tests.
const validRating = (value: number | null | undefined): value is number =>
  typeof value === "number" &&
  Number.isFinite(value) &&
  value >= 1 &&
  value <= 5;
/** Mean of the Apple and Google store ratings that exist, the same basis as the dashboard. */
const aggregateRating = (data: MarketRatings[string]): number | null => {
  const ratings = [data?.apple.rating, data?.google.rating].filter(validRating);
  return ratings.length
    ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
    : null;
};
export type Categorizer = (reviews: CustomerSentiment[]) => SentimentCategory[];

/** The three report types a user can generate. */
export type ReportKind = "executive" | "competitive" | "customer";

export const reportKinds: {
  id: ReportKind;
  title: string;
  summary: string;
  audience: string;
}[] = [
  {
    id: "executive",
    title: "Executive brief",
    summary:
      "Headline KPIs, how the brand compares, the strongest and weakest markets and what to do first.",
    audience: "Leadership · 1 page",
  },
  {
    id: "competitive",
    title: "Competitive review",
    summary:
      "Ranking against peers, store ratings, share prices and live transfer fees side by side.",
    audience: "Strategy · peer comparison",
  },
  {
    id: "customer",
    title: "Customer voice",
    summary:
      "Sentiment split, monthly trend, issue themes and the comments behind them.",
    audience: "Product and support · evidence",
  },
];

export type Callout = {
  tone: "good" | "watch" | "risk";
  headline: string;
  detail: string;
};
export type Kpi = {
  label: string;
  value: string;
  /** A comparison to a benchmark, for example "+0.3 vs peer average". */
  delta: string | null;
  tone: "good" | "watch" | "risk" | "neutral";
};
export type BarDatum = {
  label: string;
  value: number;
  display: string;
  /** Highlights the brand or selected market. */
  highlight?: boolean;
  tone?: "good" | "watch" | "risk";
};
export type MonthPoint = {
  label: string;
  positive: number;
  neutral: number;
  negative: number;
  total: number;
  net: number | null;
};
export type TableRow = { cells: string[]; highlight?: boolean };

export type ReportInput = {
  /** Groups reviews into issue themes; pass `categorizeSentimentReviews`. */
  categorize: Categorizer;
  kind: ReportKind;
  brand: string;
  countryName: string;
  countryCode: string;
  months: number;
  brandRating: number | null;
  competitors: LiveCompetitor[];
  reviews: CustomerSentiment[];
  quotes: CompetitorSharePrice[];
  transferFees: TransferFees | null;
  markets: { code: string; name: string }[];
  marketRatings: MarketRatings;
  now?: Date;
};

export type Report = {
  kind: ReportKind;
  title: string;
  subtitle: string;
  generatedAt: string;
  kpis: Kpi[];
  callouts: Callout[];
  /** Sections are present only when their data exists. */
  ratingBars: BarDatum[] | null;
  marketBars: BarDatum[] | null;
  sentiment: {
    positive: number;
    neutral: number;
    negative: number;
    total: number;
  } | null;
  trend: MonthPoint[] | null;
  themeBars: BarDatum[] | null;
  feeBars: BarDatum[] | null;
  tables: { title: string; headers: string[]; rows: TableRow[] }[];
  quotes: {
    source: string;
    rating: number;
    text: string;
    date: string | null;
  }[];
  /** What the report could not include, stated rather than estimated. */
  gaps: string[];
};

const pct = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
/** Signed number with a "+" for gains; a difference that rounds to zero is shown as "0.0", never "-0.0". */
const signed = (value: number, digits = 1) => {
  const text = value.toFixed(digits);
  if (Number(text) === 0) return (0).toFixed(digits);
  return `${value > 0 ? "+" : ""}${text}`;
};
/** Store titles carry marketing text ("Remitly: Money transfer app"); keep the brand part for display. */
const shortName = (name: string) => {
  const head = name.split(/\s[:\-–—|]\s|:\s/)[0].trim();
  return head.length >= 2 ? head : name;
};
const average = (values: number[]) =>
  values.length
    ? values.reduce((sum, value) => sum + value, 0) / values.length
    : null;

/** Counts reviews per calendar month within the window, oldest first. */
export function monthlyTrend(
  reviews: CustomerSentiment[],
  months: number,
  now: Date,
): MonthPoint[] {
  const span = Math.min(Math.max(months, 1), 6);
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - span);
  const first = new Date(cutoff.getFullYear(), cutoff.getMonth(), 1);
  const slots =
    (now.getFullYear() - first.getFullYear()) * 12 +
    now.getMonth() -
    first.getMonth() +
    1;
  return Array.from({ length: slots }, (_, index) => {
    const start = new Date(first.getFullYear(), first.getMonth() + index, 1);
    const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    const inMonth = reviews.filter((review) => {
      const time = Date.parse(review.publishedAt ?? "");
      return (
        Number.isFinite(time) &&
        time >= Math.max(start.getTime(), cutoff.getTime()) &&
        time < end.getTime() &&
        time <= now.getTime()
      );
    });
    const count = (sentiment: CustomerSentiment["sentiment"]) =>
      inMonth.filter((review) => review.sentiment === sentiment).length;
    const positive = count("positive");
    const negative = count("negative");
    const total = inMonth.length;
    return {
      label: start.toLocaleDateString("en-US", { month: "short" }),
      positive,
      neutral: count("neutral"),
      negative,
      total,
      net: total ? Math.round(((positive - negative) / total) * 100) : null,
    };
  });
}

function ratedPeers(competitors: LiveCompetitor[], brand: string) {
  return competitors
    .filter(
      (item): item is LiveCompetitor & { rating: number } =>
        item.name !== brand &&
        item.status === "live" &&
        validRating(item.rating),
    )
    .sort(
      (left, right) =>
        right.rating - left.rating ||
        (right.reviewCount ?? 0) - (left.reviewCount ?? 0),
    );
}

/** Market ladder for every market with a store rating, best first. */
export function marketLadderRows(
  markets: { code: string; name: string }[],
  ratings: MarketRatings,
) {
  return markets
    .flatMap((market) => {
      const score = aggregateRating(ratings[market.code]);
      return score === null ? [] : [{ ...market, score }];
    })
    .sort(
      (left, right) =>
        right.score - left.score || left.name.localeCompare(right.name),
    );
}

const toneForGap = (gap: number): Kpi["tone"] =>
  gap >= 0 ? "good" : gap > -0.5 ? "watch" : "risk";

export function buildReport(input: ReportInput): Report {
  const now = input.now ?? new Date();
  const {
    categorize,
    brand,
    countryName,
    reviews,
    competitors,
    brandRating,
    kind,
    months,
  } = input;
  const gaps: string[] = [];
  const kpis: Kpi[] = [];
  const callouts: Callout[] = [];

  // Sentiment
  const count = (sentiment: CustomerSentiment["sentiment"]) =>
    reviews.filter((review) => review.sentiment === sentiment).length;
  const positive = count("positive");
  const neutral = count("neutral");
  const negative = count("negative");
  const total = reviews.length;
  const net = total ? Math.round(((positive - negative) / total) * 100) : null;
  const sentiment = total ? { positive, neutral, negative, total } : null;
  if (!total) gaps.push("No customer comments were returned for this period.");

  // Peers and rank
  const peers = ratedPeers(competitors, brand);
  const peerAverage = average(peers.map((peer) => peer.rating));
  const ranked = [
    ...(validRating(brandRating)
      ? [
          {
            name: brand,
            rating: brandRating,
            reviewCount: null as number | null,
          },
        ]
      : []),
    ...peers,
  ].sort((left, right) => right.rating - left.rating);
  const position = ranked.findIndex((item) => item.name === brand) + 1;
  const leader = peers[0] ?? null;
  const gapToLeader =
    validRating(brandRating) && leader
      ? Number((brandRating - leader.rating).toFixed(1))
      : null;
  const gapToAverage =
    validRating(brandRating) && peerAverage !== null
      ? Number((brandRating - peerAverage).toFixed(2))
      : null;
  if (!validRating(brandRating))
    gaps.push("No verified store rating was available for the brand.");
  if (!peers.length) gaps.push("No rated peers were found to compare against.");

  // Markets
  const ladder = marketLadderRows(input.markets, input.marketRatings);
  const marketAverage = average(ladder.map((market) => market.score));
  const best = ladder[0] ?? null;
  const worst = ladder.length > 1 ? ladder[ladder.length - 1] : null;
  if (ladder.length < 2)
    gaps.push(
      "Fewer than two markets have a store rating, so no market comparison is shown.",
    );

  // Themes
  const categories = categorize(reviews);
  const issues = categories
    .filter((category) => category.negative > 0)
    .sort((left, right) => right.negative - left.negative);
  const topIssue = issues[0] ?? null;

  // Feature map (curated capabilities, not live data)
  const brandFeatureLevels = featureLevels(brand);
  const mappedPeers: {
    name: string;
    levels: Record<string, FeatureLevel>;
  }[] = [];
  const seenFeatureKeys = new Set(
    brandFeatureLevels ? [matchBrandKey(brand) as string] : [],
  );
  for (const competitor of competitors) {
    if (competitor.name === brand) continue;
    const key = matchBrandKey(competitor.name);
    const levels = featureLevels(competitor.name);
    if (!key || !levels || seenFeatureKeys.has(key)) continue;
    seenFeatureKeys.add(key);
    mappedPeers.push({ name: key, levels });
    if (mappedPeers.length === 5) break;
  }
  const featureInsights =
    brandFeatureLevels && mappedPeers.length
      ? buildFeatureInsights(
          brandFeatureLevels,
          mappedPeers.map((peer) => peer.levels),
        )
      : null;

  // KPIs
  if (validRating(brandRating))
    kpis.push({
      label: "Store rating",
      value: `${brandRating.toFixed(1)} / 5`,
      delta:
        gapToAverage !== null
          ? `${signed(gapToAverage, 2)} vs peer average`
          : null,
      tone: gapToAverage === null ? "neutral" : toneForGap(gapToAverage),
    });
  if (position > 0 && ranked.length > 1)
    kpis.push({
      label: "Peer rank",
      value: `#${position} of ${ranked.length}`,
      delta:
        gapToLeader === null
          ? null
          : position === 1
            ? "Category leader"
            : `${signed(gapToLeader)} vs ${leader ? shortName(leader.name) : "leader"}`,
      tone:
        position === 1
          ? "good"
          : gapToLeader !== null
            ? toneForGap(gapToLeader)
            : "neutral",
    });
  if (net !== null)
    kpis.push({
      label: "Net sentiment",
      value: `${signed(net, 0)} pp`,
      delta: `${pct(positive, total)}% positive · ${pct(negative, total)}% negative`,
      tone: net >= 20 ? "good" : net >= 0 ? "watch" : "risk",
    });
  if (total)
    kpis.push({
      label: "Comments analysed",
      value: total.toLocaleString("en-US"),
      delta: `last ${months} ${months === 1 ? "month" : "months"}`,
      tone: "neutral",
    });
  if (marketAverage !== null && ladder.length > 1)
    kpis.push({
      label: "Markets rated",
      value: String(ladder.length),
      delta: `average ${marketAverage.toFixed(1)} / 5`,
      tone: "neutral",
    });
  if (kind !== "customer") {
    if (brandFeatureLevels && mappedPeers.length) {
      const brandCoverage = coverageScore(brandFeatureLevels);
      const peerCoverage = average(
        mappedPeers.map((peer) => coverageScore(peer.levels)),
      );
      const coverageGap =
        peerCoverage === null ? null : brandCoverage - peerCoverage;
      kpis.push({
        label: "Feature coverage",
        value: `${Math.round(brandCoverage * 100)}%`,
        delta:
          peerCoverage === null
            ? `${FEATURES.length}-feature capability set`
            : `peer average ${Math.round(peerCoverage * 100)}%`,
        tone:
          coverageGap === null
            ? "neutral"
            : coverageGap >= 0
              ? "good"
              : coverageGap >= -0.1
                ? "watch"
                : "risk",
      });
    } else if (!brandFeatureLevels) {
      gaps.push(
        `${brand} is not in the curated feature map, so no capability comparison is included.`,
      );
    } else {
      gaps.push(
        "None of the rated competitors are in the curated feature map, so no capability comparison is included.",
      );
    }
  }

  // Callouts
  if (position > 0 && ranked.length > 1) {
    callouts.push(
      position === 1
        ? {
            tone: "good",
            headline: `${brand} leads ${countryName}`,
            detail: `Rated ${brandRating?.toFixed(1)} / 5, ${gapToLeader !== null && leader ? `${Math.abs(gapToLeader).toFixed(1)} ahead of ${shortName(leader.name)}` : "ahead of every rated peer"}.`,
          }
        : {
            tone:
              gapToLeader !== null && gapToLeader <= -0.5 ? "risk" : "watch",
            headline: `#${position} of ${ranked.length} in ${countryName}`,
            detail: `${Math.abs(gapToLeader ?? 0).toFixed(1)} points behind ${leader ? shortName(leader.name) : "the leader"} (${leader?.rating.toFixed(1)} / 5).`,
          },
    );
  }
  if (net !== null)
    callouts.push({
      tone: net >= 20 ? "good" : net >= 0 ? "watch" : "risk",
      headline: `${pct(positive, total)}% positive, ${pct(negative, total)}% negative`,
      detail: `Net ${signed(net, 0)} pp across ${total.toLocaleString("en-US")} comments.`,
    });
  if (topIssue)
    callouts.push({
      tone: "risk",
      headline: `Fix first: ${topIssue.label}`,
      detail: `${topIssue.negative} negative comments, ${pct(topIssue.negative, negative)}% of all negative feedback.`,
    });
  if (best && worst)
    callouts.push({
      tone: "watch",
      headline: `${best.name} ${best.score.toFixed(1)} vs ${worst.name} ${worst.score.toFixed(1)}`,
      detail: `A ${(best.score - worst.score).toFixed(1)} point spread across ${ladder.length} rated markets.`,
    });

  // Charts
  const ratingBars: BarDatum[] | null =
    ranked.length > 1
      ? ranked.map((item) => ({
          label: shortName(item.name),
          value: item.rating,
          display: item.rating.toFixed(1),
          highlight: item.name === brand,
        }))
      : null;
  const marketBars: BarDatum[] | null =
    ladder.length > 1
      ? ladder.map((market) => ({
          label: market.name,
          value: market.score,
          display: market.score.toFixed(1),
          highlight: market.code === input.countryCode,
          tone:
            market.score >= 4 ? "good" : market.score >= 3 ? "watch" : "risk",
        }))
      : null;
  const trend = total ? monthlyTrend(reviews, months, now) : null;
  const themeBars: BarDatum[] | null = issues.length
    ? issues.slice(0, 6).map((category) => ({
        label: category.label,
        value: category.negative,
        display: `${category.negative} (${pct(category.negative, negative)}%)`,
        tone: "risk",
      }))
    : null;

  // Fees
  const feeEntries = Object.entries(input.transferFees?.fees ?? {})
    .filter(
      (
        entry,
      ): entry is [string, (typeof entry)[1] & { totalCostPercent: number }] =>
        typeof entry[1].totalCostPercent === "number",
    )
    .sort(
      (left, right) => left[1].totalCostPercent - right[1].totalCostPercent,
    );
  const feeAverage = average(feeEntries.map(([, fee]) => fee.totalCostPercent));
  const feeBars: BarDatum[] | null =
    feeEntries.length > 1
      ? feeEntries.map(([name, fee]) => ({
          label: name,
          value: fee.totalCostPercent,
          display: `${fee.totalCostPercent.toFixed(1)}%`,
          highlight: name === brand,
          tone:
            feeAverage === null
              ? undefined
              : fee.totalCostPercent <= feeAverage
                ? "good"
                : "risk",
        }))
      : null;
  if (kind !== "customer" && input.transferFees && !feeBars)
    gaps.push(
      "Fewer than two live transfer-fee quotes were available for this market.",
    );
  if (feeBars && feeAverage !== null) {
    const cheapest = feeEntries[0];
    const dearest = feeEntries[feeEntries.length - 1];
    callouts.push({
      tone: "watch",
      headline: `Total transfer cost ${cheapest[1].totalCostPercent.toFixed(1)}% to ${dearest[1].totalCostPercent.toFixed(1)}%`,
      detail: `${shortName(cheapest[0])} is cheapest, ${shortName(dearest[0])} the most expensive; live average ${feeAverage.toFixed(1)}% on ${input.transferFees?.corridor.from}→${input.transferFees?.corridor.to}.`,
    });
  }

  // Feature callouts: one edge, one gap, so the brief states both sides.
  if (kind !== "customer" && featureInsights) {
    if (featureInsights.leads.length)
      callouts.push({
        tone: "good",
        headline: `Feature edge: ${featureInsights.leads[0].label}`,
        detail: `${brand} fully offers ${featureInsights.leads.map((feature) => feature.label.toLowerCase()).join(", ")} — most mapped competitors do not.`,
      });
    if (featureInsights.gaps.length)
      callouts.push({
        tone: "risk",
        headline: `Feature gap: ${featureInsights.gaps[0].label}`,
        detail: `Most mapped competitors fully offer ${featureInsights.gaps.map((feature) => feature.label.toLowerCase()).join(", ")}; ${brand} does not yet.`,
      });
  }

  // Tables
  const tables: Report["tables"] = [];
  if (kind !== "customer" && ranked.length > 1)
    tables.push({
      title: "Peer comparison",
      headers: ["#", "Brand", "Rating", "vs " + brand, "Ratings"],
      rows: ranked.map((item, index) => ({
        highlight: item.name === brand,
        cells: [
          String(index + 1),
          shortName(item.name),
          item.rating.toFixed(1),
          item.name === brand || !validRating(brandRating)
            ? "—"
            : signed(item.rating - brandRating),
          item.reviewCount ? item.reviewCount.toLocaleString("en-US") : "—",
        ],
      })),
    });
  const livePrices = input.quotes.filter(
    (quote) => quote.status === "live" && quote.price !== null,
  );
  if (kind === "competitive") {
    if (livePrices.length)
      tables.push({
        title: "Share prices",
        headers: ["Company", "Symbol", "Price", "Quote time"],
        rows: livePrices.map((quote) => ({
          highlight: quote.name === brand,
          cells: [
            shortName(quote.name),
            quote.symbol ?? "—",
            `${quote.price?.toFixed(2)} ${quote.currency ?? ""}`.trim(),
            quote.quoteTime
              ? quote.quoteTime.slice(0, 16).replace("T", " ")
              : "—",
          ],
        })),
      });
    else gaps.push("No live share prices were available.");
    if (feeEntries.length)
      tables.push({
        title: `Transfer fees · ${input.transferFees?.corridor.from}→${input.transferFees?.corridor.to}, ${feeEntries[0][1].sendAmount} ${feeEntries[0][1].sendCurrency}`,
        headers: ["Provider", "Fee", "Rate", "Recipient gets", "Total cost"],
        rows: feeEntries.map(([name, fee]) => ({
          highlight: name === brand,
          cells: [
            name,
            `${fee.fee.toFixed(2)} ${fee.feeCurrency}`,
            fee.exchangeRate.toFixed(4),
            `${fee.receivedAmount.toLocaleString("en-US")} ${fee.receiveCurrency}`,
            `${fee.totalCostPercent.toFixed(1)}%`,
          ],
        })),
      });
    if (brandFeatureLevels && mappedPeers.length) {
      const mark = (level: FeatureLevel | undefined) =>
        level === 2 ? "Yes" : level === 1 ? "Partial" : "No";
      tables.push({
        title: "Feature map · curated capabilities",
        headers: [
          "Feature",
          shortName(matchBrandKey(brand) ?? brand),
          ...mappedPeers.map((peer) => shortName(peer.name)),
        ],
        rows: FEATURES.map((feature) => ({
          highlight:
            featureInsights?.gaps.some((gap) => gap.id === feature.id) ??
            false,
          cells: [
            feature.label,
            mark(brandFeatureLevels[feature.id]),
            ...mappedPeers.map((peer) => mark(peer.levels[feature.id])),
          ],
        })),
      });
    }
  }
  if (kind !== "customer" && ladder.length > 1)
    tables.push({
      title: "Market comparison",
      headers: ["#", "Market", "Rating", "vs average"],
      rows: ladder.slice(0, 12).map((market, index) => ({
        highlight: market.code === input.countryCode,
        cells: [
          String(index + 1),
          market.name,
          market.score.toFixed(1),
          marketAverage === null
            ? "—"
            : signed(market.score - marketAverage, 2),
        ],
      })),
    });
  if (kind === "customer" && categories.length)
    tables.push({
      title: "Issue themes",
      headers: ["Theme", "Comments", "Negative", "Neutral", "Positive"],
      rows: categories.map((category) => ({
        cells: [
          category.label,
          String(category.reviews.length),
          `${category.negative} (${pct(category.negative, category.reviews.length)}%)`,
          String(category.neutral),
          String(category.positive),
        ],
      })),
    });

  // Quotes (customer voice)
  const recent = (
    sentimentName: CustomerSentiment["sentiment"],
    limit: number,
  ) =>
    reviews
      .filter(
        (review) => review.sentiment === sentimentName && review.text.trim(),
      )
      .sort(
        (a, b) =>
          (Date.parse(b.publishedAt ?? "") || 0) -
          (Date.parse(a.publishedAt ?? "") || 0),
      )
      .slice(0, limit)
      .map((review) => ({
        source: review.source,
        rating: review.rating,
        text: review.text.replace(/\s+/g, " ").trim().slice(0, 240),
        date: review.publishedAt ? review.publishedAt.slice(0, 10) : null,
      }));
  const quotes =
    kind === "customer"
      ? [...recent("negative", 3), ...recent("positive", 2)]
      : [];

  const meta = {
    executive: {
      title: "Executive brief",
      subtitle: "Where the brand stands and what to do first",
    },
    competitive: {
      title: "Competitive review",
      subtitle: "How the brand compares with peers and markets",
    },
    customer: {
      title: "Customer voice",
      subtitle: "What customers are saying and why",
    },
  }[kind];

  return {
    kind,
    title: `${meta.title} · ${brand}`,
    subtitle: `${meta.subtitle} · ${countryName}`,
    generatedAt: now.toISOString(),
    kpis,
    callouts: kind === "executive" ? callouts.slice(0, 4) : callouts,
    ratingBars: kind === "customer" ? null : ratingBars,
    marketBars: kind === "customer" ? null : marketBars,
    sentiment: kind === "competitive" ? null : sentiment,
    trend: kind === "competitive" ? null : trend,
    themeBars: kind === "competitive" ? null : themeBars,
    feeBars: kind === "customer" ? null : feeBars,
    tables: kind === "executive" ? tables.slice(0, 1) : tables,
    quotes,
    gaps,
  };
}
