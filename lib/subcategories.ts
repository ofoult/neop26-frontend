import { CATEGORIES } from './categories';
import { slugify } from './slug';
import type { ApiSubtype, CategoryId } from './types';

export interface Subcategory {
  id: number;
  name: string;
  slug: string;
  typeId: number;
  categoryId: CategoryId;
}

const CATEGORY_BY_TYPE_ID = new Map<number, CategoryId>(
  CATEGORIES.filter((c) => c.typeId != null).map((c) => [c.typeId as number, c.id]),
);

/**
 * Maps raw `/subtypes` rows onto neop's category taxonomy, slugifying each
 * name for use in `/browse/{slug}` (see lib/slug.ts's slugify). Subtypes under
 * a type_id with no matching neop category (none currently, but mirrors the
 * same defensive stance as categories.ts) are dropped. When two names slugify
 * to the same string, the first one wins — see the plan's "known limitation"
 * note; the taxonomy is a curated genre list, so collisions are rare.
 *
 * Category slugs are reserved up front: Gigsberg's Comedy type has exactly
 * one subtype, itself named "Comedy" (a generic catch-all, not a real
 * subdivision) — without this it'd slugify to the same "comedy" as the
 * category and show up as a second, redundant "Comedy" entry next to "All"
 * in the select and Nav submenu. categoryById(slug) always takes precedence
 * over a subcategory in routing (see browse/[slug]/page.tsx's resolveSlug),
 * so a subtype whose slug collides with a category id could never be reached
 * by its own URL anyway — dropping it keeps the UI from offering a dead option.
 */
export function toSubcategories(raw: ApiSubtype[]): Subcategory[] {
  const seenSlugs = new Set<string>(CATEGORIES.map((c) => c.id));
  const out: Subcategory[] = [];
  for (const item of raw) {
    const categoryId = CATEGORY_BY_TYPE_ID.get(item.type_id);
    if (!categoryId) continue;
    const slug = slugify(item.name);
    if (!slug || seenSlugs.has(slug)) continue;
    seenSlugs.add(slug);
    out.push({ id: item.id, name: item.name, slug, typeId: item.type_id, categoryId });
  }
  return out;
}

export function subcategoriesByCategory(subs: Subcategory[]): Partial<Record<CategoryId, Subcategory[]>> {
  const out: Partial<Record<CategoryId, Subcategory[]>> = {};
  for (const s of subs) {
    (out[s.categoryId] ??= []).push(s);
  }
  return out;
}

export function findSubcategory(subs: Subcategory[], slug: string): Subcategory | undefined {
  return subs.find((s) => s.slug === slug);
}
