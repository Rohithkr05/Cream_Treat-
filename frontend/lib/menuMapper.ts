import { Category, FoodItem } from '@/types/menu';
import { MENU_SECTIONS, MenuSectionData } from '@/lib/menuData';
import {
  filterMenuItemsByActiveCategories,
  isValidMongoObjectId,
} from '@/lib/checkout';
import { FeaturedDish } from '@/components/FeaturedPhotoGrid';
import { TypographicSubgroup } from '@/components/TypographicItemList';

export interface HydratedMenuSection {
  id: string;
  title: string;
  tagline: string;
  theme: 'light' | 'dark';
  imagePlacement: 'left' | 'right';
  featuredDishes: FeaturedDish[];
  subgroups?: TypographicSubgroup[];
  items?: FoodItem[];
  note?: string;
  totalItemsCount: number;
}

/**
 * Normalizes string for robust lookup matching (ignoring case, spaces, and punctuation).
 * e.g. "Cheese Maggie" -> "cheesemaggie", "Cheese maggi" -> "cheesemaggi"
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .replace(/maggie/g, 'maggi')
    .replace(/gadbud/g, 'gadbad')
    .replace(/falafels/g, 'falafel')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Pairs backend FoodItem array with editorial section layout data.
 */
export function buildHydratedSections(
  apiFoodItems: FoodItem[],
  searchQuery: string = '',
  categories: Category[] = [],
): HydratedMenuSection[] {
  const activeApiItems = filterMenuItemsByActiveCategories(
    apiFoodItems,
    categories,
  );

  // Build fast lookup map from valid backend items (valid 24-char ObjectIds only)
  const itemMap = new Map<string, FoodItem>();
  const matchedIds = new Set<string>();
  activeApiItems.forEach((item) => {
    itemMap.set(normalizeName(item.name), item);
  });

  const query = searchQuery.trim().toLowerCase();

  // Helper to resolve backend FoodItem; never emits synthetic "client_*" orderable IDs
  const resolveFoodItem = (
    name: string,
    defaultPricePaise: number,
    imageUrl?: string,
  ): FoodItem => {
    const key = normalizeName(name);
    const existing = itemMap.get(key);
    if (existing) {
      matchedIds.add(existing._id);
      return existing;
    }

    return {
      _id: '',
      categoryId: '',
      name,
      price: defaultPricePaise,
      imageUrl: imageUrl || '',
      isAvailable: false,
      displayOrder: 99,
    };
  };

  const matchesSearch = (item: FoodItem): boolean => {
    if (!query) return true;
    const nameMatch = item.name.toLowerCase().includes(query);
    const descMatch = (item.description || '').toLowerCase().includes(query);
    return nameMatch || descMatch;
  };

  const sections: HydratedMenuSection[] = MENU_SECTIONS.map(
    (section: MenuSectionData) => {
      // 1. Resolve Featured Photo Dishes
      const featuredDishes: FeaturedDish[] = section.photos
        .map((p) => {
          const resolved = resolveFoodItem(p.name, p.price * 100, p.image);
          const resolvedImg = resolved.imageUrl?.trim();
          const useBackendImage =
            resolvedImg &&
            (resolvedImg.startsWith('/') || resolvedImg.startsWith('http'));
          return {
            foodItem: resolved,
            image: useBackendImage ? resolvedImg : p.image,
            alt: p.alt,
          };
        })
        .filter((d) => matchesSearch(d.foodItem));

      // 2. Resolve Subgroups (if any)
      let subgroups: TypographicSubgroup[] | undefined;
      if (section.subgroups) {
        subgroups = section.subgroups
          .map((sg) => ({
            title: sg.title,
            items: sg.items
              .map((i) => resolveFoodItem(i.name, i.price * 100))
              .filter((i) => matchesSearch(i)),
          }))
          .filter((sg) => sg.items.length > 0);
      }

      // 3. Resolve Flat Items (if no subgroups)
      let items: FoodItem[] | undefined;
      if (section.items) {
        items = section.items
          .map((i) => resolveFoodItem(i.name, i.price * 100))
          .filter((i) => matchesSearch(i));
      }

      const totalCount =
        (subgroups
          ? subgroups.reduce((acc, sg) => acc + sg.items.length, 0)
          : 0) + (items ? items.length : 0);

      return {
        id: section.id,
        title: section.title,
        tagline: section.tagline,
        theme: section.theme,
        imagePlacement: section.imagePlacement,
        featuredDishes,
        subgroups,
        items,
        note: section.note,
        totalItemsCount: totalCount,
      };
    },
  );

  // Append any live backend items not listed in the static editorial catalog
  const unmatchedItems = activeApiItems.filter(
    (item) =>
      isValidMongoObjectId(item._id) &&
      !matchedIds.has(item._id) &&
      matchesSearch(item),
  );

  if (unmatchedItems.length > 0) {
    sections.push({
      id: 'specials',
      title: 'House Additions',
      tagline: 'Fresh from the Kitchen',
      theme: sections.length % 2 === 0 ? 'light' : 'dark',
      imagePlacement: 'left',
      featuredDishes: [],
      items: unmatchedItems,
      totalItemsCount: unmatchedItems.length,
    });
  }

  return sections;
}
