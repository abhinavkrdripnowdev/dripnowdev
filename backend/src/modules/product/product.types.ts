export type ProductAvailabilityStatus = 'in_stock' | 'out_of_stock' | 'discontinued';

export interface Category {
  id: number;
  parent_id?: number | null;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProductImage {
  id: string;
  product_id: string;
  variant_id?: string | null;
  image_url: string;
  is_primary: boolean;
  display_order: number;
  created_at: string;
}

export interface Inventory {
  id: string;
  variant_id: string;
  quantity: number;
  reserved_quantity: number;
  low_stock_threshold: number;
  updated_at: string;
}

export interface ProductVariant {
  id: string;
  product_id: string;
  sku: string;
  size?: string | null;
  color?: string | null;
  price_override?: number | null;
  is_active: boolean;
  inventory?: Inventory | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  seller_id: string;
  category_id: number;
  name: string;
  slug: string;
  description?: string | null;
  base_price: number;
  is_active: boolean;
  availability_status: ProductAvailabilityStatus;
  category?: Category | null;
  variants?: ProductVariant[];
  images?: ProductImage[];
  created_at: string;
  updated_at: string;
}

export interface CreateCategoryDTO {
  name: string;
  parent_id?: number;
  description?: string;
  image_url?: string;
}

export interface CreateVariantDTO {
  sku: string;
  size?: string;
  color?: string;
  price_override?: number;
  initial_quantity?: number;
  low_stock_threshold?: number;
}

export interface CreateProductDTO {
  category_id: number;
  name: string;
  description?: string;
  base_price: number;
  images?: Array<{
    image_url: string;
    is_primary?: boolean;
    display_order?: number;
  }>;
  variants?: CreateVariantDTO[];
}

export interface UpdateProductDTO {
  category_id?: number;
  name?: string;
  description?: string;
  base_price?: number;
  is_active?: boolean;
  availability_status?: ProductAvailabilityStatus;
}

export interface UpdateInventoryDTO {
  quantity: number;
  low_stock_threshold?: number;
}
