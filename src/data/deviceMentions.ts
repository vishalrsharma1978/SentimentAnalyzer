export type DeviceMention = { label: string; kind: "device" | "os" };

// Devices and operating systems a reviewer wrote about in their own words. Store feeds
// expose no device field, so nothing is inferred: when the text names none, we return [].
const DEVICE_PATTERNS: {
  kind: DeviceMention["kind"];
  regex: RegExp;
  format: (match: RegExpMatchArray) => string;
}[] = [
  {
    kind: "device",
    regex:
      /\biphone\s?(se|x[rs]?|1[0-9]|[5-9])?\s?(pro\s?max|pro|plus|max|mini)?\b/i,
    format: (m) =>
      ["iPhone", m[1]?.toUpperCase(), cap(m[2])].filter(Boolean).join(" "),
  },
  {
    kind: "device",
    regex: /\bipad(\s?(pro|air|mini))?\b/i,
    format: (m) => ["iPad", cap(m[2])].filter(Boolean).join(" "),
  },
  {
    kind: "device",
    regex: /\b(?:google\s)?pixel\s?([2-9][a-z]?|1[0-9])?\s?(pro|xl|fold)?\b/i,
    format: (m) => ["Pixel", m[1], cap(m[2])].filter(Boolean).join(" "),
  },
  {
    kind: "device",
    regex:
      /\b(?:samsung\s)?galaxy\s?(s|a|z|note|tab)\s?(\d{1,2})\s?(ultra|plus|fold|flip|fe)?\b/i,
    format: (m) =>
      [
        "Galaxy",
        [m[1]?.toUpperCase(), m[2]].filter(Boolean).join(""),
        cap(m[3]),
      ]
        .filter(Boolean)
        .join(" "),
  },
  {
    kind: "device",
    regex: /\bone\s?plus\s?(\d{1,2}[a-z]?)?\b/i,
    format: (m) => ["OnePlus", m[1]].filter(Boolean).join(" "),
  },
  {
    kind: "device",
    regex:
      /\b(xiaomi|redmi|poco|huawei|oppo|vivo|realme|motorola|moto\s?[a-z]\d*|nokia|lg)\b/i,
    format: (m) => cap(m[1].replace(/\s+/g, " ")),
  },
  { kind: "device", regex: /\bsamsung\b/i, format: () => "Samsung" },
  {
    kind: "os",
    regex: /\bandroid\s?(1[0-9]|[4-9](?:\.\d)?)\b/i,
    format: (m) => `Android ${m[1]}`,
  },
  {
    kind: "os",
    regex: /\bios\s?(1[0-9]|[7-9])(?:\.\d+)?\b/i,
    format: (m) => `iOS ${m[1]}`,
  },
];

function cap(value: string | undefined): string {
  if (!value) return "";
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function detectDeviceMentions(text: string): DeviceMention[] {
  const found = new Map<string, DeviceMention>();
  for (const { kind, regex, format } of DEVICE_PATTERNS) {
    const match = text.match(regex);
    if (!match) continue;
    const label = format(match).trim();
    if (label) found.set(label.toLowerCase(), { label, kind });
  }
  // "Samsung Galaxy S23" matches both the Galaxy and bare Samsung patterns; keep the specific one.
  const labels = [...found.values()];
  return labels.filter(
    (mention) =>
      !(
        mention.label === "Samsung" &&
        labels.some((other) => other.label.startsWith("Galaxy"))
      ),
  );
}
