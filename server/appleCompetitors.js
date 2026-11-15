const { discoverCompetitors } = require('./competitorDiscovery');

function appleApp(item) {
  return {
    appId: String(item.trackId), title: item.trackName, developer: item.sellerName || item.artistName,
    developerWebsite: item.sellerUrl, genreId: String(item.primaryGenreId),
    summary: String(item.description || '').slice(0, 1000),
    score: item.averageUserRating, ratings: item.userRatingCount,
  };
}

async function discoverAppleCompetitors({ brand, country, appName, findApp, fetchJson, profile, log }) {
  const selected = await findApp(brand, country, appName);
  if (!selected?.trackId) return { apps: [], basis: 'No verified Apple App Store app found in this country.' };
  const adapter = {
    app: async ({ appId }) => {
      if (appId === String(selected.trackId)) return appleApp(selected);
      const data = await fetchJson(`https://itunes.apple.com/lookup?id=${encodeURIComponent(appId)}&country=${country.toLowerCase()}&entity=software`);
      const item = data?.results?.find((result) => String(result.trackId) === appId);
      if (!item) throw new Error('Apple peer app lookup unavailable.');
      return appleApp(item);
    },
    search: async ({ term, num }) => {
      const data = await fetchJson(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country.toLowerCase()}&entity=software&limit=${num}`);
      if (!Array.isArray(data?.results)) throw new Error('Apple peer search unavailable.');
      return data.results.map(appleApp);
    },
    similar: async () => [],
  };
  return discoverCompetitors({
    brand, country, gplay: adapter, resolveAppId: async () => String(selected.trackId), profile, log,
  });
}

module.exports = { discoverAppleCompetitors };
