export type Market = { code: string; name: string; region: string };
export type StoreRating = { rating: number | null; reviewCount: number };
export type ChannelComponent = { label: string; score: number };
export type ChannelScore = { rating: number | null; sampleSize: number; basis: string; components: ChannelComponent[] };
export type MarketRating = { apple: StoreRating; google: StoreRating; brand?: ChannelScore | null; web?: ChannelScore | null };
export type MarketRatings = Record<string, MarketRating | undefined>;
export type Channel = 'brand' | 'web' | 'mobile' | 'ios' | 'android';
export const channelLabels: Record<Channel, string> = {
  brand: 'Brand', web: 'Website', mobile: 'Mobile app', ios: 'iOS', android: 'Android',
};
export const channelColors: Record<Channel, string> = {
  brand: '#B7791F', web: '#0891B2', mobile: '#635BFF', ios: '#635BFF', android: '#059669',
};

export function validRating(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 1 && value <= 5;
}

export function aggregateRating(data: MarketRating | undefined): number | null {
  const ratings = [data?.apple.rating, data?.google.rating].filter(validRating);
  return ratings.length ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length : null;
}

export function storeRatingBasis(data: MarketRating | undefined): string {
  const apple = validRating(data?.apple.rating);
  const google = validRating(data?.google.rating);
  if (apple && google) return 'Equal average of Apple App Store and Google Play ratings';
  if (apple) return 'Single source: Apple App Store';
  if (google) return 'Single source: Google Play';
  return 'No store rating available';
}

export function channelRating(data: MarketRating | undefined, channel: Channel): number | null {
  if (channel === 'mobile' || channel === 'brand') return aggregateRating(data);
  const value = channel === 'ios' ? data?.apple.rating
    : channel === 'android' ? data?.google.rating
      : data?.web?.rating;
  return validRating(value) ? value : null;
}

export function channelScore(data: MarketRating | undefined, channel: Channel): ChannelScore | null {
  if (channel === 'brand') return { rating: aggregateRating(data), sampleSize: 0, basis: storeRatingBasis(data), components: [] };
  if (channel === 'web') return data?.web ?? null;
  return null;
}

export function rankMarkets(markets: Market[], ratings: MarketRatings, region = 'Global', channel: Channel = 'mobile') {
  const scored = markets
    .filter((market) => region === 'Global' || market.region === region)
    .flatMap((market) => {
      const score = channelRating(ratings[market.code], channel);
      return score === null ? [] : [{ ...market, score }];
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return scored.map((market, index) => ({
    ...market,
    rank: scored.findIndex((other) => other.score === market.score) + 1,
    position: index + 1,
  }));
}

export type SunburstSegment = {
  id: string;
  countryCode: string;
  label: string;
  channel: Channel | null;
  depth: 0 | 1;
  start: number;
  end: number;
};

export function sunburstSegments(markets: Market[], focus: string | null): SunburstSegment[] {
  const channels: Channel[] = ['brand', 'web', 'ios', 'android'];
  if (focus) {
    if (!markets.some((market) => market.code === focus)) return [];
    const parents: Channel[] = ['brand', 'web', 'mobile'];
    return parents.flatMap((channel, index) => {
      const start = index * 120;
      const parent: SunburstSegment = {
        id: `${focus}-${channel}`, countryCode: focus, label: channelLabels[channel], channel, depth: 0, start, end: start + 120,
      };
      const children: Channel[] = channel === 'mobile' ? ['ios', 'android'] : [channel];
      return [parent, ...children.map((child, childIndex): SunburstSegment => ({
        id: `${focus}-${channel}-${child}`, countryCode: focus, label: channelLabels[child], channel: child,
        depth: 1, start: start + childIndex * 120 / children.length, end: start + (childIndex + 1) * 120 / children.length,
      }))];
    });
  }
  return markets.flatMap((market, index) => {
    const size = 360 / markets.length;
    const start = index * size;
    const parent: SunburstSegment = {
      id: market.code, countryCode: market.code, label: market.code, channel: null, depth: 0, start, end: start + size,
    };
    return [parent, ...channels.map((channel, childIndex): SunburstSegment => ({
      id: `${market.code}-${channel}`, countryCode: market.code, label: channelLabels[channel], channel, depth: 1,
      start: start + childIndex * size / channels.length, end: start + (childIndex + 1) * size / channels.length,
    }))];
  });
}

export function polarPoint(radius: number, degrees: number) {
  const radians = (degrees - 90) * Math.PI / 180;
  return { x: 200 + radius * Math.cos(radians), y: 200 + radius * Math.sin(radians) };
}

export function hitTestSunburst(segments: SunburstSegment[], x: number, y: number) {
  const radius = Math.hypot(x - 200, y - 200);
  const depth = radius >= 85 && radius <= 138 ? 0 : radius >= 141 && radius <= 188 ? 1 : null;
  const angle = (Math.atan2(y - 200, x - 200) * 180 / Math.PI + 450) % 360;
  return segments.find((segment) => segment.depth === depth && angle >= segment.start && angle < segment.end);
}

export function ringPath(inner: number, outer: number, start: number, end: number): string {
  if (end <= start) return '';
  // Leave a tiny seam to avoid coincident endpoints on a full SVG circle.
  const sweep = Math.min(end - start, 359.999);
  const finish = start + sweep;
  const a = polarPoint(outer, start);
  const b = polarPoint(outer, finish);
  const c = polarPoint(inner, finish);
  const d = polarPoint(inner, start);
  const large = sweep > 180 ? 1 : 0;
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 ${large} 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 ${large} 0 ${d.x} ${d.y} Z`;
}
