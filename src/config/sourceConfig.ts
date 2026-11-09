export type SourceConfig = {
  name: string;
  detail: string;
  status: 'connected' | 'public' | 'configure';
  credential: 'public' | 'server';
};

export const sourceConfigs: SourceConfig[] = [
  { name: 'Apple App Store', detail: 'Public country lookup and review feed', status: 'public', credential: 'public' },
  { name: 'Google Play', detail: 'Live public reviews collected with google-play-scraper backend', status: 'public', credential: 'server' },
  { name: 'Facebook', detail: 'Meta token validation failed: token is invalid and cannot be parsed by Graph API', status: 'configure', credential: 'server' },
  { name: 'Instagram', detail: 'Meta token validation failed: no usable Instagram business account access', status: 'configure', credential: 'server' },
  { name: 'LinkedIn', detail: 'Organization or Partner API credentials', status: 'configure', credential: 'server' },
  { name: 'X / Twitter', detail: 'X API bearer token and approved API access', status: 'configure', credential: 'server' },
  { name: 'Trustpilot', detail: 'Trustpilot business API key and secret', status: 'configure', credential: 'server' },
  { name: 'Reviews.io', detail: 'Reviews.io API key and private key', status: 'configure', credential: 'server' },
  { name: 'Reddit', detail: 'Live public brand-search feed with unauthenticated Reddit JSON endpoint', status: 'public', credential: 'public' },
];
