const STORAGE_KEY = "pulseboard.recentBrands";
const MAX_BRANDS = 8;

export type RecentBrand = {
  name: string;
  website: string;
  count: number;
  lastUsed: number;
};

let memory: RecentBrand[] = [];

const storage = (): Storage | undefined => {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

const isRecentBrand = (item: unknown): item is RecentBrand => {
  const brand = item as RecentBrand;
  return (
    !!brand &&
    typeof brand.name === "string" &&
    typeof brand.website === "string" &&
    typeof brand.count === "number" &&
    typeof brand.lastUsed === "number"
  );
};

/** Most frequently used first; ties go to the most recently used. */
export const sortBrands = (brands: RecentBrand[]) =>
  [...brands].sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed);

export function loadRecentBrands(): RecentBrand[] {
  const store = storage();
  if (!store) return sortBrands(memory);
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed)
      ? sortBrands(parsed.filter(isRecentBrand))
      : [];
  } catch {
    return [];
  }
}

export function recordBrand(
  name: string,
  website: string,
  now = Date.now(),
): RecentBrand[] {
  const trimmed = name.trim();
  if (!trimmed) return loadRecentBrands();
  const current = loadRecentBrands();
  const existing = current.find(
    (brand) => brand.name.toLowerCase() === trimmed.toLowerCase(),
  );
  const updated: RecentBrand = {
    name: trimmed,
    website: website.trim() || existing?.website || "",
    count: (existing?.count ?? 0) + 1,
    lastUsed: now,
  };
  const next = sortBrands([
    updated,
    ...current.filter((brand) => brand !== existing),
  ]).slice(0, MAX_BRANDS);
  memory = next;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Storage may be full or blocked; the in-memory copy still works for this session.
  }
  return next;
}

export function forgetBrand(name: string): RecentBrand[] {
  const next = loadRecentBrands().filter(
    (brand) => brand.name.toLowerCase() !== name.trim().toLowerCase(),
  );
  memory = next;
  try {
    storage()?.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage failures.
  }
  return next;
}
