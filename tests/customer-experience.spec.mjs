import { test, expect } from "@playwright/test";
import { openExplorer } from "./explorer-fixture.mjs";

const quote = (provider, rank, received, fee, rate, delivery, rating) => ({
  provider,
  kind: "Money transfer",
  logo: null,
  sendAmount: 500,
  fee,
  exchangeRate: rate,
  midMarketRate: 18.9,
  receivedAmount: received,
  totalCost: 4.2,
  totalCostPercent: 0.84,
  delivery,
  collectedAt: "2026-11-25T07:00:00Z",
  rating,
  ratingBasis: delivery
    ? "Amount in hand and delivery speed"
    : "Amount in hand",
  lessThanBest: Number((9500 - received).toFixed(2)),
  rank,
  best: rank === 1,
});

const body = (payIn, label) => ({
  request: {
    fromCountry: "US",
    toCountry: "MX",
    fromCurrency: "USD",
    toCurrency: "MXN",
    payIn,
    payInLabel: label,
    amount: 500,
  },
  midMarketRate: 18.9,
  providers: [
    quote("Remitly", 1, 9500, 0, 19.0, null, 5),
    quote(
      "Wise",
      2,
      9450,
      1.99,
      18.95,
      { hours: 0.0003, label: "Within seconds" },
      4.4,
    ),
    quote("Xoom", 3, 9300, 1.99, 18.7, null, 2.1),
  ],
  source: "Wise price comparison",
  fetchedAt: "2026-11-25T07:05:00Z",
});

async function openCustomerExperience(page) {
  const requests = [];
  await openExplorer(page);
  await page.route("**/api/fx-rate?**", async (route) => {
    const url = new URL(route.request().url());
    await route.fulfill({
      json: {
        from: url.searchParams.get("from"),
        to: url.searchParams.get("to"),
        rate: 18.9,
        source: "Wise mid-market rate",
        fetchedAt: "2026-11-25T07:00:00Z",
      },
    });
  });
  await page.route("**/api/transfer-compare?**", async (route) => {
    const url = new URL(route.request().url());
    requests.push(Object.fromEntries(url.searchParams));
    const payIn = url.searchParams.get("payIn");
    const label =
      payIn === "DEBIT"
        ? "Debit card"
        : payIn === "CREDIT"
          ? "Credit card"
          : "Bank transfer";
    await route.fulfill({ json: body(payIn, label) });
  });
  await page.getByText("Competitors", { exact: true }).first().click();
  const card = page.getByTestId("customer-experience");
  await expect(card).toBeVisible();
  return { card, requests };
}

test("sender is prefilled from the selected market and Compare price shows the best provider", async ({
  page,
}) => {
  const { card, requests } = await openCustomerExperience(page);
  await expect(card.getByLabel("Sender country: United States")).toBeVisible();
  await expect(card.getByLabel("Receiver country: Mexico")).toBeVisible();
  await expect(card.getByTestId("compare-results")).toHaveCount(0);

  await card
    .getByRole("button", { name: "Compare price", exact: true })
    .click();
  await expect(card.getByTestId("compare-results")).toBeVisible();
  expect(requests).toHaveLength(1);
  expect(requests[0]).toMatchObject({
    fromCountry: "US",
    toCountry: "MX",
    fromCurrency: "USD",
    toCurrency: "MXN",
    payIn: "BANK_TRANSFER",
    amount: "500",
  });
  expect(requests[0]).not.toHaveProperty("payOut");

  const recommendation = card.getByTestId("recommendation");
  await expect(recommendation).toContainText("Remitly gets Mexico the most");
  const best = card.getByTestId("best-provider");
  await expect(best).toContainText("Best option");
  await expect(best).toContainText("Free");
  await expect(card.getByTestId("provider-row")).toHaveCount(2);
  await expect(card.getByText("Within seconds")).toBeVisible();
  await expect(card.getByText("Not stated").first()).toBeVisible();
});

test("changing the pay-in method re-prices live, pay-out does not", async ({
  page,
}) => {
  const { card, requests } = await openCustomerExperience(page);
  await card
    .getByRole("button", { name: "Compare price", exact: true })
    .click();
  await expect(card.getByTestId("compare-results")).toBeVisible();
  expect(requests).toHaveLength(1);

  await card
    .getByRole("button", { name: "Pay out Cash pickup", exact: true })
    .click();
  await page.waitForTimeout(500);
  expect(requests).toHaveLength(1);
  await expect(
    card.getByText(/confirm cash pickup availability/),
  ).toBeVisible();

  await card
    .getByRole("button", { name: "Pay in Debit card", exact: true })
    .click();
  await expect.poll(() => requests.length).toBe(2);
  expect(requests[1].payIn).toBe("DEBIT");
  await expect(card.getByTestId("recommendation")).toContainText(
    "by debit card",
  );
});

