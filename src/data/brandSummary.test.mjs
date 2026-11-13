import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildBrandSummary, rankCompetitors } from './brandSummary.ts';

const competitors = [
  { name: 'Wise', rating: 4.7, reviewCount: 900, status: 'live' },
  { name: 'Western Union', rating: 3.1, reviewCount: 500, status: 'live' },
  { name: 'Remitly', rating: 4.7, reviewCount: 1200, status: 'live' },
  { name: 'MoneyGram', rating: null, reviewCount: null, status: 'unavailable' },
];
const ladder = [
  { code: 'GB', name: 'United Kingdom', score: 4.8 },
  { code: 'US', name: 'United States', score: 4.6 },
  { code: 'IN', name: 'India', score: 3.9 },
];

test('rankCompetitors uses the combined brand rating and breaks ties by review volume', () => {
  const ranked = rankCompetitors(competitors, 'Western Union', 4.6);
  assert.deepEqual(ranked.map((item) => item.name), ['Remitly', 'Wise', 'Western Union']);
  assert.equal(ranked[2].rating, 4.6);
});

test('buildBrandSummary produces consistent rank, gap, sentiment and takeaways', () => {
  const summary = buildBrandSummary({
    brand: 'Western Union', countryName: 'United States', brandRating: 4.6, competitors,
    reviews: [{ sentiment: 'positive' }, { sentiment: 'positive' }, { sentiment: 'negative' }, { sentiment: 'neutral' }],
    topIssue: { label: 'Fees & rates', negative: 3 },
    marketLadder: ladder,
  });
  assert.equal(summary.competitorRank, 3);
  assert.equal(summary.competitorCount, 3);
  assert.equal(summary.leader?.name, 'Remitly');
  assert.equal(summary.gapToLeader, -0.1);
  assert.deepEqual([summary.sentiment.positiveShare, summary.sentiment.negativeShare, summary.sentiment.net], [50, 25, 25]);
  assert.equal(summary.bestMarket?.code, 'GB');
  assert.equal(summary.weakestMarket?.code, 'IN');
  assert.deepEqual(summary.takeaways.map((item) => item.tone), ['watch', 'good', 'risk', 'watch']);
  assert.match(summary.takeaways[0].text, /#3 of 3 in United States, 0\.1 behind Remitly/);
  assert.match(summary.takeaways[2].text, /Fix first: Fees & rates \(3 negative comments\)/);
});

test('buildBrandSummary marks a leader and stays empty without data', () => {
  const leader = buildBrandSummary({ brand: 'Western Union', countryName: 'US', brandRating: 4.9, competitors,   reviews: [], topIssue: null, marketLadder: ladder });
  assert.equal(leader.competitorRank, 1);
  assert.match(leader.takeaways[0].text, /Category leader: #1 of 3 in US, \+0\.2 ahead of Remitly/);
  const empty = buildBrandSummary({ brand: 'X', countryName: 'US', brandRating: null, competitors: [], reviews: [], topIssue: null, marketLadder: [] });
  assert.equal(empty.competitorRank, null);
  assert.equal(empty.sentiment.net, null);
  assert.equal(empty.bestMarket, null);
  assert.deepEqual(empty.takeaways, []);
});
