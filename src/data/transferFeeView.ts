import type { TransferFee, TransferFees } from "./liveData";

/** A curated corridor fee range, as held in corridorData.ts. */
export type CuratedFee = {
  low: number;
  high: number;
  corridor: string;
  amount: string;
};
export type CuratedLookup = (
  countryCode: string,
  name: string,
) => CuratedFee | null;

/** What the Competitors table shows in the transfer-fee column for one competitor. */
export type FeeCell =
  | {
      kind: "live";
      /** Headline: fixed fee, for example "1.99 USD". */
      fee: string;
      /** Total cost (fee plus exchange-rate margin) as a percentage, for example "3.8% total". */
      total: string | null;
      /** Exchange rate used, for example "1 USD = 18.6267 MXN". */
      rate: string;
      /** Recipient amount, for example "Recipient gets 3,688.27 MXN". */
      received: string;
      corridor: string;
      amount: string;
      /** Whether this total cost is below, above or level with the other live quotes. */
      tone: "below" | "above" | "at" | null;
      deltaText: string | null;
    }
  | {
      kind: "range";
      /** The curated World Bank range, for example "3.0–4.0%". */
      range: string;
      corridor: string;
      amount: string;
      source: string;
    }
  | { kind: "none" };

const number = (value: number, digits = 2) =>
  value.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: digits,
  });

/** Mean total cost of every live quote that has one, or null when fewer than two do. */
export function averageTotalCost(
  fees: Record<string, TransferFee>,
): number | null {
  const totals = Object.values(fees)
    .map((fee) => fee.totalCostPercent)
    .filter((value): value is number => typeof value === "number");
  if (totals.length < 2) return null;
  return totals.reduce((sum, value) => sum + value, 0) / totals.length;
}

function toneFor(total: number | null, average: number | null) {
  if (total === null || average === null)
    return { tone: null, deltaText: null };
  const delta = total - average;
  if (Math.abs(delta) < 0.05)
    return { tone: "at" as const, deltaText: "At live average" };
  const text = `${Math.abs(delta).toFixed(1)}pp ${delta < 0 ? "below" : "above"} live average`;
  return {
    tone: delta < 0 ? ("below" as const) : ("above" as const),
    deltaText: text,
  };
}

/**
 * Picks the fee to show: the live quote when the feed has one, otherwise the curated World Bank
 * range for the corridor, otherwise nothing. The two are never mixed in one cell.
 */
export function feeCellFor(
  name: string,
  countryCode: string,
  live: TransferFees | null | undefined,
  curated: CuratedLookup,
): FeeCell {
  const quote = live?.fees[name];
  if (quote) {
    const { tone, deltaText } = toneFor(
      quote.totalCostPercent,
      averageTotalCost(live?.fees ?? {}),
    );
    return {
      kind: "live",
      fee: `${number(quote.fee)} ${quote.feeCurrency}`,
      total:
        quote.totalCostPercent === null
          ? null
          : `${quote.totalCostPercent.toFixed(1)}% total`,
      rate: `1 ${quote.sendCurrency} = ${number(quote.exchangeRate, 4)} ${quote.receiveCurrency}`,
      received: `Recipient gets ${number(quote.receivedAmount)} ${quote.receiveCurrency}`,
      corridor: `${quote.from}→${quote.to}`,
      amount: `${number(quote.sendAmount, 0)} ${quote.sendCurrency}`,
      tone,
      deltaText,
    };
  }
  const range = curated(countryCode, name);
  if (range) {
    return {
      kind: "range",
      range: `${range.low.toFixed(1)}–${range.high.toFixed(1)}%`,
      corridor: range.corridor,
      amount: range.amount,
      source: "World Bank 2024",
    };
  }
  return { kind: "none" };
}

/** True when at least one competitor has a live quote or a curated range. */
export function hasAnyFee(
  names: string[],
  countryCode: string,
  live: TransferFees | null | undefined,
  curated: CuratedLookup,
): boolean {
  return names.some(
    (name) => feeCellFor(name, countryCode, live, curated).kind !== "none",
  );
}
