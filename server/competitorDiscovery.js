const { wikidataProfile } = require("./wikidataProfile");

const MAX_PEERS = 6;
const MIN_RATINGS = 500;
const SEARCH_SIZE = 25;
// Signal strength: what the brand's own app says it does is the strongest hint,
// named business peers next, broad business categories last.
const TITLE_TERM_WEIGHT = 4;
const NAMED_PEER_WEIGHT = 3;
const CATEGORY_TERM_WEIGHT = 1.5;
const STOP_WORDS = new Set(
  (
    "the and for app apps inc llc ltd limited mobile official company corp corporation co group " +
    "games game studio studios services service online plc gmbh international usa your with new from now get earn " +
    "rewards reward order ordering"
  ).split(" "),
);
const GENERIC_BUSINESS_WORDS = new Set(
  (
    "pay payment loyalty pickup menu food drink retail restaurant shopping " +
    "financial technology chain"
  ).split(" "),
);

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const compact = (value) => normalize(value).replace(/\s+/g, "");
const tokens = (value) =>
  normalize(value)
    .split(" ")
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
const ratingsOf = (app) =>
  Math.max(Number(app.ratings) || 0, Number(app.reviews) || 0);
// App types that serve a category without being a business in it.
const UTILITY_APP =
  /\b(journal|learn|learning|recipe|recipes|guide|tracker|finder|calculator|wallpapers?|quiz|timer|simulator|tycoon|puzzle|widget|themes?|tips|news|maker|scanner|editor)\b/;
// Marketplaces resell many brands; they only count as peers of another marketplace.
const MARKETPLACE_APP =
  /\b(delivery|grocery|groceries|marketplace|deals|coupons?)\b/;
const isMarketplace = (app) => MARKETPLACE_APP.test(normalize(app.title));

// Words left in the brand's store title once the brand name is removed,
// e.g. "Western Union Send Money Now" -> "send money".
function titleTerm(title, brand) {
  const brandTokens = new Set(tokens(brand));
  const words = tokens(title)
    .filter((token) => !brandTokens.has(token))
    .slice(0, 3);
  return words.length ? words.join(" ") : null;
}

// Keep company apps whose title names their own publisher, which drops games,
// recipe/guide apps and resellers that merely mention the category.
function isOfficialBrandApp(app) {
  if (UTILITY_APP.test(normalize(app.title))) return false;
  const publisher = compact(
    `${app.developer || ""} ${app.developerWebsite || ""}`,
  );
  return tokens(app.title).some((token) => publisher.includes(token));
}

function isSameBrand(app, selected, brand) {
  const brandKey = compact(brand);
  return (
    app.appId === selected.appId ||
    normalize(app.developer) === normalize(selected.developer) ||
    (brandKey.length >= 3 && compact(app.title).includes(brandKey))
  );
}

function namesMatch(peerName, appTitle) {
  const peer = normalize(peerName);
  const title = normalize(appTitle);
  return (
    peer.length >= 3 &&
    title.length >= 4 &&
    (` ${title} `.includes(` ${peer} `) || ` ${peer} `.includes(` ${title} `))
  );
}

function businessWords(value) {
  return tokens(
    normalize(value).replace(/\b(coffeehouses?|cafes?)\b/g, "coffee"),
  ).filter((word) => !GENERIC_BUSINESS_WORDS.has(word));
}

function matchesBusiness(app, words) {
  const evidence = new Set(businessWords(`${app.title} ${app.summary || ""}`));
  return words.length > 0 && words.every((word) => evidence.has(word));
}

