const { test } = require("node:test");
const assert = require("node:assert/strict");
const { wikidataProfile, categoryTerm } = require("./wikidataProfile");

const uri = (id) => `http://www.wikidata.org/entity/${id}`;
const prop = (id) => `http://www.wikidata.org/prop/direct/${id}`;
const claim = (id) => ({ mainsnak: { datavalue: { value: { id } } } });

function mockWikidata({ hits, entities, sizes = [], peers = [] }) {
  const urls = [];
  const fetchJson = async (url) => {
    urls.push(url);
    if (url.includes("wbsearchentities")) return { search: hits };
    if (url.includes("wbgetentities")) return { entities };
    if (decodeURIComponent(url).includes("COUNT(?m)"))
      return { results: { bindings: sizes } };
    return { results: { bindings: peers } };
  };
  return { fetchJson, urls };
}

test("categoryTerm strips filler words", () => {
  assert.equal(categoryTerm("coffeehouse chain"), "coffeehouse");
  assert.equal(
    categoryTerm("fast food restaurant chain"),
    "fast food restaurant",
  );
  assert.equal(categoryTerm("Q12345"), null);
});

test("resolves a brand by label prefix and returns specific terms and weighted peers", async () => {
  const { fetchJson } = mockWikidata({
    hits: [
      { id: "Q2", label: "chipotle", description: "smoke-dried jalapeño" },
      {
        id: "Q1",
        label: "Chipotle Mexican Grill",
        description: "American restaurant chain",
      },
    ],
    entities: {
      Q1: {
        claims: { P31: [claim("Q10")], P452: [claim("Q11")] },
        sitelinks: { en: {} },
      },
      Q2: { claims: {}, sitelinks: {} },
    },
    sizes: [
      {
        p: { value: prop("P31") },
        k: { value: uri("Q10") },
        kLabel: { value: "fast casual restaurant chain" },
        n: { value: "40" },
      },
      {
        p: { value: prop("P452") },
        k: { value: uri("Q11") },
        kLabel: { value: "restaurant industry" },
        n: { value: "3000" },
      },
    ],
    peers: [
      {
        peer: { value: uri("Q20") },
        peerLabel: { value: "Qdoba" },
        links: { value: "15" },
        p: { value: prop("P31") },
        k: { value: uri("Q10") },
      },
      {
        peer: { value: uri("Q21") },
        peerLabel: { value: "Generic Diner" },
        links: { value: "90" },
        p: { value: prop("P452") },
        k: { value: uri("Q11") },
      },
    ],
  });
  const profile = await wikidataProfile("Chipotle", fetchJson);
  assert.deepEqual(profile.terms, ["fast casual restaurant"]);
  assert.deepEqual(profile.peers, ["Qdoba"]);
});

test("popular peers sharing only broader categories cannot outrank the specific business match", async () => {
  const row = (id, label, size) => ({
    p: { value: prop("P31") },
    k: { value: uri(id) },
    kLabel: { value: label },
    n: { value: String(size) },
  });
  const match = (id, name, category, links) => ({
    peer: { value: uri(id) },
    peerLabel: { value: name },
    links: { value: String(links) },
    p: { value: prop("P31") },
    k: { value: uri(category) },
  });
  const { fetchJson } = mockWikidata({
    hits: [{ id: "Q1", label: "Starbucks", description: "coffeehouse chain" }],
    entities: {
      Q1: {
        id: "Q1",
        claims: { P31: [claim("Q10"), claim("Q11"), claim("Q12")] },
      },
    },
    sizes: [
      row("Q10", "coffeehouse chain", 100),
      row("Q11", "restaurant chain", 400),
      row("Q12", "retail chain", 600),
    ],
    peers: [
      match("Q20", "Coffee Peer", "Q10", 10),
      match("Q21", "Burger Palace", "Q11", 500),
      match("Q21", "Burger Palace", "Q12", 500),
    ],
  });
  assert.deepEqual(await wikidataProfile("Starbucks", fetchJson), {
    terms: ["coffeehouse"],
    peers: ["Coffee Peer"],
  });
});

test("concurrent lookups of one brand share a single Wikidata request", async (t) => {
  // The first request stays pending until the test releases it, so all three callers are
  // provably waiting on the same in-flight lookup. No timer is involved.
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  // mock.method restores the real fetch when this test ends, even if an assertion throws,
  // so other tests never see the patched version.
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    await gate;
    return { ok: true, status: 200, json: async () => ({ search: [] }) };
  });

  // Every market asks for the same brand profile at once; only one lookup may go out.
  const lookups = Promise.all([
    wikidataProfile("Sharedco"),
    wikidataProfile("Sharedco"),
    wikidataProfile("Sharedco"),
  ]);
  assert.equal(fetchMock.mock.callCount(), 1);
  release();
  const profiles = await lookups;
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(profiles, [profiles[0], profiles[0], profiles[0]]);

  // A later call is served from the cache without another request.
  await wikidataProfile("Sharedco");
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("returns an empty profile when no business entity matches", async () => {
  const { fetchJson, urls } = mockWikidata({
    hits: [{ id: "Q5", label: "Unrelated Thing", description: "a song" }],
    entities: {},
  });
  assert.deepEqual(await wikidataProfile("Brewzz", fetchJson), {
    terms: [],
    peers: [],
  });
  assert.equal(urls.length, 1);
});
