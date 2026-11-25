import type { TransferPayIn } from "./liveData";

export type TransferCountry = { code: string; name: string; currency: string };

// Countries Wise prices transfers for, with the currency each one sends and receives in.
export const TRANSFER_COUNTRIES: TransferCountry[] = [
  { code: "US", name: "United States", currency: "USD" },
  { code: "GB", name: "United Kingdom", currency: "GBP" },
  { code: "CA", name: "Canada", currency: "CAD" },
  { code: "AU", name: "Australia", currency: "AUD" },
  { code: "DE", name: "Germany", currency: "EUR" },
  { code: "FR", name: "France", currency: "EUR" },
  { code: "ES", name: "Spain", currency: "EUR" },
  { code: "IT", name: "Italy", currency: "EUR" },
  { code: "NL", name: "Netherlands", currency: "EUR" },
  { code: "SE", name: "Sweden", currency: "SEK" },
  { code: "NO", name: "Norway", currency: "NOK" },
  { code: "DK", name: "Denmark", currency: "DKK" },
  { code: "SG", name: "Singapore", currency: "SGD" },
  { code: "AE", name: "UAE", currency: "AED" },
  { code: "IN", name: "India", currency: "INR" },
  { code: "PH", name: "Philippines", currency: "PHP" },
  { code: "MX", name: "Mexico", currency: "MXN" },
  { code: "BR", name: "Brazil", currency: "BRL" },
  { code: "CO", name: "Colombia", currency: "COP" },
  { code: "PE", name: "Peru", currency: "PEN" },
  { code: "NG", name: "Nigeria", currency: "NGN" },
  { code: "ZA", name: "South Africa", currency: "ZAR" },
  { code: "EG", name: "Egypt", currency: "EGP" },
  { code: "MA", name: "Morocco", currency: "MAD" },
  { code: "TR", name: "Türkiye", currency: "TRY" },
  { code: "RO", name: "Romania", currency: "RON" },
  { code: "PL", name: "Poland", currency: "PLN" },
  { code: "PK", name: "Pakistan", currency: "PKR" },
  { code: "BD", name: "Bangladesh", currency: "BDT" },
  { code: "ID", name: "Indonesia", currency: "IDR" },
  { code: "MY", name: "Malaysia", currency: "MYR" },
  { code: "JP", name: "Japan", currency: "JPY" },
  { code: "KR", name: "South Korea", currency: "KRW" },
  { code: "SA", name: "Saudi Arabia", currency: "SAR" },
];

export function findTransferCountry(
  code: string | undefined,
): TransferCountry | null {
  const wanted = String(code ?? "").toUpperCase();
  return TRANSFER_COUNTRIES.find((country) => country.code === wanted) ?? null;
}

// The most common receiving country for a sender, used to prefill the receiver so the form opens
// on a corridor Wise actually prices. The user can change it.
const DEFAULT_RECEIVER: Record<string, string> = {
  US: "MX",
  GB: "IN",
  CA: "IN",
  AU: "IN",
  DE: "TR",
  FR: "MA",
  ES: "CO",
  IT: "RO",
  NL: "TR",
  SE: "PL",
  NO: "PL",
  DK: "PL",
  SG: "IN",
  AE: "IN",
  SA: "IN",
  MY: "IN",
  JP: "PH",
  KR: "PH",
  IN: "US",
  PH: "US",
  MX: "US",
};

export function defaultReceiverFor(senderCode: string): TransferCountry {
  const preferred = findTransferCountry(
    DEFAULT_RECEIVER[senderCode.toUpperCase()],
  );
  if (preferred && preferred.code !== senderCode.toUpperCase())
    return preferred;
  return findTransferCountry(
    senderCode.toUpperCase() === "IN" ? "US" : "IN",
  ) as TransferCountry;
}

export const PAY_IN_OPTIONS: {
  id: TransferPayIn;
  label: string;
  hint: string;
}[] = [
  { id: "BANK_TRANSFER", label: "Bank transfer", hint: "Usually the cheapest" },
  { id: "DEBIT", label: "Debit card", hint: "Instant, small card fee" },
  { id: "CREDIT", label: "Credit card", hint: "Highest fees" },
];

// How the recipient can be paid. Wise's quotes do not change with the pay-out method, so these are
// shown for the user to note which method they need to confirm with the provider, not to re-price.
export const PAY_OUT_OPTIONS: { id: string; label: string }[] = [
  { id: "bank", label: "Bank account" },
  { id: "cash", label: "Cash pickup" },
  { id: "wallet", label: "Mobile wallet" },
  { id: "upi", label: "UPI / instant payment" },
];

// Wise prices a corridor in the sender's currency, so the "from" and "to" currencies follow the
// two countries chosen.
export function corridorRequest(
  sender: TransferCountry,
  receiver: TransferCountry,
  payIn: TransferPayIn,
  amount: number,
) {
  return {
    fromCountry: sender.code,
    toCountry: receiver.code,
    fromCurrency: sender.currency,
    toCurrency: receiver.currency,
    payIn,
    amount,
  };
}

export function isSameCorridor(
  sender: TransferCountry,
  receiver: TransferCountry,
): boolean {
  return sender.code === receiver.code;
}

export function formatMoney(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: value >= 1000 ? 0 : 2,
    }).format(value);
  } catch {
    return `${value.toFixed(2)} ${currency}`;
  }
}