test("the converted amount previews in the receiver currency and each provider shows a fee breakdown", async ({
  page,
}) => {
  const { card } = await openCustomerExperience(page);

  const converted = card.getByTestId("converted-amount");
  await expect(converted).toContainText("MX$9,450");
  await expect(card.getByText(/Mid-market rate 18.9/)).toBeVisible();

  await card.getByLabel("Amount to send").fill("1000");
  await expect(converted).toContainText("MX$18,900");

  await card
    .getByRole("button", { name: "Compare price", exact: true })
    .click();
  await expect(card.getByTestId("compare-results")).toBeVisible();
  await expect(card.getByTestId("fee-breakdown")).toHaveCount(0);

  await card
    .getByRole("button", { name: "Show fee breakdown for Wise", exact: true })
    .click();
  const breakdown = card.getByTestId("fee-breakdown");
  await expect(breakdown).toHaveCount(1);
  await expect(breakdown).toContainText("You send");
  await expect(breakdown).toContainText("$500.00");
  await expect(breakdown).toContainText("Wise fee deducted");
  await expect(breakdown).toContainText("− $1.99");
  await expect(breakdown).toContainText("Amount converted");
  await expect(breakdown).toContainText("$498.01");
  await expect(breakdown).toContainText("Exchange rate applied");
  await expect(breakdown).toContainText("× 18.9500");
  await expect(breakdown).toContainText("Receiver gets");
  await expect(breakdown).toContainText("MX$9,450");

  await card
    .getByRole("button", { name: "Hide fee breakdown for Wise", exact: true })
    .click();
  await expect(card.getByTestId("fee-breakdown")).toHaveCount(0);
});

test("the receiver country picker filters as the user types", async ({
  page,
}) => {
  const { card } = await openCustomerExperience(page);
  await card.getByLabel("Receiver country: Mexico").click();
  const search = card.getByTestId("receiver-country-search");
  await expect(search).toBeVisible();

  await search.fill("ind");
  await expect(
    card.getByRole("button", { name: "Receiver country option India" }),
  ).toBeVisible();
  await expect(
    card.getByRole("button", { name: "Receiver country option Germany" }),
  ).toHaveCount(0);

  // Currency codes match too.
  await search.fill("PHP");
  await expect(
    card.getByRole("button", { name: "Receiver country option Philippines" }),
  ).toBeVisible();

  await search.fill("zzz");
  await expect(card.getByText(/No country matches/)).toBeVisible();

  await search.fill("india");
  await card
    .getByRole("button", { name: "Receiver country option India" })
    .click();
  await expect(card.getByLabel("Receiver country: India")).toBeVisible();
});

test("the whole section can be hidden and shown again", async ({ page }) => {
  const { card } = await openCustomerExperience(page);
  await expect(card.getByLabel("Amount to send")).toBeVisible();

  await card
    .getByRole("button", { name: "Hide customer experience section" })
    .click();
  await expect(card.getByLabel("Amount to send")).toHaveCount(0);
  await expect(card.getByText("Customer experience")).toBeVisible();

  await card
    .getByRole("button", { name: "Show customer experience section" })
    .click();
  await expect(card.getByLabel("Amount to send")).toBeVisible();
});

test("the form blocks invalid input and reports a failed comparison", async ({
  page,
}) => {
  const { card } = await openCustomerExperience(page);
  const compare = card.getByRole("button", {
    name: "Compare price",
    exact: true,
  });

  await card.getByLabel("Amount to send").fill("5");
  await expect(
    card.getByText("Enter an amount between 10 and 100,000."),
  ).toBeVisible();
  await expect(compare).toBeDisabled();

  await card.getByLabel("Amount to send").fill("500");
  await card.getByLabel("Receiver country: Mexico").click();
  await card
    .getByRole("button", {
      name: "Receiver country option United States",
      exact: true,
    })
    .click({ force: true })
    .catch(() => {});
  await expect(compare).toBeEnabled();

  await page.route("**/api/transfer-compare?**", (route) =>
    route.fulfill({
      status: 502,
      json: {
        error: "Provider comparison is temporarily unavailable. Try again.",
      },
    }),
  );
  await compare.click();
  await expect(card.getByTestId("compare-error")).toContainText(
    "temporarily unavailable",
  );
});
