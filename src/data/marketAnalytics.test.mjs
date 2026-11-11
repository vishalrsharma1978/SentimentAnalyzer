import assert from 'node:assert/strict';
import { test } from 'node:test';
import { aggregateRating, channelRating, channelScore, hitTestSunburst, polarPoint, rankMarkets, ringPath, storeRatingBasis, sunburstSegments } from './marketAnalytics.ts';

test('aggregates only valid platform ratings without inventing web or brand scores', () => {
  assert.equal(aggregateRating({ apple: { rating: 4, reviewCount: 20 }, google: { rating: 2, reviewCount: 80 } }), 3);
  assert.equal(aggregateRating({ apple: { rating: null, reviewCount: 0 }, google: { rating: 4.5, reviewCount: 10 } }), 4.5);
  assert.equal(aggregateRating(undefined), null);
  assert.equal(aggregateRating({ apple: { rating: NaN, reviewCount: 0 }, google: { rating: 9, reviewCount: 0 } }), null);
});

test('brand rating uses store aggregates and identifies single-source coverage', () => {
  const data = { apple: { rating: 4.2, reviewCount: 30 }, google: { rating: 3.2, reviewCount: 90 } };
  assert.equal(channelRating(data, 'ios'), 4.2);
  assert.equal(channelRating(data, 'android'), 3.2);
  assert.equal(channelRating(data, 'mobile'), 3.7);
  assert.equal(channelRating(data, 'brand'), 3.7);
  assert.equal(storeRatingBasis(data), 'Equal average of Apple App Store and Google Play ratings');
  assert.equal(storeRatingBasis({ ...data, google: { rating: null, reviewCount: 0 } }), 'Single source: Apple App Store');
  assert.equal(storeRatingBasis({ ...data, apple: { rating: null, reviewCount: 0 } }), 'Single source: Google Play');
  assert.equal(storeRatingBasis(undefined), 'No store rating available');
  assert.equal(channelRating(data, 'web'), null);
  assert.equal(channelRating(undefined, 'ios'), null);
  assert.equal(channelRating(undefined, 'android'), null);
  const withChannels = {
    ...data,
    brand: { rating: 3.4, sampleSize: 40, basis: 'reviews', components: [] },
    web: { rating: 4.35, sampleSize: 14, basis: 'site', components: [{ label: 'Security headers', score: 0.2 }] },
  };
  assert.equal(channelRating(withChannels, 'brand'), 3.7);
  assert.equal(channelRating(withChannels, 'web'), 4.35);
  assert.equal(channelScore(withChannels, 'web')?.components[0].label, 'Security headers');
  assert.equal(channelScore(withChannels, 'ios'), null);
  assert.equal(channelScore(withChannels, 'brand')?.basis, 'Equal average of Apple App Store and Google Play ratings');
});

test('ranks countries by the selected channel', () => {
  const markets = [
    { code: 'US', name: 'United States', region: 'North America' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe' },
  ];
  const score = (rating) => ({ rating, sampleSize: 10, basis: '', components: [] });
  const ratings = {
    US: { apple: { rating: 4.8, reviewCount: 1 }, google: { rating: 4.8, reviewCount: 1 }, brand: score(3.1), web: score(4.4) },
    GB: { apple: { rating: 4.0, reviewCount: 1 }, google: { rating: 4.0, reviewCount: 1 }, brand: score(3.6), web: null },
  };
  assert.deepEqual(rankMarkets(markets, ratings).map(({ code }) => code), ['US', 'GB']);
  assert.deepEqual(rankMarkets(markets, ratings, 'Global', 'brand').map(({ code }) => code), ['US', 'GB']);
  assert.deepEqual(rankMarkets(markets, ratings, 'Global', 'web').map(({ code }) => code), ['US']);
});
test('ranks monitored countries within region with shared ranks for ties and excludes missing sources', () => {
  const markets = [
    { code: 'US', name: 'United States', region: 'North America' },
    { code: 'GB', name: 'United Kingdom', region: 'Europe' },
    { code: 'DE', name: 'Germany', region: 'Europe' },
    { code: 'FR', name: 'France', region: 'Europe' },
  ];
  const ratings = {
    US: { apple: { rating: 4.8, reviewCount: 100 }, google: { rating: null, reviewCount: 0 } },
    GB: { apple: { rating: 4.5, reviewCount: 10 }, google: { rating: null, reviewCount: 0 } },
    DE: { apple: { rating: 4.5, reviewCount: 20 }, google: { rating: null, reviewCount: 0 } },
  };
  assert.deepEqual(rankMarkets(markets, ratings, 'Europe').map(({ code, rank }) => [code, rank]), [['DE', 1], ['GB', 1]]);
  assert.deepEqual(rankMarkets(markets, ratings).map(({ rank }) => rank), [1, 2, 2]);
  assert.deepEqual(rankMarkets(markets, ratings, 'Asia Pacific'), []);
});

test('sunburst preserves parent bounds and drills country into Brand, Website and Mobile with iOS/Android leaves', () => {
  const markets = [{ code: 'US', name: 'United States', region: 'North America' }, { code: 'GB', name: 'United Kingdom', region: 'Europe' }];
  const global = sunburstSegments(markets, null);
  assert.equal(global.filter((segment) => segment.depth === 0).length, 2);
  assert.equal(global.filter((segment) => segment.depth === 1).length, 8);
  const focused = sunburstSegments(markets, 'GB');
  assert.deepEqual(focused.filter((segment) => segment.depth === 0).map(({ channel }) => channel), ['brand', 'web', 'mobile']);
  const mobile = focused.find((segment) => segment.channel === 'mobile');
  assert.ok(mobile);
  const leaves = focused.filter((segment) => segment.depth === 1 && (segment.channel === 'ios' || segment.channel === 'android'));
  assert.equal(leaves.length, 2);
  assert.ok(leaves.every((leaf) => leaf.start >= mobile.start && leaf.end <= mobile.end));
  assert.ok(focused.every((segment) => segment.countryCode === 'GB'));
  assert.deepEqual(sunburstSegments([], null), []);
  assert.deepEqual(sunburstSegments(markets, 'XX'), []);
});

test('annular geometry is finite for small arcs and handles a full-circle country', () => {
  for (const [start, end] of [[0, 360], [0, 180], [180, 181], [0, 0]]) {
    const path = ringPath(100, 150, start, end);
    assert.ok(!/NaN|Infinity/.test(path));
    if (end > start) assert.ok(path.startsWith('M '));
    else assert.equal(path, '');
  }
});

test('sunburst hit testing selects ring sectors and ignores the center and ring gaps', () => {
  const segments = sunburstSegments([{ code: 'GB', name: 'United Kingdom', region: 'Europe' }], 'GB');
  const ios = polarPoint(170, 270);
  assert.equal(hitTestSunburst(segments, ios.x, ios.y)?.channel, 'ios');
  const mobile = polarPoint(110, 300);
  assert.equal(hitTestSunburst(segments, mobile.x, mobile.y)?.channel, 'mobile');
  const gap = polarPoint(140, 300);
  assert.equal(hitTestSunburst(segments, gap.x, gap.y), undefined);
  assert.equal(hitTestSunburst(segments, 200, 200), undefined);
  assert.equal(hitTestSunburst(segments, 400, 400), undefined);
});
