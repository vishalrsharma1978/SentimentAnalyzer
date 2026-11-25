const STORAGE_KEY = "pulseboard.hiddenSections";

const SECTION_IDS = [
  "competitive-intelligence",
  "customer-experience",
  "feature-map",
  "customer-reviews",
  "customer-voice-map",
  "issue-funnel",
] as const;

export type SectionId = (typeof SECTION_IDS)[number];

let memory = [] as SectionId[];

const storage = (): Storage | undefined => {
  try {
    return typeof localStorage === "undefined" ? undefined : localStorage;
  } catch {
    return undefined;
  }
};

const isSectionId = (value: unknown): value is SectionId =>
  SECTION_IDS.includes(value as SectionId);

export function loadHiddenSections(): SectionId[] {
  const store = storage();
  if (!store) return [...memory];
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter(isSectionId) : [];
  } catch {
    return [];
  }
}

export function isSectionHidden(id: SectionId): boolean {
  return loadHiddenSections().includes(id);
}

/** Remembers the choice across visits; returns whether the section is now hidden. */
export function setSectionHidden(id: SectionId, hidden: boolean): boolean {
  const next: SectionId[] = loadHiddenSections().filter((item) => item !== id);
  if (hidden) next.push(id);
  memory = next;
  const store = storage();
  if (store) {
    try {
      store.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage can be full or blocked; the choice still applies for this visit.
    }
  }
  return hidden;
}
