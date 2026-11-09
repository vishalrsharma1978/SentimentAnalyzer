import type { CustomerSentiment } from './liveData';

export type SentimentCategoryId =
  | 'stability'
  | 'performance'
  | 'fees'
  | 'access'
  | 'transfers'
  | 'support'
  | 'other';

export type SentimentCategory = {
  id: SentimentCategoryId;
  label: string;
  icon: 'bug-outline' | 'speedometer-outline' | 'cash-outline' | 'key-outline' | 'swap-horizontal-outline' | 'headset-outline' | 'chatbox-ellipses-outline';
  reviews: CustomerSentiment[];
  positive: number;
  neutral: number;
  negative: number;
};

const categoryRules: {
  id: SentimentCategoryId;
  label: string;
  icon: SentimentCategory['icon'];
  terms: RegExp;
}[] = [
  {
    id: 'stability',
    label: 'Crashes & bugs',
    icon: 'bug-outline',
    terms: /\b(crash(?:es|ed|ing)?|freez(?:e|es|ing)|bug(?:s|gy)?|error(?:s)?|not open(?:ing)?|keeps clos(?:ing|e))\b|no funciona|se cierra|bloquea|erreur|plante|crash|absturz|fehler/i,
  },
  {
    id: 'performance',
    label: 'Speed & performance',
    icon: 'speedometer-outline',
    terms: /\b(slow(?:ly)?|slowness|lag(?:gy)?|delay(?:ed|s)?|loading|buffer(?:ing)?|timeout|takes forever|unresponsive)\b|lento|lentitud|tarda|ralent|lentement|verzöger/i,
  },
  {
    id: 'fees',
    label: 'Fees & exchange rates',
    icon: 'cash-outline',
    terms: /\b(fee(?:s)?|charge(?:s|d)?|cost(?:s|ly)?|price|pricing|expensive|exchange rate|rate is|hidden cost|commission)\b|comisi[oó]n|tarifa|cargos?|caro|frais|cher|geb[uü]hr|teuer/i,
  },
  {
    id: 'access',
    label: 'Login & account access',
    icon: 'key-outline',
    terms: /\b(log ?in|sign ?in|password|passcode|verification|verify|otp|locked out|account access|cannot access)\b|iniciar sesi[oó]n|contrase[ñn]a|acceso|connexion|mot de passe|anmeldung|passwort/i,
  },
  {
    id: 'transfers',
    label: 'Transfers & payments',
    icon: 'swap-horizontal-outline',
    terms: /\b(transfer(?:s|red|ring)?|payment(?:s)?|transaction(?:s)?|deposit(?:s|ed)?|withdraw(?:al|als)?|send money|receive money|refund(?:s|ed)?)\b|transferencia|pago|env[ií]o|dinero|paiement|virement|zahlung|[uü]berweisung/i,
  },
  {
    id: 'support',
    label: 'Customer support',
    icon: 'headset-outline',
    terms: /\b(support|customer service|help ?desk|agent|representative|call center|no response|contact(?:ed)?)\b|atenci[oó]n al cliente|servicio al cliente|ayuda|service client|kundendienst/i,
  },
];

export function categorizeSentimentReviews(
  reviews: CustomerSentiment[],
): SentimentCategory[] {
  const categories = categoryRules.map(({ id, label, icon }) => ({
    id,
    label,
    icon,
    reviews: [] as CustomerSentiment[],
    positive: 0,
    neutral: 0,
    negative: 0,
  }));
  const other: SentimentCategory = {
    id: 'other',
    label: 'Other feedback',
    icon: 'chatbox-ellipses-outline',
    reviews: [],
    positive: 0,
    neutral: 0,
    negative: 0,
  };

  reviews.forEach((review) => {
    const text = review.text.toLocaleLowerCase();
    const matches = categoryRules.filter(({ terms }) => terms.test(text));
    const matchedCategories = matches.length
      ? categories.filter((category) => matches.some((match) => match.id === category.id))
      : [other];

    matchedCategories.forEach((category) => {
      category.reviews.push(review);
      category[review.sentiment] += 1;
    });
  });

  return [...categories, other]
    .filter((category) => category.reviews.length > 0)
    .sort((left, right) => {
      if (left.id === 'other') return 1;
      if (right.id === 'other') return -1;
      return right.reviews.length - left.reviews.length;
    });
}
