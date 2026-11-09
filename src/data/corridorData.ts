// Curated competitive reference data for the Competitive Intelligence table.
//
// Sources:
//  - Transfer fees: World Bank Remittance Prices Worldwide (RPW) 2024 quarterly
//    surveys. Figures are the average total cost (fee + FX margin) of sending a
//    $200-equivalent transfer on each market's highest-volume corridor, expressed
//    as a % range across payout/funding methods.
//  - Daily transactions: latest company disclosures (annual reports, quarterly
//    results, company reports). Figures are GLOBAL averages; country-level daily
//    volumes are not publicly disclosed by any provider.

export type CorridorFeeRange = {
  low: number;
  high: number;
};

export type MarketCorridor = {
  fromCode: string;
  fromName: string;
  toCode: string;
  toName: string;
  direction: 'outbound' | 'inbound';
  benchmarkAmount: string;
  fees: Record<string, CorridorFeeRange>;
};

export const CORRIDOR_FEE_SOURCE = 'World Bank Remittance Prices Worldwide';
export const CORRIDOR_FEE_PERIOD = '2024 quarterly surveys';

const US_MX_FEES: Record<string, CorridorFeeRange> = {
  'Western Union': { low: 3.0, high: 4.0 },
  Wise: { low: 2.0, high: 2.5 },
  Remitly: { low: 2.5, high: 3.5 },
  MoneyGram: { low: 2.5, high: 4.0 },
  Xoom: { low: 3.0, high: 4.0 },
  Ria: { low: 2.5, high: 3.5 },
};

