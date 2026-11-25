export type RatedCompetitor = {
  name: string;
  rating: number | null;
  reviewCount: number | null;
  status: "live" | "unavailable";
};
export type SentimentRecord = {
  sentiment: "positive" | "neutral" | "negative";
};
export type IssueSignal = { label: string; negative: number };
export type MarketScore = { code: string; name: string; score: number };
export type Takeaway = { tone: "good" | "watch" | "risk"; text: string };

// Single ranking used by every section so the brand position never disagrees.
export function rankCompetitors<T extends RatedCompetitor>(
  competitors: T[],
  brand: string,
  brandRating: number | null,
): T[] {
  return competitors
    .map((item) =>
      item.name === brand && brandRating !== null
        ? { ...item, rating: brandRating, status: "live" as const }
        : item,
    )
    .filter((item) => item.status === "live" && item.rating !== null)
    .sort(
      (left, right) =>
        (right.rating ?? 0) - (left.rating ?? 0) ||
        (right.reviewCount ?? 0) - (left.reviewCount ?? 0) ||
        left.name.localeCompare(right.name),
    );
}

const pct = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : null;

export type BrandSummaryInput = {
  brand: string;
  countryName: string;
  brandRating: number | null;
  competitors: RatedCompetitor[];
  reviews: SentimentRecord[];
  topIssue: IssueSignal | null;
  marketLadder: MarketScore[];
};

export function buildBrandSummary({
  brand,
  countryName,
  brandRating,
  competitors,
  reviews,
  topIssue,
  marketLadder,
}: BrandSummaryInput) {
  const ranked = rankCompetitors(competitors, brand, brandRating);
  const rankIndex = ranked.findIndex((item) => item.name === brand);
  const competitorRank = rankIndex >= 0 ? rankIndex + 1 : null;
  const leader = ranked.find((item) => item.name !== brand) ?? null;
  const gapToLeader =
    brandRating !== null && leader?.rating != null
      ? Number((brandRating - leader.rating).toFixed(1))
      : null;

  const count = (sentiment: SentimentRecord["sentiment"]) =>
    reviews.filter((review) => review.sentiment === sentiment).length;
  const positive = count("positive");
  const neutral = count("neutral");
  const negative = count("negative");
  const sentiment = {
    total: reviews.length,
    positive,
    neutral,
    negative,
    positiveShare: pct(positive, reviews.length),
    negativeShare: pct(negative, reviews.length),
    net: reviews.length
      ? Math.round(((positive - negative) / reviews.length) * 100)
      : null,
  };

  const bestMarket = marketLadder[0] ?? null;
  const weakestMarket =
    marketLadder.length > 1 ? marketLadder[marketLadder.length - 1] : null;

  const takeaways: Takeaway[] = [];
  if (competitorRank !== null) {
    const position = `#${competitorRank} of ${ranked.length} in ${countryName}`;
    takeaways.push(
      competitorRank === 1
        ? {
            tone: "good",
            text: `Category leader: ${position}${leader?.rating != null && gapToLeader !== null ? `, +${gapToLeader.toFixed(1)} ahead of ${leader.name}` : ""}.`,
          }
        : {
            tone:
              gapToLeader !== null && gapToLeader <= -0.5 ? "risk" : "watch",
            text: `${position}, ${Math.abs(gapToLeader ?? 0).toFixed(1)} behind ${leader?.name}.`,
          },
    );
  }
  if (sentiment.net !== null) {
    takeaways.push({
      tone:
        sentiment.net >= 20 ? "good" : sentiment.net >= 0 ? "watch" : "risk",
      text: `${sentiment.positiveShare}% positive vs ${sentiment.negativeShare}% negative (net ${sentiment.net > 0 ? "+" : ""}${sentiment.net}).`,
    });
  }
  if (topIssue && topIssue.negative > 0) {
    takeaways.push({
      tone: "risk",
      text: `Fix first: ${topIssue.label} (${topIssue.negative} negative ${topIssue.negative === 1 ? "comment" : "comments"}).`,
    });
  }
  if (bestMarket && weakestMarket) {
    takeaways.push({
      tone: "watch",
      text: `Strongest ${bestMarket.name} ${bestMarket.score.toFixed(1)}; weakest ${weakestMarket.name} ${weakestMarket.score.toFixed(1)}.`,
    });
  }

  const executive = buildExecutiveOverview({
    brand,
    countryName,
    brandRating,
    competitorRank,
    competitorCount: ranked.length,
    leader,
    gapToLeader,
    sentiment,
    topIssue,
    bestMarket,
    weakestMarket,
  });

  return {
    competitorRank,
    competitorCount: ranked.length,
    leader,
    gapToLeader,
    sentiment,
    bestMarket,
    weakestMarket,
    ratedMarkets: marketLadder.length,
    takeaways,
    executive,
  };
}

