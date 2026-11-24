export const businessTypes = [
  "Other",
  "Money transfer",
  "Banking",
  "Fintech",
  "E-commerce",
  "Retail",
  "Travel",
  "Telecom",
  "SaaS",
  "Hospitality",
  "Food & beverage",
  "Healthcare",
];
export const platformOptions = [
  "Web",
  "Mobile · iOS",
  "Mobile · Android",
  "Desktop app",
  "Agent network",
];
export const sentimentSources = [
  "App Store",
  "Google Play",
  "Instagram",
  "Facebook",
  "LinkedIn",
  "X / Twitter",
  "YouTube",
  "Reddit",
  "Trustpilot",
  "Reviews.io",
  "Other web reviews",
];
export const workingSentimentSources = [
  "App Store",
  "Google Play",
  "Reddit",
  "Trustpilot",
  "Facebook",
  "LinkedIn",
  "X / Twitter",
  "Reviews.io",
];
export const countryBundles: Record<string, string[]> = {
  Global: [
    "United States",
    "United Kingdom",
    "India",
    "Germany",
    "Australia",
    "Philippines",
    "Mexico",
    "UAE",
    "France",
    "Canada",
    "Brazil",
    "Japan",
    "Singapore",
    "Sweden",
    "Norway",
    "Denmark",
    "Saudi Arabia",
  ],
  APAC: [
    "India",
    "Australia",
    "Philippines",
    "Japan",
    "Singapore",
    "South Korea",
    "Indonesia",
    "Malaysia",
  ],
  Nordics: ["Sweden", "Norway", "Denmark", "Finland", "Iceland"],
  LACA: [
    "Mexico",
    "Brazil",
    "Argentina",
    "Chile",
    "Colombia",
    "Peru",
    "Panama",
  ],
  Europe: [
    "United Kingdom",
    "Germany",
    "France",
    "Italy",
    "Spain",
    "Netherlands",
  ],
  "North America": ["United States", "Canada", "Mexico"],
  "Middle East & Africa": [
    "UAE",
    "Saudi Arabia",
    "South Africa",
    "Egypt",
    "Nigeria",
  ],
};
export const countries = [...new Set(Object.values(countryBundles).flat())];
const westernUnionExcludedCountries = new Set([
  "South Korea",
  "Indonesia",
  "South Africa",
  "Egypt",
  "Iceland",
  "Nigeria",
]);
export const countriesForBrand = (items: string[], name: string) =>
  name.trim().toLowerCase() === "western union"
    ? items.filter((country) => !westernUnionExcludedCountries.has(country))
    : items;
export const brandPresets = [
  { name: "Western Union", website: "https://www.westernunion.com" },
  { name: "Wise", website: "https://wise.com" },
  { name: "PayPal", website: "https://www.paypal.com" },
  { name: "Revolut", website: "https://www.revolut.com" },
  { name: "MoneyGram", website: "https://www.moneygram.com" },
  { name: "Remitly", website: "https://www.remitly.com" },
  { name: "Venmo", website: "https://venmo.com" },
  { name: "Cash App", website: "https://cash.app" },
  { name: "Monzo", website: "https://monzo.com" },
  { name: "Chime", website: "https://www.chime.com" },
];
export const brandSetupSuggestions: Record<
  string,
  {
    businessType: string;
    platforms: string[];
    sources: string[];
    countries: string[];
  }
> = {
  "Western Union": {
    businessType: "Money transfer",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android", "Agent network"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "India",
      "Philippines",
      "Mexico",
      "UAE",
      "Canada",
      "Brazil",
      "Argentina",
      "Chile",
      "Colombia",
      "Peru",
      "Panama",
      "Sweden",
      "Norway",
      "Denmark",
      "Finland",
    ],
  },
  Wise: {
    businessType: "Fintech",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "India",
      "Germany",
      "Australia",
      "Singapore",
      "Japan",
      "Canada",
    ],
  },
  PayPal: {
    businessType: "Fintech",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android", "Desktop app"],
    sources: [...workingSentimentSources],
    countries: [
      "United States",
      "United Kingdom",
      "Germany",
      "France",
      "Australia",
      "Canada",
      "Japan",
      "Singapore",
    ],
  },
  Revolut: {
    businessType: "Banking",
    platforms: ["Web", "Mobile · iOS", "Mobile · Android"],
    sources: [...workingSentimentSources],
    countries: [
      "United Kingdom",
      "United States",
      "Germany",
      "France",
      "Spain",
      "Italy",
      "Australia",
      "Singapore",
    ],
  },
};
