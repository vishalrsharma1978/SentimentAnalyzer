const { test } = require('node:test');
const assert = require('node:assert/strict');
const { discoverCompetitors, titleTerm, isOfficialBrandApp, isMarketplace } = require('./competitorDiscovery');

const quietLog = { error: () => {} };
const brandApp = { appId: 'com.brew', title: 'Brew Coffee: Order & Pay', genreId: 'FOOD_AND_DRINK', genre: 'Food & Drink', developer: 'Brew Coffee Company' };
const peer = (appId, title, developer, extra = {}) => ({ appId, title, developer, genreId: 'FOOD_AND_DRINK', score: 4.5, ratings: 5000, ...extra });

function mockStore({ searches = {}, apps = {}, similar = [], selected = brandApp } = {}) {
  const calls = { search: [], app: [], similar: [] };
  return {
    calls,
    gplay: {
      app: async (options) => { calls.app.push(options); return options.appId === brandApp.appId ? selected : apps[options.appId]; },
      search: async (options) => {
        calls.search.push(options);
        const result = searches[options.term];
        if (result instanceof Error) throw result;
        return result || [];
      },
      similar: async (options) => { calls.similar.push(options); return similar; },
    },
  };
}

const run = (gplay, profile = async () => ({ terms: [], peers: [] }), brand = 'Brew') => discoverCompetitors({
  brand, country: 'US', gplay, resolveAppId: async () => brandApp.appId, profile, log: quietLog,
});

test('titleTerm keeps what the brand app says it does', () => {
  assert.equal(titleTerm('Western Union Send Money Now', 'Western Union'), 'send money');
  assert.equal(titleTerm('Brew Coffee: Order & Pay', 'Brew'), 'coffee pay');
  assert.equal(titleTerm('Starbucks', 'Starbucks'), null);
});

test('isOfficialBrandApp requires the publisher to own the title and rejects utility apps', () => {
  assert.equal(isOfficialBrandApp({ title: "Peet's Coffee", developer: "Peet's Coffee & Tea" }), true);
  assert.equal(isOfficialBrandApp({ title: 'Coffee Journal', developer: 'Coffee Journal Labs' }), false);
  assert.equal(isOfficialBrandApp({ title: 'iBrewCoffee', developer: 'Indie Dev', developerEmail: 'ibrewcoffee@mail.com' }), false);
});

test('isMarketplace flags delivery aggregators', () => {
  assert.equal(isMarketplace({ title: 'DoorDash: Food Delivery' }), true);
  assert.equal(isMarketplace({ title: 'Panera Bread' }), false);
});

test('ranks same-category brand peers from the brand app title term', async () => {
  const { gplay, calls } = mockStore({ searches: { 'coffee pay': [
    peer('com.bean', 'Bean Coffee', 'Bean Coffee Inc', { ratings: 20000 }),
    peer('com.game', 'Coffee Shop Tycoon', 'Coffee Tycoon Games'),
    peer('com.small', 'Tiny Coffee', 'Tiny Coffee LLC', { ratings: 100 }),
    peer('com.fin', 'Coffee Money', 'Coffee Money', { genreId: 'FINANCE' }),
    peer('com.brew2', 'Brew Coffee Rewards', 'Someone'),
    peer('com.dd', 'Coffee Delivery Now', 'Coffee Delivery Now'),
    peer('com.cup', 'Cup Coffee', 'Cup Coffee Co', { ratings: 900 }),
  ] } });
  const result = await run(gplay);
  assert.deepEqual(result.apps.map((app) => app.name), ['Bean Coffee', 'Cup Coffee']);
  assert.equal(result.apps[0].rating, 4.5);
  assert.match(result.basis, /not verified business competitors/);
  assert.ok(calls.search.every((call) => call.country === 'us'));
});

test('named business peers from the profile are matched and boosted', async () => {
  const { gplay } = mockStore({
    searches: {
      'coffee pay': [peer('com.cup', 'Cup Coffee', 'Cup Coffee Co', { ratings: 900000 })],
      'cafe': [],
      "Rival Roasters": [{ appId: 'com.rival', title: 'Rival Roasters' }],
    },
    apps: { 'com.rival': peer('com.rival', 'Rival Roasters', 'Rival Roasters Ltd', { ratings: 600 }) },
  });
  const result = await run(gplay, async () => ({ terms: ['cafe'], peers: ['Rival Roasters', 'Unknown Peer'] }));
  assert.deepEqual(result.apps.map((app) => app.name), ['Rival Roasters', 'Cup Coffee']);
});

