const assert = require("node:assert/strict");
const { test } = require("node:test");
const {
  cleanBrandTitle,
  isMoneyTransferBrand,
  listedSymbol,
  regionalPeerNames,
} = require("./peerBrands");

test("store titles are reduced to the company name", () => {
  assert.equal(cleanBrandTitle("Remitly: Money transfer app"), "Remitly");
  assert.equal(cleanBrandTitle("PayPal - Pay, Send, Save"), "PayPal");
  assert.equal(cleanBrandTitle("Wells Fargo Mobile®"), "Wells Fargo");
  assert.equal(cleanBrandTitle("Taptap Send: Money Transfer"), "Taptap Send");
  assert.equal(cleanBrandTitle("Citibank HK – Mobile Banking"), "Citibank HK");
  assert.equal(cleanBrandTitle("Western Union"), "Western Union");
  assert.equal(cleanBrandTitle(undefined), "");
});

test("listed symbols resolve from store titles and never for private companies", () => {
  assert.equal(listedSymbol("Remitly: Money transfer app"), "RELY");
  assert.equal(listedSymbol("PayPal - Pay, Send, Save"), "PYPL");
  assert.equal(listedSymbol("wise"), "WISE.L");
  assert.equal(listedSymbol("MoneyGram"), null);
  assert.equal(listedSymbol("Revolut"), null);
  assert.equal(listedSymbol("Taptap Send: Money Transfer"), null);
});

test("regional peers follow the country and exclude the selected brand", () => {
  assert.ok(regionalPeerNames("Western Union", "IN").includes("Wise"));
  assert.ok(regionalPeerNames("Western Union", "PH").includes("GCash"));
  assert.ok(
    regionalPeerNames("Western Union", "AE").includes("Al Ansari Exchange"),
  );
  assert.ok(!regionalPeerNames("Wise", "GB").includes("Wise"));
  assert.ok(regionalPeerNames("Western Union", "ZZ").length > 0);
  assert.deepEqual(regionalPeerNames("Acme Coffee", "US"), []);
  assert.equal(isMoneyTransferBrand("Western Union"), true);
  assert.equal(isMoneyTransferBrand("Acme Coffee"), false);
});
