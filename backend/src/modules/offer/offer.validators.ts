import { z } from 'zod';

export const createOfferSchema = z.object({
  title: z.string().min(2, 'Offer title must be at least 2 characters').max(255),
  code: z.string().max(50).optional(),
  offer_type: z.enum(['percentage', 'flat', 'special_price']),
  discount_value: z.number().positive('Discount value must be greater than 0'),
  min_order_value: z.number().min(0).optional().default(0),
  start_date: z.string().optional(),
  end_date: z.string().optional(),
});

export const createComboOfferSchema = z.object({
  name: z.string().min(2, 'Combo name must be at least 2 characters').max(255),
  description: z.string().optional(),
  combo_price: z.number().positive('Combo price must be greater than 0'),
  items: z
    .array(
      z.object({
        product_id: z.string().uuid('Valid product ID required'),
        variant_id: z.string().uuid().optional(),
      })
    )
    .min(2, 'Combo offer requires at least 2 items'),
});