test('a failing business profile does not stop store discovery', async () => {
  const { gplay } = mockStore({ searches: { 'coffee pay': [peer('com.bean', 'Bean Coffee', 'Bean Coffee Inc')] } });
  const result = await run(gplay, async () => { throw new Error('Wikidata down'); });
  assert.deepEqual(result.apps.map((app) => app.name), ['Bean Coffee']);
});

test('throws when every live search fails so the API can report an outage', async () => {
  const { gplay } = mockStore({ searches: { 'coffee pay': new Error('offline'), cafe: new Error('offline') } });
  await assert.rejects(run(gplay, async () => ({ terms: ['cafe'], peers: [] })), /All live peer searches failed/);
});

test('falls back to filtered related apps when search finds no qualified peers', async () => {
  const { gplay, calls } = mockStore({ similar: [
    peer('com.bean', 'Bean Coffee', 'Bean Coffee Inc'),
    peer('com.own', 'Brew Coffee Gift', brandApp.developer),
    peer('com.burger', 'Burger Palace', 'Burger Palace Inc', { ratings: 9000000 }),
  ] });
  const result = await run(gplay);
  assert.deepEqual(result.apps.map((app) => app.name), ['Bean Coffee']);
  assert.equal(calls.similar.length, 1);
  assert.match(result.basis, /related apps/);
});

test('Starbucks gets coffee businesses, not popular apps sharing Food & Drink', async () => {
  const { gplay } = mockStore({
    selected: { ...brandApp, title: 'Starbucks', developer: 'Starbucks Coffee Company' },
    searches: {
      coffee: [
        peer('com.taco', 'Taco Bell', 'Taco Bell', { ratings: 9000000 }),
        peer('com.burger', 'Burger Palace', 'Burger Palace'),
        peer('com.dd', 'DoorDash: Food, Grocery, More', 'DoorDash'),
        peer('com.bean', 'Bean Coffee', 'Bean Coffee Inc'),
        peer('com.utility', 'Coffee Journal', 'Coffee Journal Labs'),
      ],
      Dunkin: [{ appId: 'com.dunkin', title: 'Dunkin’' }],
    },
    apps: { 'com.dunkin': peer('com.dunkin', 'Dunkin’', 'Dunkin Brands', { ratings: 600 }) },
  });
  const result = await run(gplay, async () => ({ terms: ['coffee', 'restaurant'], peers: ['Dunkin'] }), 'Starbucks');
  assert.deepEqual(result.apps.map((app) => app.name), ['Dunkin’', 'Bean Coffee']);
});

test('related apps still require business evidence when the profile is unavailable', async () => {
  const { gplay } = mockStore({
    selected: { ...brandApp, title: 'Starbucks', developer: 'Starbucks Coffee Company' },
    similar: [peer('com.taco', 'Taco Bell', 'Taco Bell')],
  });
  const result = await run(gplay, async () => { throw new Error('Wikidata down'); }, 'Starbucks');
  assert.deepEqual(result.apps, []);
  assert.match(result.basis, /No business-matched peers/);
});

test('generic title words and broad profile categories are not business evidence', async () => {
  const { gplay } = mockStore({
    selected: { ...brandApp, title: 'Brew: Order & Pay' },
    searches: { pay: [peer('com.burger', 'Burger Palace', 'Burger Palace', { summary: 'Order and pay for food' })] },
    similar: [peer('com.taco', 'Taco Bell', 'Taco Bell')],
  });
  assert.deepEqual((await run(gplay, async () => ({ terms: ['food and drink'], peers: [] }))).apps, []);
});

test('summary evidence supports peers without the category in their brand name', async () => {
  const { gplay } = mockStore({ searches: { 'coffee pay': [
    peer('com.roast', 'Roasty', 'Roasty Inc', { summary: 'Order coffee ahead from our cafes' }),
    peer('com.substr', 'Coffeely', 'Coffeely Inc'),
  ] } });
  assert.deepEqual((await run(gplay)).apps.map((app) => app.name), ['Roasty']);
});

test('unknown brands get no peers and never preset remittance competitors', async () => {
  const result = await discoverCompetitors({ brand: 'Unknown', country: 'US', gplay: {}, resolveAppId: async () => null, log: quietLog });
  assert.deepEqual(result.apps, []);
  assert.doesNotMatch(JSON.stringify(result), /MoneyGram|Remitly|Western Union|Wise/);
});