export const TOP_CORRIDOR_BY_COUNTRY: Record<string, MarketCorridor> = {
  // US → Mexico is the world's largest remittance corridor (~$64B in 2024).
  US: {
    fromCode: 'US', fromName: 'United States', toCode: 'MX', toName: 'Mexico',
    direction: 'outbound', benchmarkAmount: '$200', fees: US_MX_FEES,
  },
  MX: {
    fromCode: 'US', fromName: 'United States', toCode: 'MX', toName: 'Mexico',
    direction: 'inbound', benchmarkAmount: '$200', fees: US_MX_FEES,
  },
  CA: {
    fromCode: 'CA', fromName: 'Canada', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 3.5, high: 5.5 },
      Wise: { low: 1.0, high: 2.0 },
      Remitly: { low: 2.0, high: 3.0 },
      MoneyGram: { low: 3.0, high: 4.5 },
      Xoom: { low: 3.0, high: 4.5 },
    },
  },
  IN: {
    fromCode: 'US', fromName: 'United States', toCode: 'IN', toName: 'India',
    direction: 'inbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 6.0, high: 8.0 },
      Wise: { low: 1.0, high: 3.0 },
      Remitly: { low: 2.0, high: 4.0 },
      MoneyGram: { low: 3.5, high: 5.5 },
      Xoom: { low: 3.0, high: 5.0 },
    },
  },
  PH: {
    fromCode: 'US', fromName: 'United States', toCode: 'PH', toName: 'Philippines',
    direction: 'inbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 6.0, high: 8.0 },
      Wise: { low: 1.5, high: 3.0 },
      Remitly: { low: 2.0, high: 5.0 },
      MoneyGram: { low: 4.0, high: 6.0 },
      WorldRemit: { low: 3.0, high: 5.0 },
    },
  },
  GB: {
    fromCode: 'GB', fromName: 'United Kingdom', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 4.0, high: 6.0 },
      Wise: { low: 1.0, high: 2.0 },
      Remitly: { low: 2.0, high: 3.0 },
      MoneyGram: { low: 3.0, high: 4.5 },
      Revolut: { low: 1.0, high: 2.5 },
      WorldRemit: { low: 2.5, high: 4.0 },
    },
  },
  DE: {
    fromCode: 'DE', fromName: 'Germany', toCode: 'TR', toName: 'Turkey',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 5.5, high: 7.5 },
      Wise: { low: 2.0, high: 3.5 },
      Remitly: { low: 3.0, high: 4.5 },
      Revolut: { low: 2.0, high: 3.5 },
      MoneyGram: { low: 4.5, high: 6.5 },
      Skrill: { low: 3.0, high: 4.5 },
    },
  },
  AE: {
    fromCode: 'AE', fromName: 'UAE', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 4.0, high: 6.0 },
      Wise: { low: 1.5, high: 3.0 },
      Remitly: { low: 1.5, high: 4.0 },
      MoneyGram: { low: 3.0, high: 5.0 },
      'Al Ansari Exchange': { low: 2.0, high: 3.5 },
      WorldRemit: { low: 2.5, high: 4.0 },
    },
  },
  SA: {
    fromCode: 'SA', fromName: 'Saudi Arabia', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 3.0, high: 6.0 },
      Wise: { low: 1.5, high: 3.0 },
      Remitly: { low: 2.0, high: 4.0 },
      MoneyGram: { low: 3.0, high: 5.0 },
      'Al Ansari Exchange': { low: 2.0, high: 3.5 },
      Ria: { low: 2.5, high: 4.0 },
    },
  },
  AU: {
    fromCode: 'AU', fromName: 'Australia', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 4.0, high: 6.0 },
      Wise: { low: 1.5, high: 2.5 },
      Remitly: { low: 2.0, high: 3.5 },
      MoneyGram: { low: 3.5, high: 5.0 },
      WorldRemit: { low: 2.5, high: 4.0 },
      Xoom: { low: 3.0, high: 4.5 },
    },
  },
  SG: {
    fromCode: 'SG', fromName: 'Singapore', toCode: 'IN', toName: 'India',
    direction: 'outbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 3.5, high: 5.5 },
      Wise: { low: 1.0, high: 2.0 },
      Remitly: { low: 2.0, high: 3.0 },
      MoneyGram: { low: 3.0, high: 4.5 },
      Revolut: { low: 1.0, high: 2.5 },
      WorldRemit: { low: 2.5, high: 4.0 },
    },
  },
  BR: {
    fromCode: 'US', fromName: 'United States', toCode: 'BR', toName: 'Brazil',
    direction: 'inbound', benchmarkAmount: '$200',
    fees: {
      'Western Union': { low: 4.0, high: 6.0 },
      Wise: { low: 2.0, high: 3.5 },
      Remitly: { low: 2.5, high: 4.5 },
      MoneyGram: { low: 3.5, high: 5.5 },
      Xoom: { low: 3.5, high: 5.5 },
      Ria: { low: 3.0, high: 5.0 },
    },
  },
};

export type BrandDailyVolume = {
  avgPerDay: number;
  basis: string;
  period: string;
};

export const BRAND_DAILY_VOLUMES: Record<string, BrandDailyVolume> = {
  // 2024 annual report: ~31 transactions/second globally.
  'Western Union': { avgPerDay: 2678400, basis: '31 txn/sec', period: '2024 annual report' },
  // Q1 2024 results: 14M+ transactions in the quarter.
  Remitly: { avgPerDay: 154000, basis: '14M+ txn in Q1 2024', period: 'Q1 2024 results' },
  // 2024 State of Remittances report.
  MoneyGram: { avgPerDay: 1000000, basis: '~1M txn/day', period: '2024 company report' },
};

export function getCorridorForCountry(countryCode: string): MarketCorridor | null {
  return TOP_CORRIDOR_BY_COUNTRY[countryCode.toUpperCase()] ?? null;
}

export function getBrandCorridorFee(countryCode: string, brandName: string): CorridorFeeRange | null {
  return getCorridorForCountry(countryCode)?.fees[brandName] ?? null;
}

export function getBrandDailyVolume(brandName: string): BrandDailyVolume | null {
  return BRAND_DAILY_VOLUMES[brandName] ?? null;
}

export function formatFeeRange(range: CorridorFeeRange): string {
  return `${range.low.toFixed(1)}–${range.high.toFixed(1)}%`;
}

export function formatDailyVolume(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(Math.round(value));
}
