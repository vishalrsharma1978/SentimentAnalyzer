const assert = require('node:assert/strict');
const { test } = require('node:test');
const { brandWebsiteUrl, isBrandReview, probeWebsite, scoreBrandReviews, scoreWebsiteProbe } = require('./channelRatings');

const review = (rating, text) => ({ rating, text });

test('brand rating averages only service-themed reviews and needs a minimum sample', () => {
  assert.equal(isBrandReview(review(1, 'Fees are far too high')), true);
  assert.equal(isBrandReview(review(5, 'Customer service sorted my refund quickly')), true);
  assert.equal(isBrandReview(review(5, 'Nice app, love the dark mode')), false);

  const tooFew = scoreBrandReviews([review(5, 'great exchange rate'), review(1, 'app crashes')]);
  assert.equal(tooFew.rating, null);
  assert.equal(tooFew.sampleSize, 1);
  assert.match(tooFew.basis, /Fewer than 5/);

  const scored = scoreBrandReviews([
    review(5, 'Great exchange rate'),
    review(4, 'Low fees'),
    review(3, 'Agent location was fine'),
    review(1, 'Transfer on hold for days, support useless'),
    review(2, 'Recipient never got the money, refund pending'),
    review(5, 'Pretty colours'),
    review(9, 'bad fees'),
  ]);
  assert.equal(scored.rating, 3);
  assert.equal(scored.sampleSize, 5);
  assert.deepEqual(scored.components.map(({ score }) => score), [0.4, 0.2, 0.4]);
  assert.equal(scoreBrandReviews(undefined).rating, null);
});

const goodProbe = {
  status: 200,
  country: 'GB',
  finalUrl: 'https://www.westernunion.com/gb/en/home.html',
  headersMs: 250,
  totalMs: 700,
  bytes: 100 * 1024,
  headers: {
    'Strict-Transport-Security': 'max-age=1', 'content-security-policy': "frame-ancestors 'self'",
    'x-content-type-options': 'nosniff', 'referrer-policy': 'same-origin',
  },
  html: '<html lang="en"><head><meta name="viewport" content="w"><title> WU </title><meta name="description" content="d"><link rel="canonical" href="x"></head></html>',
};

test('website rating maps live site checks onto a 1-5 scale', () => {
  const perfect = scoreWebsiteProbe(goodProbe);
  assert.equal(perfect.rating, 5);
  assert.ok(perfect.components.every(({ score }) => score === 1));

  const weaker = scoreWebsiteProbe({ ...goodProbe, headers: { 'strict-transport-security': 'x' }, headersMs: 1500, totalMs: 4000, html: '<html><title></title></html>' });
  assert.ok(weaker.rating > 1 && weaker.rating < 4, `got ${weaker.rating}`);
  assert.equal(weaker.components.find(({ label }) => label === 'Security headers').score, 0.2);
  assert.equal(weaker.components.find(({ label }) => label === 'Mobile & SEO markup').score, 0);

  const notLocalized = scoreWebsiteProbe({ ...goodProbe, finalUrl: 'https://www.westernunion.com/us/en/home.html' });
  assert.ok(notLocalized.rating < perfect.rating);

  assert.equal(scoreWebsiteProbe({ ...goodProbe, status: 404 }).rating, 1);
  assert.equal(scoreWebsiteProbe(null).rating, null);

  const blended = scoreWebsiteProbe({ ...goodProbe, lighthouse: { performance: 0, seo: 0 } });
  assert.equal(blended.rating, 3);
  assert.match(blended.basis, /Lighthouse/);
});

test('website probe measures a response and builds localized brand URLs', async () => {
  assert.equal(brandWebsiteUrl('Western Union', 'GB'), 'https://www.westernunion.com/gb/en/home.html');
  assert.equal(brandWebsiteUrl('Unknown Co', 'GB'), null);
  const fakeFetch = async (url) => new Response('<html lang="en"></html>', { status: 200, headers: { 'x-frame-options': 'DENY' } });
  const probe = await probeWebsite('https://example.test/gb/', 'GB', { fetchImpl: fakeFetch });
  assert.equal(probe.status, 200);
  assert.equal(probe.headers['x-frame-options'], 'DENY');
  assert.ok(probe.bytes > 0 && probe.totalMs >= 0);
});