async function discoverCompetitors({
  brand,
  country,
  gplay,
  resolveAppId,
  profile = wikidataProfile,
  log = console,
}) {
  const appId = await resolveAppId(brand, country);
  if (!appId)
    return {
      apps: [],
      basis:
        "No matching Google Play app found for this brand in this country.",
    };
  const options = {
    country: country.toLowerCase(),
    lang: "en",
    requestOptions: { timeout: 12000 },
  };
  const selected = await gplay.app({ ...options, appId });
  if (!selected.genreId || !selected.developer) {
    return {
      apps: [],
      basis:
        "The selected app has insufficient category or publisher metadata to identify peers.",
    };
  }

  let business = { terms: [], peers: [] };
  try {
    business = await profile(brand);
  } catch (error) {
    log.error(`Business profile lookup failed for ${brand}:`, error.message);
  }

  const candidates = new Map();
  const add = (app, points, namedPeer = false) => {
    if (!app?.appId) return;
    const current = candidates.get(app.appId) || { app, score: 0 };
    candidates.set(app.appId, {
      app: current.app.genreId ? current.app : app,
      score: current.score + points,
      namedPeer: current.namedPeer || namedPeer,
    });
  };

  // Store rank/category is not business evidence. Use the most specific profile
  // category, or meaningful words from the selected app's own title.
  const profileWords = businessWords(business.terms[0]);
  const relevanceWords = profileWords.length
    ? profileWords
    : businessWords(titleTerm(selected.title, brand));
  const searches = [
    { term: titleTerm(selected.title, brand), weight: TITLE_TERM_WEIGHT },
    ...business.terms.map((term) => ({ term, weight: CATEGORY_TERM_WEIGHT })),
  ].filter(
    (item, index, list) =>
      item.term &&
      list.findIndex((other) => other.term === item.term) === index,
  );
  let attempts = 0;
  let failures = 0;
  for (const { term, weight } of searches) {
    attempts += 1;
    try {
      const results = await gplay.search({
        ...options,
        term,
        num: SEARCH_SIZE,
        fullDetail: true,
      });
      (Array.isArray(results) ? results : []).forEach((app, rank) => {
        const mentionsTerm = normalize(`${app.title} ${app.summary}`).includes(
          term,
        );
        add(
          app,
          weight * (1 - rank / SEARCH_SIZE) + (mentionsTerm ? weight / 4 : 0),
        );
      });
    } catch (error) {
      failures += 1;
      log.error(
        `Peer keyword search failed for "${term}" (${country}):`,
        error.message,
      );
    }
  }

  const peerLookups = await Promise.allSettled(
    business.peers.map(async (name) => {
      const hits = await gplay.search({ ...options, term: name, num: 3 });
      const match = (Array.isArray(hits) ? hits : []).find((hit) =>
        namesMatch(name, hit.title),
      );
      return match ? gplay.app({ ...options, appId: match.appId }) : null;
    }),
  );
  attempts += peerLookups.length;
  for (const [index, lookup] of peerLookups.entries()) {
    if (lookup.status === "fulfilled")
      add(lookup.value, NAMED_PEER_WEIGHT, true);
    else {
      failures += 1;
      log.error(
        `Named peer lookup failed for "${business.peers[index]}" (${country}):`,
        lookup.reason.message,
      );
    }
  }
  if (attempts > 0 && failures === attempts)
    throw new Error("All live peer searches failed.");

  const selectedIsMarketplace = isMarketplace(selected);
  const qualifies = (app, namedPeer = false) =>
    typeof app.title === "string" &&
    app.title.trim() &&
    app.genreId === selected.genreId &&
    !isSameBrand(app, selected, brand) &&
    (selectedIsMarketplace || !isMarketplace(app)) &&
    isOfficialBrandApp(app) &&
    ratingsOf(app) >= MIN_RATINGS &&
    (namedPeer || matchesBusiness(app, relevanceWords));
  const unique = (list) =>
    list.filter(
      (item, index) =>
        list.findIndex(
          (other) =>
            normalize(other.app.developer) === normalize(item.app.developer),
        ) === index,
    );

  // Relevance first; popularity breaks near-ties so established chains outrank tiny apps.
  const rank = ({ app, score }) =>
    score + 0.6 * Math.log10(ratingsOf(app) || 1);
  let ranked = unique(
    [...candidates.values()]
      .filter(({ app, namedPeer }) => qualifies(app, namedPeer))
      .sort(
        (left, right) =>
          Number(right.namedPeer) - Number(left.namedPeer) ||
          rank(right) - rank(left),
      ),
  );
  let source = "brand-matched store search";
  if (!ranked.length && relevanceWords.length) {
    const related = await gplay.similar({
      ...options,
      appId,
      fullDetail: true,
    });
    if (!Array.isArray(related))
      throw new Error("Related-app discovery returned an invalid response.");
    ranked = unique(
      related.filter((app) => qualifies(app)).map((app) => ({ app, score: 0 })),
    );
    source = "related apps";
  }

  return {
    apps: ranked.slice(0, MAX_PEERS).map(({ app }) => ({
      name: app.title.trim(),
      appId: app.appId,
      developer: typeof app.developer === "string" ? app.developer : null,
      rating:
        typeof app.score === "number" &&
        Number.isFinite(app.score) &&
        app.score >= 1 &&
        app.score <= 5
          ? app.score
          : null,
      reviewCount: ratingsOf(app),
    })),
    basis: ranked.length
      ? `Suggested peers from Google Play ${source} in ${selected.genre || selected.genreId}, matched to ${brand}'s specific business category or named business peers; not verified business competitors.`
      : `No business-matched peers found for ${brand} in ${country}. A shared store category alone is not sufficient evidence of competition.`,
  };
}

module.exports = {
  discoverCompetitors,
  titleTerm,
  isOfficialBrandApp,
  isMarketplace,
};
