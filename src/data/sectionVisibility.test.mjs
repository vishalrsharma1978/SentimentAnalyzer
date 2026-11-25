import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";

const store = new Map();
globalThis.localStorage = {
  getItem: (key) => (store.has(key) ? store.get(key) : null),
  setItem: (key, value) => store.set(key, String(value)),
  removeItem: (key) => store.delete(key),
};

const { isSectionHidden, loadHiddenSections, setSectionHidden } =
  await import("./sectionVisibility.ts");

beforeEach(() => store.clear());

test("a section is visible until the user hides it", () => {
  assert.equal(isSectionHidden("competitive-intelligence"), false);
  assert.deepEqual(loadHiddenSections(), []);
});

test("hiding is remembered and showing clears it", () => {
  assert.equal(setSectionHidden("competitive-intelligence", true), true);
  assert.equal(isSectionHidden("competitive-intelligence"), true);
  assert.equal(setSectionHidden("competitive-intelligence", true), true);
  assert.deepEqual(loadHiddenSections(), ["competitive-intelligence"]);
  setSectionHidden("competitive-intelligence", false);
  assert.equal(isSectionHidden("competitive-intelligence"), false);
});

test("ignores corrupt or unknown stored values", () => {
  store.set("pulseboard.hiddenSections", "{not json");
  assert.deepEqual(loadHiddenSections(), []);
  store.set("pulseboard.hiddenSections", JSON.stringify(["something-else", 7]));
  assert.deepEqual(loadHiddenSections(), []);
});
