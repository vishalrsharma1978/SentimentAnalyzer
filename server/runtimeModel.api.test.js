const assert = require("node:assert/strict");
const { test } = require("node:test");
const express = require("express");
const { registerModelRoute } = require("./runtimeModel");

const config = {
  brand: "Unlisted Brand",
  appName: "",
  website: "https://example.com",
  businessType: "Other",
  country: "IN",
  platforms: ["Web"],
  sources: ["Reddit"],
  months: 1,
};

async function serve(t, overrides = {}) {
  const app = express();
  app.use(express.json());
  registerModelRoute(app, { log: { error() {} }, ...overrides });
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(
    () =>
      new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }),
  );
  return (body) =>
    fetch(`http://127.0.0.1:${server.address().port}/api/models/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
}

test("model API returns explicit unavailable evidence for an arbitrary brand, not demo data", async (t) => {
  const request = await serve(t);
  const response = await request(config);
  assert.equal(response.status, 200);
  const model = await response.json();
  assert.equal(model.country, "IN");
  assert.equal(model.status, "unavailable");
  assert.deepEqual(model.reviews, []);
  assert.deepEqual(model.competitors, []);
  assert.equal(model.statistics.rating, null);
  assert.equal(model.statistics.sentiment.positiveShare, null);
  const invalid = await request({ ...config, brand: "" });
  assert.equal(invalid.status, 400);
  assert.match((await invalid.json()).error, /brand/);
});

test("model API reports per-source collection errors and still returns verified ratings", async (t) => {
  const request = await serve(t, {
    stores: async () => ({
      google: { rating: 4.3, reviewCount: 123 },
      apple: { rating: null, reviewCount: 0 },
    }),
    reviews: async () => {
      throw new Error("Review source offline");
    },
    peers: async () => ({ apps: [], basis: "No verified peers" }),
    chart: async () => ({ rank: null, chartSize: 0, category: null }),
  });
  const response = await request({
    ...config,
    platforms: ["Mobile · Android"],
    sources: ["Google Play"],
  });
  assert.equal(response.status, 200);
  const model = await response.json();
  assert.equal(model.status, "limited");
  assert.equal(model.statistics.rating, 4.3);
  assert.ok(
    model.availability.some((source) => /Retry model/.test(source.reason)),
  );
});

test("model API bounds expensive concurrent builds and releases capacity afterward", async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let started = 0;
  const request = await serve(t, {
    stores: async () => {
      started += 1;
      await gate;
      return {
        google: { rating: null, reviewCount: 0 },
        apple: { rating: null, reviewCount: 0 },
      };
    },
    reviews: async () => [],
    peers: async () => ({ apps: [], basis: "No peers" }),
    chart: async () => ({ rank: null, chartSize: 0, category: null }),
  });
  t.after(() => release());
  const body = {
    ...config,
    platforms: ["Mobile · Android"],
    sources: ["Google Play"],
  };
  // Distinct brands: identical in-flight requests are shared and do not consume capacity.
  const pending = Array.from({ length: 4 }, (_, index) =>
    request({ ...body, brand: `Brand ${index}` }),
  );
  for (let attempt = 0; started < 4 && attempt < 100; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  assert.equal(started, 4);
  assert.equal((await request({ ...body, brand: "Brand 4" })).status, 429);
  release();
  assert.ok(
    (await Promise.all(pending)).every((response) => response.status === 200),
  );
  assert.equal((await request({ ...body, brand: "Brand 4" })).status, 200);
});

test("model API shares identical in-flight evaluations and caches complete results", async (t) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  let storeCalls = 0;
  const request = await serve(t, {
    stores: async () => {
      storeCalls += 1;
      await gate;
      return {
        google: { rating: 4.4, reviewCount: 900 },
        apple: { rating: null, reviewCount: 0 },
      };
    },
    reviews: async () => [
      {
        source: "Google Play",
        author: "A",
        text: "Great app",
        rating: 5,
        publishedAt: new Date(Date.now() - 60000).toISOString(),
        sourceId: "1",
      },
    ],
    peers: async () => ({
      apps: [{ name: "Peer", rating: 4.1, reviewCount: 900 }],
      basis: "Peers",
    }),
    chart: async () => ({ rank: 3, chartSize: 100, category: "Finance" }),
    quotes: async () => [],
  });
  t.after(() => release());
  const body = {
    ...config,
    platforms: ["Mobile · Android"],
    sources: ["Google Play"],
  };
  const pending = [request(body), request(body), request(body)];
  await new Promise((resolve) => setTimeout(resolve, 50));
  release();
  const responses = await Promise.all(pending);
  assert.ok(responses.every((response) => response.status === 200));
  assert.equal(storeCalls, 1);
  const first = await responses[0].json();
  assert.equal(first.status, "ready");
  const again = await request(body);
  assert.deepEqual(await again.json(), first);
  assert.equal(storeCalls, 1);
});
