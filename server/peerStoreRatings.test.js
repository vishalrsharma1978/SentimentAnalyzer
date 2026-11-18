const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  appleRatingForPeer,
  sameCompany,
  withStoreRatings,
} = require("./peerStoreRatings");

const quiet = { error() {} };
const ios = (trackName, sellerName, averageUserRating, userRatingCount) => ({
  trackName,
  sellerName,
  artistName: sellerName,
  averageUserRating,
  userRatingCount,
});
const store = (results) => async () => ({ results });

test("matches an App Store listing only when name and publisher agree", () => {
  const remitly = ios(
    "Remitly: Send money & transfer",
    "Remitly Inc",
    4.87,
    2833956,
  );
  assert.equal(
    sameCompany(remitly, "Remitly: Money transfer app", "Remitly"),
    true,
  );
  assert.equal(
    sameCompany(
      ios("Wise - Global Money", "Wise Payments Ltd", 4.79, 1),
      "Wise: International Transfers",
      "Wise Payments Limited",
    ),
    true,
  );
  assert.equal(
    sameCompany(
      ios("Waze Navigation", "waze", 4.77, 1),
      "Wise: International Transfers",
      "Wise Payments Limited",
    ),
    false,
  );
  assert.equal(
    sameCompany(
      ios("Remitly Fan Club", "Someone Else", 4, 1),
      "Remitly",
      "Remitly",
    ),
    false,
  );
  assert.equal(sameCompany(remitly, "", ""), false);
});

test("returns the matching App Store rating and ignores unrelated results", async () => {
  const fetchJson = store([
    ios("Taptap Send: Money Transfer", "Taptap Send, Inc.", 4.74, 102621),
    ios("Remitly: Send money & transfer", "Remitly Inc", 4.87, 2833956),
  ]);
  assert.deepEqual(
    await appleRatingForPeer(
      { name: "Remitly: Money transfer app", developer: "Remitly" },
      "US",
      fetchJson,
    ),
    { rating: 4.87, reviewCount: 2833956 },
  );
  assert.equal(
    await appleRatingForPeer(
      { name: "Unknown Peer", developer: "Unknown" },
      "US",
      fetchJson,
    ),
    null,
  );
  assert.equal(
    await appleRatingForPeer(
      { name: "Remitly" },
      "US",
      store([ios("Remitly", "Remitly Inc", 0, 0)]),
    ),
    null,
  );
});

test("each peer gets both store ratings and a combined average", async () => {
  const fetchJson = store([
    ios("Remitly: Send money & transfer", "Remitly Inc", 4.8, 100),
  ]);
  const [peer] = await withStoreRatings(
    [
      {
        name: "Remitly: Money transfer app",
        developer: "Remitly",
        rating: 4.6,
        reviewCount: 300,
      },
    ],
    { country: "US", fetchJson, log: quiet },
  );
  assert.deepEqual(peer.google, { rating: 4.6, reviewCount: 300 });
  assert.deepEqual(peer.apple, { rating: 4.8, reviewCount: 100 });
  assert.ok(Math.abs(peer.rating - 4.7) < 1e-9);
  assert.equal(peer.reviewCount, 400);
});

test("a peer missing from one store keeps the other store's rating and a failed lookup never drops the peer", async () => {
  const onlyGoogle = await withStoreRatings(
    [{ name: "Acme Pay", developer: "Acme", rating: 4.2, reviewCount: 50 }],
    { country: "US", fetchJson: store([]), log: quiet },
  );
  assert.equal(onlyGoogle[0].apple, null);
  assert.equal(onlyGoogle[0].rating, 4.2);
  const failing = await withStoreRatings(
    [{ name: "Acme Pay", developer: "Acme", rating: 4.2, reviewCount: 50 }],
    {
      country: "US",
      fetchJson: async () => {
        throw new Error("offline");
      },
      log: quiet,
    },
  );
  assert.equal(failing[0].apple, null);
  assert.equal(failing[0].google.rating, 4.2);
});
