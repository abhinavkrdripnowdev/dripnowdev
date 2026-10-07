export interface ProductVariant {
  id: string;
  size?: string;
  color?: string;
  sku?: string;
  price_override?: number | null;
  inventory?: { quantity: number; low_stock_threshold?: number } | null;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category: { id?: number; name: string; slug?: string; parent_id?: number | null } | string;
  images?: { image_url: string }[];
  variants?: ProductVariant[];
  base_price: number;
  image?: string;
  seller_id: string;
  created_at?: string;
}

export const inr = (n: number | string) => {
  const v = Number(n);
  return `₹${v.toLocaleString('en-IN', { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
};

export const productCategoryName = (p: Product) => (typeof p.category === 'string' ? p.category : p.category?.name ?? '');
export const productCategorySlug = (p: Product) => (typeof p.category === 'string' ? p.category : p.category?.slug ?? '').toLowerCase();

export const variantStock = (v?: ProductVariant) => Number(v?.inventory?.quantity ?? 0);
