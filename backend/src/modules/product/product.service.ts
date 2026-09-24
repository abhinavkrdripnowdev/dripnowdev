import { v4 as uuidv4 } from 'uuid';
import { db } from '../../config/database';
import {
  Category,
  Product,
  ProductVariant,
  ProductImage,
  Inventory,
  CreateCategoryDTO,
  CreateProductDTO,
  UpdateProductDTO,
  CreateVariantDTO,
  UpdateInventoryDTO,
} from './product.types';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// ─── Categories ─────────────────────────────────────────────────────────────

export async function createCategory(data: CreateCategoryDTO): Promise<Category> {
  const slug = slugify(data.name);
  const [id] = await db('categories').insert({
    name: data.name,
    parent_id: data.parent_id ?? null,
    slug,
    description: data.description ?? null,
    image_url: data.image_url ?? null,
    is_active: true,
  });

  return db('categories').where({ id }).first();
}

export async function listCategories(): Promise<Category[]> {
  return db('categories').where({ is_active: true }).orderBy('name', 'asc');
}

export async function getCategoryById(id: number): Promise<Category | null> {
  const cat = await db('categories').where({ id }).first();
  return cat ?? null;
}

// ─── Products ───────────────────────────────────────────────────────────────

export async function createProduct(sellerId: string, data: CreateProductDTO): Promise<Product> {
  const productId = uuidv4();
  const baseSlug = slugify(data.name);
  const slug = `${baseSlug}-${productId.substring(0, 8)}`;

  await db('products').insert({
    id: productId,
    seller_id: sellerId,
    category_id: data.category_id,
    name: data.name,
    slug,
    description: data.description ?? null,
    base_price: data.base_price,
    is_active: true,
    availability_status: 'in_stock',
  });

  // Create variants if provided, or default variant
  if (data.variants && data.variants.length > 0) {
    for (const v of data.variants) {
      await addProductVariant(productId, v);
    }
  } else {
    // Default variant
    await addProductVariant(productId, {
      sku: `SKU-${productId.substring(0, 8).toUpperCase()}`,
      initial_quantity: 10,
    });
  }

  // Create images if provided
  if (data.images && data.images.length > 0) {
    for (let i = 0; i < data.images.length; i++) {
      const img = data.images[i];
      await db('product_images').insert({
        id: uuidv4(),
        product_id: productId,
        image_url: img.image_url,
        is_primary: img.is_primary ?? i === 0,
        display_order: img.display_order ?? i,
      });
    }
  }

  return getProductById(productId) as Promise<Product>;
}

export async function getProductById(productId: string): Promise<Product | null> {
  const product = await db('products').where({ id: productId }).first();
  if (!product) return null;

  const category = await getCategoryById(product.category_id);
  const variants = await getProductVariants(productId);
  const images = await getProductImages(productId);

  return {
    ...product,
    base_price: Number(product.base_price),
    category,
    variants,
    images,
  };
}

export async function listProductsBySeller(sellerId: string): Promise<Product[]> {
  const products = await db('products').where({ seller_id: sellerId }).orderBy('created_at', 'desc');
  const result: Product[] = [];
  for (const p of products) {
    const full = await getProductById(p.id);
    if (full) result.push(full);
  }
  return result;
}

export interface ProductFilterOptions {
  category_id?: number;
  search?: string;
  min_price?: number;
  max_price?: number;
  size?: string;
  color?: string;
  sort?: 'price_asc' | 'price_desc' | 'newest' | 'name_asc';
}

