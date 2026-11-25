import assert from "node:assert/strict";
import { test } from "node:test";
import { detectDeviceMentions } from "./deviceMentions.ts";

const labels = (text) => detectDeviceMentions(text).map((item) => item.label);

test("detects devices and operating systems the reviewer named", () => {
  assert.deepEqual(labels("Works fine on my iPhone 14 Pro Max"), [
    "iPhone 14 Pro Max",
  ]);
  assert.deepEqual(labels("Crashes on my Samsung Galaxy S23 Ultra"), [
    "Galaxy S23 Ultra",
  ]);
  assert.deepEqual(labels("Since the Android 14 update it fails"), [
    "Android 14",
  ]);
  assert.deepEqual(labels("Broken after iOS 17.2"), ["iOS 17"]);
  assert.deepEqual(labels("Google Pixel 8 Pro keeps logging me out"), [
    "Pixel 8 Pro",
  ]);
});

test("reports both device and operating system when both are written", () => {
  const found = detectDeviceMentions(
    "On my iPhone 13 running iOS 16 it freezes",
  );
  assert.deepEqual(
    found.map((item) => [item.label, item.kind]),
    [
      ["iPhone 13", "device"],
      ["iOS 16", "os"],
    ],
  );
});

test("returns nothing when the review names no device", () => {
  assert.deepEqual(labels("Fast and cheap transfers, great app"), []);
  assert.deepEqual(labels("Customer service never replied"), []);
  assert.deepEqual(labels(""), []);
});

test("does not match look-alike words", () => {
  assert.deepEqual(
    labels("The pictures look pixelated and the radios are fine"),
    [],
  );
  assert.deepEqual(labels("Their policies are unclear"), []);
  assert.deepEqual(labels("It was a galaxy of problems"), []);
});
