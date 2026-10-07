export interface CatalogNode {
  slug: string;
  label: string;
  icon: string;
  tone: string;
  subs: { slug: string; label: string }[];
}

const sub = (parent: string, label: string) => ({
  slug: label.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  label,
  parent,
});

const make = (slug: string, label: string, icon: string, tone: string, subs: string[]): CatalogNode => ({
  slug, label, icon, tone,
  subs: subs.map((s) => { const n = sub(slug, s); return { slug: n.slug, label: n.label }; }),
});

/** Mirrors backend/database/seeds/categories.cjs (category slug = `${parent}-${sub}`). */
export const CATALOG: CatalogNode[] = [
  make('women', 'Women', '◒', 'rose', ['Tops', 'Dresses', 'Jeans & Trousers', 'Co-ords', 'Jumpsuits', 'Athleisure', 'Sleepwear', 'Innerwear']),
  make('men', 'Men', '◐', 'blue', ['T-shirts', 'Shirts', 'Jeans & Trousers', 'Shorts', 'Athleisure', 'Sleepwear', 'Innerwear']),
  make('ethnic', 'Ethnic', '❋', 'saffron', ['Kurtas & Sets', 'Sarees', 'Lehengas', 'Nehru Jackets', 'Ethnic Bottoms']),
  make('beauty', 'Beauty', '✿', 'pink', ['Skincare', 'Makeup', 'Haircare', 'Fragrances']),
  make('accessories', 'Accessories', '◇', 'mint', ['Bags', 'Watches', 'Sunglasses', 'Belts & Wallets', 'Caps & Hats']),
  make('footwear', 'Footwear', '↗', 'sky', ['Sneakers', 'Heels', 'Flats & Sandals', 'Formal Shoes', 'Sports Shoes']),
  make('home', 'Home', '⌂', 'peach', ['Bedding', 'Decor', 'Kitchen & Dining', 'Storage']),
  make('jewellery', 'Jewellery', '♢', 'gold', ['Earrings', 'Necklaces', 'Rings', 'Bracelets']),
  make('gifting', 'Gifting', '⌑', 'lilac', ['Gift Sets', 'Personalised', 'Hampers']),
];

export const FOR_YOU = { slug: '', label: 'For you', icon: '✦', tone: 'violet' };

/** Legacy flat "fashion" category covers all apparel departments. */
export const LEGACY_ALIASES: Record<string, string[]> = { fashion: ['women', 'men', 'ethnic'] };

export const categoryPath = (slug?: string, subSlug?: string) =>
  !slug ? '/' : subSlug ? `/c/${slug}/${subSlug}` : `/c/${slug}`;

export const findNode = (slug?: string) => CATALOG.find((c) => c.slug === slug);

/** Does a product's category slug fall under the requested department / sub-department? */
export function matchesCategory(productCategorySlug: string, slug?: string, subSlug?: string): boolean {
  if (!slug) return true;
  const s = (productCategorySlug || '').toLowerCase();
  if (subSlug) return s === `${slug}-${subSlug}`;
  return s === slug || s.startsWith(`${slug}-`) || (LEGACY_ALIASES[s] ?? []).includes(slug);
}
