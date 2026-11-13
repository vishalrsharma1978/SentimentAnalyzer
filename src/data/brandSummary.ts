export type RatedCompetitor = { name: string; rating: number | null; reviewCount: number | null; status: 'live' | 'unavailable' };
export type SentimentRecord = { sentiment: 'positive' | 'neutral' | 'negative' };
export type IssueSignal = { label: string; negative: number };
export type MarketScore = { code: string; name: string; score: number };
export type Takeaway = { tone: 'good' | 'watch' | 'risk'; text: string };

// Single ranking used by every section so the brand position never disagrees.
export function rankCompetitors<T extends RatedCompetitor>(competitors: T[], brand: string, brandRating: number | null): T[] {
  return competitors
    .map((item) => item.name === brand && brandRating !== null ? { ...item, rating: brandRating, status: 'live' as const } : item)
    .filter((item) => item.status === 'live' && item.rating !== null)
    .sort((left, right) => (right.rating ?? 0) - (left.rating ?? 0)
      || (right.reviewCount ?? 0) - (left.reviewCount ?? 0)
      || left.name.localeCompare(right.name));
}

const pct = (part: number, total: number) => total ? Math.round(part / total * 100) : null;

export type BrandSummaryInput = {
  brand: string;
  countryName: string;
  brandRating: number | null;
  competitors: RatedCompetitor[];
  reviews: SentimentRecord[];
  topIssue: IssueSignal | null;
  marketLadder: MarketScore[];
};

export function buildBrandSummary({ brand, countryName, brandRating, competitors, reviews, topIssue, marketLadder }: BrandSummaryInput) {
  const ranked = rankCompetitors(competitors, brand, brandRating);
  const rankIndex = ranked.findIndex((item) => item.name === brand);
  const competitorRank = rankIndex >= 0 ? rankIndex + 1 : null;
  const leader = ranked.find((item) => item.name !== brand) ?? null;
  const gapToLeader = brandRating !== null && leader?.rating != null ? Number((brandRating - leader.rating).toFixed(1)) : null;

  const count = (sentiment: SentimentRecord['sentiment']) => reviews.filter((review) => review.sentiment === sentiment).length;
  const positive = count('positive');
  const neutral = count('neutral');
  const negative = count('negative');
  const sentiment = {
    total: reviews.length, positive, neutral, negative,
    positiveShare: pct(positive, reviews.length),
    negativeShare: pct(negative, reviews.length),
    net: reviews.length ? Math.round((positive - negative) / reviews.length * 100) : null,
  };

  const bestMarket = marketLadder[0] ?? null;
  const weakestMarket = marketLadder.length > 1 ? marketLadder[marketLadder.length - 1] : null;

  const takeaways: Takeaway[] = [];
  if (competitorRank !== null) {
    const position = `#${competitorRank} of ${ranked.length} in ${countryName}`;
    takeaways.push(competitorRank === 1
      ? { tone: 'good', text: `Category leader: ${position}${leader?.rating != null && gapToLeader !== null ? `, +${gapToLeader.toFixed(1)} ahead of ${leader.name}` : ''}.` }
      : { tone: gapToLeader !== null && gapToLeader <= -0.5 ? 'risk' : 'watch', text: `${position}, ${Math.abs(gapToLeader ?? 0).toFixed(1)} behind ${leader?.name}.` });
  }
  if (sentiment.net !== null) {
    takeaways.push({
      tone: sentiment.net >= 20 ? 'good' : sentiment.net >= 0 ? 'watch' : 'risk',
      text: `${sentiment.positiveShare}% positive vs ${sentiment.negativeShare}% negative (net ${sentiment.net > 0 ? '+' : ''}${sentiment.net}).`,
    });
  }
  if (topIssue && topIssue.negative > 0) {
    takeaways.push({ tone: 'risk', text: `Fix first: ${topIssue.label} (${topIssue.negative} negative ${topIssue.negative === 1 ? 'comment' : 'comments'}).` });
  }
  if (bestMarket && weakestMarket) {
    takeaways.push({ tone: 'watch', text: `Strongest ${bestMarket.name} ${bestMarket.score.toFixed(1)}; weakest ${weakestMarket.name} ${weakestMarket.score.toFixed(1)}.` });
  }

  return { competitorRank, competitorCount: ranked.length, leader, gapToLeader, sentiment, bestMarket, weakestMarket, ratedMarkets: marketLadder.length, takeaways };
}

export type BrandSummary = ReturnType<typeof buildBrandSummary>;
