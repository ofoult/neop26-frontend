import type { Category, CategoryId } from './types';

// neop's editorial categories, mapped onto the backend's Gigsberg event types:
//   type_id 1 = Sport, 2 = Concert, 3 = Comedy, 4 = Festival, 5 = Theatre.
// Only categories with a Gigsberg type are listed (Conferences has no
// equivalent and was removed).
export const CATEGORIES: Category[] = [
  { id: 'music', label: 'Music', emoji: '♪', typeId: 2 , color: '#ad3561' },
  { id: 'festivals', label: 'Festivals', emoji: '✦', typeId: 4 , color: '#623ac0' },
  { id: 'sports', label: 'Sports', emoji: '◆', typeId: 1 , color: '#3264b4' },
  { id: 'arts', label: 'Theater & Arts', emoji: '❖', typeId: 5 , color:'#c4833a' },
  { id: 'comedy', label: 'Comedy', emoji: '☺', typeId: 3 , color: '#29af5a' },
];

const BY_ID = new Map<CategoryId, Category>(CATEGORIES.map((c) => [c.id, c]));
const BY_TYPE_ID = new Map<number, Category>(
  CATEGORIES.filter((c) => c.typeId != null).map((c) => [c.typeId as number, c]),
);

// Gigsberg type_name -> neop category, used when only the listing projection
// (which omits type_id) is available.
const BY_TYPE_NAME: Record<string, CategoryId> = {
  Concert: 'music',
  Festival: 'festivals',
  Sport: 'sports',
  Theatre: 'arts',
  Comedy: 'comedy',
};

export function categoryById(id: string | null | undefined): Category | undefined {
  if (!id) return undefined;
  return BY_ID.get(id as CategoryId);
}

export function categoryFromType(
  typeId: number | null | undefined,
  typeName: string | null | undefined,
): CategoryId {
  if (typeId != null && BY_TYPE_ID.has(typeId)) {
    return BY_TYPE_ID.get(typeId)!.id;
  }
  if (typeName && BY_TYPE_NAME[typeName]) {
    return BY_TYPE_NAME[typeName];
  }
  return 'music';
}
