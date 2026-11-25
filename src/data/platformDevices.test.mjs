import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDeviceMentions } from "./deviceMentions.ts";
import { summarizePlatformDevices as summarize } from "./platformDevices.ts";

const summarizePlatformDevices = (reviews, platform) =>
  summarize(reviews, platform, detectDeviceMentions);

const review = (source, text, sentiment, rating) => ({
  source,
  text,
  sentiment,
  rating,
});

const reviews = [
  review("Apple App Store", "Login fails on my iPhone 14 Pro", "negative", 1),
  review(
    "Apple App Store",
    "iPhone 14 Pro crashes after iOS 17 update",
    "negative",
    1,
  ),
  review("Apple App Store", "Great on iPhone 14 Pro", "positive", 5),
  review("Apple App Store", "Works well on my iPhone 13", "positive", 5),
  review("Apple App Store", "Simple and fast", "positive", 5),
  review("Google Play", "Broken on Samsung Galaxy S23", "negative", 1),
  review("Google Play", "Galaxy S23 app freezes", "negative", 2),
  review("Google Play", "Fine on Pixel 8", "positive", 4),
  review("Google Play", "Better than my iPhone version", "positive", 4),
];

test("groups reviews by the device each platform's reviewers named", () => {
  const ios = summarizePlatformDevices(reviews, "ios");
  assert.equal(ios.source, "Apple App Store");
  assert.equal(ios.totalReviews, 5);
  assert.equal(ios.namingDevice, 4);
  const pro = ios.rows.find((row) => row.label === "iPhone 14 Pro");
  assert.deepEqual([pro.reviews, pro.negative, pro.positive], [3, 2, 1]);
  assert.equal(Math.round(pro.negativeShare * 100), 67);
});

test("calls out a failing device only when most of its reviews are negative with enough samples", () => {
  const ios = summarizePlatformDevices(reviews, "ios");
  assert.deepEqual(
    ios.failingRows.map((row) => row.label),
    ["iPhone 14 Pro"],
  );
  assert.equal(
    ios.rows.find((row) => row.label === "iPhone 13").failing,
    false,
  );
  assert.equal(ios.rows[0].label, "iPhone 14 Pro", "failing rows sort first");

  const single = summarizePlatformDevices(
    [review("Apple App Store", "iPhone 12 is broken", "negative", 1)],
    "ios",
  );
  assert.equal(
    single.rows[0].failing,
    false,
    "one negative review is not enough",
  );
});

test("keeps each platform to its own store and device family", () => {
  const android = summarizePlatformDevices(reviews, "android");
  assert.equal(android.totalReviews, 4);
  assert.deepEqual(android.rows.map((row) => row.label).sort(), [
    "Galaxy S23",
    "Pixel 8",
  ]);
  assert.deepEqual(
    android.failingRows.map((row) => row.label),
    ["Galaxy S23"],
  );
  assert.ok(!android.rows.some((row) => /iphone/i.test(row.label)));
});

test("returns an empty table when no review names a device", () => {
  const none = summarizePlatformDevices(
    [review("Google Play", "Fast and reliable", "positive", 5)],
    "android",
  );
  assert.deepEqual(
    [none.totalReviews, none.namingDevice, none.rows.length],
    [1, 0, 0],
  );
});
