const assert = require("node:assert/strict");
const { test } = require("node:test");
const { collectSocialReviews, derivedRating } = require("./socialReviews");

const reply =
  (body, ok = true) =>
  async () => ({
    ok,
    status: ok ? 200 : 500,
    json: async () => body,
  });

test("derives a rating from text polarity when the feed has no stars", () => {
  assert.equal(derivedRating("Terrible, hidden fees and a delay"), 1);
  assert.equal(derivedRating("Love it, fast and reliable"), 5);
  assert.equal(derivedRating("Sent money yesterday"), 3);
});

test("returns no reviews when neither API credentials nor the scraper are configured", async () => {
  delete process.env.TWITTER_BEARER_TOKEN;
  delete process.env.SCRAPY_SERVICE_URL;
  assert.deepEqual(
    await collectSocialReviews("X / Twitter", "Wise", { fetchImpl: reply({}) }),
    [],
  );
});

test("normalizes X API posts into dated reviews", async () => {
  process.env.TWITTER_BEARER_TOKEN = "token";
  const reviews = await collectSocialReviews("X / Twitter", "Wise", {
    fetchImpl: reply({
      data: [
        {
          id: "1",
          author_id: "9",
          text: "Wise is great and fast",
          created_at: "2026-01-02T00:00:00Z",
        },
        {
          id: "2",
          author_id: "8",
          text: "   ",
          created_at: "2026-01-02T00:00:00Z",
        },
      ],
    }),
  });
  delete process.env.TWITTER_BEARER_TOKEN;
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].source, "X / Twitter");
  assert.equal(reviews[0].rating, 5);
  assert.equal(reviews[0].ratingDerived, true);
  assert.equal(reviews[0].publishedAt, "2026-01-02T00:00:00.000Z");
});

test("Trustpilot uses the Business API and never calls the Scrapy service", async () => {
  process.env.TRUSTPILOT_API_KEY = "key";
  process.env.SCRAPY_SERVICE_URL = "http://localhost:8001";
  const urls = [];
  const fetchImpl = async (url) => {
    urls.push(String(url));
    const body = String(url).includes("/find")
      ? { id: "bu1" }
      : {
          reviews: [
            {
              id: "r1",
              stars: 2,
              title: "Slow",
              text: "Took days",
              createdAt: "2026-03-01T00:00:00Z",
              consumer: { displayName: "Lee" },
            },
          ],
        };
    return { ok: true, status: 200, json: async () => body };
  };
  const reviews = await collectSocialReviews("Trustpilot", "Wise", {
    fetchImpl,
    trustpilotDomain: () => "wise.com",
  });
  assert.equal(reviews.length, 1);
  assert.equal(reviews[0].rating, 2);
  assert.equal(reviews[0].text, "Slow — Took days");
  assert.ok(urls.every((url) => url.startsWith("https://api.trustpilot.com/")));

  delete process.env.TRUSTPILOT_API_KEY;
  urls.length = 0;
  const none = await collectSocialReviews("Trustpilot", "Wise", {
    fetchImpl,
    trustpilotDomain: () => "wise.com",
  });
  delete process.env.SCRAPY_SERVICE_URL;
  assert.deepEqual(none, []);
  assert.equal(urls.length, 0);
});

test("falls back to the Scrapy service when the API is not configured", async () => {
  delete process.env.REVIEWS_IO_API_KEY;
  process.env.SCRAPY_SERVICE_URL = "http://localhost:8001";
  const reviews = await collectSocialReviews("Reviews.io", "Wise", {
    fetchImpl: reply({
      reviews: [
        {
          id: "a",
          author: "Sam",
          rating: 4,
          text: "Good service",
          publishedAt: "2026-02-01",
        },
      ],
    }),
  });
  delete process.env.SCRAPY_SERVICE_URL;
  assert.equal(reviews[0].rating, 4);
  assert.equal(reviews[0].ratingDerived, false);
});
