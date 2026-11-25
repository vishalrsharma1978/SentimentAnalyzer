// Feature-level capability map of the major remittance brands, curated from
// each provider's public product pages. 2 = fully offered, 1 = partial or
// limited markets, 0 = not offered. Brands absent from the matrix render as
// "no data" rather than being guessed.

export type FeatureLevel = 0 | 1 | 2;

export type Feature = {
  id: string;
  label: string;
  category: string;
};

export const FEATURE_CATEGORIES = [
  "Payout options",
  "Pricing & speed",
  "Product breadth",
  "Experience & reach",
] as const;

export const FEATURES: Feature[] = [
  { id: "bankDeposit", label: "Bank deposit", category: "Payout options" },
  { id: "cashPickup", label: "Cash pickup", category: "Payout options" },
  { id: "mobileWallet", label: "Mobile wallet payout", category: "Payout options" },
  { id: "cardPayout", label: "Payout to debit card", category: "Payout options" },
  { id: "instant", label: "Instant / minutes delivery", category: "Pricing & speed" },
  { id: "midMarketFx", label: "Mid-market FX rate", category: "Pricing & speed" },
  { id: "rateLock", label: "Guaranteed / locked rate", category: "Pricing & speed" },
  { id: "multiCurrency", label: "Multi-currency account", category: "Product breadth" },
  { id: "debitCard", label: "Own debit card", category: "Product breadth" },
  { id: "business", label: "Business payments", category: "Product breadth" },
  { id: "billPay", label: "Bill payments", category: "Product breadth" },
  { id: "tracking", label: "Live transfer tracking", category: "Experience & reach" },
  { id: "support247", label: "24/7 customer support", category: "Experience & reach" },
  { id: "loyalty", label: "Loyalty / rewards", category: "Experience & reach" },
  { id: "agentNetwork", label: "Physical agent network", category: "Experience & reach" },
];

type BrandFeatures = Record<string, FeatureLevel>;

const level = (
  bankDeposit: FeatureLevel,
  cashPickup: FeatureLevel,
  mobileWallet: FeatureLevel,
  cardPayout: FeatureLevel,
  instant: FeatureLevel,
  midMarketFx: FeatureLevel,
  rateLock: FeatureLevel,
  multiCurrency: FeatureLevel,
  debitCard: FeatureLevel,
  business: FeatureLevel,
  billPay: FeatureLevel,
  tracking: FeatureLevel,
  support247: FeatureLevel,
  loyalty: FeatureLevel,
  agentNetwork: FeatureLevel,
): BrandFeatures => ({
  bankDeposit,
  cashPickup,
  mobileWallet,
  cardPayout,
  instant,
  midMarketFx,
  rateLock,
  multiCurrency,
  debitCard,
  business,
  billPay,
  tracking,
  support247,
  loyalty,
  agentNetwork,
});

// Canonical brand name -> capability levels.
const BRAND_FEATURES: Record<string, BrandFeatures> = {
  "Western Union": level(2, 2, 2, 2, 2, 0, 1, 1, 1, 2, 2, 2, 1, 2, 2),
  Wise: level(2, 0, 1, 2, 2, 2, 2, 2, 2, 2, 0, 2, 1, 0, 0),
  Remitly: level(2, 2, 2, 2, 2, 0, 1, 0, 0, 0, 1, 2, 2, 1, 0),
  MoneyGram: level(2, 2, 2, 2, 2, 0, 0, 0, 1, 1, 2, 2, 1, 2, 2),
  Xoom: level(2, 2, 2, 2, 2, 0, 0, 0, 0, 0, 2, 2, 1, 0, 1),
  Ria: level(2, 2, 2, 1, 1, 0, 0, 0, 0, 0, 1, 2, 0, 1, 2),
  WorldRemit: level(2, 2, 2, 1, 2, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0),
  Revolut: level(2, 0, 0, 2, 2, 1, 0, 2, 2, 2, 1, 2, 2, 2, 0),
  Paysend: level(2, 0, 2, 2, 2, 0, 0, 1, 1, 2, 0, 2, 2, 0, 0),
  PayPal: level(2, 0, 2, 1, 2, 0, 0, 2, 2, 2, 2, 2, 1, 0, 0),
  Xe: level(2, 1, 1, 0, 1, 1, 2, 0, 0, 2, 0, 2, 0, 0, 0),
  "Taptap Send": level(1, 1, 2, 0, 2, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0),
  Sendwave: level(1, 1, 2, 0, 2, 1, 0, 0, 0, 0, 0, 1, 1, 0, 0),
  Zepz: level(2, 2, 2, 1, 2, 0, 0, 0, 0, 0, 1, 2, 1, 0, 0),
  OFX: level(2, 0, 0, 0, 0, 1, 2, 1, 0, 2, 0, 2, 2, 0, 0),
};

// Live competitor names come from store listings ("Wise: International
// transfers"), so match the longest canonical name contained in the listing.
export function matchBrandKey(name: string): string | null {
  const wanted = name.trim().toLowerCase();
  if (!wanted) return null;
  let bestKey: string | null = null;
  for (const key of Object.keys(BRAND_FEATURES)) {
    const canonical = key.toLowerCase();
    if (wanted === canonical) return key;
    if (
      (wanted.includes(canonical) || canonical.includes(wanted)) &&
      (bestKey === null || key.length > bestKey.length)
    ) {
      bestKey = key;
    }
  }
  return bestKey;
}

export function featureLevels(name: string): BrandFeatures | null {
  const key = matchBrandKey(name);
  return key ? BRAND_FEATURES[key] : null;
}

/** Share of the full feature set a brand covers; partial counts half. */
export function coverageScore(levels: BrandFeatures): number {
  const total = FEATURES.reduce(
    (sum, feature) => sum + (levels[feature.id] ?? 0),
    0,
  );
  return total / (FEATURES.length * 2);
}

export type FeatureInsights = {
  /** Features the brand fully offers that most mapped competitors do not. */
  leads: Feature[];
  /** Features most mapped competitors fully offer that the brand does not. */
  gaps: Feature[];
  /** Features the brand offers partially — candidates to complete. */
  partials: Feature[];
};

export function buildFeatureInsights(
  brand: BrandFeatures,
  competitors: BrandFeatures[],
): FeatureInsights {
  const leads: Feature[] = [];
  const gaps: Feature[] = [];
  const partials: Feature[] = [];
  if (competitors.length === 0) return { leads, gaps, partials };
  for (const feature of FEATURES) {
    const own = brand[feature.id] ?? 0;
    const fullCount = competitors.filter(
      (c) => (c[feature.id] ?? 0) === 2,
    ).length;
    const majorityHave = fullCount >= Math.ceil(competitors.length / 2);
    if (own === 2 && !majorityHave) {
      leads.push(feature);
    } else if (own === 0 && majorityHave) {
      gaps.push(feature);
    } else if (own === 1 && majorityHave) {
      partials.push(feature);
    }
  }
  return { leads, gaps, partials };
}
