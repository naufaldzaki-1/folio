import { profileSchema, type Profile } from "./schema";

// Only collapse items that express the same value in the same category. Different
// claims (even when their evidence overlaps) remain editable by the user.
const canonical = (value: string) => value.normalize("NFKC").toLocaleLowerCase("id-ID")
  .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "")
  .replace(/[^\p{L}\p{N}]+/gu, " ").trim().replace(/\s+/g, " ");

export function deduplicateProfile(profile: Profile): Profile {
  const result = {} as Profile;
  for (const category of profileSchema.keyof().options) {
    const seen = new Set<string>();
    result[category] = profile[category].filter(item => {
      const key = canonical(item.value);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  return result;
}

type Item = { value: string; evidence: string };

// Student ID, semester and class labels are enrolment metadata, not education
// facts. They are only rejected when they look like identifiers, so titles such
// as "Class Representative" are preserved.
const ADMIN_DETAIL = /^(student id|nim|nrp)\b|\bsemester\s*\d|\b(class|kelas)\s*[a-z]{0,3}\s*-?\s*\d/i;

// A CV usually writes one organization/project heading followed by bullets.
// Bullets belong to the same entry, so group them by the heading before ":" or "|".
function entityKey(value: string): string | null {
  const head = value.split(/[:—–|]| - /)[0]?.trim() ?? "";
  const key = canonical(head);
  return key.length >= 3 && key.length <= 60 ? key : null;
}

function groupItems(items: Item[]): Item[] {
  const order: string[] = [];
  const groups = new Map<string, Item[]>();
  for (const item of items) {
    const key = entityKey(item.value) ?? `single-${order.length}`;
    const existing = groups.get(key);
    if (existing) existing.push(item);
    else { groups.set(key, [item]); order.push(key); }
  }
  return order.map(key => {
    const group = groups.get(key)!;
    if (group.length === 1) return group[0];
    // The shortest value is normally the heading ("FOLIO - ... | 2026").
    const title = [...group].sort((a, b) => a.value.length - b.value.length)[0];
    const head = title.value.split(/[:—–|]| - /)[0].trim();
    const details = group
      .filter(item => item !== title)
      .map(item => item.value.slice(head.length).replace(/^[\s:—–|\-]+/, "").trim())
      .filter(detail => detail && canonical(detail) !== canonical(head));
    const merged = details.length ? `${title.value}: ${details.join("; ")}` : title.value;
    return { value: merged.slice(0, 600), evidence: title.evidence };
  });
}

// Deterministic cleanup applied to AI output, resumed drafts and confirmed edits.
export function normalizeProfile(profile: Profile): Profile {
  const deduped = deduplicateProfile(profile);
  const result = {} as Profile;
  for (const category of profileSchema.keyof().options) {
    const items = deduped[category];
    const cleaned = category === "education" ? items.filter(item => !ADMIN_DETAIL.test(item.value)) : items;
    const merge = category === "education" || category === "experience" || category === "projects";
    result[category] = merge ? groupItems(cleaned) : cleaned;
  }
  return result;
}