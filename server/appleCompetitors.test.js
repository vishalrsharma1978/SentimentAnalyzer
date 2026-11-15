const assert = require('node:assert/strict');
const { test } = require('node:test');
const { discoverAppleCompetitors } = require('./appleCompetitors');

const apple = (id, name, developer = name) => ({
  trackId: id, trackName: name, sellerName: developer, primaryGenreId: 6023,
  description: 'Coffee shops and coffee ordering', averageUserRating: 4.4, userRatingCount: 5000,
});
test('Apple-only discovery reuses business relevance checks without Google Play requests', async () => {
  const selected = apple(1, 'Acme Coffee');
  const result = await discoverAppleCompetitors({
    brand: 'Acme Coffee', country: 'US', appName: 'Acme Coffee Rewards',
    findApp: async (brand, country, appName) => {
      assert.deepEqual([brand, country, appName], ['Acme Coffee', 'US', 'Acme Coffee Rewards']);
      return selected;
    },
    fetchJson: async () => ({ results: [selected, apple(2, 'Coffee Peer'), apple(3, 'Coffee Tracker')] }),
    profile: async () => ({ terms: ['coffee'], peers: [] }),
  });
  assert.deepEqual(result.apps.map((item) => item.name), ['Coffee Peer']);
});

test('Apple discovery reports missing apps and propagates invalid upstream results', async () => {
  const missing = await discoverAppleCompetitors({ brand: 'Missing', country: 'IN', findApp: async () => null });
  assert.deepEqual(missing.apps, []);
  await assert.rejects(() => discoverAppleCompetitors({
    brand: 'Acme Coffee', country: 'US', findApp: async () => apple(1, 'Acme Coffee'),
    fetchJson: async () => null, profile: async () => ({ terms: ['coffee'], peers: [] }),
    log: { error() {} },
  }), /searches failed/);
});
