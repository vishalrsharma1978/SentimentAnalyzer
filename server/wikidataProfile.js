// Business classification from Wikidata: specific category terms (e.g. "coffee")
// and named peer companies that share those categories.
const WIKIDATA_API = 'https://www.wikidata.org/w/api.php';
const SPARQL_API = 'https://query.wikidata.org/sparql';
const USER_AGENT = 'PulseBoard/1.0 (customer sentiment dashboard)';
const TOTAL_ENTITIES = 300000;
const MAX_CLASS_SIZE = 10000;
const MAX_PEERS = 8;
// Classes too broad to describe what a company sells.
const GENERIC_CLASSES = new Set([
  'Q4830453', 'Q6881511', 'Q891723', 'Q43229', 'Q783794', 'Q8148', 'Q7397', 'Q35127', 'Q2659904',
  'Q167037', 'Q1058914', 'Q5', 'Q620615', 'Q1331793', 'Q219577', 'Q11032',
]);
const BUSINESS_DESCRIPTION = /company|chain|brand|service|platform|retailer|manufacturer|corporation|business|restaurant|airline|bank|app|maker|operator|provider|network|store|marketplace/i;
const CATEGORY_FILLER = /\b(industry|sector|chain|company|companies|brand|business|enterprise|provider|operator|service|services|platform|directory|institution)\b/g;

const normalize = (value) => String(value || '').toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, ' ').trim();
const qid = (uri) => String(uri).split('/').pop();
const claimIds = (claims, property) => (claims?.[property] || []).map((claim) => claim.mainsnak?.datavalue?.value?.id).filter(Boolean);

function categoryTerm(label) {
  const term = normalize(String(label).replace(CATEGORY_FILLER, ' ')).replace(/\s+/g, ' ');
  return term && !/^q\d+$/.test(term) ? term : null;
}

async function defaultFetchJson(url) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'User-Agent': USER_AGENT, Accept: 'application/sparql-results+json, application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status === 429 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 3000 * (attempt + 1)));
      continue;
    }
    if (!response.ok) throw new Error(`Wikidata returned HTTP ${response.status}`);
    return response.json();
  }
  throw new Error('Wikidata rate limit exceeded');
}

async function sparql(query, fetchJson) {
  const data = await fetchJson(`${SPARQL_API}?query=${encodeURIComponent(query)}`);
  return Array.isArray(data?.results?.bindings) ? data.results.bindings : [];
}

async function resolveEntity(brand, fetchJson) {
  const search = await fetchJson(`${WIKIDATA_API}?action=wbsearchentities&search=${encodeURIComponent(brand)}&language=en&type=item&limit=7&format=json`);
  const needle = normalize(brand);
  const exact = (hit) => normalize(hit.label) === needle || normalize(hit.match?.text) === needle;
  const named = (search?.search || []).filter((hit) => exact(hit) || normalize(hit.label).startsWith(`${needle} `));
  if (!named.length) return null;
  const details = await fetchJson(`${WIKIDATA_API}?action=wbgetentities&ids=${named.map((hit) => hit.id).join('|')}&props=claims|sitelinks&format=json`);
  return named
    .map((hit) => ({ hit, entity: details?.entities?.[hit.id] }))
    .filter(({ hit, entity }) => entity && (claimIds(entity.claims, 'P452').length || BUSINESS_DESCRIPTION.test(hit.description || '')))
    .sort((left, right) => Number(exact(right.hit)) - Number(exact(left.hit))
      || Object.keys(right.entity.sitelinks || {}).length - Object.keys(left.entity.sitelinks || {}).length)
    .map(({ entity }) => entity)[0] || null;
}

async function lookupProfile(brand, fetchJson) {
  const entity = await resolveEntity(brand, fetchJson);
  if (!entity) return { terms: [], peers: [] };
  const classes = [
    ...claimIds(entity.claims, 'P31').map((id) => ['P31', id]),
    ...claimIds(entity.claims, 'P452').map((id) => ['P452', id]),
  ].filter(([, id]) => !GENERIC_CLASSES.has(id));
  if (!classes.length) return { terms: [], peers: [] };

  const sizes = await sparql(`SELECT ?p ?k ?kLabel (COUNT(?m) AS ?n) WHERE {
    VALUES (?p ?k) { ${classes.map(([property, id]) => `(wdt:${property} wd:${id})`).join(' ')} }
    OPTIONAL { ?m ?p ?k } SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } } GROUP BY ?p ?k ?kLabel`, fetchJson);
  const specific = sizes
    .map((row) => ({ property: qid(row.p.value), id: qid(row.k.value), label: row.kLabel?.value, size: Number(row.n.value) }))
    .filter((item) => item.size > 1 && item.size <= MAX_CLASS_SIZE)
    .sort((left, right) => left.size - right.size);
  if (!specific.length) return { terms: [], peers: [] };
  const primary = specific[0];
  const terms = [categoryTerm(primary.label)].filter(Boolean);

  // Rarer shared categories count for more, so "café chain" outweighs "retail chain".
  const weight = new Map(specific.map((item) => [`${item.property}:${item.id}`, Math.log(TOTAL_ENTITIES / item.size)]));
  const rows = await sparql(`SELECT ?peer ?peerLabel ?links ?p ?k WHERE {
    VALUES (?p ?k) { ${specific.map((item) => `(wdt:${item.property} wd:${item.id})`).join(' ')} }
    ?peer ?p ?k . ?peer wikibase:sitelinks ?links .
    FILTER(?peer != wd:${entity.id} && ?links >= 10)
    FILTER NOT EXISTS { ?peer wdt:P576 [] }
    FILTER NOT EXISTS { ?peer wdt:P749 wd:${entity.id} }
    FILTER NOT EXISTS { wd:${entity.id} wdt:P749 ?peer }
    SERVICE wikibase:label { bd:serviceParam wikibase:language "en". } }`, fetchJson);
  const scored = new Map();
  for (const row of rows) {
    const id = qid(row.peer.value);
    const key = `${qid(row.p.value)}:${qid(row.k.value)}`;
    const current = scored.get(id) || { name: row.peerLabel.value, links: Number(row.links.value), score: 0, keys: new Set() };
    if (!current.keys.has(key)) {
      current.keys.add(key);
      current.score += weight.get(key) || 0;
    }
    scored.set(id, current);
  }
  const maxWeight = Math.max(...weight.values());
  const primaryKey = `${primary.property}:${primary.id}`;
  const peers = [...scored.values()]
    .filter((peer) => peer.keys.has(primaryKey) && peer.score >= 0.8 * maxWeight && !/^Q\d+$/.test(peer.name))
    .sort((left, right) => (right.score + Math.log10(right.links)) - (left.score + Math.log10(left.links)))
    .slice(0, MAX_PEERS)
    .map((peer) => peer.name);
  return { terms, peers };
}

const PROFILE_TTL_MS = 24 * 60 * 60 * 1000;
const profileCache = new Map();

// Business categories change rarely; cache successes per brand for a day.
async function wikidataProfile(brand, fetchJson = defaultFetchJson) {
  const useCache = fetchJson === defaultFetchJson;
  const key = normalize(brand);
  const cached = useCache ? profileCache.get(key) : null;
  if (cached && Date.now() - cached.storedAt < PROFILE_TTL_MS) return cached.profile;
  const profile = await lookupProfile(brand, fetchJson);
  if (useCache) profileCache.set(key, { storedAt: Date.now(), profile });
  return profile;
}

module.exports = { wikidataProfile, categoryTerm };
