const assert = require('node:assert/strict');
const { test } = require('node:test');
const { evaluateMarket, parseModelRequest } = require('./runtimeModel');

const setup = {
  brand: 'Acme Coffee', appName: 'Acme Rewards', website: 'https://example.com',
  businessType: 'Food & beverage', country: 'US',
  platforms: ['Mobile · Android'], sources: ['Google Play'], months: 1,
};
const review = { source: 'Google Play', author: 'Customer', text: 'Great coffee', rating: 5, sentiment: 'positive', publishedAt: new Date().toISOString() };
function collectors(overrides = {}) {
  return {
    stores: async () => ({ google: { rating: 4.5, reviewCount: 100 }, apple: { rating: null, reviewCount: 0 } }),
    reviews: async () => [review],
    peers: async () => ({ apps: [{ name: 'Coffee Peer', rating: 4, reviewCount: 800 }], basis: 'Business-matched store apps' }),
    chart: async () => ({ rank: 10, chartSize: 200, category: 'Food & Drink' }),
    quotes: async () => [],
    log: { error() {} },
    ...overrides,
  };
}

test('validates complete configuration without replacing the brand with its app name', () => {
  assert.deepEqual(parseModelRequest(setup), setup);
  for (const change of [
    { brand: '' }, { brand: 'x'.repeat(81) }, { country: 'USA' },
    { platforms: [] }, { platforms: ['Unknown'] }, { sources: [] },
    { sources: ['Unknown'] }, { months: 0 }, { months: 1.5 },
    { website: 'file:///secret' }, { appName: 42 }, { businessType: {} },
  ]) assert.throws(() => parseModelRequest({ ...setup, ...change }));
  assert.throws(() => parseModelRequest(null));
});

test('builds country-specific sentiment, store statistics and comparable competitor rankings from evidence', async () => {
  const calls = [];
  const result = await evaluateMarket(setup, collectors({
    reviews: async (source, config) => { calls.push([source, config.brand, config.appName, config.country]); return [review, review]; },
    chart: async (platform) => { assert.equal(platform, 'google'); return { rank: 10, chartSize: 200, category: 'Food & Drink' }; },
  }));
  assert.deepEqual(calls, [['Google Play', 'Acme Coffee', 'Acme Rewards', 'US']]);
  assert.equal(result.reviews.length, 1);
  assert.equal(result.statistics.sentiment.positiveShare, 100);
  assert.equal(result.statistics.rating, 4.5);
  assert.equal(result.statistics.competitorRank, 1);
  assert.equal(result.competitors[1].source, 'Google Play');
  assert.equal(result.ratings.apple.rating, null);
  assert.equal(result.status, 'ready');
});

test('never calls excluded platforms or assigns global or unconfigured sources to a selected country', async () => {
  const config = { ...setup, platforms: ['Web'], sources: ['Reddit', 'Trustpilot', 'Instagram'] };
  const unexpected = async () => { assert.fail('Excluded collector was invoked'); };
  const result = await evaluateMarket(config, collectors({
    stores: unexpected, reviews: unexpected, peers: unexpected, chart: unexpected, quotes: unexpected,
  }));
  assert.equal(result.status, 'unavailable');
  assert.equal(result.statistics.rating, null);
  assert.equal(result.statistics.sentiment.positiveShare, null);
  assert.deepEqual(result.competitors, []);
  assert.ok(result.availability.every((item) => item.status === 'unavailable'));
  assert.match(result.availability.find((item) => item.source === 'Reddit').reason, /country/i);
});

test('a failed source preserves other evidence with explicit availability and no invented metrics', async () => {
  const result = await evaluateMarket({ ...setup, sources: ['Google Play', 'App Store'] }, collectors({
    reviews: async () => { throw new Error('Upstream offline'); },
    peers: async () => { throw new Error('Discovery offline'); },
    chart: async () => { throw new Error('Chart offline'); },
  }));
  assert.equal(result.status, 'limited');
  assert.equal(result.statistics.rating, 4.5);
  assert.equal(result.statistics.competitorRank, null);
  assert.equal(result.statistics.sentiment.total, 0);
  assert.equal(result.statistics.sentiment.positiveShare, null);
  assert.ok(result.availability.some((item) => item.source === 'Google Play' && item.status === 'unavailable'));
  assert.deepEqual(result.competitors, []);
});

test('filters undated, future, out-of-window and incorrectly attributed reviews', async () => {
  const result = await evaluateMarket(setup, collectors({
    reviews: async () => [
      review, { ...review, text: 'Unknown date', publishedAt: null },
      { ...review, text: 'Old', publishedAt: '2000-01-01' },
      { ...review, text: 'Future', publishedAt: '2099-01-01' },
      { ...review, text: 'Wrong source', source: 'Reddit' },
      { ...review, text: 'Invalid rating', rating: 9 },
    ],
  }));
  assert.deepEqual(result.reviews.map((item) => item.text), ['Great coffee']);
});

test('measures a website rating for the selected brand when Web is a chosen platform', async () => {
  const result = await evaluateMarket({ ...setup, platforms: ['Mobile · Android', 'Web'] }, collectors({
    web: async (config) => {
      assert.equal(config.website, 'https://example.com');
      return { rating: 4.2, sampleSize: 14, basis: 'Live check of https://example.com', components: [{ label: 'Security headers', score: 0.6 }] };
    },
  }));
  assert.equal(result.ratings.web.rating, 4.2);
  assert.equal(result.availability.find((item) => item.source === 'Web').status, 'available');
});

test('iOS-only models use Apple discovery and do not claim a lone brand is a category leader', async () => {
  const result = await evaluateMarket({ ...setup, platforms: ['Mobile · iOS'], sources: ['App Store'] }, collectors({
    stores: async () => ({ apple: { rating: 4, reviewCount: 50 }, google: { rating: null, reviewCount: 0 } }),
    reviews: async (source) => [{ ...review, source }],
    peers: async (platform) => { assert.equal(platform, 'apple'); return { apps: [], basis: 'No verified peers found' }; },
    chart: async (platform) => { assert.equal(platform, 'apple'); return { rank: null, chartSize: 0, category: null }; },
  }));
  assert.equal(result.statistics.competitorRank, null);
  assert.deepEqual(result.competitors, []);
  assert.equal(result.ratings.google.rating, null);
});
