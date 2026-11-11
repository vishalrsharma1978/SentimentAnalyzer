const { test } = require('node:test');
const assert = require('node:assert/strict');
const { westernUnionStoreIds } = require('./westernUnionApps');
const { storeBrandRating } = require('./storeBrandRating');

test('returns verified country-specific Western Union store identifiers', () => {
  assert.deepEqual(westernUnionStoreIds('GB'), { apple: '1045347175', google: 'com.westernunion.moneytransferr3app.eu' });
  assert.deepEqual(westernUnionStoreIds('in'), { apple: '1150872438', google: 'com.westernunion.moneytransferr3app.in' });
  assert.deepEqual(westernUnionStoreIds('US'), { apple: '424716908', google: 'com.westernunion.android.mtapp' });
  assert.equal(westernUnionStoreIds('ZA'), null);
  assert.equal(westernUnionStoreIds('ZZ'), null);
});

test('brand endpoint score averages valid stores and reports coverage', () => {
  const stores = { apple: { rating: 4.8 }, google: { rating: 3.2 } };
  assert.equal(storeBrandRating(stores).rating, 4);
  assert.equal(storeBrandRating({ ...stores, google: { rating: null } }).basis, 'Single source: Apple App Store');
  assert.equal(storeBrandRating({ apple: { rating: 0 }, google: { rating: null } }).rating, null);
});
