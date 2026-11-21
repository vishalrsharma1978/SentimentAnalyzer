import assert from "node:assert/strict";
import { test } from "node:test";
import { averageTotalCost, feeCellFor, hasAnyFee } from "./transferFeeView.ts";

const fee = (provider, feeAmount, total, extra = {}) => ({
  provider,
  fee: feeAmount,
  feeCurrency: "USD",
  exchangeRate: 18.6267,
  midMarketRate: 19.163,
  totalCostPercent: total,
  receivedAmount: 3688.27,
  sendAmount: 200,
  sendCurrency: "USD",
  receiveCurrency: "MXN",
  from: "US",
  to: "MX",
  collectedAt: "2026-11-20T05:37:03Z",
  source: "Wise price comparison",
  ...extra,
});
const live = (fees) => ({
  corridor: { from: "US", fromCurrency: "USD", to: "MX", toCurrency: "MXN" },
  fees,
});
// Stands in for the curated World Bank table: only PayPal and Wise have a range.
const curated = (countryCode, name) =>
  countryCode === "US" && ["PayPal", "Wise"].includes(name)
    ? { low: 4, high: 6, corridor: "US→MX", amount: "$200" }
    : null;

test("a live quote shows the fee, total cost, exchange rate and what the recipient gets", () => {
  const cell = feeCellFor(
    "Western Union",
    "US",
    live({ "Western Union": fee("Western Union", 1.99, 3.8) }),
    curated,
  );
  assert.equal(cell.kind, "live");
  assert.equal(cell.fee, "1.99 USD");
  assert.equal(cell.total, "3.8% total");
  assert.equal(cell.rate, "1 USD = 18.6267 MXN");
  assert.equal(cell.received, "Recipient gets 3,688.27 MXN");
  assert.equal(cell.corridor, "US→MX");
  assert.equal(cell.amount, "200 USD");
});

test("a zero fee still shows as a fee, and a missing mid-market rate hides only the total", () => {
  const cell = feeCellFor(
    "Xoom",
    "US",
    live({ Xoom: fee("Xoom", 0, null) }),
    curated,
  );
  assert.equal(cell.kind, "live");
  assert.equal(cell.fee, "0 USD");
  assert.equal(cell.total, null);
  assert.equal(cell.tone, null);
});

test("each live quote is compared with the average of all live quotes", () => {
  const fees = {
    Wise: fee("Wise", 2.35, 1.2),
    "Western Union": fee("Western Union", 1.99, 3.8),
    Remitly: fee("Remitly", 1.99, 4.4),
  };
  assert.equal(Number(averageTotalCost(fees).toFixed(2)), 3.13);
  assert.equal(feeCellFor("Wise", "US", live(fees), curated).tone, "below");
  assert.equal(feeCellFor("Remitly", "US", live(fees), curated).tone, "above");
  assert.match(
    feeCellFor("Wise", "US", live(fees), curated).deltaText,
    /below live average/,
  );
});

test("one live quote alone has nothing to be compared with", () => {
  const fees = { Wise: fee("Wise", 2.35, 1.2) };
  assert.equal(averageTotalCost(fees), null);
  assert.equal(feeCellFor("Wise", "US", live(fees), curated).tone, null);
});

test("without a live quote the curated World Bank range is used and labelled as such", () => {
  const cell = feeCellFor(
    "PayPal",
    "US",
    live({ Wise: fee("Wise", 2.35, 1.2) }),
    curated,
  );
  assert.equal(cell.kind, "range");
  assert.equal(cell.range, "4.0–6.0%");
  assert.equal(cell.source, "World Bank 2024");
  assert.equal(cell.corridor, "US→MX");
  assert.equal(feeCellFor("Wise", "US", null, curated).kind, "range");
});

test("a provider with neither a live quote nor a curated range shows nothing", () => {
  assert.deepEqual(feeCellFor("Intermex", "US", live({}), curated), {
    kind: "none",
  });
  assert.deepEqual(feeCellFor("Western Union", "JP", null, curated), {
    kind: "none",
  });
});

test("the column is only worth showing when some competitor has a fee", () => {
  assert.equal(
    hasAnyFee(["Intermex", "Chase"], "US", live({}), curated),
    false,
  );
  assert.equal(hasAnyFee(["Intermex", "Wise"], "US", live({}), curated), true);
  assert.equal(
    hasAnyFee(
      ["Intermex"],
      "US",
      live({ Intermex: fee("Intermex", 1, 2) }),
      curated,
    ),
    true,
  );
});