export type ExecutiveOverview = {
  tone: Takeaway["tone"];
  verdict: string;
  points: { label: string; text: string; tone: Takeaway["tone"] }[];
};

type ExecutiveInput = {
  brand: string;
  countryName: string;
  brandRating: number | null;
  competitorRank: number | null;
  competitorCount: number;
  leader: RatedCompetitor | null;
  gapToLeader: number | null;
  sentiment: {
    total: number;
    positiveShare: number | null;
    negativeShare: number | null;
    net: number | null;
  };
  topIssue: IssueSignal | null;
  bestMarket: MarketScore | null;
  weakestMarket: MarketScore | null;
};

// Crisp, brand-specific read-out: one verdict line and up to four short evidence points.
export function buildExecutiveOverview(
  input: ExecutiveInput,
): ExecutiveOverview | null {
  const {
    brand,
    countryName,
    brandRating,
    competitorRank,
    competitorCount,
    leader,
    gapToLeader,
    sentiment,
    topIssue,
    bestMarket,
    weakestMarket,
  } = input;
  if (brandRating === null && sentiment.net === null && competitorRank === null)
    return null;

  const points: ExecutiveOverview["points"] = [];
  if (competitorRank !== null) {
    points.push(
      competitorRank === 1
        ? {
            label: "Position",
            tone: "good",
            text: `#1 of ${competitorCount} in ${countryName}${leader?.rating != null && gapToLeader !== null ? `, +${gapToLeader.toFixed(1)} ahead of ${leader.name}` : ""}.`,
          }
        : {
            label: "Position",
            tone:
              gapToLeader !== null && gapToLeader <= -0.5 ? "risk" : "watch",
            text: `#${competitorRank} of ${competitorCount} in ${countryName}${leader && gapToLeader !== null ? `, ${Math.abs(gapToLeader).toFixed(1)} behind ${leader.name}` : ""}.`,
          },
    );
  }
  if (sentiment.net !== null) {
    points.push({
      label: "Customers",
      tone:
        sentiment.net >= 20 ? "good" : sentiment.net >= 0 ? "watch" : "risk",
      text: `${sentiment.positiveShare}% positive, ${sentiment.negativeShare}% negative across ${sentiment.total} reviews.`,
    });
  }
  if (topIssue && topIssue.negative > 0) {
    points.push({
      label: "Priority",
      tone: "risk",
      text: `Fix ${topIssue.label} first (${topIssue.negative} negative ${topIssue.negative === 1 ? "comment" : "comments"}).`,
    });
  }
  if (bestMarket && weakestMarket) {
    points.push({
      label: "Markets",
      tone: "watch",
      text: `Strongest ${bestMarket.name} (${bestMarket.score.toFixed(1)}), weakest ${weakestMarket.name} (${weakestMarket.score.toFixed(1)}).`,
    });
  }

  const tones = points.map((point) => point.tone);
  const tone: Takeaway["tone"] = tones.includes("risk")
    ? "risk"
    : tones.includes("watch")
      ? "watch"
      : "good";
  const rated =
    brandRating !== null ? ` rated ${brandRating.toFixed(1)}/5` : "";
  const verdict =
    tone === "good"
      ? `${brand} is performing strongly in ${countryName}${rated}.`
      : tone === "watch"
        ? `${brand} is holding steady in ${countryName}${rated}, with room to improve.`
        : `${brand} needs attention in ${countryName}${rated}.`;

  return { tone, verdict, points };
}

export type BrandSummary = ReturnType<typeof buildBrandSummary>;
