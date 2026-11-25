import assert from "node:assert/strict";
import { test } from "node:test";
import {
  PAY_IN_OPTIONS,
  PAY_OUT_OPTIONS,
  corridorRequest,
  defaultReceiverFor,
  findTransferCountry,
  formatMoney,
  isSameCorridor,
} from "./transferCorridors.ts";

test("finds a country by code and ignores case", () => {
  assert.equal(findTransferCountry("gb")?.currency, "GBP");
  assert.equal(findTransferCountry("ZZ"), null);
  assert.equal(findTransferCountry(undefined), null);
});

test("prefills a receiver that differs from the sender", () => {
  assert.equal(defaultReceiverFor("US").code, "MX");
  assert.equal(defaultReceiverFor("GB").code, "IN");
  assert.equal(defaultReceiverFor("IN").code, "US");
  for (const code of ["US", "GB", "IN", "PH", "MX", "JP", "BR", "NG"]) {
    assert.notEqual(defaultReceiverFor(code).code, code);
  }
});

test("builds the comparison request from the two countries and pay-in method", () => {
  const sender = findTransferCountry("GB");
  const receiver = findTransferCountry("IN");
  assert.deepEqual(corridorRequest(sender, receiver, "DEBIT", 500), {
    fromCountry: "GB",
    toCountry: "IN",
    fromCurrency: "GBP",
    toCurrency: "INR",
    payIn: "DEBIT",
    amount: 500,
  });
  assert.equal(isSameCorridor(sender, sender), true);
  assert.equal(isSameCorridor(sender, receiver), false);
});

test("pay-in drives quotes while pay-out is informational only", () => {
  assert.deepEqual(
    PAY_IN_OPTIONS.map((option) => option.id),
    ["BANK_TRANSFER", "DEBIT", "CREDIT"],
  );
  assert.ok(PAY_OUT_OPTIONS.length >= 3);
  const request = corridorRequest(
    findTransferCountry("US"),
    findTransferCountry("MX"),
    "CREDIT",
    200,
  );
  assert.equal("payOut" in request, false);
});

test("formats money in the right currency", () => {
  assert.equal(formatMoney(59963.32, "INR"), "₹59,963");
  assert.equal(formatMoney(12.5, "USD"), "$12.50");
  assert.equal(formatMoney(5, "XXX_BAD"), "5.00 XXX_BAD");
});
