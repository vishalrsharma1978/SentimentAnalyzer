// Competitor discovery returns each peer with its Google Play rating. This looks up the same peer in the
// Apple App Store of the same country, so every peer can show both store ratings.
// A match is accepted only when the App Store title starts with the peer's company name AND the publisher
// agrees with the Google Play developer or the company name. Nothing is estimated for a peer without a match.
const { cleanBrandTitle } = require("./peerBrands");

const normalize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const compact = (value) => normalize(value).replace(/\s+/g, "");
const validRating = (value) =>
  Number.isFinite(value) && value >= 1 && value <= 5;

function sameCompany(item, peerName, developer) {
  const company = compact(cleanBrandTitle(peerName));
  if (company.length < 3) return false;
  const titleName = compact(cleanBrandTitle(item.trackName));
  const publisher = compact(
    `${item.sellerName || ""} ${item.artistName || ""}`,
  );
  const nameMatches =
    titleName === company ||
    titleName.startsWith(company) ||
    (company.startsWith(titleName) && titleName.length >= 4);
  const developerKey = compact(developer);
  const publisherMatches =
    publisher.includes(company) ||
    (developerKey.length >= 4 &&
      (publisher.includes(developerKey) ||
        (developerKey.includes(publisher) && publisher.length >= 4)));
  return nameMatches && publisherMatches;
}

async function appleRatingForPeer(peer, country, fetchJson) {
  const term = cleanBrandTitle(peer.name) || peer.name;
  const data = await fetchJson(
    `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&country=${country.toLowerCase()}&entity=software&limit=8`,
  );
  const results = Array.isArray(data?.results) ? data.results : [];
  const match = results.find((item) =>
    sameCompany(item, peer.name, peer.developer),
  );
  const rating = Number(match?.averageUserRating);
  if (!match || !validRating(rating)) return null;
  return {
    rating: Number(rating.toFixed(2)),
    reviewCount: Number(match.userRatingCount) || 0,
  };
}

// Adds `apple` / `google` store ratings to each peer and a combined `rating` (equal average of the stores found).
async function withStoreRatings(peers, { country, fetchJson, log = console }) {
  return Promise.all(
    peers.map(async (peer) => {
      const google = validRating(peer.rating)
        ? { rating: peer.rating, reviewCount: peer.reviewCount ?? 0 }
        : null;
      let apple = null;
      try {
        apple = await appleRatingForPeer(peer, country, fetchJson);
      } catch (error) {
        log.error(
          `App Store rating lookup failed for ${peer.name} (${country}):`,
          error.message,
        );
      }
      const found = [google, apple].filter(Boolean);
      return {
        ...peer,
        google,
        apple,
        rating: found.length
          ? found.reduce((sum, store) => sum + store.rating, 0) / found.length
          : null,
        reviewCount: found.reduce((sum, store) => sum + store.reviewCount, 0),
      };
    }),
  );
}

module.exports = { appleRatingForPeer, sameCompany, withStoreRatings };
