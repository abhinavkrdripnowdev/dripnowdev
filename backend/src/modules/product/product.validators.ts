import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(2).max(150),
  parent_id: z.number().int().positive().optional(),
  description: z.string().optional(),
  image_url: z.string().url().optional(),
});

export const createVariantSchema = z.object({
  sku: z.string().min(3).max(100),
  size: z.string().max(50).optional(),
  color: z.string().max(50).optional(),
  price_override: z.number().positive().optional(),
  initial_quantity: z.number().int().min(0).optional().default(0),
  low_stock_threshold: z.number().int().min(0).optional().default(5),
});

export const createProductSchema = z.object({
  category_id: z.number().int().positive('Category is required'),
  name: z.string().min(2, 'Product name must be at least 2 characters').max(255),
  description: z.string().optional(),
  base_price: z.number().positive('Base price must be greater than 0'),
  images: z
    .array(
      z.object({
        image_url: z.string().url('Image URL must be valid'),
        is_primary: z.boolean().optional(),
        display_order: z.number().int().optional(),
      })
    )
    .optional(),
  variants: z.array(createVariantSchema).optional(),
});

export const updateProductSchema = z.object({
  category_id: z.number().int().positive().optional(),
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional(),
  base_price: z.number().positive().optional(),
  is_active: z.boolean().optional(),
  availability_status: z.enum(['in_stock', 'out_of_stock', 'discontinued']).optional(),
});

export const updateInventorySchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
  low_stock_threshold: z.number().int().min(0).optional(),
});
