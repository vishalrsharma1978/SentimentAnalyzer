const test = require('node:test');
const assert = require('node:assert/strict');
const { appleChartRank, playChartRank } = require('./storeChartRank');

const appleEntry = (id) => ({ id: { attributes: { 'im:id': id } } });

test('appleChartRank returns the 1-based chart position of the app', () => {
  const feed = { feed: { entry: [appleEntry('1'), appleEntry('424716908'), appleEntry('3')] } };
  assert.deepEqual(appleChartRank(feed, '424716908'), { rank: 2, chartSize: 3 });
});

test('appleChartRank reports null rank when the app is outside the chart or feed is empty', () => {
  assert.deepEqual(appleChartRank({ feed: { entry: [appleEntry('1')] } }, '9'), { rank: null, chartSize: 1 });
  assert.deepEqual(appleChartRank(null, '9'), { rank: null, chartSize: 0 });
  assert.deepEqual(appleChartRank({ feed: { entry: appleEntry('9') } }, '9'), { rank: 1, chartSize: 1 });
});

test('playChartRank returns the 1-based chart position of the package', () => {
  const list = [{ appId: 'a' }, { appId: 'b' }, { appId: 'com.westernunion.android.mtapp' }];
  assert.deepEqual(playChartRank(list, 'com.westernunion.android.mtapp'), { rank: 3, chartSize: 3 });
  assert.deepEqual(playChartRank(list, 'missing'), { rank: null, chartSize: 3 });
  assert.deepEqual(playChartRank(undefined, 'a'), { rank: null, chartSize: 0 });
});