export async function listPublicProducts(filters?: ProductFilterOptions): Promise<Product[]> {
  let query = db('products').where({ 'products.is_active': true });

  if (filters?.category_id) {
    query = query.where({ 'products.category_id': filters.category_id });
  }

  if (filters?.search) {
    const search = `%${filters.search.toLowerCase()}%`;
    query = query.where((q) => {
      q.whereRaw('LOWER(products.name) LIKE ?', [search]).orWhereRaw('LOWER(products.description) LIKE ?', [search]);
    });
  }

  if (filters?.min_price !== undefined) {
    query = query.where('products.base_price', '>=', filters.min_price);
  }

  if (filters?.max_price !== undefined) {
    query = query.where('products.base_price', '<=', filters.max_price);
  }

  if (filters?.size || filters?.color) {
    query = query
      .join('product_variants', 'products.id', 'product_variants.product_id')
      .distinct('products.*');

    if (filters.size) {
      query = query.where('product_variants.size', filters.size);
    }
    if (filters.color) {
      query = query.where('product_variants.color', filters.color);
    }
  }

  switch (filters?.sort) {
    case 'price_asc':
      query = query.orderBy('products.base_price', 'asc');
      break;
    case 'price_desc':
      query = query.orderBy('products.base_price', 'desc');
      break;
    case 'name_asc':
      query = query.orderBy('products.name', 'asc');
      break;
    case 'newest':
    default:
      query = query.orderBy('products.created_at', 'desc');
      break;
  }

  const products = await query;
  const result: Product[] = [];
  for (const p of products) {
    const full = await getProductById(p.id);
    if (full) result.push(full);
  }
  return result;
}

export async function updateProduct(productId: string, sellerId: string, data: UpdateProductDTO): Promise<Product> {
  const product = await db('products').where({ id: productId, seller_id: sellerId }).first();
  if (!product) {
    throw new Error('Product not found or not owned by seller');
  }

  await db('products')
    .where({ id: productId })
    .update({
      ...data,
      updated_at: db.fn.now(),
    });

  return getProductById(productId) as Promise<Product>;
}

export async function deleteProduct(productId: string, sellerId: string): Promise<void> {
  const product = await db('products').where({ id: productId, seller_id: sellerId }).first();
  if (!product) {
    throw new Error('Product not found or not owned by seller');
  }

  await db('products').where({ id: productId }).delete();
}

// ─── Variants & Inventory ───────────────────────────────────────────────────

export async function addProductVariant(productId: string, data: CreateVariantDTO): Promise<ProductVariant> {
  const variantId = uuidv4();
  await db('product_variants').insert({
    id: variantId,
    product_id: productId,
    sku: data.sku,
    size: data.size ?? null,
    color: data.color ?? null,
    price_override: data.price_override ?? null,
    is_active: true,
  });

  // Create inventory record
  const inventoryId = uuidv4();
  await db('inventory').insert({
    id: inventoryId,
    variant_id: variantId,
    quantity: data.initial_quantity ?? 0,
    reserved_quantity: 0,
    low_stock_threshold: data.low_stock_threshold ?? 5,
  });

  const variant = await db('product_variants').where({ id: variantId }).first();
  const inventory = await db('inventory').where({ variant_id: variantId }).first();

  return {
    ...variant,
    price_override: variant.price_override ? Number(variant.price_override) : null,
    inventory,
  };
}

export async function getProductVariants(productId: string): Promise<ProductVariant[]> {
  const variants = await db('product_variants').where({ product_id: productId });
  const result: ProductVariant[] = [];

  for (const v of variants) {
    const inventory = await db('inventory').where({ variant_id: v.id }).first();
    result.push({
      ...v,
      price_override: v.price_override ? Number(v.price_override) : null,
      inventory: inventory ?? null,
    });
  }

  return result;
}

export async function updateInventory(variantId: string, data: UpdateInventoryDTO): Promise<Inventory> {
  const inventory = await db('inventory').where({ variant_id: variantId }).first();
  if (!inventory) {
    throw new Error('Inventory record not found for variant');
  }

  await db('inventory')
    .where({ variant_id: variantId })
    .update({
      quantity: data.quantity,
      low_stock_threshold: data.low_stock_threshold ?? inventory.low_stock_threshold,
      updated_at: db.fn.now(),
    });

  return db('inventory').where({ variant_id: variantId }).first();
}

export async function getProductImages(productId: string): Promise<ProductImage[]> {
  return db('product_images').where({ product_id: productId }).orderBy('display_order', 'asc');
}

export async function addProductImage(
  productId: string,
  imageUrl: string,
  isPrimary = false
): Promise<ProductImage> {
  const imageId = uuidv4();
  await db('product_images').insert({
    id: imageId,
    product_id: productId,
    image_url: imageUrl,
    is_primary: isPrimary,
  });

  return db('product_images').where({ id: imageId }).first();
}
