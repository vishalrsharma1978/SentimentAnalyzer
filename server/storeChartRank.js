// Position of an app inside a store top chart, using 1-based ranks.
function appleChartRank(feed, appleId) {
  const entries = feed?.feed?.entry;
  const list = Array.isArray(entries) ? entries : entries ? [entries] : [];
  const index = list.findIndex((entry) => String(entry?.id?.attributes?.['im:id'] ?? '') === String(appleId));
  return { rank: index >= 0 ? index + 1 : null, chartSize: list.length };
}

function playChartRank(list, appId) {
  const apps = Array.isArray(list) ? list : [];
  const index = apps.findIndex((app) => app?.appId === appId);
  return { rank: index >= 0 ? index + 1 : null, chartSize: apps.length };
}

module.exports = { appleChartRank, playChartRank };
