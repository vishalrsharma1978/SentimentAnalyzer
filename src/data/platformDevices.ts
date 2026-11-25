export type PlatformKey = "ios" | "android";

type Mention = { label: string; kind: "device" | "os" };
/** Finds the devices and operating systems named in a review's text (see deviceMentions.ts). */
export type MentionDetector = (text: string) => Mention[];

type ReviewLike = {
  source: string;
  text: string;
  sentiment: "positive" | "neutral" | "negative";
  rating: number;
};

export type DeviceRow = {
  label: string;
  kind: Mention["kind"];
  reviews: number;
  negative: number;
  positive: number;
  negativeShare: number;
  avgRating: number;
  /** True when most of the reviews naming this device or OS are negative. */
  failing: boolean;
};

export type PlatformDevices = {
  platform: PlatformKey;
  source: string;
  totalReviews: number;
  /** Reviews that named at least one device or operating system. */
  namingDevice: number;
  rows: DeviceRow[];
  failingRows: DeviceRow[];
};

export const PLATFORM_SOURCE: Record<PlatformKey, string> = {
  ios: "Apple App Store",
  android: "Google Play",
};

// A device or OS is called out as failing when at least half of the reviews that name it are
// negative, with a minimum sample so one unhappy review does not trigger a callout.
export const FAILURE_NEGATIVE_SHARE = 0.5;
export const FAILURE_MIN_REVIEWS = 2;

// Only what the reviewer wrote is counted. A store platform can only be paired with the
// matching device family, so an iPhone mention inside a Google Play review (for example a
// reviewer comparing both) is not attributed to Android.
const FAMILY: Record<PlatformKey, RegExp> = {
  ios: /^(iphone|ipad|ios)/i,
  android:
    /^(galaxy|pixel|oneplus|xiaomi|redmi|poco|huawei|oppo|vivo|realme|motorola|moto|nokia|lg|samsung|android)/i,
};

export function summarizePlatformDevices(
  reviews: ReviewLike[],
  platform: PlatformKey,
  detect: MentionDetector,
): PlatformDevices {
  const source = PLATFORM_SOURCE[platform];
  const own = reviews.filter((review) => review.source === source);
  const byLabel = new Map<string, DeviceRow & { ratingSum: number }>();
  let namingDevice = 0;

  for (const review of own) {
    const mentions = detect(review.text).filter((mention) =>
      FAMILY[platform].test(mention.label),
    );
    if (mentions.length === 0) continue;
    namingDevice += 1;
    for (const mention of mentions) {
      const row =
        byLabel.get(mention.label) ??
        ({
          label: mention.label,
          kind: mention.kind,
          reviews: 0,
          negative: 0,
          positive: 0,
          negativeShare: 0,
          avgRating: 0,
          failing: false,
          ratingSum: 0,
        } as DeviceRow & { ratingSum: number });
      row.reviews += 1;
      if (review.sentiment === "negative") row.negative += 1;
      if (review.sentiment === "positive") row.positive += 1;
      row.ratingSum += review.rating;
      byLabel.set(mention.label, row);
    }
  }

  const rows = [...byLabel.values()]
    .map(({ ratingSum, ...row }) => {
      const negativeShare = row.reviews ? row.negative / row.reviews : 0;
      return {
        ...row,
        negativeShare,
        avgRating: row.reviews ? ratingSum / row.reviews : 0,
        failing:
          row.reviews >= FAILURE_MIN_REVIEWS &&
          negativeShare >= FAILURE_NEGATIVE_SHARE,
      };
    })
    .sort(
      (left, right) =>
        Number(right.failing) - Number(left.failing) ||
        right.reviews - left.reviews ||
        left.label.localeCompare(right.label),
    );

  return {
    platform,
    source,
    totalReviews: own.length,
    namingDevice,
    rows,
    failingRows: rows.filter((row) => row.failing),
  };
}
